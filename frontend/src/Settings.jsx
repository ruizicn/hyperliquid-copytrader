import { useState, useEffect } from "react";
import { apiFetch, fmt } from "./api.js";

export default function Settings({ walletStatus, copierStatus, onUpdate, notify, onBack }) {
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [copyRatio, setCopyRatio] = useState(10);
  const [minAmount, setMinAmount] = useState(10);
  const [maxAmount, setMaxAmount] = useState(500);

  useEffect(() => {
    if (copierStatus.config) {
      setCopyRatio((copierStatus.config.copyRatio || 0.1) * 100);
      setMinAmount(copierStatus.config.minCopyAmount || 10);
      setMaxAmount(copierStatus.config.maxCopyAmount || 500);
    }
  }, [copierStatus.config]);

  const connectWallet = async () => {
    if (!privateKey || !password) { notify("\u8bf7\u586b\u5199\u79c1\u94a5\u548c\u5bc6\u7801", "error"); return; }
    try {
      const res = await apiFetch("/wallet/set-key", { method: "POST", body: JSON.stringify({ privateKey: privateKey.trim(), password }) });
      if (res.success) { notify("\u94b1\u5305\u5df2\u8fde\u63a5: " + fmt.shortAddr(res.data.address), "success"); setPrivateKey(""); setPassword(""); onUpdate(); }
      else notify(res.error || "\u8fde\u63a5\u5931\u8d25", "error");
    } catch (err) { notify(err.message, "error"); }
  };
  const disconnectWallet = async () => {
    try { await apiFetch("/wallet/clear", { method: "POST" }); notify("\u94b1\u5305\u5df2\u65ad\u5f00", "info"); onUpdate(); } catch {}
  };
  const saveConfig = async () => {
    try {
      const res = await apiFetch("/copier/config", { method: "POST", body: JSON.stringify({ copyRatio: copyRatio / 100, minCopyAmount: minAmount, maxCopyAmount: maxAmount }) });
      if (res.success) { notify("\u914d\u7f6e\u5df2\u4fdd\u5b58", "success"); onUpdate(); }
    } catch (err) { notify(err.message, "error"); }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-lg">\u2190</button>
          <span className="font-semibold text-sm">\u8bbe\u7f6e</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-200">\u94b1\u5305\u914d\u7f6e</h3>
            {walletStatus.isReady && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full border border-green-700/50">\u5df2\u8fde\u63a5</span>}
          </div>
          {walletStatus.isReady ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-400">\u5730\u5740</span>
                <span className="text-sm text-gray-200 font-mono">{walletStatus.address}</span>
              </div>
              <button onClick={disconnectWallet} className="w-full px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 border border-red-600/30">\u65ad\u5f00\u94b1\u5305</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg text-xs text-yellow-400">
                \u79c1\u94a5\u4ec5\u4fdd\u5b58\u5728\u672c\u5730\u5185\u5b58\u4e2d\uff0c\u7528\u4e8e\u7b7e\u540d\u4ea4\u6613\u3002\u5efa\u8bae\u4f7f\u7528\u5355\u72ec\u7684\u8ddf\u5355\u94b1\u5305\u3002
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">\u79c1\u94a5 (0x\u5f00\u5934 64\u4f4dhex)</label>
                <input type="password" value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="0x..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">\u52a0\u5bc6\u5bc6\u7801</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="\u8bbe\u7f6e\u5bc6\u7801\u7528\u4e8e\u52a0\u5bc6\u5b58\u50a8" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600" />
              </div>
              <button onClick={connectWallet} disabled={!privateKey || !password} className="w-full px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">\u8fde\u63a5\u94b1\u5305</button>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-4">\u8ddf\u5355\u53c2\u6570</h3>
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">\u8ddf\u5355\u6bd4\u4f8b: {copyRatio}%</label>
              <input type="range" min="1" max="100" value={copyRatio} onChange={e => setCopyRatio(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
              <div className="flex justify-between text-xs text-gray-600 mt-1"><span>1%</span><span>50%</span><span>100%</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">\u6700\u5c0f\u8ddf\u5355\u91d1\u989d (USD)</label>
                <input type="number" value={minAmount} onChange={e => setMinAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">\u6700\u5927\u8ddf\u5355\u91d1\u989d (USD)</label>
                <input type="number" value={maxAmount} onChange={e => setMaxAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
              </div>
            </div>
            <button onClick={saveConfig} className="w-full px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 border border-green-600/30">\u4fdd\u5b58\u914d\u7f6e</button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-4">\u7cfb\u7edf\u4fe1\u606f</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">\u53c2\u8003\u8d26\u6237</span>
              <span className="text-gray-300 font-mono text-xs">{fmt.shortAddr("0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef")}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">\u626b\u63cf\u95f4\u9694</span><span className="text-gray-300">8 \u79d2</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-800">
              <span className="text-gray-500">\u8ddf\u5355\u5f15\u64ce</span>
              <span className={copierStatus.enabled ? "text-green-400" : "text-gray-500"}>{copierStatus.enabled ? "\u8fd0\u884c\u4e2d" : "\u5df2\u505c\u6b62"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">API \u7aef\u70b9</span>
              <span className="text-gray-500 text-xs">api.hyperliquid.xyz</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-amber-900/30 p-5">
          <h3 className="text-sm font-medium text-amber-400 mb-2">\u5b89\u5168\u63d0\u793a</h3>
          <ul className="space-y-1 text-xs text-amber-300/70">
            <li>\u2022 \u5efa\u8bae\u4f7f\u7528\u72ec\u7acb\u7684\u4ea4\u6613\u94b1\u5305</li>
            <li>\u2022 \u79c1\u94a5\u4ec5\u89e3\u5bc6\u7528\u4e8e\u7b7e\u540d\uff0c\u4e0d\u4e0a\u4f20\u670d\u52a1\u5668</li>
            <li>\u2022 \u8ddf\u5355\u4ea4\u6613\u5b58\u5728\u98ce\u9669</li>
          </ul>
        </div>
      </main>
    </div>
  );
}