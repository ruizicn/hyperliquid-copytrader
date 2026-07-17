import sys
path = "C:/Users/LENOVO/Documents/跟单系统/frontend/src/Dashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add drawdown tracking in ControlStrip
old = '  const refPnl = refData?.summary?.totalPnl || 0;'
new = '  const [ddPct, setDdPct] = useState(0);\n  const refPnl = refData?.summary?.totalPnl || 0;'
c = c.replace(old, new)

old = '  const refC = refData?.positions?.length || 0;'
new = '  const refC = refData?.positions?.length || 0;\n  const ddLimit = copierStatus.config?.maxDrawdownPercent || 15;\n  const ddDaily = copierStatus.config?.maxDailyLossPercent || 8;'
c = c.replace(old, new)

# Add drawdown to the 4-grid metrics - replace the ref PnL cell with one that shows drawdown
old = '        <div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">参考 PnL</div>\n          <div className={"text-xs font-semibold mt-0.5 " + (refPnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(refPnl)}</div>\n        </div>'
new = '        <div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">参考 PnL</div>\n          <div className={"text-xs font-semibold mt-0.5 " + (refPnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(refPnl)}</div>\n        </div>\n        <div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">止损线</div>\n          <div className="text-xs font-semibold mt-0.5 text-gray-300">\u2460 {ddLimit}% / \u2461 {ddDaily}%</div>\n        </div>'
c = c.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Updated")
