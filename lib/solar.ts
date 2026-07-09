'use client';
// lib/solar.ts — useSolar hook（Phase 7，v3.0 B3）
// 每分鐘重新計算倒數；資料每小時重新抓取。
import { useEffect, useState } from 'react';

export type SolarWarningLevel = 'none' | 'yellow' | 'orange' | 'red';

export interface SolarState {
  sunrise: string;
  sunset: string;
  dusk: string; // 天完全黑（civil twilight 結束）
  minutesToSunset: number;
  minutesToDark: number;
  isNight: boolean;
  warningLevel: SolarWarningLevel;
}

/** 解析 '6:55:13 PM' 為今天的 Date */
function parseTime(timeStr: string): Date | null {
  const m = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const pm = (m[4] ?? '').toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, sec);
}

export function computeSolarState(data: {
  sunrise: string;
  sunset: string;
  dawn: string;
  dusk: string;
}): SolarState | null {
  const sunsetTime = parseTime(data.sunset);
  const duskTime = parseTime(data.dusk);
  const dawnTime = parseTime(data.dawn);
  if (!sunsetTime || !duskTime || !dawnTime) return null;

  const now = new Date();
  const minutesToSunset = Math.round((sunsetTime.getTime() - now.getTime()) / 60000);
  const minutesToDark = Math.round((duskTime.getTime() - now.getTime()) / 60000);
  const isNight = now > duskTime || now < dawnTime;

  let warningLevel: SolarWarningLevel = 'none';
  if (isNight || minutesToSunset <= 30) warningLevel = 'red';
  else if (minutesToSunset <= 60) warningLevel = 'orange';
  else if (minutesToSunset <= 90) warningLevel = 'yellow';

  return {
    sunrise: data.sunrise,
    sunset: data.sunset,
    dusk: data.dusk,
    minutesToSunset,
    minutesToDark,
    isNight,
    warningLevel,
  };
}

export function useSolar(lat: number, lng: number): SolarState | null {
  const [raw, setRaw] = useState<{
    sunrise: string;
    sunset: string;
    dawn: string;
    dusk: string;
  } | null>(null);
  const [state, setState] = useState<SolarState | null>(null);

  // 抓資料（每小時）
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    let alive = true;
    const load = () =>
      fetch(`/api/solar?lat=${lat.toFixed(2)}&lng=${lng.toFixed(2)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setRaw(d))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 3600_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [lat, lng]);

  // 每分鐘重算倒數
  useEffect(() => {
    if (!raw) return;
    const tick = () => setState(computeSolarState(raw));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [raw]);

  return state;
}
