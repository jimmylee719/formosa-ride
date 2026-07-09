'use client';
// lib/offline-download.ts — 路線離線包下載（Phase 11B，v7.0 C2–C3）
// 一次抓齊：路線 GeoJSON → 沿線 10km POI → 海拔剖面 → 沿線縣市天氣快照。
import { savePackage, type OfflinePackage } from '@/lib/offline-store';
import type { POIRecord } from '@/types/poi';
import type { RouteDetail } from '@/types/route';
import type { WeatherBundle } from '@/lib/weather';
import type { ElevationProfileResult } from '@/lib/elevation';

export interface DownloadResult {
  poisCount: number;
  counties: string[];
  downloadedAt: string;
}

export async function downloadRouteOfflinePackage(
  routeId: string,
  onProgress: (percent: number) => void
): Promise<DownloadResult> {
  onProgress(5);

  // 1. 路線本體（含 GeoJSON）
  const routeRes = await fetch(`/api/routes/${routeId}`);
  if (!routeRes.ok) throw new Error(`route ${routeRes.status}`);
  const { route } = (await routeRes.json()) as { route: RouteDetail };
  onProgress(20);

  // 2. 沿線 10km POI（v7.0 C2）
  const poisRes = await fetch(`/api/routes/${routeId}/pois?buffer=10`);
  if (!poisRes.ok) throw new Error(`pois ${poisRes.status}`);
  const { pois } = (await poisRes.json()) as { pois: POIRecord[] };
  onProgress(45);

  // 3. 海拔剖面（可能尚未計算過 → 這次呼叫會順便建快取）
  let elevation: ElevationProfileResult | null = null;
  try {
    const elevRes = await fetch(`/api/elevation?routeId=${routeId}`);
    if (elevRes.ok) elevation = (await elevRes.json()) as ElevationProfileResult;
  } catch {
    elevation = null; // 海拔失敗不阻擋整包下載
  }
  onProgress(70);

  // 4. 沿線縣市天氣快照（附擷取時間，v7.0 C5 誠實標注）
  const weather: OfflinePackage['weather'] = {};
  const counties = route.counties ?? [];
  for (const county of counties) {
    try {
      const wRes = await fetch(`/api/weather?county=${encodeURIComponent(county)}`);
      if (wRes.ok) {
        const bundle = (await wRes.json()) as WeatherBundle;
        weather[county] = { ...bundle, snapshotAt: new Date().toISOString() };
      }
    } catch {
      /* 單一縣市失敗不阻擋 */
    }
  }
  onProgress(90);

  const downloadedAt = new Date().toISOString();
  await savePackage({ routeId, route, pois, elevation, weather, downloadedAt });
  onProgress(100);

  return { poisCount: pois.length, counties, downloadedAt };
}
