'use client';
// components/ui/DevSwCleanup.tsx — 開發模式 SW 清除（Phase 17A 防呆）
// 情境：本機跑過 production（SW 註冊 scope=/）後回到 dev，
// 舊 SW 會把 production 快取餵給 dev 頁面造成 hydration 崩潰（2026-07-10 實測）。
// dev 自動解除註冊＋清快取；production build 時 NODE_ENV 內聯為 'production'，整段為 no-op。
import { useEffect } from 'react';

export function DevSwCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
    }
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        keys.forEach((k) => void caches.delete(k));
      });
    }
  }, []);
  return null;
}
