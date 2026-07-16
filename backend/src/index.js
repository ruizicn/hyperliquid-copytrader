import "dotenv/config"
import express from "express"
import cors from "cors"
import http from "http"
import { WebSocketServer } from "ws"
import apiRoutes from "./routes/api.js"
import { walletManager } from "./wallet.js"
import { accountScanner } from "./scanner.js"
import { copyEngine } from "./copier.js"
import { PORT, REFERENCE_ADDRESS, SCAN_INTERVAL } from "./config.js"

// 自动从环境变量初始化钱包
walletManager.initialize().then(result => {
  if (result) {
    console.log("[Wallet] 已自动加载钱包: " + result.address)
  } else {
    console.log("[Wallet] 未配置私钥，可通过前端输入")
  }
}).catch(err => {
  console.error("[Wallet] 钱包初始化失败: " + err.message)
})

const app = express()
const server = http.createServer(app)

// WebSocket 实时推送
const wss = new WebSocketServer({ server, path: "/ws" })

wss.on("connection", (ws) => {
  console.log("[WS] 客户端已连接")

  const send = (type, data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }))
    }
  }

  // 注册监听器
  const unsubScan = accountScanner.onUpdate((type, data) => {
    if (type === "scan") send("scan", data)
  })

  const unsubCopier = copyEngine.onUpdate((type, data) => {
    send(`copier:${type}`, data)
  })

  ws.on("close", () => {
    unsubScan()
    unsubCopier()
    console.log("[WS] 客户端已断开")
  })

  ws.on("error", () => {})
})

// 中间件
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
  credentials: true
}))
app.use(express.json({ limit: "1mb" }))

// API Routes
app.use("/api", apiRoutes)

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: Date.now() })
})

// 启动参考账户自动扫描
let scanIntervalId = null
function startAutoScan() {
  if (scanIntervalId) clearInterval(scanIntervalId)
  console.log(`[Scanner] 开始自动扫描: ${REFERENCE_ADDRESS}，间隔 ${SCAN_INTERVAL}ms`)

  // 立即执行一次
  accountScanner.scanFull(REFERENCE_ADDRESS).catch(err => {
    console.error("[Scanner] 初始扫描失败:", err.message)
  })

  scanIntervalId = setInterval(async () => {
    try {
      await accountScanner.scanFull(REFERENCE_ADDRESS)
    } catch (err) {
      console.error("[Scanner] 扫描失败:", err.message)
    }
  }, SCAN_INTERVAL)
}

// 启动
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n========================================`)
  console.log(`  Hyperliquid 跟单系统`)
  console.log(`  HTTP:     http://localhost:${PORT}`)
  console.log(`  WS:       ws://localhost:${PORT}/ws`)
  console.log(`  参考地址: ${REFERENCE_ADDRESS}`)
  console.log(`========================================\n`)

  startAutoScan()
})

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n[Server] 正在关闭...")
  if (scanIntervalId) clearInterval(scanIntervalId)
  copyEngine.stop()
  server.close()
  process.exit(0)
})

process.on("SIGTERM", () => {
  process.exit(0)
})

