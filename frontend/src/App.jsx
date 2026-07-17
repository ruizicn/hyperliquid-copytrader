import { useState, useEffect, useCallback } from "react";
import { apiFetch, fmt } from "./api.js";
import Dashboard from "./Dashboard.jsx";
import Settings from "./Settings.jsx";

const REF_ADDR = "0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef";

export default function App() {
  const [refData, setRefData] = useState(null);
  const [myData, setMyData] = useState(null);
  const [walletStatus, setWalletStatus] = useState({ isReady: false });
  const [copierStatus, setCopierStatus] = useState({ enabled: false, config: {} });
  const [notification, setNotification] = useState(null);
  const [isVercel, setIsVercel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const notify = useCallback((msg, type) => {
    type = type || "info";
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    apiFetch("/env").then(r => setIsVercel(r.isVercel === true)).catch(() => setIsVercel(false));
  }, []);

  const loadAll = useCallback(() => {
    apiFetch("/reference/scan").then(r => r.success && setRefData(r.data)).catch(() => {});
    if (!isVercel) {
      apiFetch("/my/state").then(r => r.success && setMyData(r.data)).catch(() => {});
      apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {});
      apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {});
    }
  }, [isVercel]);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 8000); return () => clearInterval(id); }, [loadAll]);

  const myPosCount = myData?.positions?.length || 0;
  const refPosCount = refData?.positions?.length || 0;

  if (showSettings) {
    return <Settings walletStatus={walletStatus} copierStatus={copierStatus}
      onUpdate={() => { apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {});
      apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {}); }}
      notify={notify} onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 顶部状态栏 */}
      <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-green-900/30">C</div>
            <span className="text-sm font-semibold text-gray-100">\u8ddf\u5355\u7cfb\u7edf</span>
            {refPosCount > 0 && <span className="hidden sm:inline text-[11px] text-gray-500">\u53c2\u8003 {refPosCount} \u6301\u4ed3</span>}
            {!isVercel && myPosCount > 0 && <span className="hidden sm:inline text-[11px] text-gray-500">\u2022 \u5df2\u8ddf {myPosCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            {!isVercel && (
              <div className={"flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] " + (walletStatus.isReady ? "bg-green-900/25 text-green-400 border border-green-800/40" : "bg-yellow-900/25 text-yellow-400 border border-yellow-800/40")}>
                <span className={"w-1.5 h-1.5 rounded-full " + (walletStatus.isReady ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                {walletStatus.isReady ? fmt.shortAddr(walletStatus.address) : "\u672a\u8fde\u63a5"}
              </div>
            )}
            <button onClick={() => setShowSettings(true)} className="text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors">
              \u2699
            </button>
            <a href="https://app.hyperliquid.xyz" target="_blank" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors px-1">HL</a>
          </div>
        </div>
      </header>

      {/* 通知 */}
      {notification && (
        <div className={"fixed top-14 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs animate-slide-up border " + (notification.type === "error" ? "bg-red-900/90 text-red-200 border-red-700" : notification.type === "success" ? "bg-green-900/90 text-green-200 border-green-700" : "bg-gray-800 text-gray-200 border-gray-700")}>
          {notification.msg}
        </div>
      )}

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Dashboard refData={refData} myData={myData}
          walletStatus={walletStatus} copierStatus={copierStatus}
          onRefreshRef={loadAll} onRefreshMy={loadAll}
          notify={notify} isVercel={isVercel} />
      </main>

      {/* Vercel 底部条 */}
      {isVercel && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur border-t border-gray-800 px-4 py-2.5 text-center text-[11px] text-gray-600">
          \u53ea\u8bfb\u6a21\u5f0f \u00b7 {fmt.shortAddr(REF_ADDR)} \u00b7 <a href="https://github.com/ruizicn/hyperliquid-copytrader" target="_blank" className="text-blue-500 hover:text-blue-400">GitHub</a> \u00b7 <a href="https://frontend-chi-three-72.vercel.app" className="text-blue-500 hover:text-blue-400">Vercel</a>
        </div>
      )}
    </div>
  );
}