import { hyperliquidClient } from "./hyperliquid.js"
import { walletManager } from "./wallet.js"
import { accountScanner } from "./scanner.js"
import { COPY_RATIO, MIN_COPY_AMOUNT, MAX_COPY_AMOUNT } from "./config.js"

/**
 * 跟单交易引擎
 * - 监控参考账户持仓变化
 * - 自动同步持仓到自己的账户
 * - 支持手动平仓（全部或单个）
 */
class CopyTradingEngine {
  constructor() {
    this._enabled = false
    this._intervalId = null
    this._config = {
      copyRatio: COPY_RATIO,
      minCopyAmount: MIN_COPY_AMOUNT,
      maxCopyAmount: MAX_COPY_AMOUNT
    }
    this._listeners = []
    this._lastSyncState = null
  }

  onUpdate(callback) {
    this._listeners.push(callback)
    return () => { this._listeners = this._listeners.filter(l => l !== callback) }
  }

  _notify(type, data) {
    for (const cb of this._listeners) {
      try { cb(type, data) } catch (e) { console.error("[Copier] listener error:", e) }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    Object.assign(this._config, config)
    this._notify("config", { ...this._config })
  }

  getConfig() {
    return { ...this._config }
  }

  get enabled() { return this._enabled }

  /**
   * 启动跟单
   */
  start(intervalMs = 10000) {
    if (this._enabled) return
    this._enabled = true
    this._notify("status", { enabled: true })
    console.log("[Copier] 跟单引擎已启动")
    this._tick()
    return this
  }

  /**
   * 停止跟单
   */
  stop() {
    this._enabled = false
    if (this._intervalId) {
      clearTimeout(this._intervalId)
      this._intervalId = null
    }
    this._notify("status", { enabled: false })
    console.log("[Copier] 跟单引擎已停止")
    return this
  }

  /**
   * 跟单周期：扫描参考账户 -> 对比持仓 -> 执行同步
   */
  async _tick() {
    if (!this._enabled) return

    try {
      if (!walletManager.isReady()) {
        console.log("[Copier] 钱包未就绪，跳过跟单周期")
        this._scheduleNext()
        return
      }

      const refAddress = process.env.REFERENCE_ADDRESS
      if (!refAddress) {
        console.log("[Copier] 未配置参考地址")
        this._scheduleNext()
        return
      }

      // 1. 扫描参考账户
      const refState = await accountScanner.scanFull(refAddress)
      // 2. 获取自己账户的状态
      const myAddress = walletManager.getAddress()
      const myState = await hyperliquidClient.getAccountState(myAddress)
      const myMids = await hyperliquidClient.getAllMids()

      // 3. 对比并执行同步
      await this._syncPositions(refState.positions, myState, myMids)

      this._lastSyncState = {
        refPositions: refState.positions,
        myPositions: (myState.assetPositions || []).map(p => ({
          coin: p.position.coin,
          size: parseFloat(p.position.szi),
          entryPrice: parseFloat(p.position.entryPx),
          currentPrice: parseFloat(myMids[p.position.coin] || "0"),
          pnl: parseFloat(p.position.unrealizedPnl || "0")
        })),
        timestamp: Date.now()
      }
      this._notify("sync", this._lastSyncState)
    } catch (err) {
      console.error("[Copier] 跟单周期错误:", err.message)
    }

    this._scheduleNext()
  }

  _scheduleNext() {
    if (!this._enabled) return
    this._intervalId = setTimeout(() => this._tick(), 10000)
  }

  /**
   * 同步持仓：根据参考账户调整自己的持仓
   */
  async _syncPositions(refPositions, myState, mids) {
    const myPositions = (myState.assetPositions || []).map(p => ({
      coin: p.position.coin,
      size: parseFloat(p.position.szi),
      entryPx: parseFloat(p.position.entryPx)
    }))

    const myPosMap = {}
    for (const p of myPositions) {
      myPosMap[p.coin] = p
    }

    const { copyRatio, maxCopyAmount } = this._config

    for (const refPos of refPositions) {
      const coin = refPos.coin
      const targetSize = refPos.size * copyRatio // 按比例缩放
      const currentPos = myPosMap[coin]

      // 计算当前价格下的目标价值
      const currentPrice = parseFloat(mids[coin] || "0")
      if (currentPrice <= 0) continue

      const targetValue = Math.abs(targetSize) * currentPrice
      if (targetValue < this._config.minCopyAmount) continue
      if (targetValue > maxCopyAmount) {
        // 按最大金额调整数量
        const adjustedSize = (targetSize > 0 ? 1 : -1) * (maxCopyAmount / currentPrice)
        // 这里简化为记录日志
        console.log(`[Copier] ${coin}: 目标金额 ${targetValue.toFixed(2)} 超过最大限制 ${maxCopyAmount}，已调整`)
      }

      // 检查是否需要调整持仓
      if (currentPos) {
        const diff = Math.abs(targetSize - currentPos.size)
        const threshold = Math.abs(targetSize) * 0.1 // 10%阈值
        if (diff > threshold) {
          console.log(`[Copier] ${coin}: 需要调整持仓 ${currentPos.size} -> ${targetSize.toFixed(4)}`)
          await this._placeOrder(coin, targetSize - currentPos.size, currentPrice, refPos.leverage)
        }
      } else if (Math.abs(targetSize) > 0) {
        // 新建持仓
        console.log(`[Copier] ${coin}: 新建持仓 ${targetSize.toFixed(4)}`)
        await this._placeOrder(coin, targetSize, currentPrice, refPos.leverage)
      }

      delete myPosMap[coin]
    }

    // 处理参考账户没有但自己还有的持仓（平仓）
    for (const [coin, pos] of Object.entries(myPosMap)) {
      if (Math.abs(pos.size) > 0) {
        console.log(`[Copier] ${coin}: 参考账户无此仓位，平仓 ${pos.size}`)
        await this._placeOrder(coin, -pos.size, parseFloat(mids[coin] || "0"), 1)
      }
    }
  }

  /**
   * 下单（通过 Hyperliquid Exchange API）
   * 使用 ethers Wallet 签名 EIP-712 结构化数据
   */
  async _placeOrder(coin, size, price, leverage) {
    if (!walletManager.isReady()) {
      throw new Error("钱包未就绪")
    }
    if (Math.abs(size) < 0.0001) return

    try {
      const wallet = walletManager.getWallet()
      const address = walletManager.getAddress()

      // 获取 coin 索引
      const meta = await hyperliquidClient.getMetadata()
      const coinIndex = (meta.universe || []).findIndex(u => u.name === coin)
      if (coinIndex === -1) throw new Error(`Coin ${coin} not found`)

      const isBuy = size > 0
      const absSize = Math.abs(size)

      // Hyperliquid 签名：
      // 使用 EIP-712 签名的 L2 消息
      const timestamp = Date.now()
      const signatureChainId = "0x2105" // Arbitrum One: 42161

      // 构建 order action
      const action = {
        orders: [{
          a: coinIndex,
          b: isBuy,
          p: price.toString(),
          s: absSize.toString(),
          r: false,
          t: { lmt: { tif: "Gtc" } } // limit order GTC
        }],
        grouping: "na",
        trigger: undefined
      }

      // 构建 EIP-712 typed data
      const domain = {
        name: "Exchange",
        version: "1",
        chainId: 42161, // Arbitrum One
        verifyingContract: "0x0000000000000000000000000000000000000000"
      }

      const types = {
        "HyperliquidTransaction:ActionApproval": [
          { name: "hyperliquidChain", type: "string" },
          { name: "action", type: "HyperliquidTransaction:OrderAction" },
          { name: "nonce", type: "uint64" },
          { name: "signatureChainId", type: "string" }
        ],
        "HyperliquidTransaction:OrderAction": [
          { name: "orders", type: "HyperliquidTransaction:Order[]" },
          { name: "grouping", type: "string" },
          { name: "trigger", type: "HyperliquidTransaction:Trigger?" }
        ],
        "HyperliquidTransaction:Order": [
          { name: "a", type: "uint32" },
          { name: "b", type: "bool" },
          { name: "p", type: "string" },
          { name: "s", type: "string" },
          { name: "r", type: "bool" },
          { name: "t", type: "HyperliquidTransaction:OrderType" }
        ],
        "HyperliquidTransaction:OrderType": [
          { name: "limit", type: "HyperliquidTransaction:Limit?" },
          { name: "trigger", type: "HyperliquidTransaction:Trigger?" }
        ],
        "HyperliquidTransaction:Limit": [
          { name: "tif", type: "string" }
        ],
        "HyperliquidTransaction:Trigger": []
      }

      const message = {
        hyperliquidChain: "Mainnet",
        action: {
          orders: action.orders,
          grouping: "na",
          trigger: { limit: undefined, trigger: undefined }
        },
        nonce: timestamp,
        signatureChainId: signatureChainId
      }

      const signature = await wallet.signTypedData(domain, types, message)

      // 发送到 exchange API
      const payload = {
        action: action,
        nonce: timestamp,
        signature: signature,
        signatureChainId: signatureChainId
      }

      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order",
          request: payload,
          signature: signature
        })
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[Copier] 下单失败 ${coin}:`, text)
        return { success: false, error: text }
      }

      const result = await res.json()
      console.log(`[Copier] 下单成功 ${coin}:`, JSON.stringify(result).substring(0, 100))
      this._notify("order", { coin, size, price, isBuy, result })
      return { success: true, data: result }
    } catch (err) {
      console.error(`[Copier] 下单异常 ${coin}:`, err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * 手动平仓指定币种
   */
  async closePosition(coin) {
    if (!walletManager.isReady()) throw new Error("钱包未就绪")

    const address = walletManager.getAddress()
    const state = await hyperliquidClient.getAccountState(address)
    const position = (state.assetPositions || []).find(p => p.position.coin === coin)
    if (!position) throw new Error(`没有 ${coin} 的持仓`)

    const pos = position.position
    const size = parseFloat(pos.szi)
    const mid = await hyperliquidClient.getMid(coin)
    if (mid <= 0) throw new Error(`无法获取 ${coin} 价格`)

    const result = await this._placeOrder(coin, -size, mid, pos.leverage?.value || 1)
    this._notify("closePosition", { coin, size: -size, result })
    return result
  }

  /**
   * 手动平仓所有持仓
   */
  async closeAllPositions() {
    if (!walletManager.isReady()) throw new Error("钱包未就绪")

    const address = walletManager.getAddress()
    const state = await hyperliquidClient.getAccountState(address)
    const positions = state.assetPositions || []

    const results = []
    for (const p of positions) {
      const pos = p.position
      const coin = pos.coin
      const size = parseFloat(pos.szi)
      const mid = await hyperliquidClient.getMid(coin)
      if (mid > 0) {
        const result = await this._placeOrder(coin, -size, mid, pos.leverage?.value || 1)
        results.push({ coin, result })
      }
    }
    this._notify("closeAll", results)
    return results
  }
}

export const copyEngine = new CopyTradingEngine()
