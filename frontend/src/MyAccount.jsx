import { apiFetch, fmt } from "./api.js";

export default function MyAccount({ myData, loading, walletStatus, onRefresh, notify }) {
  if (!walletStatus.isReady) {
    return <div className="text-center py-20 text-gray-500"><p className="text-lg mb-2">🔐</p><p>请先在设置页面配置钱包连接</p></div>;
  }
  const closePos = async (coin) => {
    try {
      const res = await apiFetch("/copier/close-position", { method: "POST", body: JSON.stringify({ coin }) });
      if (res.success) { notify(coin + " 已平仓", "success"); onRefresh(); }
      else notify(res.error || "平仓失败", "error");
    } catch (err) { notify(err.message, "error"); }
  };
  const closeAll = async () => {
    try {
      const res = await apiFetch("/copier/close-all", { method: "POST" });
      if (res.success) { notify("全部平仓成功", "success"); onRefresh(); }
    } catch (err) { notify(err.message, "error"); }
  };
  return (
    <div className="space-y-5 animate-slide-up">
      {myData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "账户总值", value: fmt.usd(myData.summary.accountValue) },
            { label: "持仓价值", value: fmt.usd(myData.summary.totalPositionValue) },
            { label: "总盈亏", value: fmt.pnl(myData.summary.totalPnl), color: myData.summary.totalPnl >= 0 ? "green" : "red" },
            { label: "持仓数量", value: "" + myData.summary.positionCount },
          ].map((item, i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className={"text-base font-semibold " + (item.color === "green" ? "text-green-400" : item.color === "red" ? "text-red-400" : "text-gray-100")}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">我的持仓 {myData?.positions?.length ? "(" + myData.positions.length + ")" : ""}</h3>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-300">刷新</button>
            <button onClick={closeAll} className="text-xs text-red-500 hover:text-red-400">全部平仓</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-5 py-3 font-medium">币种</th>
                <th className="text-right px-4 py-3 font-medium">方向</th>
                <th className="text-right px-4 py-3 font-medium">持仓量</th>
                <th className="text-right px-4 py-3 font-medium">开仓价</th>
                <th className="text-right px-4 py-3 font-medium">当前价</th>
                <th className="text-right px-4 py-3 font-medium">杠杆</th>
                <th className="text-right px-4 py-3 font-medium">未实现盈亏</th>
                <th className="text-right px-4 py-3 font-medium">盈亏率</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {myData?.positions?.map((pos) => (
                <tr key={pos.coin} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-medium text-gray-200">{pos.coin}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.direction === "LONG" ? "text-green-400" : "text-red-400")}>{pos.direction === "LONG" ? "做多" : "做空"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.size(pos.size)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.entryPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.currentPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.leverage(pos.leverage)}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</td>
                  <td className={"px-4 py-3 text-right " + (pos.pnlPercent >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnlPercent(pos.pnlPercent)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => closePos(pos.coin)} className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 border border-red-600/30">平仓</button>
                  </td>
                </tr>
              ))}
              {(!myData?.positions || myData.positions.length === 0) && (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-gray-500">暂无持仓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
