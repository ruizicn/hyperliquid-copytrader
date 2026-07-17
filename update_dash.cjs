const fs = require("fs");
const path = "C:/Users/LENOVO/Documents/跟单系统/frontend/src/Dashboard.jsx";
let c = fs.readFileSync(path, "utf8");
c = c.replace(
  'import { apiFetch, fmt } from "./api.js";',
  'import { useState } from "react";\nimport { apiFetch, fmt } from "./api.js";'
);
c = c.replace(
  "const refPnl = refData?.summary?.totalPnl || 0;",
  "const [ddPct, setDdPct] = useState(0);\nconst refPnl = refData?.summary?.totalPnl || 0;"
);
c = c.replace(
  "const refC = refData?.positions?.length || 0;",
  'const refC = refData?.positions?.length || 0;\nconst ddLimit = copierStatus.config?.maxDrawdownPercent || 15;\nconst ddDaily = copierStatus.config?.maxDailyLossPercent || 8;'
);
c = c.replace(
  'className="grid grid-cols-4 text-center divide-x divide-gray-800/50"',
  'className={"grid text-center divide-x divide-gray-800/50 " + (isVercel ? "grid-cols-4" : "grid-cols-5")}'
);
c = c.replace(
  "        </div>\n        {!isVercel && (\n          <>\n            <div className=\"py-2.5 px-2\">\n              <div className=\"text-[10px] text-gray-500\">\u6211\u7684 PnL</div>",
  "        </div>\n        {!isVercel && (\n          <>\n            <div className=\"py-2.5 px-2\">\n              <div className=\"text-[10px] text-gray-500\">\u6b62\u635f\u7ebf</div>\n              <div className=\"text-xs font-semibold mt-0.5 text-gray-300\">\u2460 {ddLimit}% / \u2461 {ddDaily}%</div>\n            </div>\n            <div className=\"py-2.5 px-2\">\n              <div className=\"text-[10px] text-gray-500\">\u6211\u7684 PnL</div>"
);
fs.writeFileSync(path, c, "utf8");
console.log("Dashboard updated with stop-loss UI");
