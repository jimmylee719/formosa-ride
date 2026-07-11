'use client';
// components/mobile/FilterModal.tsx — POI 篩選器（Phase 4B，v10.0 B2）
// 全螢幕覆蓋式（v1.0 §四手機互動規則）。
// 預設只顯示 5 個大分類；點大分類 = 一鍵全選該組；點「展開」才漸進式顯示細項。
import { useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { POI_CATEGORY_GROUPS } from '@/lib/poi-category-groups';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';
import { ACCOMMODATION_SUBTYPES } from '@/types/poi';

export function FilterModal() {
  const isOpen = useMapStore((s) => s.isFilterOpen);
  const setFilterOpen = useMapStore((s) => s.setFilterOpen);
  const activeTypes = useMapStore((s) => s.activeTypes);
  const toggleType = useMapStore((s) => s.toggleType);
  const toggleGroup = useMapStore((s) => s.toggleGroup);
  const accommodationSubtypes = useMapStore((s) => s.accommodationSubtypes);
  const toggleAccommodationSubtype = useMapStore((s) => s.toggleAccommodationSubtype);
  const clearFilters = useMapStore((s) => s.clearFilters);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border px-3">
        <h2 className="info-primary font-bold">Filter places · 篩選地點</h2>
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="close-x"
          aria-label="Close 關閉"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="info-secondary mb-3 text-neutral-text">
          Tap a category to select all, or expand for details
          <br />
          點大分類快速選取，或展開挑選細項
        </p>

        {POI_CATEGORY_GROUPS.map((group) => {
          const selectedCount = group.types.filter((t) =>
            activeTypes.includes(t)
          ).length;
          const allSelected = selectedCount === group.types.length;
          const isExpanded = expanded === group.key;

          return (
            <div
              key={group.key}
              className="mb-3 rounded-2xl border border-neutral-border"
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.types)}
                  className={`tap-target flex flex-1 items-center gap-3 rounded-l-2xl px-4 py-3 text-left ${
                    allSelected
                      ? 'bg-safe-bg font-bold text-safe-text'
                      : selectedCount > 0
                        ? 'bg-caution-bg'
                        : 'bg-white'
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {group.icon}
                  </span>
                  <span>
                    <span className="info-primary block">
                      {group.label_en}
                      {selectedCount > 0 && ` (${selectedCount} selected)`}
                    </span>
                    <span className="info-secondary text-neutral-text">
                      {group.label_zh}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : group.key)}
                  aria-label={`Expand ${group.label_en} 展開${group.label_zh}細項`}
                  aria-expanded={isExpanded}
                  className="tap-target rounded-r-2xl border-l border-neutral-border px-4 text-xl text-neutral-text"
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {isExpanded && (
                <div className="flex flex-wrap gap-2 border-t border-neutral-border p-3">
                  {group.types.map((type) => {
                    const on = activeTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        className={`tap-target rounded-full border px-4 py-2 info-secondary ${
                          on
                            ? 'border-safe-border bg-safe-bg font-bold text-safe-text'
                            : 'border-neutral-border bg-white'
                        }`}
                      >
                        {POI_ICONS[type]} {POI_LABELS[type].en}
                        <span className="ml-1 text-sm text-neutral-text">
                          {POI_LABELS[type].zh}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 住宿子類型（Phase 15B，v8.0 C3 漸進式揭露）：選了住宿才出現 */}
              {group.key === 'rest' && activeTypes.includes('accommodation') && (
                <div className="border-t border-neutral-border p-3">
                  <p className="text-sm text-neutral-text">
                    Accommodation type 住宿類型（optional 可略過）
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACCOMMODATION_SUBTYPES.map((s) => {
                      const on = accommodationSubtypes.includes(s.value);
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => toggleAccommodationSubtype(s.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            on
                              ? 'border-safe-border bg-safe-bg font-bold text-safe-text'
                              : 'border-neutral-border bg-white'
                          }`}
                        >
                          {s.en} {s.zh}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 地圖圖例（2026-07-11）：解釋安全圖層的顏色語言，事故熱點不畫在地圖上 */}
        <div className="mt-4 rounded-2xl border border-neutral-border p-4">
          <p className="info-primary font-bold">Map legend 地圖圖例</p>
          <ul className="mt-3 space-y-3">
            <li className="flex items-center gap-3">
              <span aria-hidden className="inline-block h-1.5 w-10 shrink-0 rounded bg-[#DC2626]" />
              <span className="info-secondary">
                High-risk road — Suhua Highway
                <span className="block text-neutral-text">高風險路段（蘇花公路）</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="inline-block w-10 shrink-0 border-t-4 border-dashed border-[#334155]" />
              <span className="info-secondary">
                No bicycles by law (freeway)
                <span className="block text-neutral-text">依法禁行自行車（國道）</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="inline-block h-1.5 w-10 shrink-0 rounded bg-[#8B5CF6]" />
              <span className="info-secondary">
                Unlit road (shown at night)
                <span className="block text-neutral-text">無照明路段（夜間顯示）</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="inline-block h-1.5 w-10 shrink-0 rounded bg-[#16A34A]" />
              <span className="info-secondary">
                Selected cycling route
                <span className="block text-neutral-text">選取的自行車路線</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="inline-block w-10 shrink-0 border-t-4 border-dashed border-[#E61FD2]" />
              <span className="info-secondary">
                Bike route network (base map, not tappable)
                <span className="block text-neutral-text">自行車路網（底圖資訊，不可點擊）</span>
              </span>
            </li>
          </ul>
          <p className="info-secondary mt-3 text-neutral-text">
            Accident hotspots are not drawn on the map — Journey Mode alerts you
            automatically when you approach one.
            <br />
            事故熱點不畫在地圖上——旅途模式中接近時會自動警示。
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 border-t border-neutral-border p-4">
        <button
          type="button"
          onClick={clearFilters}
          className="tap-target flex-1 rounded-xl border border-neutral-border py-3 info-primary"
        >
          Clear 清除
        </button>
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="tap-target flex-1 rounded-xl bg-primary py-3 font-bold text-white info-primary"
        >
          {activeTypes.length === 0
            ? 'Auto display 自動顯示'
            : `Apply (${activeTypes.length}) 套用`}
        </button>
      </div>
    </div>
  );
}
