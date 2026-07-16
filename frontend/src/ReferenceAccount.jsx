import { useState, useEffect } from "react";
import { fmt } from "./api.js";

export default function ReferenceAccount({ refData, loading, onRefresh }) {
  const [localData, setLocalData] = useState(refData);
  useEffect(() => { if (refData) setLocalData(refData); }, [refData]);

  const sum = localData?.summary;
  const spot = localData?.spot;
  const perpValue = sum?.perpAccountValue || sum?.accountValue || 0;
  const totalEquity = (spot?.totalUSDC || 0) + Math.max(perpValue, 0);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* \u8d44\u4ea7\u6982\u89c8 */}
      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">\u603b\u6743\u76ca</div>
            <div className="text-lg font-semibold text-blue-400">{fmt.usd(totalEquity)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">\u73b0\u8d27\u4f59\u989d</div>
            <div className="text-lg font-semibold text-gray-100">{fmt.usd(spot?.totalUSDC || 0)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">\u6c38\u7eed\u5408\u7ea6\u51c0\u503c</div>
            <div className="text-lg font-semibold text-gray-100">{fmt.usd(perpValue)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">\u603b\u76c8\u4e8f</div>
            <div className={"text-lg font-semibold " + (sum.totalPnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(sum.totalPnl)}</div>
            {sum.totalReturnRate !== undefined && <div className={"text-xs " + (sum.totalReturnRate >= 0 ? "text-green-400" : "text-red-400")}>({sum.totalReturnRate >= 0 ? "+" : ""}{sum.totalReturnRate}%)</div>}
          </div>
        </div>
      )}

      {/* \u6301\u4ed3\u5217\u8868 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">\u6301\u4ed3 {localData?.summary?.positionCount ? "(" + localData.summary.positionCount + ")" : ""}</h3>
          <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-300">{loading ? "\u626b\u63cf\u4e2d..." : "\u5237\u65b0"}</button>
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
              </tr>
            </thead>
            <tbody>
              {localData?.positions?.map((pos) => (
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
                </tr>
              ))}
              {(!localData?.positions || localData.positions.length === 0) && (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-gray-500">\u6682\u65e0\u6301\u4ed3</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}