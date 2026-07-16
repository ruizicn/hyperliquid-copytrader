import { useState, useEffect } from "react";
import { fmt } from "./api.js";

export default function ReferenceAccount({ refData, loading, onRefresh }) {
  const [localData, setLocalData] = useState(refData);
  useEffect(() => { if (refData) setLocalData(refData); }, [refData]);

  const items = localData?.summary ? [
    { label: "账户总值", value: fmt.usd(localData.summary.accountValue) },
    { label: "持仓价值", value: fmt.usd(localData.summary.totalPositionValue) },
    { label: "占用保证金", value: fmt.usd(localData.summary.totalMarginUsed) },
    { label: "总盈亏", value: fmt.pnl(localData.summary.totalPnl), color: localData.summary.totalPnl >= 0 ? "green" : "red" },
    { label: "可提取", value: fmt.usd(localData.summary.withdrawable) },
  ] : [];

  return (
    <div className="space-y-5 animate-slide-up">
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className={"text-base font-semibold " + (item.color === "green" ? "text-green-400" : item.color === "red" ? "text-red-400" : "text-gray-100")}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">持仓 {localData?.summary?.positionCount ? "(" + localData.summary.positionCount + ")" : ""}</h3>
          <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-300">{loading ? "扫描中..." : "刷新"}</button>
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
                <th className="text-right px-4 py-3 font-medium">强平价</th>
              </tr>
            </thead>
            <tbody>
              {localData?.positions?.map((pos) => (
                <tr key={pos.coin} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-medium text-gray-200">{pos.coin}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.direction === "LONG" ? "text-green-400" : "text-red-400")}>{pos.direction === "LONG" ? "做多" : "做空"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.size(pos.size)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.entryPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.price(pos.currentPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{fmt.leverage(pos.leverage)}</td>
                  <td className={"px-4 py-3 text-right font-medium " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</td>
                  <td className={"px-4 py-3 text-right " + (pos.pnlPercent >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnlPercent(pos.pnlPercent)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{pos.liquidationPrice ? fmt.price(pos.liquidationPrice) : "-"}</td>
                </tr>
              ))}
              {(!localData?.positions || localData.positions.length === 0) && (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-gray-500">暂无持仓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
