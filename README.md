# Hyperliquid 跟单系统

一个基于 Hyperliquid 的自动跟单交易系统，支持扫描参考账户持仓、自动同步跟单、手动平仓等功能。

## 功能

- **参考账户扫描** - 实时扫描指定账户的持仓、挂单、交易记录
- **自动跟单** - 按比例自动同步参考账户的持仓变化
- **手动平仓** - 支持单个持仓平仓和全部平仓
- **私钥安全管理** - AES-256 加密存储，仅在内存中解密用于签名
- **WebSocket 实时推送** - 页面数据自动更新

## 快速开始

### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

编辑 `backend/.env` 文件：

- `REFERENCE_ADDRESS` - 被跟单的参考账户地址（默认配置好）
- `YOUR_PRIVATE_KEY` - 你的钱包私钥（可选，也可以通过前端输入）
- `COPY_RATIO` - 跟单比例

### 3. 启动服务

```bash
# 启动后端
cd backend && npm run dev

# 新终端，启动前端
cd frontend && npm run dev
```

### 4. 打开浏览器

访问 http://localhost:5173

## 安全说明

- 私钥可以通过前端页面输入，经密码加密后存储在服务端内存中
- 私钥绝不会在页面或日志中以明文形式暴露
- 建议使用专门的跟单钱包，仅转入适量资金
- 建议先在测试网小额测试

## 技术栈

- **后端**: Node.js + Express + WebSocket
- **前端**: React + Vite + TailwindCSS
- **API**: Hyperliquid API (REST + WebSocket)

## 注意事项

- 跟单交易存在风险，请自行评估
- 系统不存储您的私钥到磁盘
- 每次重启服务需要重新输入密码解锁私钥
