'use client';
// components/mobile/OfflineBadge.tsx — 離線模式指示（Phase 11B，v2.0 C2 / v7.0 C5）
// 顯示時機：瀏覽器離線，或資料實際來自離線包（fetch 失敗回退）。
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/map-store';

export function OfflineBadge() {
  const usingOfflineData = useMapStore((s) => s.usingOfflineData);
  const [browserOffline, setBrowserOffline] = useState(false);

  useEffect(() => {
    const update = () => setBrowserOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!usingOfflineData && !browserOffline) return null;

  return (
    <p
      role="status"
      className="absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-4 py-1.5 text-sm font-bold text-white shadow"
    >
      📡 離線模式 — 顯示已下載資料 Offline data
    </p>
  );
}
