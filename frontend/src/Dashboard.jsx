import { apiFetch, fmt } from "./api.js";

function AccountCard({ title, color, data, loading, isMy }) {
  const c = { blue: "from-blue-600/10 border-blue-900/30 text-blue-400", green: "from-green-600/10 border-green-900/30 text-green-400" }[color] || "";
  const spot = data?.spot;
  const sum = data?.summary;
  const totalEquity = (spot?.totalUSDC || 0) + Math.max(sum?.perpAccountValue || sum?.accountValue || 0, 0);
  const perpValue = sum?.perpAccountValue || sum?.accountValue || 0;
  const copyRate = sum?.copyReturnRate;
  return (
    <div className={"bg-gradient-to-br " + c + " border rounded-xl p-4"}>
      <div className="text-xs text-gray-400 mb-2">{title}</div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-28 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
        </div>
      ) : data ? (
        <div className="space-y-1">
          <div className="text-xl font-semibold" style={{color: color === "blue" ? "#60a5fa" : "#4ade80"}}>
            {fmt.usd(totalEquity)} <span className="text-xs text-gray-500 font-normal">\u603b\u6743\u76ca</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>\u73b0\u8d27: {fmt.usd(spot?.totalUSDC || 0)}</span>
            <span>\u6c38\u7eed: {fmt.usd(perpValue)}</span>
            {isMy && copyRate !== undefined && (
              <span className={copyRate >= 0 ? "text-green-400" : "text-red-400"}>
                \u8ddf\u5355\u6536\u76ca\u7387: {copyRate >= 0 ? "+" : ""}{copyRate}%
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">-\u200b-</div>
      )}
    </div>
  );
}

export default function Dashboard({ refData, myData, loading, walletStatus, copierStatus, onRefreshRef, onRefreshMy, notify, isVercel }) {
  const toggleCopier = async () => {
    try {
      const ep = copierStatus.enabled ? "/copier/stop" : "/copier/start";
      const res = await apiFetch(ep, { method: "POST" });
      if (res.success) notify(copierStatus.enabled ? "\u5df2\u505c\u6b62\u8ddf\u5355" : "\u5df2\u542f\u52a8\u8ddf\u5355", "success");
    } catch (err) { notify(err.message, "error"); }
  };
  const closeAll = async () => {
    try { const res = await apiFetch("/copier/close-all", { method: "POST" }); if (res.success) notify("\u5df2\u5168\u90e8\u5e73\u4ed3", "success"); } catch (err) { notify(err.message, "error"); }
  };

  const PositionRow = ({ pos }) => (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-gray-200 shrink-0">{pos.coin}</span>
        <span className={"text-xs px-1.5 py-0.5 rounded shrink-0 " + (pos.direction === "LONG" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400")}>
          {pos.direction === "LONG" ? "\u591a" : "\u7a7a"}
        </span>
        <span className="text-xs text-gray-500 truncate">{fmt.size(pos.size)} @ {fmt.price(pos.entryPrice)}</span>
      </div>
      <div className="text-right text-xs shrink-0">
        <div className={"font-medium " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</div>
        <div className="text-gray-500">{pos.returnOnEquity || (pos.pnlPercent ? pos.pnlPercent.toFixed(2) + "%" : "-")}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      {/* \u8d44\u4ea7\u6982\u89c8 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountCard title={"\u53c2\u8003\u8d26\u6237 \u00b7 " + fmt.shortAddr("0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef")} color="blue" data={refData} loading={loading} />
        {!isVercel && <AccountCard title={"\u6211\u7684\u8d26\u6237"} color="green" data={myData} loading={!myData} isMy />}
      </div>

      {/* \u5feb\u901f\u64cd\u4f5c & \u8ddf\u5355\u72b6\u6001 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">\u5feb\u901f\u64cd\u4f5c</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={onRefreshRef} className="flex-1 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 border border-blue-600/30">\u626b\u63cf\u53c2\u8003\u8d26\u6237</button>
              {!isVercel && <button onClick={onRefreshMy} disabled={!walletStatus.isReady} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">\u5237\u65b0\u6211\u7684\u8d26\u6237</button>}
            </div>
            {!isVercel && (
              <div className="flex gap-2">
                <button onClick={toggleCopier} className={"flex-1 px-4 py-2 rounded-lg text-sm border " + (copierStatus.enabled ? "bg-red-600/20 text-red-400 border-red-600/30" : "bg-green-600/20 text-green-400 border-green-600/30")}>
                  {copierStatus.enabled ? "\u505c\u6b62\u8ddf\u5355" : "\u542f\u52a8\u8ddf\u5355"}
                </button>
                <button onClick={closeAll} disabled={!walletStatus.isReady} className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/30 hover:bg-red-600/30 disabled:opacity-40">\u5168\u90e8\u5e73\u4ed3</button>
              </div>
            )}
            {isVercel && (
              <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg text-xs text-blue-400">Vercel \u53ea\u8bfb\u6a21\u5f0f \u00b7 \u8ddf\u5355\u673a\u5668\u4eba\u9700\u5728\u672c\u5730\u8fd0\u884c</div>
            )}
            {!isVercel && (
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg text-xs">
                <span className="text-gray-400">\u8ddf\u5355\u72b6\u6001:</span>
                <span className={copierStatus.enabled ? "text-green-400" : "text-gray-500"}>{copierStatus.enabled ? "\u8fd0\u884c\u4e2d" : "\u5df2\u505c\u6b62"}</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">\u6bd4\u4f8b:</span>
                <span className="text-gray-300">{(copierStatus.config?.copyRatio || 0) * 100}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">\u53c2\u8003\u8d26\u6237\u6301\u4ed3</h3>
          {refData?.positions?.length > 0 ? (
            <div className="space-y-0">
              {refData.positions.slice(0, 8).map(pos => <PositionRow key={pos.coin} pos={pos} />)}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">\u6682\u65e0\u6301\u4ed3\u6570\u636e</p>
          )}
        </div>
      </div>

      {/* \u6211\u7684\u6301\u4ed3\u6982\u89c8 */}
      {!isVercel && myData?.positions?.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">\u6211\u7684\u6301\u4ed3</h3>
            <button onClick={onRefreshMy} className="text-xs text-gray-500 hover:text-gray-300">\u5237\u65b0</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-3 py-2 font-medium">\u5e01\u79cd</th>
                  <th className="text-right px-3 py-2 font-medium">\u65b9\u5411</th>
                  <th className="text-right px-3 py-2 font-medium">\u6301\u4ed3\u91cf</th>
                  <th className="text-right px-3 py-2 font-medium">\u5f00\u4ed3\u4ef7</th>
                  <th className="text-right px-3 py-2 font-medium">\u5f53\u524d\u4ef7</th>
                  <th className="text-right px-3 py-2 font-medium">\u6760\u6746</th>
                  <th className="text-right px-3 py-2 font-medium">PnL</th>
                  <th className="text-right px-3 py-2 font-medium">\u6536\u76ca\u7387</th>
                </tr>
              </thead>
              <tbody>
                {myData.positions.map(pos => (
                  <tr key={pos.coin} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 font-medium text-gray-200">{pos.coin}</td>
                    <td className={"px-3 py-2 text-right " + (pos.direction === "LONG" ? "text-green-400" : "text-red-400")}>{pos.direction === "LONG" ? "\u591a" : "\u7a7a"}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{fmt.size(pos.size)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{fmt.price(pos.entryPrice)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{fmt.price(pos.currentPrice)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{fmt.leverage(pos.leverage)}</td>
                    <td className={"px-3 py-2 text-right font-medium " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</td>
                    <td className={"px-3 py-2 text-right " + ((pos.returnOnEquity || "0%") >= "0%" ? "text-green-400" : "text-red-400")}>{pos.returnOnEquity || fmt.pnlPercent(pos.pnlPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}