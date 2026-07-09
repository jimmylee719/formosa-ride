'use client';
// components/weather/WeatherWidget.tsx — Header 天氣小圖示（Phase 7）
// 依地圖中心自動對應最近縣市；點擊前往 /weather 總覽頁。
// Phase 7C：內含逆風提醒條件渲染（v8.0 B3，不新建元件）。
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { nearestCounty } from '@/lib/taiwan-counties';
import { checkHeadwind } from '@/lib/headwind-check';
import { useHeading } from '@/lib/use-heading';
import { windDirectionToDegrees } from '@/components/weather/WindCompass';
import type { WeatherBundle } from '@/lib/weather';

export function WeatherWidget() {
  const center = useMapStore((s) => s.center);
  const county = nearestCounty(center[1], center[0]).name;
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/weather?county=${encodeURIComponent(county)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setBundle(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [county]);

  const heading = useHeading();

  const period = bundle?.next36h?.[0];
  if (!period) return null;

  const hasHazard = (bundle?.hazards?.length ?? 0) > 0;

  // 逆風判斷（Phase 7C）：需有行進方位 + 今日風向風速資料
  const today = bundle?.weekly?.[0];
  const windDeg = today ? windDirectionToDegrees(today.windDirection) : null;
  const windKmh = today?.windSpeed != null ? today.windSpeed * 3.6 : null;
  const headwind =
    heading != null && windDeg != null && windKmh != null
      ? checkHeadwind(heading, windDeg, windKmh)
      : null;

  return (
    <>
      <Link
        href={`/weather?county=${encodeURIComponent(county)}`}
        className={`tap-target flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
          hasHazard ? 'bg-warning-bg text-warning-text font-bold' : 'bg-info-bg text-info-text'
        }`}
      >
        {hasHazard ? '⚠️' : '🌡️'} {period.minT}–{period.maxT}°
        <span className="hidden sm:inline">{county}</span>
      </Link>

      {headwind?.isHeadwind && (
        <p className="headwind-notice fixed inset-x-3 top-14 z-20 rounded-xl bg-info-bg px-4 py-2 text-info-text info-secondary shadow">
          🌬️ 目前為逆風（風速 {Math.round(headwind.windSpeedKmh)} km/h），騎行會比較吃力
          <span className="block text-sm">
            Headwind detected ({Math.round(headwind.windSpeedKmh)} km/h) — riding will
            be tougher than usual
          </span>
        </p>
      )}
    </>
  );
}
