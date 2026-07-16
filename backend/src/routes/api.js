import { Router } from "express"
import { hyperliquidClient } from "../hyperliquid.js"
import { accountScanner } from "../scanner.js"
import { copyEngine } from "../copier.js"
import { walletManager } from "../wallet.js"
import { REFERENCE_ADDRESS, COPY_RATIO, MIN_COPY_AMOUNT, MAX_COPY_AMOUNT } from "../config.js"

const router = Router()

// ========================================
// 参考账户 API
// ========================================

/**
 * 获取参考账户完整状态
 */
router.get("/reference/scan", async (req, res) => {
  try {
    const address = req.query.address || REFERENCE_ADDRESS
    const data = await accountScanner.scanFull(address)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * 获取参考账户的最新缓存数据
 */
router.get("/reference/latest", (req, res) => {
  const data = accountScanner.getLastState()
  res.json({ success: true, data })
})

/**
 * 获取参考账户的交易历史
 */
router.get("/reference/trades", async (req, res) => {
  try {
    const address = req.query.address || REFERENCE_ADDRESS
    const fills = await hyperliquidClient.getFills(address)
    res.json({ success: true, data: fills })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * 获取参考账户的挂单
 */
router.get("/reference/orders", async (req, res) => {
  try {
    const address = req.query.address || REFERENCE_ADDRESS
    const orders = await hyperliquidClient.getOpenOrders(address)
    res.json({ success: true, data: orders })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ========================================
// 自己账户 API
// ========================================

/**
 * 获取自己账户状态
 */
router.get("/my/state", async (req, res) => {
  try {
    if (!walletManager.isReady()) {
      return res.json({ success: false, error: "钱包未初始化", walletReady: false })
    }
    const address = walletManager.getAddress()
    const state = await hyperliquidClient.getAccountState(address)
    const mids = await hyperliquidClient.getAllMids()

    const positions = (state.assetPositions || []).map(p => {
      const pos = p.position
      const midPrice = parseFloat(mids[pos.coin] || "0")
      const entryPrice = parseFloat(pos.entryPx)
      const size = parseFloat(pos.szi)
      const positionValue = Math.abs(size) * midPrice
      const entryValue = Math.abs(size) * entryPrice
      const pnl = parseFloat(pos.unrealizedPnl || "0")
      const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0

      return {
        coin: pos.coin,
        size,
        entryPrice,
        currentPrice: midPrice,
        positionValue,
        leverage: pos.leverage?.value || 1,
        pnl,
        pnlPercent,
        liquidationPrice: pos.liquidationPx ? parseFloat(pos.liquidationPx) : null,
        marginUsed: parseFloat(pos.marginUsed || "0"),
        direction: size > 0 ? "LONG" : "SHORT",
        type: pos.leverage?.type || "cross"
      }
    })

    res.json({
      success: true,
      data: {
        address,
        summary: {
          accountValue: parseFloat(state.marginSummary?.accountValue || "0"),
          totalPositionValue: parseFloat(state.marginSummary?.totalNtlPos || "0"),
          totalMarginUsed: parseFloat(state.marginSummary?.totalMarginUsed || "0"),
          withdrawable: parseFloat(state.withdrawable || "0"),
          positionCount: positions.length,
          totalPnl: positions.reduce((s, p) => s + p.pnl, 0)
        },
        positions
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ========================================
// 钱包管理 API
// ========================================

/**
 * 初始化钱包（通过加密私钥）
 * POST { encryptedKey, password }
 */
router.post("/wallet/init", async (req, res) => {
  try {
    const { encryptedKey, password } = req.body
    if (!password) {
      return res.status(400).json({ success: false, error: "需要密码" })
    }
    const result = await walletManager.initialize(encryptedKey, password)
    if (!result) {
      return res.status(400).json({ success: false, error: "钱包初始化失败，请提供私钥" })
    }
    res.json({
      success: true,
      data: { address: result.address, method: result.method }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * 加密并设置私钥
 * POST { privateKey, password }
 */
router.post("/wallet/set-key", async (req, res) => {
  try {
    const { privateKey, password } = req.body
    if (!privateKey || !password) {
      return res.status(400).json({ success: false, error: "需要私钥和密码" })
    }
    const { encrypted, address } = walletManager.encryptKey(privateKey, password)
    await walletManager.initialize(encrypted, password)
    res.json({
      success: true,
      data: {
        address,
        encryptedKey: encrypted,
        message: "私钥已加密存储，密码用于解锁"
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * 钱包状态
 */
router.get("/wallet/status", (req, res) => {
  const info = walletManager.getInfo()
  res.json({ success: true, data: info || { isReady: false } })
})

/**
 * 清除钱包
 */
router.post("/wallet/clear", (req, res) => {
  walletManager.clear()
  res.json({ success: true })
})

// ========================================
// 跟单引擎 API
// ========================================

/**
 * 启动跟单
 */
router.post("/copier/start", (req, res) => {
  copyEngine.start()
  res.json({ success: true, enabled: true })
})

/**
 * 停止跟单
 */
router.post("/copier/stop", (req, res) => {
  copyEngine.stop()
  res.json({ success: true, enabled: false })
})

/**
 * 跟单状态
 */
router.get("/copier/status", (req, res) => {
  res.json({
    success: true,
    enabled: copyEngine.enabled,
    config: copyEngine.getConfig()
  })
})

/**
 * 更新跟单配置
 */
router.post("/copier/config", (req, res) => {
  const { copyRatio, minCopyAmount, maxCopyAmount } = req.body
  const config = {}
  if (copyRatio !== undefined) config.copyRatio = parseFloat(copyRatio)
  if (minCopyAmount !== undefined) config.minCopyAmount = parseFloat(minCopyAmount)
  if (maxCopyAmount !== undefined) config.maxCopyAmount = parseFloat(maxCopyAmount)
  copyEngine.updateConfig(config)
  res.json({ success: true, config: copyEngine.getConfig() })
})

/**
 * 手动平仓所有持仓
 */
router.post("/copier/close-all", async (req, res) => {
  try {
    const results = await copyEngine.closeAllPositions()
    res.json({ success: true, data: results })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * 手动平仓指定币种
 * POST { coin }
 */
router.post("/copier/close-position", async (req, res) => {
  try {
    const { coin } = req.body
    if (!coin) return res.status(400).json({ success: false, error: "缺少币种" })
    const result = await copyEngine.closePosition(coin)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// ========================================
// 环境检测 API
// ========================================

router.get("/env", (req, res) => {
  res.json({ success: true, isVercel: false, mode: "local" })
})
// ========================================
// 市场数据 API
// ========================================

/**
 * 获取所有代币价格
 */
router.get("/market/prices", async (req, res) => {
  try {
    const mids = await hyperliquidClient.getAllMids()
    res.json({ success: true, data: mids })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router

