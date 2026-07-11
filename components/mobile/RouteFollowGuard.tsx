'use client';
// components/mobile/RouteFollowGuard.tsx — 沿線跟騎＋偏離提醒（2026-07-11 方案 B）
// 旅途模式中，若地圖有載入路線（?route=id），比對即時 GPS 到路線的最短距離；
// 超過門檻就震動＋橫幅提示，回到線上自動消失。純前端、無外部 API、
// 吃既有（每月自動更新）的路線幾何。非 turn-by-turn：只回答「我還在路線上嗎？」
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { journeyTracker } from '@/lib/journey-tracker';
import type { LineStringGeoJSON } from '@/types/route';

const OFF_ROUTE_M = 150; // 偏離門檻（路線頂點間距約 160m，用點到線段距離避免誤判）
const BACK_ON_M = 90; // 回到此距離內視為歸線（遲滯，避免門檻邊界抖動）
const VIBRATE_COOLDOWN_MS = 60_000;

type Coord = [number, number]; // [lng, lat]

function distPointToSegM(
  plat: number,
  plng: number,
  a: Coord,
  b: Coord
): number {
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((plat * Math.PI) / 180);
  const px = plng * mPerLng;
  const py = plat * mPerLat;
  const ax = a[0] * mPerLng;
  const ay = a[1] * mPerLat;
  const bx = b[0] * mPerLng;
  const by = b[1] * mPerLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function distToPolylineM(lat: number, lng: number, coords: Coord[]): number {
  let best = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    if (!a || !b) continue;
    const d = distPointToSegM(lat, lng, a, b);
    if (d < best) best = d;
  }
  return best;
}

export function RouteFollowGuard() {
  const routeId = useSearchParams().get('route');
  const coordsRef = useRef<Coord[] | null>(null);
  const offRef = useRef(false); // 目前是否處於偏離狀態（遲滯用）
  const lastVibrateRef = useRef(0);
  const [offBy, setOffBy] = useState<number | null>(null);

  // 載入路線幾何（隨 routeId 變動）
  useEffect(() => {
    coordsRef.current = null;
    offRef.current = false;
    setOffBy(null);
    if (!routeId) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}`);
        if (!res.ok || !alive) return;
        const { route } = (await res.json()) as { route: { geometry: LineStringGeoJSON } };
        const c = route.geometry?.coordinates as Coord[] | undefined;
        if (c && c.length >= 2) coordsRef.current = c;
      } catch {
        /* 離線或失敗：不提示，不干擾騎乘 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [routeId]);

  // 訂閱旅途座標（onStats 僅在旅途進行中觸發）
  useEffect(() => {
    const unsub = journeyTracker.onStats((s) => {
      const coords = coordsRef.current;
      if (!coords || s.lat == null || s.lng == null) {
        if (offRef.current) {
          offRef.current = false;
          setOffBy(null);
        }
        return;
      }
      const d = distToPolylineM(s.lat, s.lng, coords);
      if (!offRef.current && d > OFF_ROUTE_M) {
        offRef.current = true;
        setOffBy(Math.round(d));
        const now = Date.now();
        if (now - lastVibrateRef.current > VIBRATE_COOLDOWN_MS) {
          lastVibrateRef.current = now;
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {
            /* 不支援震動 */
          }
        }
      } else if (offRef.current && d < BACK_ON_M) {
        offRef.current = false;
        setOffBy(null);
      } else if (offRef.current) {
        setOffBy(Math.round(d)); // 持續偏離：更新距離
      }
    });
    return unsub;
  }, []);

  if (offBy == null) return null;

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-warning-border bg-warning-bg px-4 py-2 shadow-lg">
        <span className="text-2xl" aria-hidden>
          ↩️
        </span>
        <div className="text-warning-text">
          <p className="info-secondary font-bold">Off route · 偏離路線</p>
          <p className="text-sm">
            ~{offBy} m from the green line · 距綠色路線約 {offBy} 公尺
          </p>
        </div>
      </div>
    </div>
  );
}
