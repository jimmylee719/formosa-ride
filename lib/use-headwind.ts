'use client';
// lib/use-headwind.ts — 逆風狀態 hook（Phase 8C 自 WeatherWidget 抽出，供佇列與清單共用）
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { nearestCounty } from '@/lib/taiwan-counties';
import { checkHeadwind, type HeadwindResult } from '@/lib/headwind-check';
import { useHeading } from '@/lib/use-heading';
import { windDirectionToDegrees } from '@/components/weather/WindCompass';
import type { WeatherBundle } from '@/lib/weather';

export function useHeadwind(): HeadwindResult | null {
  const center = useMapStore((s) => s.center);
  const county = nearestCounty(center[1], center[0]).name;
  const heading = useHeading();
  const [wind, setWind] = useState<{ deg: number; kmh: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/weather?county=${encodeURIComponent(county)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: WeatherBundle | null) => {
        if (!alive || !d) return;
        const today = d.weekly?.[0];
        const deg = today ? windDirectionToDegrees(today.windDirection) : null;
        const kmh = today?.windSpeed != null ? today.windSpeed * 3.6 : null;
        setWind(deg != null && kmh != null ? { deg, kmh } : null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [county]);

  if (heading == null || wind == null) return null;
  return checkHeadwind(heading, wind.deg, wind.kmh);
}
