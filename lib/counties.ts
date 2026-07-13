// lib/counties.ts — 縣市判定（server-side；環島認證縣市徽章用）
//
// 邊界資料來源與重現方式（非捏造，可重跑）：
//   來源：g0v/twgeojson（內政部「直轄市、縣市界線」衍生，d3 簡化）
//         https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json
//   簡化：npx mapshaper <上檔> -simplify 8% keep-shapes \
//           -filter-fields COUNTYNAME -o format=geojson precision=0.0001 data/tw-counties.json
//   下載/簡化日期：2026-07-13。原始 9.3MB → 簡化 ~0.39MB（縣市徽章判定用，精度足夠）。
//
// ⚠️ 此模組會 import ~0.39MB GeoJSON，只可在 server（API route）使用，勿於前端元件 import。
// 名稱正規化：資料為 2010 版 → 「桃園縣」對映到現行「桃園市」；「臺」→「台」對齊 county-en.ts。
import type { SupabaseClient } from '@supabase/supabase-js';
import rawCounties from '../data/tw-counties.json';

type Ring = number[][]; // [ [lng, lat], ... ]
type Poly = Ring[]; // [outerRing, ...holes]

interface CountyShape {
  name: string; // 正規化後的縣市名（對齊 COUNTY_EN 鍵）
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  polys: Poly[];
}

function canonicalName(raw: string): string {
  const n = raw.replace(/^臺/, '台');
  return n === '桃園縣' ? '桃園市' : n;
}

function buildShapes(): CountyShape[] {
  const fc = rawCounties as unknown as {
    features: Array<{
      properties: { COUNTYNAME: string };
      geometry: { type: string; coordinates: unknown };
    }>;
  };
  const shapes: CountyShape[] = [];
  for (const f of fc.features) {
    const polys: Poly[] =
      f.geometry.type === 'MultiPolygon'
        ? (f.geometry.coordinates as Poly[])
        : [f.geometry.coordinates as Poly];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const poly of polys) {
      const outer = poly[0];
      if (!outer) continue;
      for (const [lng, lat] of outer) {
        if (lng! < minLng) minLng = lng!;
        if (lng! > maxLng) maxLng = lng!;
        if (lat! < minLat) minLat = lat!;
        if (lat! > maxLat) maxLat = lat!;
      }
    }
    shapes.push({
      name: canonicalName(f.properties.COUNTYNAME),
      bbox: [minLng, minLat, maxLng, maxLat],
      polys,
    });
  }
  return shapes;
}

// 建一次即快取（模組層級）
const SHAPES = buildShapes();

/** 射線法：點是否在單一環內 */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i]!;
    const pj = ring[j]!;
    const xi = pi[0]!;
    const yi = pi[1]!;
    const xj = pj[0]!;
    const yj = pj[1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 點在多邊形內（外環內且不在任何洞內） */
function pointInPoly(lng: number, lat: number, poly: Poly): boolean {
  const outer = poly[0];
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  for (let h = 1; h < poly.length; h++) {
    if (pointInRing(lng, lat, poly[h]!)) return false; // 落在洞內
  }
  return true;
}

/** 回傳某座標所在縣市（正規化名稱），找不到回 null */
export function countyForPoint(lat: number, lng: number): string | null {
  for (const s of SHAPES) {
    const [minLng, minLat, maxLng, maxLat] = s.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    for (const poly of s.polys) {
      if (pointInPoly(lng, lat, poly)) return s.name;
    }
  }
  return null;
}

export interface CountyAward {
  county: string;
  proof: { lat: number; lng: number; recorded_at: string | null };
}

/**
 * 掃一趟行程的軌跡點，判定造訪過哪些縣市。
 * 分頁抓取（避免 1000 列上限），每 KEEP_EVERY 點取樣一次做點面判定，
 * 蒐集到 22 縣市即提早結束。屬「結束整趟旅程」時的一次性計算，容忍多次查詢。
 */
export async function evaluateTripCounties(
  supabase: SupabaseClient,
  tripId: string
): Promise<CountyAward[]> {
  const PAGE = 1000;
  const MAX_PAGES = 60; // 上限 6 萬點，保護極長行程
  const KEEP_EVERY = 3;
  const found = new Map<string, CountyAward['proof']>();
  let idx = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await supabase
      .from('trip_points')
      .select('lat,lng,recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (!data || data.length === 0) break;

    for (const r of data as Array<{ lat: number; lng: number; recorded_at: string }>) {
      if (idx++ % KEEP_EVERY !== 0) continue;
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      const c = countyForPoint(lat, lng);
      if (c && !found.has(c)) {
        found.set(c, { lat, lng, recorded_at: r.recorded_at });
      }
    }
    if (found.size >= SHAPES.length) break; // 全島跑完
    if (data.length < PAGE) break; // 最後一頁
  }

  return [...found.entries()].map(([county, proof]) => ({ county, proof }));
}
