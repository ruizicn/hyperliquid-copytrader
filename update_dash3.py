import sys, os
path = "C:/Users/LENOVO/Documents/跟单系统/frontend/src/Dashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add useState import
old_import = 'import { apiFetch, fmt } from "./api.js";'
new_import = 'import { useState } from "react";\nimport { apiFetch, fmt } from "./api.js";'
if old_import in c:
    c = c.replace(old_import, new_import)
    print("Added useState import")

# Fix the stop-loss cell - remove the broken one and re-add properly
# First find and remove the broken cell
c = c.replace('{!isVercel && (<div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">止损线</div>\n          <div className="text-xs font-semibold mt-0.5 text-gray-300">\u2460 {ddLimit}% / \u2461 {ddDaily}%</div>\n        </div>)}', '')

# Add the stop-loss cell properly before my PnL
old = '<div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">我的 PnL</div>'
new = '{!isVercel && (<div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">止损线</div>\n          <div className="text-xs font-semibold mt-0.5 text-gray-300">\ue0f0 {ddLimit}% / \ue0f1 {ddDaily}%</div>\n        </div>)}\n        <div className="py-2.5 px-2">\n          <div className="text-[10px] text-gray-500">我的 PnL</div>'
c = c.replace(old, new)

# Change grid-cols-4 to dynamic
c = c.replace('grid grid-cols-4 text-center divide-x divide-gray-800/50', 'grid text-center divide-x divide-gray-800/50 ' + ('" + (isVercel ? "grid-cols-4" : "grid-cols-5") + "'"))

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Done")
