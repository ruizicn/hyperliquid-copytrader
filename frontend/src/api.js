import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

export async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.substring(0, 200));
  }
  return res.json();
}

export const fmt = {
  usd: (v) => '$' + (v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  price: (v) => {
    if (!v || v === 0) return '-';
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (abs >= 1) return v.toFixed(4);
    if (abs >= 0.001) return v.toFixed(6);
    return v.toFixed(8);
  },
  size: (v) => {
    if (!v || v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (abs >= 1) return v.toFixed(2);
    return v.toFixed(4);
  },
  pnl: (v) => { const s = v >= 0 ? '+' : ''; return s + fmt.usd(v); },
  pnlPercent: (v) => {
    if (v === undefined || v === null) return '-';
    const s = v >= 0 ? '+' : '';
    return s + v.toFixed(2) + '%';
  },
  leverage: (v) => v + 'x',
  time: (ts) => { const d = new Date(ts); return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); },
  shortAddr: (addr) => addr ? addr.substring(0, 6) + '...' + addr.substring(addr.length - 4) : '-',
};