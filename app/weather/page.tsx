'use client';
// /weather — 天氣總覽頁（Phase 7）
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { WindCompass } from '@/components/weather/WindCompass';
import { TAIWAN_COUNTIES } from '@/lib/taiwan-counties';
import { getOfflineWeather, staleness } from '@/lib/offline-store';
import type { WeatherBundle } from '@/lib/weather';

function weekdayZh(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] ?? '';
}

function WeatherContent() {
  const paramCounty = useSearchParams().get('county');
  const [county, setCounty] = useState(
    paramCounty && TAIWAN_COUNTIES.some((c) => c.name === paramCounty)
      ? paramCounty
      : '花蓮縣'
  );
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [offlineSnapshotAt, setOfflineSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setState('loading');
    setOfflineSnapshotAt(null);
    fetch(`/api/weather?county=${encodeURIComponent(county)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: WeatherBundle) => {
        if (!alive) return;
        setBundle(d);
        setState('ok');
      })
      .catch(async () => {
        // 離線回退：讀離線包的天氣快照（Phase 11B，v7.0 C5 誠實標注時效）
        const snap = await getOfflineWeather(county);
        if (!alive) return;
        if (snap) {
          setBundle(snap);
          setOfflineSnapshotAt(snap.snapshotAt);
          setState('ok');
        } else {
          setState('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [county]);

  const period = bundle?.next36h?.[0];

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="info-primary font-bold">🌤️ 天氣 · Weather</h1>
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          aria-label="選擇縣市 Select county"
          className="tap-target rounded-xl border border-neutral-border bg-white px-3 py-2"
        >
          {TAIWAN_COUNTIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' && (
        <p className="info-secondary mt-4 rounded-xl bg-white p-6 text-center text-neutral-text">
          ⏳ 載入中… Loading…
        </p>
      )}
      {state === 'error' && (
        <p className="info-secondary mt-4 rounded-xl bg-danger-bg p-4 text-danger-text">
          天氣資料暫時無法取得，請稍後再試
          <br />
          Weather temporarily unavailable
        </p>
      )}

      {state === 'ok' && bundle && (
        <>
          {offlineSnapshotAt && (
            <p
              role="alert"
              className="mt-3 rounded-xl border-2 border-warning-border bg-warning-bg p-3 info-secondary text-warning-text"
            >
              ⚠️ 此為離線快取資料，擷取於 {staleness(offlineSnapshotAt).zh}
              ，實際天氣可能已改變
              <br />
              Offline snapshot from {staleness(offlineSnapshotAt).en} — weather may
              have changed
            </p>
          )}
          {/* 特報橫幅（含颱風） */}
          {bundle.hazards.map((h) => (
            <div
              key={`${h.phenomena}-${h.startTime}`}
              role="alert"
              className={`mt-3 rounded-xl border-2 p-3 ${
                bundle.typhoonAlert
                  ? 'border-danger-border bg-danger-bg text-danger-text'
                  : 'border-warning-border bg-warning-bg text-warning-text'
              }`}
            >
              <p className="alert-warning">
                {h.phenomena.includes('颱風') ? '🌀' : '⚠️'} {h.phenomena}
                {h.significance}
              </p>
              <p className="info-secondary">
                有效時間：{h.startTime.slice(5, 16)} ～ {h.endTime.slice(5, 16)}
              </p>
            </div>
          ))}

          {/* 目前時段 */}
          {period && (
            <div className="mt-3 rounded-2xl bg-white p-4">
              <p className="info-secondary text-neutral-text">
                {period.startTime.slice(5, 16)} ～ {period.endTime.slice(11, 16)}
              </p>
              <p className="mt-1 text-3xl font-bold">
                {period.minT}–{period.maxT}°C
              </p>
              <p className="info-primary">{period.wx}</p>
              <p className="info-secondary text-neutral-text">
                ☔ 降雨機率 {period.pop}% · {period.comfort}
              </p>
            </div>
          )}

          {/* 一週預報 */}
          <div className="mt-3 rounded-2xl bg-white p-4">
            <h2 className="info-primary font-bold">📅 一週預報 · 7-Day</h2>
            <ul className="mt-2 divide-y divide-neutral-border">
              {bundle.weekly.map((d) => (
                <li key={d.date} className="flex items-center gap-2 py-2">
                  <span className="info-secondary w-14 shrink-0 font-bold">
                    {d.date.slice(5)}（{weekdayZh(d.date)}）
                  </span>
                  <span className="info-secondary flex-1">{d.wx}</span>
                  <span className="info-secondary w-16 text-right">
                    {d.minT ?? '–'}~{d.maxT ?? '–'}°
                  </span>
                  <span className="w-8 text-right text-sm text-info-border">
                    {d.pop}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 風向（騎行重點資訊，逆風提醒 Phase 7C 使用） */}
          <div className="mt-3 rounded-2xl bg-white p-4">
            <h2 className="info-primary font-bold">🌬️ 風向風速 · Wind</h2>
            <ul className="mt-2 divide-y divide-neutral-border">
              {bundle.weekly.slice(0, 4).map((d) => (
                <li key={d.date} className="flex items-center justify-between py-2">
                  <span className="info-secondary w-16 font-bold">{d.date.slice(5)}</span>
                  <WindCompass direction={d.windDirection} speed={d.windSpeed} />
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 text-center text-sm text-neutral-text">
            資料來源：交通部中央氣象署
            {'cachedAt' in bundle &&
              `（快取於 ${String((bundle as { cachedAt?: string }).cachedAt).slice(11, 16)}）`}
          </p>
        </>
      )}
    </main>
  );
}

export default function WeatherPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <Suspense fallback={null}>
        <WeatherContent />
      </Suspense>
      <BottomNavBar />
    </div>
  );
}
