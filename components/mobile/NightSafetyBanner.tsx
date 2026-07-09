'use client';
// components/mobile/NightSafetyBanner.tsx — 夜間安全橫幅（Phase 7B，v3.0 C3）
// 深藍底、白字；三個快捷鈕直接套用 POI 篩選。
// Phase 8C 起為「受控元件」：顯示與關閉統一由 BannerQueue 管理（v10.0 單一佇列）。
import { useMapStore } from '@/store/map-store';

export function NightSafetyBanner({ onDismiss }: { onDismiss: () => void }) {
  const setActiveTypes = useMapStore((s) => s.setActiveTypes);

  const quick = (types: Parameters<typeof setActiveTypes>[0]) => {
    setActiveTypes(types);
    onDismiss(); // 選了目標就收起橫幅，讓地圖露出來
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
          onClick={() => onDismiss()}
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
          onClick={() => quick(['campsite_legal', 'campsite_wild'])}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          ⛺ 找附近的露營地
        </button>
        <button
          type="button"
          onClick={() => quick(['temple_overnight'])}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          🏛️ 找附近的廟宇
        </button>
        <button
          type="button"
          onClick={() => quick(['convenience_store'])}
          className="tap-target rounded-full bg-white/15 px-4 py-2 text-sm font-bold"
        >
          🏪 找附近的 7-11
        </button>
      </div>
    </div>
  );
}
