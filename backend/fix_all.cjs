const fs = require("fs");
const PATH = "C:/Users/LENOVO/Documents/跟单系统/backend/src/copier.js";
let c = fs.readFileSync(PATH, "utf8");

// Full replacement of _placeOrder
const oldPlaceStart = "async _placeOrder(coin, size, price, leverage) {";
const oldPlaceEnd = '    } catch (err) {\n      console.error(`[Copier] 下单异常 ${coin}:`, err.message)\n      return { success: false, error: err.message }\n    }\n  }';

const startIdx = c.indexOf(oldPlaceStart);
const endIdx = c.indexOf(oldPlaceEnd, startIdx) + oldPlaceEnd.length;

const newPlace = `async _placeOrder(coin, size, price, leverage) {
    if (!walletManager.isReady()) throw new Error("\u94b1\u5305\u672a\u5c31\u7eea");
    if (Math.abs(size) < 0.0001) return;

    try {
      const wallet = walletManager.getWallet();
      const meta = await hyperliquidClient.getMetadata();
      const coinIndex = meta.universe.findIndex(u => u.name === coin);
      if (coinIndex === -1) throw new Error("Coin " + coin + " not found");

      const isBuy = size > 0;
      const absSize = Math.abs(size);
      const nonce = Date.now();
      const sd = meta.universe[coinIndex].szDecimals !== undefined ? meta.universe[coinIndex].szDecimals : 2;
      const sf = Math.pow(10, sd);
      let sz = Math.floor(Math.max(absSize, 10 / Math.max(price, 0.001)) * sf) / sf;
      if (sz <= 0) sz = 1 / sf;

      const action = { type: "order", orders: [{ a: coinIndex, b: isBuy, p: Math.floor(price * 100) / 100 + "", s: sz + "", r: false, t: { limit: { tif: "Gtc" } } }], grouping: "na" };

      const { encode } = await import("@msgpack/msgpack");
      const { keccak256, getBytes, TypedDataEncoder } = await import("ethers");
      const packed = encode(action);
      const nb = new Uint8Array(8);
      const nbBig = BigInt(nonce);
      for (let i = 0; i < 8; i++) nb[7 - i] = Number((nbBig >> BigInt(i * 8)) & BigInt(0xFF));
      const comb = new Uint8Array(packed.length + 9);
      comb.set(packed, 0); comb.set(nb, packed.length); comb[packed.length + 8] = 0;
      const hash = keccak256(comb);
      const domain = { name: "Exchange", version: "1", chainId: 1337, verifyingContract: "0x0000000000000000000000000000000000000000" };
      const types = { "Agent": [{ name: "source", type: "string" }, { name: "connectionId", type: "bytes32" }] };
      const msg = { source: "a", connectionId: hash };
      const encoded = TypedDataEncoder.encode(domain, types, msg);
      const digest = getBytes(keccak256(encoded));
      const sig = wallet.signingKey.sign(digest);
      const sigV = sig.v >= 27 ? sig.v - 27 : sig.v;

      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, signature: { r: sig.r, s: sig.s, v: sigV } })
      });

      if (!res.ok) { const txt = await res.text(); console.error("[Copier] \u4e0b\u5355\u5931\u8d25 " + coin + ":", txt.substring(0,200)); return { success: false, error: txt }; }
      const result = await res.json();
      const hasErr = result.status === "err" || (result.response?.data?.statuses || []).some(s => s.error);
      if (hasErr) console.error("[Copier] \u4e0b\u5355\u8fd4\u56de\u9519\u8bef " + coin + ":", JSON.stringify(result).substring(0,300));
      else console.log("[Copier] \u4e0b\u5355\u6210\u529f " + coin + ":", JSON.stringify(result).substring(0,200));
      this._notify("order", { coin, size, price, isBuy, result });
      return { success: true, data: result };
    } catch (err) {
      console.error("[Copier] \u4e0b\u5355\u5f02\u5e38 " + coin + ":", err.message);
      return { success: false, error: err.message };
    }
  }`;

c = c.substring(0, startIdx) + newPlace + c.substring(endIdx);

// Add _ensurePerpBalance and _usdTransfer before closePosition
const closePosIdx = c.indexOf("async closePosition(coin)");
const newMethods = `
  async _ensurePerpBalance(neededAmount) {
    if (!walletManager.isReady()) return false;
    const address = walletManager.getAddress();
    const state = await hyperliquidClient.getAccountState(address);
    const perpAvail = parseFloat(state.withdrawable || "0");
    if (perpAvail >= neededAmount) return true;
    const shortfall = neededAmount - perpAvail;
    if (shortfall <= 0) return true;
    const spotRes = await hyperliquidClient.getSpotState(address);
    const spotAvail = parseFloat(spotRes?.balances?.find(b => b.coin === "USDC")?.total || "0");
    if (spotAvail <= 0) return false;
    const transferAmount = Math.min(shortfall + 1, spotAvail);
    console.log("[Copier] \u4ece\u73b0\u8d27\u8f6c\u5165 " + transferAmount.toFixed(2) + " USDC");
    const result = await this._usdTransfer(transferAmount, true);
    return result.success;
  }

  async _usdTransfer(amount, toPerp) {
    try {
      const wallet = walletManager.getWallet();
      const nonce = Date.now();
      const chainId = parseInt("0x66eee");
      const action = { type: "usdClassTransfer", amount: amount.toString(), toPerp, nonce, signatureChainId: "0x66eee", hyperliquidChain: "Mainnet" };
      const domain = { name: "HyperliquidSignTransaction", version: "1", chainId, verifyingContract: "0x0000000000000000000000000000000000000000" };
      const types = { "HyperliquidTransaction:UsdClassTransfer": [{ name: "hyperliquidChain", type: "string" }, { name: "amount", type: "string" }, { name: "toPerp", type: "bool" }, { name: "nonce", type: "uint64" }] };
      const msg = { hyperliquidChain: "Mainnet", amount: amount.toString(), toPerp, nonce: BigInt(nonce) };
      const sigHex = await wallet.signTypedData(domain, types, msg);
      const clean = sigHex.replace("0x","");
      const v = parseInt(clean.substring(128,130),16);
      const sig = { r: "0x"+clean.substring(0,64), s: "0x"+clean.substring(64,128), v: v < 27 ? v+27 : v };
      const res = await fetch("https://api.hyperliquid.xyz/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, signature: sig })
      });
      if (!res.ok) { const t = await res.text(); console.error("[Copier] \u8f6c\u8d26\u5931\u8d25:", t.substring(0,200)); return { success: false, error: t }; }
      const result = await res.json();
      console.log("[Copier] \u8f6c\u8d26\u6210\u529f: " + amount + " USDC");
      this._notify("transfer", { amount, toPerp, result });
      return { success: true, data: result };
    } catch (err) {
      console.error("[Copier] \u8f6c\u8d26\u5f02\u5e38:", err.message);
      return { success: false, error: err.message };
    }
  }

  `;
c = c.substring(0, closePosIdx) + newMethods + c.substring(closePosIdx);

// Fix _syncPositions margin check
c = c.replace(
  '    const { copyRatio, maxCopyAmount } = this._config\n\n    for (const refPos of refPositions) {',
  '    const { copyRatio, maxCopyAmount } = this._config\n\n    let totalNeeded = 0;\n    for (const rp of refPositions) {\n      const cp = parseFloat(mids[rp.coin] || "0");\n      if (cp <= 0) continue;\n      const tv = Math.abs(rp.size * copyRatio) * cp;\n      if (tv >= this._config.minCopyAmount) totalNeeded += tv / rp.leverage;\n    }\n    const perpAvail = parseFloat(myState.withdrawable || "0");\n    if (perpAvail < totalNeeded) { this._ensurePerpBalance(totalNeeded).catch(() => {}); }\n\n    for (const refPos of refPositions) {'
);

fs.writeFileSync(PATH, c, 'utf8');
console.log("Done: " + PATH);
