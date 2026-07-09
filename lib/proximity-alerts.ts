// lib/proximity-alerts.ts — 鄰近警示（Phase 8，v3.0 A6）
// 距離危險/禁行路段 < 500m 時產生警示。Journey 模式（Phase 11）將定期呼叫。
// 純資料函數：前後端皆可用（Node 測試時傳入 baseUrl）。
import type { LineStringGeoJSON } from '@/types/route';
import { DANGER_MESSAGES } from '@/lib/danger-messages';

export interface ProximityAlert {
  type: 'danger_zone' | 'restricted';
  level: 'high' | 'medium' | 'low' | 'restricted';
  name: string;
  distanceM: number;
  message: (typeof DANGER_MESSAGES)['high'];
}

const ALERT_RADIUS_M = 500;

/** 點到線段最短距離（公尺，等距圓柱近似——500m 尺度誤差可忽略） */
export function distanceToLineStringM(
  lat: number,
  lng: number,
  line: LineStringGeoJSON
): number {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const px = lng * mPerDegLng;
  const py = lat * mPerDegLat;
  let best = Infinity;
  const coords = line.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    if (!a || !b) continue;
    const ax = a[0] * mPerDegLng;
    const ay = a[1] * mPerDegLat;
    const bx = b[0] * mPerDegLng;
    const by = b[1] * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
}

interface DangerFeature {
  name_zh: string;
  level: 'high' | 'medium' | 'low';
  geometry: LineStringGeoJSON | { type: string; coordinates: unknown };
}
interface RestrictedRoad {
  name_zh: string;
  geometry: LineStringGeoJSON;
}

export async function checkProximityAlerts(
  lat: number,
  lng: number,
  isNightMode: boolean,
  baseUrl = ''
): Promise<ProximityAlert[]> {
  const alerts: ProximityAlert[] = [];
  const d = 0.006; // 約 600m 的查詢視窗（v3.0 A6）

  try {
    const [dzRes, rrRes] = await Promise.all([
      fetch(
        `${baseUrl}/api/danger-zones?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&night_mode=${isNightMode}`
      ),
      fetch(`${baseUrl}/api/restricted-roads`),
    ]);

    if (dzRes.ok) {
      const { features } = (await dzRes.json()) as { features: DangerFeature[] };
      for (const f of features) {
        if (f.geometry.type !== 'LineString') continue;
        const dist = distanceToLineStringM(lat, lng, f.geometry as LineStringGeoJSON);
        if (dist < ALERT_RADIUS_M) {
          alerts.push({
            type: 'danger_zone',
            level: f.level,
            name: f.name_zh,
            distanceM: Math.round(dist),
            message: DANGER_MESSAGES[f.level],
          });
        }
      }
    }
    if (rrRes.ok) {
      const { roads } = (await rrRes.json()) as { roads: RestrictedRoad[] };
      for (const r of roads) {
        const dist = distanceToLineStringM(lat, lng, r.geometry);
        if (dist < ALERT_RADIUS_M) {
          alerts.push({
            type: 'restricted',
            level: 'restricted',
            name: r.name_zh,
            distanceM: Math.round(dist),
            message: DANGER_MESSAGES.restricted,
          });
        }
      }
    }
  } catch {
    // 離線/網路錯誤時不產生警示，不拋錯（山區斷訊為常態情境）
  }

  return alerts.sort((a, b) => a.distanceM - b.distanceM);
}
