'use client';
// lib/offline-store.ts — 離線資料存取（Phase 11B，v7.0 C）
// 單一 package（以路線為單位）存 IndexedDB：路線、沿線 POI、海拔、天氣快照。
// 所有讀取都附 downloadedAt，UI 必須誠實標注資料時效（v7.0 C5）。
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { POIRecord } from '@/types/poi';
import type { RouteDetail } from '@/types/route';
import type { WeatherBundle } from '@/lib/weather';
import type { ElevationProfileResult } from '@/lib/elevation';

export interface OfflinePackage {
  routeId: string;
  route: RouteDetail;
  pois: POIRecord[];
  elevation: ElevationProfileResult | null;
  weather: Record<string, WeatherBundle & { snapshotAt: string }>;
  downloadedAt: string;
}

interface OfflineDB extends DBSchema {
  packages: { key: string; value: OfflinePackage };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function db(): Promise<IDBPDatabase<OfflineDB>> {
  dbPromise ??= openDB<OfflineDB>('formosa-ride-offline', 1, {
    upgrade(d) {
      d.createObjectStore('packages', { keyPath: 'routeId' });
    },
  });
  return dbPromise;
}

export async function savePackage(pkg: OfflinePackage): Promise<void> {
  await (await db()).put('packages', pkg);
}

export async function getPackage(routeId: string): Promise<OfflinePackage | undefined> {
  return (await db()).get('packages', routeId);
}

export async function listPackages(): Promise<OfflinePackage[]> {
  return (await db()).getAll('packages');
}

export async function deletePackage(routeId: string): Promise<void> {
  await (await db()).delete('packages', routeId);
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** 離線 POI 近點查詢（掃描所有已下載包，模擬 get_pois_near_point 的離線版） */
export async function getOfflinePoisNear(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<{ pois: POIRecord[]; downloadedAt: string | null }> {
  const pkgs = await listPackages();
  const seen = new Set<string>();
  const out: POIRecord[] = [];
  let newest: string | null = null;
  for (const pkg of pkgs) {
    if (!newest || pkg.downloadedAt > newest) newest = pkg.downloadedAt;
    for (const p of pkg.pois) {
      if (seen.has(p.id)) continue;
      const d = haversineKm(lat, lng, p.lat, p.lng);
      if (d <= radiusKm) {
        seen.add(p.id);
        out.push({ ...p, distance_m: Math.round(d * 1000) });
      }
    }
  }
  out.sort((a, b) => a.distance_m - b.distance_m);
  return { pois: out, downloadedAt: newest };
}

/** 離線天氣快照（找任何一包內含該縣市者，取最新） */
export async function getOfflineWeather(
  county: string
): Promise<(WeatherBundle & { snapshotAt: string }) | null> {
  const pkgs = await listPackages();
  let best: (WeatherBundle & { snapshotAt: string }) | null = null;
  for (const pkg of pkgs) {
    const w = pkg.weather[county];
    if (w && (!best || w.snapshotAt > best.snapshotAt)) best = w;
  }
  return best;
}

export async function getOfflineElevation(
  routeId: string
): Promise<ElevationProfileResult | null> {
  const pkg = await getPackage(routeId);
  return pkg?.elevation ?? null;
}

/** 資料時效的人話描述（誠實標注，v7.0 C5） */
export function staleness(iso: string): { zh: string; en: string } {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (hours < 1) return { zh: '不到 1 小時前', en: 'less than an hour ago' };
  if (hours < 24) return { zh: `${hours} 小時前`, en: `${hours}h ago` };
  const days = Math.floor(hours / 24);
  return { zh: `${days} 天前`, en: `${days}d ago` };
}
