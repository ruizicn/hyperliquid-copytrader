import { apiFetch, fmt } from "./api.js";

export default function MyAccount({ myData, loading, walletStatus, onRefresh, notify }) {
  if (!walletStatus.isReady) {
    return <div className="text-center py-20 text-gray-500"><p className="text-lg mb-2">\ud83d\udd10</p><p>\u8bf7\u5148\u5728\u8bbe\u7f6e\u9875\u9762\u914d\u7f6e\u94b1\u5305\u8fde\u63a5</p></div>;
  }

  const closePos = async (coin) => {
    try {
      const res = await apiFetch("/copier/close-position", { method: "POST", body: JSON.stringify({ coin }) });
      if (res.success) { notify(coin + " \u5df2\u5e73\u4ed3", "success"); onRefresh(); }
      else notify(res.error || "\u5e73\u4ed3\u5931\u8d25", "error");
    } catch (err) { notify(err.message, "error"); }
  };
  const closeAll = async () => {
    try { const res = await apiFetch("/copier/close-all", { method: "POST" }); if (res.success) { notify("\u5168\u90e8\u5e73\u4ed3\u6210\u529f", "success"); onRefresh(); } }
    catch (err) { notify(err.message, "error"); }
  };

  const sum = myData?.summary;
  const spot = myData?.spot;
  const portfolio = myData?.portfolio;
  const perpValue = sum?.perpAccountValue || sum?.accountValue || 0;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* \u8d44\u4ea7\u6982\u89c8 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-xs text-gray-500 mb-1">\u603b\u6743\u76ca</div>
          <div className="text-lg font-semibold text-green-400">{fmt.usd(portfolio?.totalEquity || 0)}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-xs text-gray-500 mb-1">\u73b0\u8d27\u4f59\u989d</div>
          <div className="text-lg font-semibold text-gray-100">{fmt.usd(spot?.totalUSDC || 0)}</div>
          {spot?.balances?.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {spot.balances.filter(b => b.available > 0).map(b => b.coin + " " + fmt.usd(b.available)).join(" | ")}
            </div>
          )}
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-xs text-gray-500 mb-1">\u6c38\u7eed\u5408\u7ea6\u51c0\u503c</div>
          <div className="text-lg font-semibold text-gray-100">{fmt.usd(perpValue)}</div>
          <div className="text-xs text-gray-500">{sum?.positionCount || 0} \u4e2a\u6301\u4ed3</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-xs text-gray-500 mb-1">\u6c38\u7eed\u76c8\u4e8f</div>
          <div className={"text-lg font-semibold " + ((sum?.totalPnl || 0) >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(sum?.totalPnl || 0)}</div>
          {portfolio?.copyReturnRate !== undefined && (
            <div className={"text-xs " + (portfolio.copyReturnRate >= 0 ? "text-green-400" : "text-red-400")}>
              \u8ddf\u5355\u6536\u76ca\u7387: {portfolio.copyReturnRate >= 0 ? "+" : ""}{portfolio.copyReturnRate}%
            </div>
          )}
        </div>
      </div>

      {/* \u6301\u4ed3\u5217\u8868 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">\u6211\u7684\u6301\u4ed3 {myData?.positions?.length ? "(" + myData.positions.length + ")" : ""}</h3>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-300">\u5237\u65b0</button>
            <button onClick={closeAll} className="text-xs text-red-500 hover:text-red-400">\u5168\u90e8\u5e73\u4ed3</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-5 py-3 font-medium">\u5e01\u79cd</th>
                <th className="text-right px-4 py-3 font-medium">\u65b9\u5411</th>
                <th className="text-right px-4 py-3 font-medium">\u6301\u4ed3\u91cf</th>
                <th className="text-right px-4 py-3 font-medium">\u5f00\u4ed3\u4ef7</th>
                <th className="text-right px-4 py-3 font-medium">\u5f53\u524d\u4ef7</th>
                <th className="text-right px-4 py-3 font-medium">\u6760\u6746</th>
                <th className="text-right px-4 py-3 font-medium">\u672a\u5b9e\u73b0\u76c8\u4e8f</th>
                <th className="text-right px-4 py-3 font-medium">\u76c8\u4e8f\u7387</th>
                <th className="text-right px-4 py-3 font-medium">\u6536\u76ca\u7387(ROE)</th>
                <th className="text-right px-4 py-3 font-medium">\u64cd\u4f5c</th>
              </tr>
            </thead>
            <tbody>
              {myData?.positions?.map((pos) => (
                <tr key={pos.coin} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-medium text-gray-200">{pos.coin}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.direction === "LONG" ? "text-green-400" : "text-red-400")}>{pos.direction === "LONG" ? "\u505a\u591a" : "\u505a\u7a7a"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.size(pos.size)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.entryPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.currentPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.leverage(pos.leverage)}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</td>
                  <td className={"px-4 py-3 text-right " + (pos.pnlPercent >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnlPercent(pos.pnlPercent)}</td>
                  <td className={"px-4 py-3 text-right font-medium " + ((pos.returnOnEquity || "0%").replace("%","") >= "0" ? "text-green-400" : "text-red-400")}>{pos.returnOnEquity || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => closePos(pos.coin)} className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 border border-red-600/30">\u5e73\u4ed3</button>
                  </td>
                </tr>
              ))}
              {(!myData?.positions || myData.positions.length === 0) && (
                <tr><td colSpan="10" className="px-5 py-8 text-center text-gray-500">\u6682\u65e0\u6301\u4ed3</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}