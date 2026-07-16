
import { HYPERLIQUID_INFO_URL, HYPERLIQUID_EXCHANGE_URL } from "./config.js"

/**
 * Hyperliquid 公共 API 客户端（只读）
 * 用于扫描参考账户数据
 */
export class HyperliquidClient {
  /**
   * 获取账户持仓
   */
  async getAccountState(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  /**
   * 获取所有代币的最新价格
   */
  async getAllMids() {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  /**
   * 获取特定代币的最新价格
   */
  async getMid(coin) {
    const mids = await this.getAllMids()
    return parseFloat(mids[coin] || "0")
  }

  /**
   * 获取账户的未成交挂单
   */
  async getOpenOrders(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "openOrders", user: address })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.value || data || []
  }

  /**
   * 获取账户最近的交易历史
   */
  async getFills(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user: address })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }

  /**
   * 获取账户的非用户触发事件（清算、资金费）
   */
  async getUserEvents(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userEvents", user: address })
    })
    if (!res.ok) return []
    const data = await res.json()
    return data || []
  }

  /**
   * 获取账户的杠杆设置
   */
  async getLeverage(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userLeverage", user: address })
    })
    if (!res.ok) return null
    return res.json()
  }

  /**
   * 获取市场信息
   */
  async getMetadata() {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }
}

export const hyperliquidClient = new HyperliquidClient()
