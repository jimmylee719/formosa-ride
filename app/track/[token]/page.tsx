'use client';
// /track/[token] — 公開即時追蹤頁（Phase 11A，v7.0 A4）
// 免登入、免安裝：家人朋友開連結即可看位置。僅顯示位置，不含個資。
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrackMap } from '@/components/track/TrackMap';

interface TrackInfo {
  active: boolean;
  tripId: string;
  tripStatus: string;
  startedAt: string | null;
  todayKm: number;
  todayPoints: [number, number][];
  lastPoint: { lat: number; lng: number; recordedAt: string } | null;
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'expired'>('loading');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [todayKm, setTodayKm] = useState(0);
  const prevPointRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/track/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: TrackInfo) => {
        if (!alive) return;
        setInfo(d);
        setTodayKm(d.todayKm);
        setLastUpdate(d.lastPoint?.recordedAt ?? null);
        prevPointRef.current = d.lastPoint ? [d.lastPoint.lng, d.lastPoint.lat] : null;
        setState('ok');
      })
      .catch(() => alive && setState('expired'));
    return () => {
      alive = false;
    };
  }, [token]);

  const handleUpdate = useCallback((lat: number, lng: number, recordedAt: string) => {
    setLastUpdate(recordedAt);
    const prev = prevPointRef.current;
    prevPointRef.current = [lng, lat];
    if (prev) {
      const R = 6371;
      const dLat = ((lat - prev[1]) * Math.PI) / 180;
      const dLon = ((lng - prev[0]) * Math.PI) / 180;
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((prev[1] * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const dKm = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      setTodayKm((k) => Math.round((k + dKm) * 100) / 100);
    }
  }, []);

  if (state === 'loading') {
    return (
      <main className="flex h-dvh items-center justify-center bg-neutral-bg">
        <p className="info-primary text-neutral-text">⏳ 載入中… Loading…</p>
      </main>
    );
  }

  if (state === 'expired' || !info) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-neutral-bg p-8 text-center">
        <p className="text-4xl" aria-hidden>
          ⏰
        </p>
        <h1 className="alert-warning">此分享連結已失效</h1>
        <p className="info-secondary text-neutral-text">
          This tracking link has expired or been disabled.
          <br />
          連結可能已被分享者停用，或行程已結束超過 24 小時。
        </p>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border bg-white px-3">
        <span className="info-primary font-bold">🚴 即時位置追蹤</span>
        <span className="text-sm text-neutral-text">FormoSA Ride</span>
      </header>

      <main className="relative flex-1">
        <TrackMap
          tripId={info.tripId}
          initialPoints={info.todayPoints}
          onUpdate={handleUpdate}
        />
      </main>

      <footer className="shrink-0 border-t border-neutral-border bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="info-secondary">
            📏 今日已騎 <strong>{todayKm}</strong> km
          </span>
          <span className="info-secondary text-neutral-text">
            最後更新：
            {lastUpdate
              ? new Date(lastUpdate).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-text">
          此頁面由 FormoSA Ride 用戶主動分享，僅顯示位置資訊，不含其他個人資料。
          Location shared voluntarily; no personal data is shown.
        </p>
      </footer>
    </div>
  );
}
