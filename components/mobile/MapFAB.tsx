'use client';
// components/mobile/MapFAB.tsx — 地圖浮動快捷按鈕（Phase 4B 起：篩選入口）
import { useMapStore } from '@/store/map-store';

export function MapFAB() {
  const setFilterOpen = useMapStore((s) => s.setFilterOpen);
  const activeCount = useMapStore((s) => s.activeTypes.length);

  return (
    <button
      type="button"
      onClick={() => setFilterOpen(true)}
      className="tap-target absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold shadow-md"
    >
      🔍 篩選 Filter
      {activeCount > 0 && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-sm text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
