const PORT = parseInt(process.env.PORT || "3001")
const REFERENCE_ADDRESS = process.env.REFERENCE_ADDRESS || "0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef"
const COPY_RATIO = parseFloat(process.env.COPY_RATIO || "0.1")
const MIN_COPY_AMOUNT = parseFloat(process.env.MIN_COPY_AMOUNT || "10")
const MAX_COPY_AMOUNT = parseFloat(process.env.MAX_COPY_AMOUNT || "500")
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL || "5000")
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || "copytrader-salt-2024"

export const HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz"
export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info"
export const HYPERLIQUID_EXCHANGE_URL = "https://api.hyperliquid.xyz/exchange"

export {
  PORT,
  REFERENCE_ADDRESS,
  COPY_RATIO,
  MIN_COPY_AMOUNT,
  MAX_COPY_AMOUNT,
  SCAN_INTERVAL,
  ENCRYPTION_SALT
}
