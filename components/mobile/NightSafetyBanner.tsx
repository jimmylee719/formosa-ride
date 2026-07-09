'use client';
// components/mobile/NightSafetyBanner.tsx — 夜間安全橫幅（Phase 7B，v3.0 C3）
// 深藍底、白字；三個快捷鈕直接套用 POI 篩選。可關閉。
// Phase 8C 通知優先順序佇列建立後，此橫幅將納入佇列管理。
import { useState } from 'react';
import { useMapStore } from '@/store/map-store';

export function NightSafetyBanner() {
  const isNightMode = useMapStore((s) => s.isNightMode);
  const setActiveTypes = useMapStore((s) => s.setActiveTypes);
  const [dismissed, setDismissed] = useState(false);

  if (!isNightMode || dismissed) return null;

  const quick = (types: Parameters<typeof setActiveTypes>[0], _label: string) => {
    setActiveTypes(types);
    setDismissed(true); // 選了目標就收起橫幅，讓地圖露出來
  };

  return (
    <div
      role="alert"
      className="absolute inset-x-3 top-3 z-20 rounded-2xl bg-navy p-4 text-white shadow-lg"
    >
      <div className="flex items-start justify-between">
        <p className="alert-warning">🌙 現在是晚上 Now is Night Time</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="關閉 Close"
          className="tap-target -mr-2 -mt-2 text-xl text-white/80"
        >
          ✕
        </button>
      </div>
      <ul className="info-secondary mt-1 space-y-0.5 text-white/90">
        <li>✓ 打開腳踏車前燈後燈 Turn on your lights</li>
        <li>✓ 不要走山路，找平地路走 Avoid mountain roads</li>
        <li>✓ 感覺累了就停下來休息 Rest when tired</li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => quick(['campsite_legal', 'campsite_wild'], '露營地')}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          ⛺ 找附近的露營地
        </button>
        <button
          type="button"
          onClick={() => quick(['temple_overnight'], '廟宇')}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          🏛️ 找附近的廟宇
        </button>
        <button
          type="button"
          onClick={() => quick(['convenience_store'], '便利商店')}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          🏪 找附近的 7-11
        </button>
      </div>
    </div>
  );
}
