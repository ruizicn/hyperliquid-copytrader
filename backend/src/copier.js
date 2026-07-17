import { hyperliquidClient } from "./hyperliquid.js"
import { walletManager } from "./wallet.js"
import { accountScanner } from "./scanner.js"
import { encode as msgpackEncode } from "@msgpack/msgpack"
import { keccak256, getBytes, TypedDataEncoder } from "ethers"
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
      maxCopyAmount: MAX_COPY_AMOUNT,
      maxDrawdownPercent: 15,
      maxDailyLossPercent: 8
    }
    this._initialEquity = 0
    this._dailyStartEquity = 0
    this._lastDayCheck = Date.now()
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
    this._initialEquity = 0
    this._dailyStartEquity = 0
    this._lastDayCheck = new Date().toDateString()
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

      // 3. 风控检查
      const stopReason = await this._checkStopLoss(myState)
      if (stopReason) {
        console.log("[Copier] 触发止损: " + stopReason)
        await this.closeAllPositions()
        this.stop()
        this._notify("stoploss", { reason: stopReason })
        this._scheduleNext()
        return
      }

      // 4. 对比并执行同步
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

    let totalNeeded = 0;
    for (const rp of refPositions) {
      const cp = parseFloat(mids[rp.coin] || "0");
      if (cp <= 0) continue;
      const tv = Math.abs(rp.size * copyRatio) * cp;
      if (tv >= this._config.minCopyAmount) totalNeeded += tv / rp.leverage;
    }
    const perpAvail = parseFloat(myState.withdrawable || "0");
    if (perpAvail < totalNeeded) { await this._ensurePerpBalance(totalNeeded); }

    for (const refPos of refPositions) {
      const coin = refPos.coin
      let targetSize = refPos.size * copyRatio
      const currentPos = myPosMap[coin]

      // 计算当前价格下的目标价值
      const currentPrice = parseFloat(mids[coin] || "0")
      if (currentPrice <= 0) continue

      const targetValue = Math.abs(targetSize) * currentPrice
      if (targetValue < this._config.minCopyAmount) continue
      if (targetValue > maxCopyAmount) {
        targetSize = (targetSize > 0 ? 1 : -1) * (maxCopyAmount / currentPrice)
        targetValue = maxCopyAmount
        console.log("[Copier] " + coin + ": target $" + targetValue.toFixed(2) + " capped to $" + maxCopyAmount)
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
    if (!walletManager.isReady()) throw new Error("钱包未就绪");
    if (Math.abs(size) < 0.0001) return;

    try {
      const wallet = walletManager.getWallet();
      const meta = await hyperliquidClient.getMetadata();
      const coinIndex = meta.universe.findIndex(u => u.name === coin);
      if (coinIndex === -1) throw new Error("Coin " + coin + " not found");

      const isBuy = size > 0;
      const absSize = Math.abs(size);
      const nonce = Date.now();
      const sd = meta.universe[coinIndex].szDecimals !== undefined ? meta.universe[coinIndex].szDecimals : 2;
      const sf = Math.pow(10, sd);
      let sz = Math.floor(Math.max(absSize, 10 / Math.max(price, 0.001)) * sf) / sf;
      if (sz <= 0) sz = 1 / sf;

      const action = { type: "order", orders: [{ a: coinIndex, b: isBuy, p: parseFloat(price.toFixed(6)).toString(), s: sz + "", r: false, t: { limit: { tif: "Gtc" } } }], grouping: "na" };

      const packed = msgpackEncode(action);
      const nb = new Uint8Array(8);
      const nbBig = BigInt(nonce);
      for (let i = 0; i < 8; i++) nb[7 - i] = Number((nbBig >> BigInt(i * 8)) & BigInt(0xFF));
      const comb = new Uint8Array(packed.length + 9);
      comb.set(packed, 0); comb.set(nb, packed.length); comb[packed.length + 8] = 0;
      const hash = keccak256(comb);
      const domain = { name: "Exchange", version: "1", chainId: 1337, verifyingContract: "0x0000000000000000000000000000000000000000" };
      const types = { "Agent": [{ name: "source", type: "string" }, { name: "connectionId", type: "bytes32" }] };
      const msg = { source: "a", connectionId: hash };
      const encoded = TypedDataEncoder.encode(domain, types, msg);
      const digest = getBytes(keccak256(encoded));
      const sig = wallet.signingKey.sign(digest);
      const sigV = sig.v >= 27 ? sig.v - 27 : sig.v;

      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, signature: { r: sig.r, s: sig.s, v: sigV } })
      });

      if (!res.ok) { const txt = await res.text(); console.error("[Copier] 下单失败 " + coin + ":", txt.substring(0,200)); return { success: false, error: txt }; }
      const result = await res.json();
      const hasErr = result.status === "err" || (result.response?.data?.statuses || []).some(s => s.error);
      if (hasErr) console.error("[Copier] 下单返回错误 " + coin + ":", JSON.stringify(result).substring(0,300));
      else console.log("[Copier] 下单成功 " + coin + ":", JSON.stringify(result).substring(0,200));
      this._notify("order", { coin, size, price, isBuy, result });
      return { success: true, data: result };
    } catch (err) {
      console.error("[Copier] 下单异常 " + coin + ":", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * 手动平仓指定币种
   */
  
  async _ensurePerpBalance(neededAmount) {
    if (!walletManager.isReady()) return false;
    const address = walletManager.getAddress();
    const state = await hyperliquidClient.getAccountState(address);
    const perpAvail = parseFloat(state.withdrawable || "0");
    if (perpAvail >= neededAmount) return true;
    const shortfall = neededAmount - perpAvail;
    if (shortfall <= 0) return true;
    const spotRes = await hyperliquidClient.getSpotState(address);
    const spotAvail = parseFloat(spotRes?.balances?.find(b => b.coin === "USDC")?.total || "0");
    if (spotAvail <= 0) return false;
    const transferAmount = Math.min(shortfall + 1, spotAvail);
    console.log("[Copier] 从现货转入 " + transferAmount.toFixed(2) + " USDC");
    const result = await this._usdTransfer(transferAmount, true);
    return result.success;
  }

  async _usdTransfer(amount, toPerp) {
    try {
      const wallet = walletManager.getWallet();
      const nonce = Date.now();
      const chainId = parseInt("0x66eee");
      const action = { type: "usdClassTransfer", amount: amount.toString(), toPerp, nonce, signatureChainId: "0x66eee", hyperliquidChain: "Mainnet" };
      const domain = { name: "HyperliquidSignTransaction", version: "1", chainId, verifyingContract: "0x0000000000000000000000000000000000000000" };
      const types = { "HyperliquidTransaction:UsdClassTransfer": [{ name: "hyperliquidChain", type: "string" }, { name: "amount", type: "string" }, { name: "toPerp", type: "bool" }, { name: "nonce", type: "uint64" }] };
      const msg = { hyperliquidChain: "Mainnet", amount: amount.toString(), toPerp, nonce: BigInt(nonce) };
      const sigHex = await wallet.signTypedData(domain, types, msg);
      const clean = sigHex.replace("0x","");
      const v = parseInt(clean.substring(128,130),16);
      const sig = { r: "0x"+clean.substring(0,64), s: "0x"+clean.substring(64,128), v: v < 27 ? v+27 : v };
      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, signature: sig })
      });
      if (!res.ok) { const t = await res.text(); console.error("[Copier] 转账失败:", t.substring(0,200)); return { success: false, error: t }; }
      const result = await res.json();
      console.log("[Copier] 转账成功: " + amount + " USDC");
      this._notify("transfer", { amount, toPerp, result });
      return { success: true, data: result };
    } catch (err) {
      console.error("[Copier] 转账异常:", err.message);
      return { success: false, error: err.message };
    }
  }

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
    _checkStopLoss(myState) {
      const eq = parseFloat(myState.marginSummary?.accountValue || "0")
      const cfg = this._config
      // 每日重置
      const today = new Date().toDateString()
      if (this._lastDayCheck !== today) {
        this._dailyStartEquity = eq
        this._lastDayCheck = today
      }
      // 初始化初始净值
      if (this._initialEquity === 0) this._initialEquity = eq
      // 总回撤检查
      if (this._initialEquity > 0) {
        const lossPct = ((this._initialEquity - eq) / this._initialEquity) * 100
        if (lossPct >= cfg.maxDrawdownPercent) {
          return "总回撤 " + lossPct.toFixed(1) + "% 超过限制 " + cfg.maxDrawdownPercent + "%"
        }
      }
      // 每日亏损检查
      if (this._dailyStartEquity > 0) {
        const dayLossPct = ((this._dailyStartEquity - eq) / this._dailyStartEquity) * 100
        if (dayLossPct >= cfg.maxDailyLossPercent) {
          return "当日亏损 " + dayLossPct.toFixed(1) + "% 超过限制 " + cfg.maxDailyLossPercent + "%"
        }
      }
      return null
    }
}

export const copyEngine = new CopyTradingEngine()