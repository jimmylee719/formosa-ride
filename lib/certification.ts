// lib/certification.ts — 環島認證判定（純函數，無 DB／無副作用，供 API 與測試共用）
// 2026-07-13 Jimmy 指示：規則「從寬」即可——重點是 GPS 軌跡確實繞了台灣一圈，
// 而非精算完美路線。所有門檻集中在此，方便日後調整。
import { LANDMARKS, type Landmark } from './landmarks';

export interface GeoPoint {
  lat: number;
  lng: number;
  recorded_at?: string | null;
}

const R_EARTH_KM = 6371;
const KM_PER_DEG_LAT = 111.32;

/** 兩點大圓距離（公里） */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface LandmarkHit {
  landmark: Landmark;
  proof: GeoPoint;
  distance_km: number;
}

/**
 * 軌跡經過哪些關鍵地標：任一軌跡點落在地標半徑內即達成。
 * 回傳達成的地標與「最接近的那個軌跡點」作為佐證。
 */
export function landmarksReached(
  points: GeoPoint[],
  landmarks: Landmark[] = LANDMARKS
): LandmarkHit[] {
  const hits: LandmarkHit[] = [];
  for (const lm of landmarks) {
    let best: { proof: GeoPoint; d: number } | null = null;
    for (const p of points) {
      const d = haversineKm(p, lm);
      if (d <= lm.radius_km && (best === null || d < best.d)) {
        best = { proof: p, d };
      }
    }
    if (best) hits.push({ landmark: lm, proof: best.proof, distance_km: best.d });
  }
  return hits;
}

// ── 環島完賽判定（從寬）────────────────────────────────────────────
// 三個條件同時成立才算環島（皆刻意寬鬆，容許不同起訖站與 GPS 誤差）：
//   1. 累計里程夠長（主線約 900+ km，門檻從寬 800）
//   2. 終點回到起點附近（loop 閉合，從寬 50 km 內——允許不同車站起訖）
//   3. 軌跡的南北跨度夠大（證明真的繞島，而非沿單一海岸長直線來回）
export const ROUND_ISLAND = {
  MIN_DISTANCE_KM: 800,
  LOOP_CLOSE_KM: 50,
  MIN_LAT_SPAN_KM: 250,
} as const;

export interface RoundIslandResult {
  passed: boolean;
  distance_km: number;
  loop_close_km: number | null; // 終點到起點的距離；點數不足時為 null
  lat_span_km: number;
  reasons: string[]; // 未通過時，還差什麼（雙語短句）
}

export interface RoundIslandInput {
  firstPoint: GeoPoint | null; // 全程第一個軌跡點（時間序）
  lastPoint: GeoPoint | null; // 全程最後一個軌跡點（時間序）
  minLat: number | null; // 全程最南緯度
  maxLat: number | null; // 全程最北緯度
  totalDistanceKm: number; // 系統累計里程（trips.total_distance_km）
}

/**
 * 判定一趟行程是否構成「環島」。
 * 以「預先算好的極值」為輸入（起終點、南北緯度、里程），避免載入全部軌跡點；
 * 呼叫端（API）用便宜的 min/max 查詢取得這些值。純函數、可測試。
 */
export function evaluateRoundIsland({
  firstPoint,
  lastPoint,
  minLat,
  maxLat,
  totalDistanceKm,
}: RoundIslandInput): RoundIslandResult {
  const reasons: string[] = [];

  const loopCloseKm =
    firstPoint && lastPoint ? haversineKm(firstPoint, lastPoint) : null;
  const latSpanKm =
    minLat !== null && maxLat !== null ? (maxLat - minLat) * KM_PER_DEG_LAT : 0;

  if (totalDistanceKm < ROUND_ISLAND.MIN_DISTANCE_KM) {
    reasons.push(
      `Ride ${Math.max(0, Math.round(ROUND_ISLAND.MIN_DISTANCE_KM - totalDistanceKm))} km more · 還差約 ${Math.max(0, Math.round(ROUND_ISLAND.MIN_DISTANCE_KM - totalDistanceKm))} 公里`
    );
  }
  if (loopCloseKm === null || loopCloseKm > ROUND_ISLAND.LOOP_CLOSE_KM) {
    reasons.push('Finish near where you started · 需回到出發地附近');
  }
  if (latSpanKm < ROUND_ISLAND.MIN_LAT_SPAN_KM) {
    reasons.push('Route must span the island north–south · 軌跡需涵蓋全島南北');
  }

  return {
    passed: reasons.length === 0,
    distance_km: totalDistanceKm,
    loop_close_km: loopCloseKm,
    lat_span_km: latSpanKm,
    reasons,
  };
}
