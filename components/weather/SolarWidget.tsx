'use client';
// components/weather/SolarWidget.tsx — 日落倒數（Header 常駐，Phase 7，v3.0 B4/B5）
import { useState } from 'react';
import { useSolar } from '@/lib/solar';
import { useMapStore } from '@/store/map-store';

const CHIP_STYLE: Record<string, string> = {
  none: 'bg-neutral-bg text-neutral-text',
  yellow: 'bg-caution-bg text-caution-text',
  orange: 'bg-warning-bg text-warning-text animate-pulse',
  red: 'bg-danger-bg text-danger-text animate-pulse font-bold',
};

function toHHMM(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2}):\d{2}\s*(AM|PM)$/i);
  if (!m) return t;
  let h = Number(m[1]);
  const pm = (m[3] ?? '').toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function SolarWidget() {
  const [open, setOpen] = useState(false);
  const center = useMapStore((s) => s.center);
  const solar = useSolar(center[1], center[0]);

  if (!solar) return null;

  const chipText = solar.isNight
    ? '🌙 夜間'
    : `🌅 ${toHHMM(solar.sunset)}`;

  const advice = solar.isNight
    ? '🌙 現在是晚上，請把腳踏車的前後燈打開'
    : solar.warningLevel === 'red'
      ? '⚠️⚠️ 馬上找安全的地方停下來！天就要黑了'
      : solar.warningLevel === 'orange'
        ? '⚠️ 快天黑了！現在就找今晚的住宿或露營地'
        : solar.warningLevel === 'yellow'
          ? '天快黑了，先找好今晚住的地方吧！'
          : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`tap-target rounded-full px-3 py-1 text-sm ${CHIP_STYLE[solar.warningLevel]}`}
      >
        {chipText}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-neutral-border bg-white p-4 shadow-lg">
          <p className="info-secondary">🌅 今天日出：{toHHMM(solar.sunrise)}</p>
          <p className="info-secondary">🌇 今天日落：{toHHMM(solar.sunset)}</p>
          <p className="info-secondary">🌙 天完全黑：{toHHMM(solar.dusk)}</p>
          {!solar.isNight && solar.minutesToSunset > 0 && (
            <p className="info-primary mt-2 font-bold">
              ⏰ 距離日落：{Math.floor(solar.minutesToSunset / 60)} 小時{' '}
              {solar.minutesToSunset % 60} 分鐘
            </p>
          )}
          {advice && (
            <p
              className={`info-secondary mt-2 rounded-lg p-2 ${CHIP_STYLE[solar.warningLevel]}`}
            >
              {advice}
            </p>
          )}
          {solar.isNight && (
            <ul className="info-secondary mt-2 list-inside list-disc text-neutral-text">
              <li>晚上騎車一定要開前燈和後紅燈</li>
              <li>穿顏色鮮豔或有反光條的衣服</li>
              <li>盡量不走沒有路燈的山路</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
