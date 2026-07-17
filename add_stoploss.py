import sys, os

path = "C:/Users/LENOVO/Documents/跟单系统/backend/src/copier.js"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add stop-loss in _tick
old = '      // 3. 对比并执行同步\n      await this._syncPositions(refState.positions, myState, myMids)'
new = '      // 3. 风控检查\n      const stopReason = await this._checkStopLoss(myState)\n      if (stopReason) {\n        console.log("[Copier] 触发止损: " + stopReason)\n        await this.closeAllPositions()\n        this.stop()\n        this._notify("stoploss", { reason: stopReason })\n        this._scheduleNext()\n        return\n      }\n\n      // 4. 对比并执行同步\n      await this._syncPositions(refState.positions, myState, myMids)'
c = c.replace(old, new)

# Add stop-loss API routes
c = c.replace(
  'export const copyEngine = new CopyTradingEngine()',
  '  _checkStopLoss(myState) {\n    const eq = parseFloat(myState.marginSummary?.accountValue || "0")\n    const cfg = this._config\n\n    // 每日重置\n    const today = new Date().toDateString()\n    if (this._lastDayCheck !== today) {\n      this._dailyStartEquity = eq\n      this._lastDayCheck = today\n    }\n\n    // 初始化初始净值\n    if (this._initialEquity === 0) this._initialEquity = eq\n\n    // 总回撤检查\n    if (this._initialEquity > 0) {\n      const lossPct = ((this._initialEquity - eq) / this._initialEquity) * 100\n      if (lossPct >= cfg.maxDrawdownPercent) {\n        return "总回撤 " + lossPct.toFixed(1) + "% 超过限制 " + cfg.maxDrawdownPercent + "%"\n      }\n    }\n\n    // 每日亏损检查\n    if (this._dailyStartEquity > 0) {\n      const dayLossPct = ((this._dailyStartEquity - eq) / this._dailyStartEquity) * 100\n      if (dayLossPct >= cfg.maxDailyLossPercent) {\n        return "当日亏损 " + dayLossPct.toFixed(1) + "% 超过限制 " + cfg.maxDailyLossPercent + "%"\n      }\n    }\n\n    return null\n  }\n}\n\nexport const copyEngine = new CopyTradingEngine()'
)

# Also add initial equity tracking in start()
c = c.replace(
  '  start(intervalMs = 10000) {\n    if (this._enabled) return\n    this._enabled = true\n    this._notify("status", { enabled: true })\n    console.log("[Copier] 跟单引擎已启动")\n    this._tick()\n    return this\n  }',
  '  start(intervalMs = 10000) {\n    if (this._enabled) return\n    this._enabled = true\n    this._notify("status", { enabled: true })\n    console.log("[Copier] 跟单引擎已启动")\n    this._initialEquity = 0\n    this._dailyStartEquity = 0\n    this._lastDayCheck = new Date().toDateString()\n    this._tick()\n    return this\n  }'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Stop-loss logic added")
