import sys, os

path = "C:/Users/LENOVO/Documents/跟单系统/frontend/src/Dashboard.jsx"

content = r"""import { apiFetch, fmt } from "./api.js";

// ---- 资产总览 ----
function OverviewBar({ refData, myData, isVercel }) {
  const r = refData?.summary;
  const rs = refData?.spot;
  const rTotal = (rs?.totalUSDC || 0) + Math.max(r?.accountValue || 0, 0);
  const m = myData?.summary;
  const ms = myData?.spot;
  const mTotal = (ms?.totalUSDC || 0) + Math.max(m?.perpAccountValue || m?.accountValue || 0, 0);
  const mPerp = m?.perpAccountValue || m?.accountValue || 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-900 rounded-lg border border-gray-800 px-3.5 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500 font-medium">参考账户</span>
          <span className="text-[10px] text-gray-600 font-mono">{fmt.shortAddr("0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef")}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-blue-400">{fmt.usd(rTotal)}</span>
          {r?.totalReturnRate !== undefined && (
            <span className={"text-[11px] font-semibold " + (r.totalReturnRate >= 0 ? "text-green-400" : "text-red-400")}>
              {(r.totalReturnRate >= 0 ? "+" : "") + r.totalReturnRate + "%"}
            </span>
          )}
        </div>
        <div className="flex gap-2.5 text-[11px] text-gray-500 mt-0.5">
          <span>现货<span className="text-gray-300 ml-0.5">{fmt.usd(rs?.totalUSDC || 0)}</span></span>
          <span>永续<span className="text-gray-300 ml-0.5">{fmt.usd(r?.accountValue || 0)}</span></span>
          <span>持仓<span className="text-gray-300 ml-0.5">{r?.positionCount || 0}</span></span>
        </div>
      </div>

      {isVercel ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 px-3.5 py-3 flex items-center justify-center text-xs text-gray-600">
          本地启动后显示我的账户
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 px-3.5 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 font-medium">我的账户</span>
            <span className="text-[10px] text-gray-600 font-mono">{fmt.shortAddr(myData?.address)}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-green-400">{fmt.usd(mTotal)}</span>
            {myData?.portfolio?.copyReturnRate !== undefined && myData.portfolio.copyReturnRate !== 0 && (
              <span className={"text-[11px] font-semibold " + (myData.portfolio.copyReturnRate >= 0 ? "text-green-400" : "text-red-400")}>
                {(myData.portfolio.copyReturnRate >= 0 ? "+" : "") + myData.portfolio.copyReturnRate + "%"}
              </span>
            )}
          </div>
          <div className="flex gap-2.5 text-[11px] text-gray-500 mt-0.5">
            <span>现货<span className="text-gray-300 ml-0.5">{fmt.usd(ms?.totalUSDC || 0)}</span></span>
            <span>永续<span className="text-gray-300 ml-0.5">{fmt.usd(mPerp)}</span></span>
            <span>持仓<span className="text-gray-300 ml-0.5">{m?.positionCount || 0}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 控制+收益合并条 ----
function ControlStrip({ copierStatus, notify, refData, myData, onRefreshMy, isVercel }) {
  const toggle = async () => {
    try {
      const ep = copierStatus.enabled ? "/copier/stop" : "/copier/start";
      const res = await apiFetch(ep, { method: "POST" });
      if (res.success) notify(copierStatus.enabled ? "已停止跟单" : "已启动跟单", "success");
    } catch (err) { notify(err.message, "error"); }
  };
  const closeAll = async () => {
    try { const res = await apiFetch("/copier/close-all", { method: "POST" }); if (res.success) notify("已全部平仓", "success"); } catch (err) { notify(err.message, "error"); }
  };

  const refPnl = refData?.summary?.totalPnl || 0;
  const refRate = refData?.summary?.totalReturnRate;
  const myPnl = myData?.summary?.totalPnl || 0;
  const myRate = myData?.portfolio?.copyReturnRate;
  const refC = refData?.positions?.length || 0;
  const myC = myData?.positions?.length || 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* 控制行 */}
      {!isVercel && (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className={"w-2 h-2 rounded-full " + (copierStatus.enabled ? "bg-green-400 animate-pulse" : "bg-gray-600")} />
            <span className={"text-xs font-medium " + (copierStatus.enabled ? "text-green-400" : "text-gray-500")}>
              {copierStatus.enabled ? "运行中" : "已停止"}
            </span>
            <span className="text-[11px] text-gray-500">{(copierStatus.config?.copyRatio || 0) * 100}% {"\u00b7"} ${copierStatus.config?.minCopyAmount}~${copierStatus.config?.maxCopyAmount}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={toggle} className={"px-3 py-1 text-[11px] font-medium rounded border transition-colors " + (copierStatus.enabled
              ? "bg-red-600/15 text-red-400 border-red-600/25 hover:bg-red-600/25"
              : "bg-green-600/15 text-green-400 border-green-600/25 hover:bg-green-600/25")}>
              {copierStatus.enabled ? "停止" : "启动"}
            </button>
            <button onClick={closeAll} disabled={!copierStatus.enabled} className="px-3 py-1 text-[11px] font-medium bg-red-600/15 text-red-400 rounded border border-red-600/25 hover:bg-red-600/25 disabled:opacity-30">
              全平
            </button>
            <button onClick={onRefreshMy} className="px-3 py-1 text-[11px] font-medium bg-gray-800 text-gray-400 rounded border border-gray-700 hover:text-gray-300">
              刷新
            </button>
          </div>
        </div>
      )}

      {/* 4格收益 */}
      <div className="grid grid-cols-4 text-center divide-x divide-gray-800/50">
        <div className="py-2.5 px-2">
          <div className="text-[10px] text-gray-500">参考 PnL</div>
          <div className={"text-xs font-semibold mt-0.5 " + (refPnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(refPnl)}</div>
        </div>
        <div className="py-2.5 px-2">
          <div className="text-[10px] text-gray-500">参考 ROE</div>
          <div className={"text-xs font-semibold mt-0.5 " + ((refRate || 0) >= 0 ? "text-green-400" : "text-red-400")}>
            {refRate !== undefined ? (refRate >= 0 ? "+" : "") + refRate + "%" : "-"}
          </div>
        </div>
        {!isVercel && (
          <>
            <div className="py-2.5 px-2">
              <div className="text-[10px] text-gray-500">我的 PnL</div>
              <div className={"text-xs font-semibold mt-0.5 " + (myPnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(myPnl)}</div>
            </div>
            <div className="py-2.5 px-2">
              <div className="text-[10px] text-gray-500">跟单 ROE</div>
              <div className={"text-xs font-semibold mt-0.5 " + ((myRate || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                {myRate !== undefined && myRate !== 0 ? (myRate >= 0 ? "+" : "") + myRate + "%" : "-"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 跟单进度 */}
      {!isVercel && refC > 0 && (
        <div className="border-t border-gray-800/50 px-3.5 py-1.5 text-[10px] text-gray-600 flex items-center justify-between">
          <span>跟单进度: <span className="text-gray-400">{myC}/{refC}</span></span>
          {myC > 0 && myC < refC && <span className="text-yellow-600">部分资金不足</span>}
          {myC === refC && <span className="text-green-400">全部同步</span>}
        </div>
      )}
    </div>
  );
}

// ---- 持仓表 ----
function PositionTable({ title, data, myData, isMy, emptyText, onClose }) {
  const positions = data?.positions || [];
  const sum = data?.summary;

  if (positions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
        <div className="text-xs text-gray-600">{emptyText || "暂无数据"}</div>
      </div>
    );
  }

  const accent = isMy ? "border-green-900/30" : "border-blue-900/30";

  return (
    <div className={"bg-gray-900 rounded-lg border " + accent + " overflow-hidden"}>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className={"w-1.5 h-1.5 rounded-full " + (isMy ? "bg-green-500" : "bg-blue-500")} />
          <span className="text-xs font-semibold text-gray-200">{title}</span>
          <span className="text-[11px] text-gray-600">({positions.length})</span>
        </div>
        <span className="text-[11px] text-gray-600">
          总 PnL <span className={"font-semibold " + ((sum?.totalPnl || 0) >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(sum?.totalPnl || 0)}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-600 border-b border-gray-800/30">
              <th className="text-left px-3.5 py-2 font-medium">币种</th>
              <th className="text-right px-2.5 py-2 font-medium">方向</th>
              <th className="text-right px-2.5 py-2 font-medium">量</th>
              <th className="text-right px-2.5 py-2 font-medium hidden sm:table-cell">开仓价</th>
              <th className="text-right px-2.5 py-2 font-medium hidden sm:table-cell">Mark</th>
              <th className="text-right px-2.5 py-2 font-medium">杠杆</th>
              <th className="text-right px-2.5 py-2 font-medium">PnL</th>
              <th className="text-right px-2.5 py-2 font-medium">ROE</th>
              {!isMy && <th className="text-right px-2.5 py-2 font-medium">跟单</th>}
              {isMy && <th className="text-right px-2.5 py-2 font-medium">操作</th>}
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => {
              const myPos = !isMy ? myData?.positions?.find(p => p.coin === pos.coin) : null;
              const copied = !isMy && myPos && Math.abs(myPos.size) > 0;
              const roe = pos.returnOnEquity || (pos.pnlPercent !== undefined ? (pos.pnlPercent >= 0 ? "+" : "") + pos.pnlPercent.toFixed(2) + "%" : "-");
              return (
                <tr key={pos.coin} className="border-b border-gray-800/15 hover:bg-gray-800/20 transition-colors">
                  <td className="px-3.5 py-2.5 font-semibold text-gray-200">{pos.coin}</td>
                  <td className={"px-2.5 py-2.5 text-right font-semibold " + (pos.direction === "LONG" ? "text-green-400" : "text-red-400")}>{pos.direction === "LONG" ? "多" : "空"}</td>
                  <td className="px-2.5 py-2.5 text-right text-gray-300 font-medium">{fmt.size(pos.size)}</td>
                  <td className="px-2.5 py-2.5 text-right text-gray-300 hidden sm:table-cell">{fmt.price(pos.entryPrice)}</td>
                  <td className="px-2.5 py-2.5 text-right text-gray-300 hidden sm:table-cell">{fmt.price(pos.currentPrice)}</td>
                  <td className="px-2.5 py-2.5 text-right text-gray-400">{fmt.leverage(pos.leverage)}</td>
                  <td className={"px-2.5 py-2.5 text-right font-semibold " + (pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>{fmt.pnl(pos.pnl)}</td>
                  <td className={"px-2.5 py-2.5 text-right font-semibold " + (roe >= "0%" ? "text-green-400" : "text-red-400")}>{roe}</td>
                  {!isMy && (
                    <td className="px-2.5 py-2.5 text-right">
                      {copied
                        ? <span className="text-[11px] text-green-400 font-medium">{fmt.size(myPos.size)}</span>
                        : <span className="text-gray-700">-</span>
                      }
                    </td>
                  )}
                  {isMy && (
                    <td className="px-2.5 py-2.5 text-right">
                      <button
                        onClick={() => onClose?.(pos.coin)}
                        className="text-[11px] text-red-400 bg-red-600/15 hover:bg-red-600/25 px-2.5 py-1 rounded border border-red-600/25 font-medium transition-colors"
                      >平仓</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- 主视图 ----
export default function Dashboard({ refData, myData, walletStatus, copierStatus, onRefreshRef, onRefreshMy, notify, isVercel }) {

  const closePosition = async (coin) => {
    try {
      const res = await apiFetch("/copier/close-position", { method: "POST", body: JSON.stringify({ coin }) });
      if (res.success) { notify(coin + " 已平仓", "success"); onRefreshMy(); }
      else notify(res.error || "平仓失败", "error");
    } catch (err) { notify(err.message, "error"); }
  };

  const spotAlert = walletStatus.isReady && (myData?.spot?.totalUSDC || 0) > 0 && (myData?.summary?.perpAccountValue || myData?.summary?.accountValue || 0) === 0;

  return (
    <div className="space-y-2.5 animate-slide-up">

      <OverviewBar refData={refData} myData={myData} isVercel={isVercel} />

      {spotAlert && (
        <div className="flex items-center gap-2 bg-yellow-900/15 border border-yellow-800/25 rounded-lg px-3.5 py-2 text-[11px] text-yellow-500">
          <span>资金提醒</span>
          <span>现货 <strong className="text-yellow-400">{fmt.usd(myData?.spot?.totalUSDC)}</strong> 尚未转入永续合约</span>
          <button onClick={async () => {
            try {
              const res = await apiFetch("/transfer/spot-to-perp", { method: "POST", body: JSON.stringify({ amount: myData?.spot?.totalUSDC }) });
              if (res.success) { notify("转账成功", "success"); onRefreshMy(); }
              else notify(res.error || "转账失败", "error");
            } catch (err) { notify(err.message, "error"); }
          }} className="ml-auto px-2.5 py-1 bg-yellow-600/15 text-yellow-400 rounded border border-yellow-600/25 hover:bg-yellow-600/25 text-[11px]">立即转入</button>
        </div>
      )}

      <ControlStrip copierStatus={copierStatus} notify={notify}
        refData={refData} myData={myData}
        onRefreshMy={onRefreshMy} isVercel={isVercel} />

      <PositionTable title="参考账户持仓" data={refData} myData={myData} isMy={false} emptyText="参考账户暂无持仓" />

      {!isVercel && (
        <PositionTable title="我的持仓" data={myData} myData={myData} isMy={true}
          emptyText="暂无持仓，启动跟单后自动同步"
          onClose={closePosition} />
      )}

      {isVercel && (
        <div className="text-center text-[11px] text-gray-700 py-4">
          启动本地跟单机器人后可查看完整信息
        </div>
      )}
    </div>
  );
}
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Written successfully, length:", len(content))
