'use client';
// components/route/RoutesBrowser.tsx — 路線總覽分類瀏覽（2026-07-11 Jimmy 指示）
// 415 條路線從頭滑到尾不好用 → 依「環島／北中南東／離島」分頁籤，
// 地方自行車道在區域內再依縣市分組。跨縣市路線會出現在每個相關縣市下（利於探索）。
// 2026-07-11（加拿大老夫妻情境）：加第二層「難度」篩選——難度已是海拔實算，
// 想避開山路者選 Easy 即可只看平路，純前端在已載入資料上篩，零額外 DB 負擔。
import { useState } from 'react';
import { RouteCard } from '@/components/route/RouteCard';
import { COUNTY_EN, normalizeCounty as normalize } from '@/lib/county-en';
import type { Difficulty, RouteListItem } from '@/types/route';
import { DIFFICULTY_LABELS } from '@/types/route';

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

// 難度晶片順序與提示圓點（平→陡；顏色沿用 DIFFICULTY_LABELS 語言）
const DIFF_ORDER: Difficulty[] = ['easy', 'moderate', 'hard', 'expert'];
const DIFF_DOT: Record<Difficulty, string> = {
  easy: '🟢',
  moderate: '🟡',
  hard: '🟠',
  expert: '🔴',
};

export function RoutesBrowser({ routes }: { routes: RouteListItem[] }) {
  const [active, setActive] = useState<RegionKey>('island');
  const [diff, setDiff] = useState<Difficulty | 'all'>('all');

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

  // 當前區域的完整路線集（未套難度）→ 供區域頁籤計數、難度晶片計數與內容篩選共用
  const routesInRegion = (key: RegionKey): RouteListItem[] => {
    if (key === 'island') return islandRoutes;
    const set = new Set(REGION_COUNTIES[key]);
    return localRoutes.filter((r) => r.counties.some((c) => set.has(normalize(c))));
  };

  const regionCount = (key: RegionKey): number => routesInRegion(key).length;

  const activeRegionRoutes = routesInRegion(active);
  const diffCountInRegion = (d: Difficulty): number =>
    activeRegionRoutes.filter((r) => r.difficulty === d).length;
  const matchesDiff = (r: RouteListItem): boolean => diff === 'all' || r.difficulty === diff;
  const visibleCount = activeRegionRoutes.filter(matchesDiff).length;

  return (
    <>
      {/* 篩選列（sticky）：第一層區域、第二層難度 */}
      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-neutral-bg px-4 pb-2 pt-1">
        {/* 區域頁籤（換行避免手機裁切） */}
        <div className="flex flex-wrap gap-2">
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

        {/* 難度晶片（換行避免手機裁切）：難度＝總爬升；避開山路選 Easy */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="info-secondary shrink-0 text-neutral-text" aria-hidden>
            ⛰️
          </span>
          <button
            type="button"
            onClick={() => setDiff('all')}
            className={`tap-target shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
              diff === 'all'
                ? 'border-primary bg-primary font-bold text-white'
                : 'border-neutral-border bg-white'
            }`}
          >
            All 全部
          </button>
          {DIFF_ORDER.map((d) => {
            const n = diffCountInRegion(d);
            if (n === 0) return null;
            const on = diff === d;
            const lbl = DIFFICULTY_LABELS[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiff(on ? 'all' : d)}
                className={`tap-target shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
                  on ? `${lbl.className} border-transparent font-bold` : 'border-neutral-border bg-white'
                }`}
              >
                {DIFF_DOT[d]} {lbl.en} {lbl.zh} {n}
              </button>
            );
          })}
        </div>
        {diff !== 'all' && (
          <p className="info-secondary mt-1 text-neutral-text">
            Difficulty = total climb · 難度依總爬升；避開山路選 🟢 Easy
          </p>
        )}
      </div>

      {visibleCount === 0 ? (
        <p className="info-secondary rounded-xl bg-white p-6 text-center text-neutral-text">
          No routes at this difficulty here · 這個區域沒有此難度的路線
          <br />
          <button
            type="button"
            onClick={() => setDiff('all')}
            className="mt-2 underline"
          >
            Show all difficulties · 顯示全部難度
          </button>
        </p>
      ) : active === 'island' ? (
        <div className="flex flex-col gap-3">
          <p className="info-secondary text-neutral-text">
            Official round-island network: main loop + numbered branch lines
            <br />
            官方環島路網：環島1號線與編號支線
          </p>
          {islandRoutes.filter(matchesDiff).map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      ) : (
        REGION_COUNTIES[active].map((county) => {
          const items = localRoutes
            .filter((r) => r.counties.some((c) => normalize(c) === county))
            .filter(matchesDiff)
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
