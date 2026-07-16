import { useState, useEffect, useCallback } from "react";
import { apiFetch, fmt } from "./api.js";
import Dashboard from "./Dashboard.jsx";
import ReferenceAccount from "./ReferenceAccount.jsx";
import MyAccount from "./MyAccount.jsx";
import Settings from "./Settings.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refData, setRefData] = useState(null);
  const [myData, setMyData] = useState(null);
  const [walletStatus, setWalletStatus] = useState({ isReady: false });
  const [copierStatus, setCopierStatus] = useState({ enabled: false, config: {} });
  const [loading, setLoading] = useState({ ref: false, my: false });
  const [notification, setNotification] = useState(null);
  const [isVercel, setIsVercel] = useState(true);

  const notify = useCallback((msg, type) => {
    type = type || "info";
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    apiFetch("/env").then(r => setIsVercel(r.isVercel === true)).catch(() => setIsVercel(false));
  }, []);

  useEffect(() => {
    const poll = () => apiFetch("/reference/scan").then(r => r.success && setRefData(r.data)).catch(() => {});
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const ws = new WebSocket((window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host + "/ws");
      ws.onmessage = (event) => {
        try { const d = JSON.parse(event.data); if (d.type === "scan") setRefData(d.data); } catch {}
      };
      return () => ws.close();
    } catch { return () => {}; }
  }, []);

  useEffect(() => {
    if (isVercel) return;
    apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {});
    apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {});
  }, [isVercel]);

  const loadMyData = async () => {
    if (isVercel) return;
    setLoading(p => ({ ...p, my: true }));
    try { const r = await apiFetch("/my/state"); if (r.success) setMyData(r.data); } catch {}
    setLoading(p => ({ ...p, my: false }));
  };

  const loadRefData = async () => {
    setLoading(p => ({ ...p, ref: true }));
    try { const r = await apiFetch("/reference/scan"); if (r.success) setRefData(r.data); } catch {}
    setLoading(p => ({ ...p, ref: false }));
  };

  const tabs = [{ key: "dashboard", label: "\u4eea\u8868\u76d8" }, { key: "reference", label: "\u53c2\u8003\u8d26\u6237" }];
  if (!isVercel) { tabs.push({ key: "myaccount", label: "\u6211\u7684\u8d26\u6237" }, { key: "settings", label: "\u8bbe\u7f6e" }); }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold">C</div>
            <span className="font-semibold text-base">Hyperliquid \u8ddf\u5355\u7cfb\u7edf</span>
            {copierStatus.enabled && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full border border-green-600/30">\u8ddf\u5355\u4e2d</span>}
            {isVercel && <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-600/30">\u53ea\u8bfb</span>}
          </div>
          <div className="flex items-center gap-2">
            {!isVercel && (
              <div className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs " + (walletStatus.isReady ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-yellow-900/30 text-yellow-400 border border-yellow-800")}>
                <span className={"w-1.5 h-1.5 rounded-full " + (walletStatus.isReady ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                {walletStatus.isReady ? fmt.shortAddr(walletStatus.address) : "\u672a\u8fde\u63a5"}
              </div>
            )}
            <a href="https://hyperscreener.asxn.xyz/profile/0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef" target="_blank" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">\u53c2\u8003</a>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-0">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all " + (activeTab === tab.key ? "border-green-500 text-green-400" : "border-transparent text-gray-500 hover:text-gray-300")}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {notification && (
        <div className={"fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm animate-slide-up " + (notification.type === "error" ? "bg-red-900/90 text-red-200 border border-red-700" : notification.type === "success" ? "bg-green-900/90 text-green-200 border border-green-700" : "bg-gray-800 text-gray-200 border border-gray-700")}>
          {notification.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-5">
        {activeTab === "dashboard" && <Dashboard refData={refData} myData={myData} loading={refData === null} walletStatus={walletStatus} copierStatus={copierStatus} onRefreshRef={loadRefData} onRefreshMy={loadMyData} notify={notify} isVercel={isVercel} />}
        {activeTab === "reference" && <ReferenceAccount refData={refData} loading={loading.ref} onRefresh={loadRefData} />}
        {activeTab === "myaccount" && !isVercel && <MyAccount myData={myData} loading={loading.my} walletStatus={walletStatus} onRefresh={loadMyData} notify={notify} />}
        {activeTab === "settings" && !isVercel && <Settings walletStatus={walletStatus} copierStatus={copierStatus} onUpdate={() => { apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {}); apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {}); }} notify={notify} />}
      </main>

      {isVercel && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2 text-center">
          <span className="text-xs text-gray-500">\u53ea\u8bfb\u6a21\u5f0f \u00b7 {fmt.shortAddr("0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef")} \u00b7 <a href="https://github.com/ruizicn/hyperliquid-copytrader" target="_blank" className="text-blue-400 hover:text-blue-300">GitHub</a></span>
        </div>
      )}
    </div>
  );
}