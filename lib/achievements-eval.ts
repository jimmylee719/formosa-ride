// lib/achievements-eval.ts — 環島認證：查 trip_points 佐證並判定成就（server-side）
// 只用「便宜的極值/範圍查詢」，不載入整趟軌跡點（多日行程可能上萬點）：
//   - 起終點、最南/最北緯度：各一筆小查詢
//   - 每個地標：以 bbox 撈候選點，再用 haversine 精確驗證半徑
// 里程直接用 trips.total_distance_km（已於 end-day 累計）。
import type { SupabaseClient } from '@supabase/supabase-js';
import { LANDMARKS } from './landmarks';
import {
  evaluateRoundIsland,
  haversineKm,
  type GeoPoint,
  type RoundIslandResult,
} from './certification';

const KM_PER_DEG_LAT = 111.32;

export interface LandmarkAward {
  id: string;
  proof: GeoPoint;
  distance_km: number;
}

export interface TripEvaluation {
  landmarks: LandmarkAward[];
  roundIsland: RoundIslandResult;
}

type Row = { lat: number | string; lng: number | string; recorded_at: string };

const toPoint = (r: Row): GeoPoint => ({
  lat: Number(r.lat),
  lng: Number(r.lng),
  recorded_at: r.recorded_at,
});

export async function evaluateTripAchievements(
  supabase: SupabaseClient,
  tripId: string,
  totalDistanceKm: number
): Promise<TripEvaluation> {
  // 起終點與南北極值（四筆小查詢並行）
  const [firstRes, lastRes, minLatRes, maxLatRes] = await Promise.all([
    supabase
      .from('trip_points')
      .select('lat,lng,recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trip_points')
      .select('lat,lng,recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trip_points')
      .select('lat')
      .eq('trip_id', tripId)
      .order('lat', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trip_points')
      .select('lat')
      .eq('trip_id', tripId)
      .order('lat', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstPoint = firstRes.data ? toPoint(firstRes.data as Row) : null;
  const lastPoint = lastRes.data ? toPoint(lastRes.data as Row) : null;
  const minLat =
    minLatRes.data != null ? Number((minLatRes.data as { lat: number }).lat) : null;
  const maxLat =
    maxLatRes.data != null ? Number((maxLatRes.data as { lat: number }).lat) : null;

  // 地標判定：bbox 撈候選 → haversine 精確驗證（半徑刻意從寬）
  const landmarks: LandmarkAward[] = [];
  for (const lm of LANDMARKS) {
    const dLat = lm.radius_km / KM_PER_DEG_LAT;
    const dLng =
      lm.radius_km / (KM_PER_DEG_LAT * Math.cos((lm.lat * Math.PI) / 180));
    const { data } = await supabase
      .from('trip_points')
      .select('lat,lng,recorded_at')
      .eq('trip_id', tripId)
      .gte('lat', lm.lat - dLat)
      .lte('lat', lm.lat + dLat)
      .gte('lng', lm.lng - dLng)
      .lte('lng', lm.lng + dLng)
      .limit(200);

    let best: LandmarkAward | null = null;
    for (const r of (data ?? []) as Row[]) {
      const gp = toPoint(r);
      const d = haversineKm(gp, lm);
      if (d <= lm.radius_km && (best === null || d < best.distance_km)) {
        best = { id: lm.id, proof: gp, distance_km: d };
      }
    }
    if (best) landmarks.push(best);
  }

  const roundIsland = evaluateRoundIsland({
    firstPoint,
    lastPoint,
    minLat,
    maxLat,
    totalDistanceKm,
  });

  return { landmarks, roundIsland };
}
