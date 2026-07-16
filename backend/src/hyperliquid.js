import { HYPERLIQUID_INFO_URL, HYPERLIQUID_EXCHANGE_URL } from "./config.js"

export class HyperliquidClient {
  async getAccountState(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async getAllMids() {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async getMid(coin) {
    const mids = await this.getAllMids()
    return parseFloat(mids[coin] || "0")
  }

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

  async getLeverage(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userLeverage", user: address })
    })
    if (!res.ok) return null
    return res.json()
  }

  async getMetadata() {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async getSpotState(address) {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotClearinghouseState", user: address })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }
}

export const hyperliquidClient = new HyperliquidClient()