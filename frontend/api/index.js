export default async function handler(req, res) {
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
    if (path === "/api/env" || path === "/env") {
      return res.status(200).json({ success: true, isVercel: true, mode: "readonly" });
    }
    if (path === "/api/health" || path === "/health") {
      return res.status(200).json({ status: "ok", env: "vercel", time: Date.now() });
    }

    if (path === "/api/reference/scan" || path === "/reference/scan") {
      const address = query.address || REF_ADDR;

      const [state, mids, fills, spotRes] = await Promise.all([
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
        }).then(r => r.json()).catch(() => []),
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotClearinghouseState", user: address })
        }).then(r => r.json()).catch(() => ({ balances: [] }))
      ]);

      const positions = (state.assetPositions || []).map(p => {
        const pos = p.position;
        const mid = parseFloat(mids[pos.coin] || "0");
        const ep = parseFloat(pos.entryPx);
        const sz = parseFloat(pos.szi);
        const pnl = parseFloat(pos.unrealizedPnl || "0");
        const mu = parseFloat(pos.marginUsed || "0");
        let roe = "0%";
        if (pos.returnOnEquity !== null && pos.returnOnEquity !== undefined) {
          roe = (parseFloat(pos.returnOnEquity) * 100).toFixed(2) + "%";
        } else if (mu > 0) {
          roe = (pnl / mu * 100).toFixed(2) + "%";
        }
        return {
          coin: pos.coin, size: sz, entryPrice: ep, currentPrice: mid,
          positionValue: Math.abs(sz) * mid,
          leverage: pos.leverage?.value || 1, pnl,
          pnlPercent: Math.abs(sz) * ep > 0 ? (pnl / (Math.abs(sz) * ep)) * 100 : 0,
          returnOnEquity: roe,
          liquidationPrice: pos.liquidationPx || null,
          direction: sz > 0 ? "LONG" : "SHORT",
          marginUsed: mu
        };
      });

      const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
      const totalMargin = positions.reduce((s, p) => s + (p.marginUsed || 0), 0);
      const totalReturnRate = positions.length > 0 ? parseFloat((totalPnl / (totalMargin || 1) * 100).toFixed(2)) : 0;

      const spotBalances = (spotRes.balances || []).map(b => ({
        coin: b.coin, token: b.token,
        total: parseFloat(b.total || "0"),
        hold: parseFloat(b.hold || "0"),
        available: parseFloat(b.total || "0") - parseFloat(b.hold || "0")
      }));
      const spotUSDC = spotBalances.find(b => b.coin === "USDC")?.total || 0;

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
            totalPnl,
            totalReturnRate
          },
          spot: { balances: spotBalances, totalUSDC: spotUSDC, total: spotBalances.reduce((s, b) => s + b.total, 0) },
          positions,
          recentFills: (Array.isArray(fills) ? fills : []).slice(0, 20).map(f => ({
            coin: f.coin, side: f.side, price: parseFloat(f.price || "0"),
            size: parseFloat(f.sz || "0"), total: parseFloat(f.total || "0"),
            time: f.time || f.timestamp
          }))
        }
      });
    }

    if (path === "/api/market/prices" || path === "/market/prices") {
      const mids = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "allMids" })
      }).then(r => r.json());
      return res.status(200).json({ success: true, data: mids });
    }

    res.status(404).json({ success: false, error: "not found", path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}