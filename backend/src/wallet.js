import CryptoJS from "crypto-js"
import { Wallet } from "ethers"
import { ENCRYPTION_SALT } from "./config.js"

/**
 * 私钥安全管理模块
 * - 私钥使用 AES-256 加密存储
 * - 内存中用完即清除
 * - 绝不将私钥明文发送到前端
 * - 支持 session 级别的密钥缓存
 */
class WalletManager {
  constructor() {
    this._decryptedKey = null
    this._address = null
    this._wallet = null
  }

  /**
   * 使用密码加密私钥
   */
  encryptKey(privateKey, password) {
    const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
    const encrypted = CryptoJS.AES.encrypt(normalizedKey, password + ENCRYPTION_SALT).toString()
    const address = new Wallet(normalizedKey).address
    return { encrypted, address: address.toLowerCase() }
  }

  /**
   * 使用密码解密私钥（仅用于内存操作）
   */
  decryptKey(encryptedKey, password) {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, password + ENCRYPTION_SALT)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted || !decrypted.startsWith("0x") || decrypted.length !== 66) {
      throw new Error("解密失败，密码错误或密钥已损坏")
    }
    return decrypted
  }

  /**
   * 初始化钱包（从环境变量或加密密钥）
   */
  async initialize(encryptedKey, password) {
    if (encryptedKey && password) {
      const privateKey = this.decryptKey(encryptedKey, password)
      this._wallet = new Wallet(privateKey)
      this._decryptedKey = privateKey
      this._address = this._wallet.address.toLowerCase()
      // 私钥保留用于签名
      return { address: this._address, method: "encrypted" }
    }

    // 尝试从环境变量加载
    if (process.env.YOUR_PRIVATE_KEY) {
      const pk = process.env.YOUR_PRIVATE_KEY.startsWith("0x")
        ? process.env.YOUR_PRIVATE_KEY
        : `0x${process.env.YOUR_PRIVATE_KEY}`
      this._wallet = new Wallet(pk)
      this._decryptedKey = pk
      this._address = this._wallet.address.toLowerCase()
      return { address: this._address, method: "env" }
    }

    return null
  }

  /**
   * 获取钱包地址
   */
  getAddress() {
    return this._address
  }

  /**
   * 获取 ethers Wallet 实例
   */
  getWallet() {
    return this._wallet
  }

  /**
   * 检查钱包是否已初始化
   */
  isReady() {
    return this._wallet !== null && this._address !== null
  }

  /**
   * 清理内存中的私钥
   */
  clear() {
    this._decryptedKey = null
    this._address = null
    this._wallet = null
  }

  /**
   * 获取账户摘要信息（不含私钥）
   */
  getInfo() {
    if (!this._wallet) return null
    return {
      address: this._address,
      isReady: this.isReady()
    }
  }
}

export const walletManager = new WalletManager()
