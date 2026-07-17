const fs = require("fs");
const PATH = "C:/Users/LENOVO/Documents/跟单系统/backend/src/copier.js";
let c = fs.readFileSync(PATH, "utf8");

// Fix 1: 金额上限裁切 - change const to let and assign back
c = c.replace(
  "const targetSize = refPos.size * copyRatio // \u6309\u6bd4\u4f8b\u7f29\u653e",
  "let targetSize = refPos.size * copyRatio"
);

// Fix 2: targetValue exceeding - replace the dead-code block
const deadBlock = [
  '      if (targetValue > maxCopyAmount) {',
  '        // \u6309\u6700\u5927\u91d1\u989d\u8c03\u6574\u6570\u91cf',
  '        const adjustedSize = (targetSize > 0 ? 1 : -1) * (maxCopyAmount / currentPrice)',
  '        // \u8fd9\u91cc\u7b80\u5316\u4e3a\u8bb0\u5f55\u65e5\u5fd7',
  '        console.log(`[Copier] ${coin}: \u76ee\u6807\u91d1\u989d ${targetValue.toFixed(2)} \u8d85\u8fc7\u6700\u5927\u9650\u5236 ${maxCopyAmount}\uff0c\u5df2\u8c03\u6574`)',
  '      }'
].join("\n");

const fixedBlock = [
  '      if (targetValue > maxCopyAmount) {',
  '        targetSize = (targetSize > 0 ? 1 : -1) * (maxCopyAmount / currentPrice)',
  '        targetValue = maxCopyAmount',
  '        console.log("[Copier] " + coin + ": target $" + targetValue.toFixed(2) + " capped to $" + maxCopyAmount)',
  '      }'
].join("\n");

c = c.replace(deadBlock, fixedBlock);

// Fix 3: 转账等待
c = c.replace(
  "if (perpAvail < totalNeeded) { this._ensurePerpBalance(totalNeeded).catch(() => {}); }",
  "if (perpAvail < totalNeeded) { await this._ensurePerpBalance(totalNeeded); }"
);

// Fix 4: 动态 import 改为顶部静态
c = c.replace(
  'import { accountScanner } from "./scanner.js"',
  'import { accountScanner } from "./scanner.js"\nimport { encode as msgpackEncode } from "@msgpack/msgpack"\nimport { keccak256, getBytes, TypedDataEncoder } from "ethers"'
);

// Fix 5: 移除 _placeOrder 中的动态 import
c = c.replace(
  'const { encode } = await import("@msgpack/msgpack");\n      const { keccak256, getBytes, TypedDataEncoder } = await import("ethers");\n      const packed = encode(action);',
  'const packed = msgpackEncode(action);'
);

// Fix 6: 价格精度改进
c = c.replace(
  'p: Math.floor(price * 100) / 100 + ""',
  'p: parseFloat(price.toFixed(6)).toString()'
);

fs.writeFileSync(PATH, c, "utf8");
console.log("All fixes applied");
