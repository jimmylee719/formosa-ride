'use client';
// components/mobile/MapFAB.tsx — 地圖浮動快捷按鈕（Phase 4B 起：篩選入口）
import { useMapStore } from '@/store/map-store';

export function MapFAB() {
  const setFilterOpen = useMapStore((s) => s.setFilterOpen);
  const activeCount = useMapStore((s) => s.activeTypes.length);

  return (
    // 按鈕文案具體化（2026-07-11 Jimmy 指示：一看就知道能找什麼）
    <button
      type="button"
      onClick={() => setFilterOpen(true)}
      className="tap-target absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md"
    >
      <span className="flex flex-col items-start text-left leading-tight">
        <span className="font-bold">🔍 Supplies · Stay · Sights</span>
        <span className="text-xs text-neutral-text">找補給・住宿・景點</span>
      </span>
      {activeCount > 0 && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-sm text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
