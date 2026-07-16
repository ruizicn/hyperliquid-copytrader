import { apiFetch, fmt } from "./api.js";

export default function Dashboard({ refData, myData, loading, walletStatus, copierStatus, onRefreshRef, onRefreshMy, notify }) {
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
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-600/5 border border-blue-900/30 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-1">\u53c2\u8003\u8d26\u6237</div>
          {loading ? <div className="h-8 w-24 bg-gray-800 rounded animate-pulse my-1" /> : <div className="text-2xl font-semibold text-blue-400">{refData?.summary?.accountValue !== undefined ? fmt.usd(refData.summary.accountValue) : "-"}</div>}
          <div className="text-xs text-gray-500 mt-1">{refData?.summary?.positionCount || 0} \u4e2a\u6301\u4ed3</div>
        </div>
        <div className="bg-gradient-to-br from-green-600/10 to-green-600/5 border border-green-900/30 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-1">\u6211\u7684\u8d26\u6237</div>
          {!myData ? <div className="h-8 w-24 bg-gray-800 rounded animate-pulse my-1" /> : <div className="text-2xl font-semibold text-green-400">{fmt.usd(myData?.summary?.accountValue)}</div>}
          <div className="text-xs text-gray-500 mt-1">{walletStatus.isReady ? (myData?.summary?.positionCount || 0) + " \u4e2a\u6301\u4ed3" : "\u94b1\u5305\u672a\u8fde\u63a5"}</div>
        </div>
        <div className={"bg-gradient-to-br " + (copierStatus.enabled ? "from-green-600/10 to-green-600/5 border-green-900/30" : "from-yellow-600/10 to-yellow-600/5 border-yellow-900/30") + " border rounded-xl p-5"}>
          <div className="text-sm text-gray-400 mb-1">\u8ddf\u5355\u72b6\u6001</div>
          <div className={"text-2xl font-semibold " + (copierStatus.enabled ? "text-green-400" : "text-yellow-400")}>{copierStatus.enabled ? "\u8fd0\u884c\u4e2d" : "\u5df2\u505c\u6b62"}</div>
          <div className="text-xs text-gray-500 mt-1">\u6bd4\u4f8b: {(copierStatus.config?.copyRatio || 0) * 100}%</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">\u5feb\u901f\u64cd\u4f5c</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={onRefreshRef} className="flex-1 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 border border-blue-600/30">
                \u626b\u63cf\u53c2\u8003\u8d26\u6237
              </button>
              <button onClick={onRefreshMy} disabled={!walletStatus.isReady} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
                \u5237\u65b0\u6211\u7684\u6301\u4ed3
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleCopier} className={"flex-1 px-4 py-2 rounded-lg text-sm border " + (copierStatus.enabled ? "bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30" : "bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30")}>
                {copierStatus.enabled ? "\u505c\u6b62\u8ddf\u5355" : "\u542f\u52a8\u8ddf\u5355"}
              </button>
              <button onClick={closeAll} disabled={!walletStatus.isReady} className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/30 hover:bg-red-600/30 disabled:opacity-40">
                \u5168\u90e8\u5e73\u4ed3
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">\u6301\u4ed3\u5feb\u7167</h3>
          {refData && <div className="space-y-2">
            {refData.positions.slice(0, 6).map((pos) => {
              const myPos = myData?.positions?.find((p) => p.coin === pos.coin);
              return (
                <div key={pos.coin} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-200">{pos.coin}</span>
                    <span className={"text-xs px-1.5 py-0.5 rounded " + (pos.direction === "LONG" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400")}>
                      {pos.direction === "LONG" ? "\u591a" : "\u7a7a"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-300">{fmt.size(pos.size)}</div>
                    <div className="text-xs text-gray-500">{myPos && myPos.size >= 0 ? "\u5df2\u8ddf\u5355" : "-"}</div>
                  </div>
                </div>
              );
            })}
            {(!refData.positions || refData.positions.length === 0) && <p className="text-gray-500 text-sm">\u6682\u65e0\u6301\u4ed3\u6570\u636e</p>}
          </div>}
        </div>
      </div>
    </div>
  );
}
