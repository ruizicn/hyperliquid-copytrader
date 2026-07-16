import { useState, useEffect } from "react";
import { apiFetch, fmt } from "./api.js";

export default function Settings({ walletStatus, copierStatus, onUpdate, notify }) {
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
    if (!privateKey || !password) { notify("请填写私钥和密码", "error"); return; }
    try {
      const res = await apiFetch("/wallet/set-key", { method: "POST", body: JSON.stringify({ privateKey: privateKey.trim(), password }) });
      if (res.success) { notify("钱包已连接: " + fmt.shortAddr(res.data.address), "success"); setPrivateKey(""); setPassword(""); onUpdate(); }
      else notify(res.error || "连接失败", "error");
    } catch (err) { notify(err.message, "error"); }
  };
  const disconnectWallet = async () => {
    try { await apiFetch("/wallet/clear", { method: "POST" }); notify("钱包已断开", "info"); onUpdate(); } catch {}
  };
  const saveConfig = async () => {
    try {
      const res = await apiFetch("/copier/config", { method: "POST", body: JSON.stringify({ copyRatio: copyRatio / 100, minCopyAmount: minAmount, maxCopyAmount: maxAmount }) });
      if (res.success) { notify("配置已保存", "success"); onUpdate(); }
    } catch (err) { notify(err.message, "error"); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-200">钱包配置</h3>
          {walletStatus.isReady && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full border border-green-700/50">已连接</span>}
        </div>
        {walletStatus.isReady ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-400">地址</span>
              <span className="text-sm text-gray-200 font-mono">{walletStatus.address}</span>
            </div>
            <button onClick={disconnectWallet} className="w-full px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 border border-red-600/30">断开钱包</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg text-xs text-yellow-400">
              私钥仅保存在本地内存中，用于签名交易。建议使用单独的跟单钱包。
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">私钥 (0x开头 64位hex)</label>
              <input type="password" value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="0x..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">加密密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="设置密码用于加密存储" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600" />
            </div>
            <button onClick={connectWallet} disabled={!privateKey || !password} className="w-full px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">连接钱包</button>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-base font-medium text-gray-200 mb-4">跟单参数</h3>
        <div className="space-y-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">跟单比例: {copyRatio}%</label>
            <input type="range" min="1" max="100" value={copyRatio} onChange={e => setCopyRatio(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>1%</span><span>50%</span><span>100%</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">最小跟单金额 (USD)</label>
              <input type="number" value={minAmount} onChange={e => setMinAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">最大跟单金额 (USD)</label>
              <input type="number" value={maxAmount} onChange={e => setMaxAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
            </div>
          </div>
          <button onClick={saveConfig} className="w-full px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 border border-green-600/30">保存配置</button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-base font-medium text-gray-200 mb-4">系统信息</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">参考账户</span>
            <span className="text-gray-300 font-mono text-xs">{fmt.shortAddr("0x3Db8f7bC6D744bEAE458207C85F46B5d0349e5ef")}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">扫描间隔</span><span className="text-gray-300">5 秒</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">跟单引擎</span>
            <span className={copierStatus.enabled ? "text-green-400" : "text-gray-500"}>{copierStatus.enabled ? "运行中" : "已停止"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">钱包状态</span>
            <span className={walletStatus.isReady ? "text-green-400" : "text-yellow-400"}>{walletStatus.isReady ? "已连接" : "未连接"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">API 端点</span>
            <span className="text-gray-500 text-xs">api.hyperliquid.xyz</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-amber-900/30 p-5">
        <h3 className="text-sm font-medium text-amber-400 mb-2">安全提示</h3>
        <ul className="space-y-2 text-xs text-amber-300/70">
          <li>建议使用独立的交易钱包</li>
          <li>私钥仅解密用于签名，不上传任何服务器</li>
          <li>请设置强密码加密存储私钥</li>
          <li>跟单交易存在风险，请自行评估</li>
        </ul>
      </div>
    </div>
  );
}
