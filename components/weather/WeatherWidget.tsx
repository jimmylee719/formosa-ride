'use client';
// components/weather/WeatherWidget.tsx — Header 天氣小圖示（Phase 7）
// 依地圖中心自動對應最近縣市；點擊前往 /weather 總覽頁。
// 逆風提醒已於 Phase 8C 移交 BannerQueue 統一管理（v10.0 B4 單一佇列）。
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { nearestCounty } from '@/lib/taiwan-counties';
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

  const period = bundle?.next36h?.[0];
  if (!period) return null;

  const hasHazard = (bundle?.hazards?.length ?? 0) > 0;

  return (
    <Link
      href={`/weather?county=${encodeURIComponent(county)}`}
      className={`tap-target flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
        hasHazard ? 'bg-warning-bg text-warning-text font-bold' : 'bg-info-bg text-info-text'
      }`}
    >
      {hasHazard ? '⚠️' : '🌡️'} {period.minT}–{period.maxT}°
      <span className="hidden sm:inline">{county}</span>
    </Link>
  );
}
