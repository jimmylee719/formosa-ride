'use client';
// lib/ahead-pois.ts — 前方 POI 動態顯示（Phase 11，v2.0 C7）
// 以行進方向為中心、左右各 60 度的扇形內挑 POI；每類型取最近 1 個，依優先序最多 4 個。
import type { POIRecord, POIType } from '@/types/poi';

/** 優先顯示順序：水/食物 > 露營 > 修車 > 廁所（v2.0 C7） */
const PRIORITY: POIType[] = [
  'convenience_store',
  'water_station',
  'campsite_legal',
  'bicycle_repair',
  'public_toilet',
];

const SECTOR_HALF_ANGLE = 60; // 扇形半角

function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const φ1 = (aLat * Math.PI) / 180;
  const φ2 = (bLat * Math.PI) / 180;
  const Δλ = ((bLng - aLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export async function getAheadPOIs(
  currentLat: number,
  currentLng: number,
  headingDegrees: number | null,
  radiusKm = 10
): Promise<POIRecord[]> {
  const res = await fetch(
    `/api/pois?lat=${currentLat.toFixed(5)}&lng=${currentLng.toFixed(5)}&radius=${radiusKm}`
  );
  if (!res.ok) return [];
  const { pois } = (await res.json()) as { pois: POIRecord[] };

  // 有行進方向 → 只取前方扇形；無方向（剛啟動）→ 全方位
  const inSector =
    headingDegrees == null
      ? pois
      : pois.filter((p) => {
          const b = bearingDeg(currentLat, currentLng, p.lat, p.lng);
          let diff = Math.abs(b - headingDegrees);
          if (diff > 180) diff = 360 - diff;
          return diff <= SECTOR_HALF_ANGLE;
        });

  // 每類型取最近的 1 個（API 已依距離排序）
  const byType = new Map<POIType, POIRecord>();
  for (const p of inSector) {
    if (!byType.has(p.type)) byType.set(p.type, p);
  }

  return PRIORITY.map((t) => byType.get(t))
    .filter((p): p is POIRecord => p != null)
    .slice(0, 4);
}
