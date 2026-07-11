// lib/pois-along-route.ts — 沿線 POI（bbox 粗篩 + Node 投影，Server 專用）
// 2026-07-11：get_pois_along_route RPC 對 ~105km 環島日段（types=null）需 ~5s——
// 實測瓶頸是「4.8萬 POI 全跟長線做精確 ST_DWithin」，非結果筆數（加 LIMIT 無效）。
// 改用 supply-gaps 已驗證的模式：先用 lat/lng btree 索引抓路線外框內的點（DB 極快），
// 投影到最近頂點、依累積里程排序，全在 Node 完成。實測 ~5s → ~1.5s。
import 'server-only';
import { createAnonServerClient } from '@/lib/supabase-server';
import type { LineStringGeoJSON } from '@/types/route';

const KM_PER_DEG_LAT = 111.32;
// 外框粗篩上限：密集路段（西部都會）也夠用；投影只留真正在緩衝內的點
const BBOX_FETCH_CAP = 8000;

export interface AlongRoutePoi {
  id: string;
  name_zh: string;
  name_en: string | null;
  type: string;
  lat: number;
  lng: number;
  chainage_km: number; // 沿路線的累積里程（用於排序 / 顯示行進順序）
}

interface PoiRow {
  id: string;
  name_zh: string;
  name_en: string | null;
  type: string;
  lat: number | string;
  lng: number | string;
}

/**
 * 回傳沿線（buffer 內）的 POI，依路線行進里程排序。
 * @param limit 只取前 N 筆（total 仍回報緩衝內總數，供「共 N 個地點」顯示）
 */
export async function getPoisAlongRoute(
  geometry: LineStringGeoJSON,
  opts: { bufferKm?: number; limit?: number; types?: string[] | null } = {}
): Promise<{ pois: AlongRoutePoi[]; total: number }> {
  const bufferKm = opts.bufferKm ?? 3;
  const coords = geometry.coordinates;
  if (coords.length < 2) return { pois: [], total: 0 };

  // 一次走訪：路線外框 + 各頂點累積里程（等距圓柱近似，緩衝尺度誤差可忽略）
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  const cum: number[] = [0];
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (!c) {
      if (i > 0) cum.push(cum[i - 1] ?? 0);
      continue;
    }
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLng) minLng = c[0];
    if (c[0] > maxLng) maxLng = c[0];
    if (i > 0) {
      const a = coords[i - 1];
      if (!a) {
        cum.push(cum[i - 1] ?? 0);
        continue;
      }
      const mPerDegLng = KM_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180);
      const dKm = Math.hypot((c[0] - a[0]) * mPerDegLng, (c[1] - a[1]) * KM_PER_DEG_LAT);
      cum.push((cum[i - 1] ?? 0) + dKm);
    }
  }

  const dLat = bufferKm / KM_PER_DEG_LAT;
  const dLng = bufferKm / (KM_PER_DEG_LAT * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));

  const supabase = createAnonServerClient();
  let query = supabase
    .from('pois')
    .select('id, name_zh, name_en, type, lat, lng')
    .eq('is_active', true)
    .gte('lat', minLat - dLat)
    .lte('lat', maxLat + dLat)
    .gte('lng', minLng - dLng)
    .lte('lng', maxLng + dLng)
    .limit(BBOX_FETCH_CAP);
  if (opts.types && opts.types.length > 0) {
    query = query.in('type', opts.types);
  }
  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error('[pois-along-route] bbox query error:', error.message);
    return { pois: [], total: 0 };
  }

  // 每個候選點 → 最近頂點：距離 ≤ buffer 才算沿線，取該頂點的累積里程
  const within: AlongRoutePoi[] = [];
  for (const p of data as PoiRow[]) {
    const sLat = Number(p.lat);
    const sLng = Number(p.lng);
    const mPerDegLng = KM_PER_DEG_LAT * Math.cos((sLat * Math.PI) / 180);
    let best = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      if (!c) continue;
      const d = Math.hypot((c[0] - sLng) * mPerDegLng, (c[1] - sLat) * KM_PER_DEG_LAT);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    if (best <= bufferKm) {
      within.push({
        id: p.id,
        name_zh: p.name_zh,
        name_en: p.name_en,
        type: p.type,
        lat: sLat,
        lng: sLng,
        chainage_km: cum[bestIdx] ?? 0,
      });
    }
  }
  within.sort((a, b) => a.chainage_km - b.chainage_km);

  const total = within.length;
  const pois = opts.limit && opts.limit > 0 ? within.slice(0, opts.limit) : within;
  return { pois, total };
}
