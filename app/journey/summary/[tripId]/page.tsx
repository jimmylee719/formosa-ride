'use client';
// /journey/summary/[tripId] — 多日旅程總結報告（Phase 11C，v8.0 A3）
// 局部路線與完整環島用同一套邏輯，不為特例開分支（v8.0 A5）。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { getDeviceId } from '@/lib/device-id';
import { generateTripShareImage, downloadDataUrl } from '@/lib/trip-share-image';

interface Totals {
  total_days: number;
  total_distance_km: number;
  total_ascent_m: number;
  total_calories: number;
  total_riding_minutes: number;
  counties_visited: string[] | null;
  checkpoint_count: number;
  start_date: string | null;
  end_date: string | null;
}

interface DayRow {
  day_number: number;
  date: string;
  distance_km: number;
  riding_minutes: number;
  calories: number;
}

interface Checkpoint {
  id: string;
  lat: number;
  lng: number;
  note: string | null;
  photo_url: string | null;
  marked_at: string;
}

interface SummaryResponse {
  tripStatus: string;
  totals: Totals | null;
  days: DayRow[];
  checkpoints: Checkpoint[];
}

export default function TripSummaryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/trips/${tripId}/summary?device=${getDeviceId()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SummaryResponse) => {
        if (!alive) return;
        setData(d);
        setState('ok');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [tripId]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const dataUrl = await generateTripShareImage('trip-share-card');
      downloadDataUrl(dataUrl, `formosa-ride-trip-${String(tripId).slice(0, 8)}.png`);
    } catch {
      window.alert('圖片產生失敗，請稍後再試 · Image generation failed');
    } finally {
      setSharing(false);
    }
  };

  const t = data?.totals;

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
            找不到這趟旅程 · Trip not found
          </p>
        )}
        {state === 'ok' && data && t && (
          <>
            {/* 分享卡區塊（html2canvas 擷取範圍） */}
            <div id="trip-share-card" className="rounded-2xl bg-white p-5">
              <h1 className="alert-warning text-center text-neutral-text">
                🏆 旅程完成！You did it!
              </h1>
              {t.start_date && t.end_date && (
                <p className="info-secondary mt-1 text-center text-neutral-text">
                  {t.start_date} ～ {t.end_date}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-safe-bg p-4 text-center">
                  <p className="text-3xl font-bold text-safe-text">{t.total_days}</p>
                  <p className="info-secondary text-safe-text">總天數 days</p>
                </div>
                <div className="rounded-xl bg-info-bg p-4 text-center">
                  <p className="text-3xl font-bold text-info-text">
                    {Number(t.total_distance_km).toFixed(1)}
                  </p>
                  <p className="info-secondary text-info-text">總距離 km</p>
                </div>
                <div className="rounded-xl bg-caution-bg p-4 text-center">
                  <p className="text-3xl font-bold text-caution-text">
                    {Math.round(Number(t.total_ascent_m))}
                  </p>
                  <p className="info-secondary text-caution-text">總爬升 m</p>
                </div>
                <div className="rounded-xl bg-danger-bg p-4 text-center">
                  <p className="text-3xl font-bold text-danger-text">
                    {Math.round(Number(t.total_calories)).toLocaleString()}
                  </p>
                  <p className="info-secondary text-danger-text">總消耗 kcal</p>
                </div>
              </div>

              {(t.counties_visited?.length ?? 0) > 0 && (
                <p className="info-secondary mt-3 text-center">
                  走過縣市：{(t.counties_visited ?? []).join('、')}
                </p>
              )}
              <p className="mt-3 text-center text-sm text-neutral-text">
                🚴 FormoSA Ride 環島通
              </p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
            >
              {sharing ? '產生中… Generating…' : '📤 下載分享圖片 Share card'}
            </button>

            {/* GPX 匯出（Phase 11D 接上） */}
            <p className="mt-2 text-center text-sm text-neutral-text">
              GPX 匯出功能即將推出 · GPX export coming soon
            </p>

            {/* 每日清單 */}
            <section className="mt-4 rounded-2xl bg-white p-4">
              <h2 className="info-primary font-bold">📅 每日紀錄 · Daily log</h2>
              <ul className="mt-2 divide-y divide-neutral-border">
                {data.days.map((d) => (
                  <li key={d.day_number}>
                    <Link
                      href={`/journey/summary/${tripId}/day/${d.day_number}`}
                      className="tap-target flex items-center gap-2 py-2"
                    >
                      <span className="info-secondary w-16 shrink-0 font-bold">
                        第 {d.day_number} 天
                      </span>
                      <span className="info-secondary flex-1 text-neutral-text">
                        {d.date.slice(5)}
                      </span>
                      <span className="info-secondary font-bold">
                        {Number(d.distance_km).toFixed(1)} km
                      </span>
                      <span aria-hidden>›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* 標記點（照片牆：照片上傳於後續版本，先列備註） */}
            {data.checkpoints.length > 0 && (
              <section className="mt-3 rounded-2xl bg-white p-4">
                <h2 className="info-primary font-bold">
                  📌 標記的地點（{data.checkpoints.length}）
                </h2>
                <ul className="mt-2 divide-y divide-neutral-border">
                  {data.checkpoints.map((c) => (
                    <li key={c.id} className="py-2">
                      <p className="info-secondary">
                        {c.note || '（無備註）'}
                      </p>
                      <p className="text-sm text-neutral-text">
                        {new Date(c.marked_at).toLocaleString('zh-TW')} ·{' '}
                        {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Link
              href="/"
              className="tap-target mt-4 flex items-center justify-center rounded-xl border border-neutral-border bg-white py-3 font-bold"
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
