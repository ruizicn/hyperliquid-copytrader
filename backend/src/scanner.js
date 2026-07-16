import { hyperliquidClient } from "./hyperliquid.js"

/**
 * 参考账户扫描器
 * 定期扫描参考账户的持仓、挂单和交易记录
 */
export class AccountScanner {
  constructor() {
    this._lastState = null
    this._lastTrades = []
    this._listeners = []
  }

  /**
   * 注册状态变更监听器
   */
  onUpdate(callback) {
    this._listeners.push(callback)
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback)
    }
  }

  _notify(type, data) {
    for (const listener of this._listeners) {
      try { listener(type, data) } catch (e) { console.error("Scanner listener error:", e) }
    }
  }

  /**
   * 完整扫描参考账户
   */
  async scanFull(address) {
    const [state, mids, orders, fills] = await Promise.all([
      hyperliquidClient.getAccountState(address),
      hyperliquidClient.getAllMids(),
      hyperliquidClient.getOpenOrders(address),
      hyperliquidClient.getFills(address)
    ])

    // 结构化持仓数据
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
        size: size,
        entryPrice: entryPrice,
        currentPrice: midPrice,
        positionValue: positionValue,
        leverage: pos.leverage?.value || 1,
        pnl: pnl,
        pnlPercent: pnlPercent,
        liquidationPrice: pos.liquidationPx,
        marginUsed: parseFloat(pos.marginUsed || "0"),
        cumFunding: pos.cumFunding,
        direction: size > 0 ? "LONG" : "SHORT",
        type: pos.leverage?.type || "cross"
      }
    })

    // 结构化挂单数据
    const openOrders = (orders || []).map(o => ({
      coin: o.coin,
      side: o.side === "A" ? "SELL" : "BUY",
      price: parseFloat(o.limitPx),
      size: parseFloat(o.sz),
      origSize: parseFloat(o.origSz),
      reduceOnly: o.reduceOnly,
      orderId: o.oid,
      timestamp: o.timestamp
    }))

    // 最近的交易记录 (最近20笔)
    const recentFills = (fills || []).slice(0, 20).map(f => ({
      coin: f.coin,
      side: f.side,
      price: parseFloat(f.price || f.px || "0"),
      size: parseFloat(f.sz || "0"),
      total: parseFloat(f.total || "0"),
      fee: parseFloat(f.fee || "0"),
      hash: f.hash || f.oid,
      time: f.time || f.timestamp
    }))

    // 账户摘要
    const summary = {
      accountValue: parseFloat(state.marginSummary?.accountValue || "0"),
      totalPositionValue: parseFloat(state.marginSummary?.totalNtlPos || "0"),
      totalMarginUsed: parseFloat(state.marginSummary?.totalMarginUsed || "0"),
      totalRawUsd: parseFloat(state.marginSummary?.totalRawUsd || "0"),
      withdrawable: parseFloat(state.withdrawable || "0"),
      crossMaintenanceMargin: parseFloat(state.crossMaintenanceMarginUsed || "0"),
      positionCount: positions.length,
      totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0),
      openOrderCount: openOrders.length
    }

    const result = {
      address: address,
      summary,
      positions,
      openOrders,
      recentFills,
      timestamp: Date.now()
    }

    this._lastState = result
    this._notify("scan", result)
    return result
  }

  /**
   * 获取最后扫描的状态
   */
  getLastState() {
    return this._lastState
  }
}

export const accountScanner = new AccountScanner()
