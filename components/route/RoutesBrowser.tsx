'use client';
// components/route/RoutesBrowser.tsx — 路線總覽分類瀏覽（2026-07-11 Jimmy 指示）
// 415 條路線從頭滑到尾不好用 → 依「環島／北中南東／離島」分頁籤，
// 地方自行車道在區域內再依縣市分組。跨縣市路線會出現在每個相關縣市下（利於探索）。
import { useState } from 'react';
import { RouteCard } from '@/components/route/RouteCard';
import { COUNTY_EN, normalizeCounty as normalize } from '@/lib/county-en';
import type { RouteListItem } from '@/types/route';

type RegionKey = 'island' | 'north' | 'central' | 'south' | 'east' | 'islands';

const REGIONS: Array<{ key: RegionKey; en: string; zh: string; icon: string }> = [
  { key: 'island', en: 'Round-Island', zh: '環島', icon: '🚴' },
  { key: 'north', en: 'North', zh: '北部', icon: '🏙️' },
  { key: 'central', en: 'Central', zh: '中部', icon: '⛰️' },
  { key: 'south', en: 'South', zh: '南部', icon: '🌾' },
  { key: 'east', en: 'East', zh: '東部', icon: '🌊' },
  { key: 'islands', en: 'Islands', zh: '離島', icon: '🏝️' },
];

// 縣市 → 區域（觀光慣例：宜蘭歸東部；縣市名先正規化「臺」→「台」）
const REGION_COUNTIES: Record<Exclude<RegionKey, 'island'>, string[]> = {
  north: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣'],
  central: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
  south: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'],
  east: ['宜蘭縣', '花蓮縣', '台東縣'],
  islands: ['澎湖縣', '金門縣', '連江縣'],
};

export function RoutesBrowser({ routes }: { routes: RouteListItem[] }) {
  const [active, setActive] = useState<RegionKey>('island');

  // 環島頁籤：主線 → 建議日段（2026-07-11）→ 官方支線；其餘（custom）依縣市歸入區域
  const TYPE_ORDER: Record<string, number> = { full_island: 0, segment: 1 };
  const islandRoutes = routes
    .filter((r) => r.type !== 'custom')
    .sort((a, b) => {
      const oa = TYPE_ORDER[a.type] ?? 2;
      const ob = TYPE_ORDER[b.type] ?? 2;
      if (oa !== ob) return oa - ob;
      if (a.type === 'segment') {
        return a.slug.localeCompare(b.slug, undefined, { numeric: true });
      }
      return (a.official_route_code ?? '').localeCompare(b.official_route_code ?? '', 'zh-TW', {
        numeric: true,
      });
    });
  const localRoutes = routes.filter((r) => r.type === 'custom');

  const regionCount = (key: RegionKey): number => {
    if (key === 'island') return islandRoutes.length;
    const set = new Set(REGION_COUNTIES[key]);
    return localRoutes.filter((r) => r.counties.some((c) => set.has(normalize(c)))).length;
  };

  return (
    <>
      {/* 區域頁籤（sticky，橫向可捲） */}
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-neutral-bg px-4 pb-2 pt-1">
        <div className="flex gap-2 overflow-x-auto">
          {REGIONS.map((reg) => {
            const n = regionCount(reg.key);
            if (n === 0) return null;
            const on = active === reg.key;
            return (
              <button
                key={reg.key}
                type="button"
                onClick={() => setActive(reg.key)}
                className={`tap-target shrink-0 whitespace-nowrap rounded-full border px-4 py-2 ${
                  on
                    ? 'border-primary bg-primary font-bold text-white'
                    : 'border-neutral-border bg-white'
                }`}
              >
                {reg.icon} {reg.en}
                <span className={`ml-1 text-sm ${on ? 'text-white/90' : 'text-neutral-text'}`}>
                  {reg.zh} {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {active === 'island' ? (
        <div className="flex flex-col gap-3">
          <p className="info-secondary text-neutral-text">
            Official round-island network: main loop + numbered branch lines
            <br />
            官方環島路網：環島1號線與編號支線
          </p>
          {islandRoutes.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      ) : (
        REGION_COUNTIES[active].map((county) => {
          const items = localRoutes
            .filter((r) => r.counties.some((c) => normalize(c) === county))
            .sort((a, b) => b.distance_km - a.distance_km);
          if (items.length === 0) return null;
          return (
            <section key={county} className="mb-5">
              <h2 className="info-primary mb-2 font-bold">
                📍 {COUNTY_EN[county] ?? county}
                <span className="info-secondary ml-2 font-normal text-neutral-text">
                  {county}（{items.length}）
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((r) => (
                  <RouteCard key={`${county}-${r.id}`} route={r} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
