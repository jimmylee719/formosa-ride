'use client';
// /journey/summary/[tripId]/day/[dayNumber] — 每日旅途摘要（Phase 11，v2.0 C9）
// 分享圖片卡於 Phase 11C/12B 補上；多日總結報告於 Phase 11C。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { getDeviceId } from '@/lib/device-id';

interface DaySummary {
  day_number: number;
  date: string;
  distance_km: number;
  riding_minutes: number;
  rest_minutes: number;
  calories: number;
  max_elevation: number | null;
}

export default function DaySummaryPage() {
  const params = useParams<{ tripId: string; dayNumber: string }>();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    const device = getDeviceId();
    fetch(`/api/trips/${params.tripId}/day/${params.dayNumber}?device=${device}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { summary: DaySummary }) => {
        if (!alive) return;
        setSummary(d.summary);
        setState('ok');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [params.tripId, params.dayNumber]);

  const weekday = summary
    ? ['日', '一', '二', '三', '四', '五', '六'][
        new Date(`${summary.date}T00:00:00+08:00`).getDay()
      ]
    : '';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        {state === 'loading' && (
          <p className="info-secondary mt-8 text-center text-neutral-text">
            ⏳ 載入中… Loading…
          </p>
        )}
        {state === 'error' && (
          <p className="info-secondary mt-8 rounded-xl bg-danger-bg p-4 text-danger-text">
            找不到這份摘要（可能尚未同步）
            <br />
            Summary not found (may not be synced yet)
          </p>
        )}
        {state === 'ok' && summary && (
          <>
            <h1 className="alert-warning text-center text-neutral-text">
              🏆 第 {summary.day_number} 天完成！
            </h1>
            <p className="info-secondary text-center text-neutral-text">
              {summary.date}（{weekday}）· Day {summary.day_number} done!
            </p>

            <div className="mt-4 rounded-2xl bg-white p-6 text-center">
              <p className="text-5xl font-bold text-primary">
                {Number(summary.distance_km).toFixed(1)}
              </p>
              <p className="info-primary text-neutral-text">今日公里 km today</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-4 text-center">
                <p className="text-2xl font-bold text-info-text">
                  {Math.floor(summary.riding_minutes / 60)}h{' '}
                  {summary.riding_minutes % 60}m
                </p>
                <p className="info-secondary text-neutral-text">騎乘時間 riding</p>
              </div>
              <div className="rounded-xl bg-white p-4 text-center">
                <p className="text-2xl font-bold text-info-text">
                  {summary.rest_minutes} m
                </p>
                <p className="info-secondary text-neutral-text">休息時間 rest</p>
              </div>
              <div className="rounded-xl bg-white p-4 text-center">
                <p className="text-2xl font-bold text-accent">{summary.calories}</p>
                <p className="info-secondary text-neutral-text">🔥 消耗大卡 kcal</p>
              </div>
              <div className="rounded-xl bg-white p-4 text-center">
                <p className="text-2xl font-bold text-safe-text">
                  {summary.max_elevation ?? '—'}
                </p>
                <p className="info-secondary text-neutral-text">最高海拔 m</p>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-neutral-text">
              分享圖片卡與多日總結報告將於後續版本提供
              <br />
              Share card & multi-day report coming soon
            </p>

            <Link
              href="/"
              className="tap-target mt-4 flex items-center justify-center rounded-xl bg-primary py-3 font-bold text-white"
            >
              🗺️ 回到地圖 Back to map
            </Link>
          </>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
