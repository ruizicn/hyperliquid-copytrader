// Hyperliquid 只读 API - 无需外部依赖
// Vercel Serverless Function

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const path = req.url.split("?")[0];
  const query = {};
  (req.url.split("?")[1] || "").split("&").filter(Boolean).forEach(p => {
    const [k, v] = p.split("="); query[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });

  const REF_ADDR = process.env.REFERENCE_ADDRESS || "0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef";

  try {
    // ---- 环境检测 ----
    if (path === "/api/env" || path === "/env") {
      return res.status(200).json({ success: true, isVercel: true, mode: "readonly" });
    }

    // ---- 健康检查 ----
    if (path === "/api/health" || path === "/health") {
      return res.status(200).json({ status: "ok", env: "vercel", time: Date.now() });
    }

    // ---- 参考账户扫描 ----
    if (path === "/api/reference/scan" || path === "/reference/scan") {
      const address = query.address || REF_ADDR;

      const [state, mids, fills] = await Promise.all([
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "clearinghouseState", user: address })
        }).then(r => r.json()),
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "allMids" })
        }).then(r => r.json()),
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "userFills", user: address })
        }).then(r => r.json()).catch(() => [])
      ]);

      const positions = (state.assetPositions || []).map(p => {
        const pos = p.position;
        const mid = parseFloat(mids[pos.coin] || "0");
        const ep = parseFloat(pos.entryPx);
        const sz = parseFloat(pos.szi);
        const pnl = parseFloat(pos.unrealizedPnl || "0");
        return {
          coin: pos.coin, size: sz, entryPrice: ep, currentPrice: mid,
          positionValue: Math.abs(sz) * mid,
          leverage: pos.leverage?.value || 1, pnl,
          pnlPercent: Math.abs(sz) * ep > 0 ? (pnl / (Math.abs(sz) * ep)) * 100 : 0,
          liquidationPrice: pos.liquidationPx || null,
          direction: sz > 0 ? "LONG" : "SHORT",
          marginUsed: parseFloat(pos.marginUsed || "0")
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          address, timestamp: Date.now(),
          summary: {
            accountValue: parseFloat(state.marginSummary?.accountValue || "0"),
            totalPositionValue: parseFloat(state.marginSummary?.totalNtlPos || "0"),
            totalMarginUsed: parseFloat(state.marginSummary?.totalMarginUsed || "0"),
            totalRawUsd: parseFloat(state.marginSummary?.totalRawUsd || "0"),
            withdrawable: parseFloat(state.withdrawable || "0"),
            positionCount: positions.length,
            totalPnl: positions.reduce((s, p) => s + p.pnl, 0)
          },
          positions,
          recentFills: (Array.isArray(fills) ? fills : []).slice(0, 20).map(f => ({
            coin: f.coin, side: f.side, price: parseFloat(f.price || "0"),
            size: parseFloat(f.sz || "0"), total: parseFloat(f.total || "0"),
            time: f.time || f.timestamp
          }))
        }
      });
    }

    // ---- 市场价格 ----
    if (path === "/api/market/prices" || path === "/market/prices") {
      const mids = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "allMids" })
      }).then(r => r.json());
      return res.status(200).json({ success: true, data: mids });
    }

    // ---- 404 ----
    res.status(404).json({ success: false, error: "not found", path });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}