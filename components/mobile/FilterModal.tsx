'use client';
// components/mobile/FilterModal.tsx — POI 篩選器（Phase 4B，v10.0 B2）
// 全螢幕覆蓋式（v1.0 §四手機互動規則）。
// 預設只顯示 5 個大分類；點大分類 = 一鍵全選該組；點「展開」才漸進式顯示細項。
import { useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { POI_CATEGORY_GROUPS } from '@/lib/poi-category-groups';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';

export function FilterModal() {
  const isOpen = useMapStore((s) => s.isFilterOpen);
  const setFilterOpen = useMapStore((s) => s.setFilterOpen);
  const activeTypes = useMapStore((s) => s.activeTypes);
  const toggleType = useMapStore((s) => s.toggleType);
  const toggleGroup = useMapStore((s) => s.toggleGroup);
  const clearFilters = useMapStore((s) => s.clearFilters);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border px-3">
        <h2 className="info-primary font-bold">篩選地點 · Filter</h2>
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="tap-target rounded-full text-2xl leading-none"
          aria-label="關閉 Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="info-secondary mb-3 text-neutral-text">
          點大分類快速選取，或展開挑選細項
          <br />
          Tap a category, or expand for details
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
                      {group.label_zh}
                      {selectedCount > 0 && `（已選 ${selectedCount}）`}
                    </span>
                    <span className="info-secondary text-neutral-text">
                      {group.label_en}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : group.key)}
                  aria-label={`展開${group.label_zh}細項`}
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
                        {POI_ICONS[type]} {POI_LABELS[type].zh}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-neutral-border p-4">
        <button
          type="button"
          onClick={clearFilters}
          className="tap-target flex-1 rounded-xl border border-neutral-border py-3 info-primary"
        >
          清除 Clear
        </button>
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="tap-target flex-1 rounded-xl bg-primary py-3 font-bold text-white info-primary"
        >
          {activeTypes.length === 0
            ? '顯示全部 Show all'
            : `套用（${activeTypes.length}）Apply`}
        </button>
      </div>
    </div>
  );
}
