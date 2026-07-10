// lib/install-prompt.ts — PWA 安裝提示單例（Phase 17A，v4.0 B2）
// beforeinstallprompt 全域只觸發一次，且可能早於任何元件掛載——
// 在模組載入時就攔截保存，按鈕與智慧橫幅共用同一個 deferred prompt。
'use client';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function clearDeferredPrompt(): void {
  deferred = null;
}

/** 訂閱 prompt 可用性變化；回傳取消訂閱函數 */
export function onInstallPromptChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'installed';

/** 平台偵測（v4.0 B2）：已安裝（standalone）→ installed */
export function detectInstallPlatform(): InstallPlatform {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  if (isStandalone) return 'installed';
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
