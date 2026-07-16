import { useState, useEffect, useCallback, useRef } from "react";
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

  const notify = useCallback((msg, type) => {
    type = type || "info";
    setNotification({ msg, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    const ws = new WebSocket((window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host + "/ws");
    ws.onmessage = (event) => {
      try { const d = JSON.parse(event.data); if (d.type === "scan") setRefData(d.data); if (d.type === "copier:sync") setMyData((prev) => (prev ? { ...prev, ...d.data } : prev)); } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  useEffect(() => {
    apiFetch("/reference/scan").then(r => r.success && setRefData(r.data)).catch(() => {});
    apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {});
    apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {});
  }, []);

  const loadMyData = async () => {
    setLoading(p => ({ ...p, my: true }));
    try { const r = await apiFetch("/my/state"); if (r.success) setMyData(r.data); } catch {}
    setLoading(p => ({ ...p, my: false }));
  };

  const loadRefData = async () => {
    setLoading(p => ({ ...p, ref: true }));
    try { const r = await apiFetch("/reference/scan"); if (r.success) setRefData(r.data); } catch {}
    setLoading(p => ({ ...p, ref: false }));
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold">C</div>
            <span className="font-semibold text-base">Hyperliquid 跟单系统</span>
            {copierStatus.enabled && (
              <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full border border-green-600/30">跟单中</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs " + (walletStatus.isReady ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-yellow-900/30 text-yellow-400 border border-yellow-800")}>
              <span className={"w-1.5 h-1.5 rounded-full " + (walletStatus.isReady ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
              {walletStatus.isReady ? fmt.shortAddr(walletStatus.address) : "未连接"}
            </div>
            <a href="https://hyperscreener.asxn.xyz/profile/0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef" target="_blank" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">参考</a>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-0">
          {[
            { key: "dashboard", label: "仪表盘" },
            { key: "reference", label: "参考账户" },
            { key: "myaccount", label: "我的账户" },
            { key: "settings", label: "设置" },
          ].map((tab) => (
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
        {activeTab === "dashboard" && <Dashboard refData={refData} myData={myData} loading={refData === null} walletStatus={walletStatus} copierStatus={copierStatus} onRefreshRef={loadRefData} onRefreshMy={loadMyData} notify={notify} />}
        {activeTab === "reference" && <ReferenceAccount refData={refData} loading={loading.ref} onRefresh={loadRefData} />}
        {activeTab === "myaccount" && <MyAccount myData={myData} loading={loading.my} walletStatus={walletStatus} onRefresh={loadMyData} notify={notify} />}
        {activeTab === "settings" && <Settings walletStatus={walletStatus} copierStatus={copierStatus} onUpdate={() => { apiFetch("/wallet/status").then(r => r.success && setWalletStatus(r.data)).catch(() => {}); apiFetch("/copier/status").then(r => r.success && setCopierStatus(r)).catch(() => {}); }} notify={notify} />}
      </main>
    </div>
  );
}
