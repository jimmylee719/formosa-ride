'use client';
// lib/use-heading.ts — 裝置行進方位 hook（Phase 7C）
// 來源：Geolocation watchPosition 的 coords.heading（僅移動中有值）。
// QA 覆寫：URL 帶 ?heading=225 可模擬行進方向（度，北=0 順時針）。
import { useEffect, useState } from 'react';

const MIN_SPEED_MS = 1.0; // 低於此速度（m/s）視為靜止，heading 不可靠

export function useHeading(): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    // QA / 驗收覆寫（與 ?night 同思路）
    const override = new URLSearchParams(window.location.search).get('heading');
    if (override !== null) {
      const deg = Number(override);
      if (Number.isFinite(deg) && deg >= 0 && deg < 360) {
        setHeading(deg);
        return;
      }
    }

    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { heading: h, speed } = pos.coords;
        if (h != null && Number.isFinite(h) && (speed ?? 0) >= MIN_SPEED_MS) {
          setHeading(h);
        } else {
          setHeading(null);
        }
      },
      () => setHeading(null),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return heading;
}
