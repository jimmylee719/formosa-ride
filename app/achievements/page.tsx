'use client';
// /achievements — 數位環島認證（2026-07-13 Jimmy 指示）
// 地標徽章牆 + 環島完賽證書（html2canvas 匯出，蓋租車品牌 icon）+ 縣市收集。
// 成就於「結束整趟旅程」時由 /api/trips/complete 依 GPS 佐證自動授予（見 lib/certification.ts）。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { getDeviceId } from '@/lib/device-id';
import { generateTripShareImage, downloadDataUrl } from '@/lib/trip-share-image';
import { LANDMARKS } from '@/lib/landmarks';
import { COUNTY_EN } from '@/lib/county-en';

interface CertMeta {
  landmarks?: string[];
  lat_span_km?: number;
  loop_close_km?: number;
}
interface AchievementsResponse {
  landmarks: string[];
  counties: string[];
  certificate: { distance_km: number; meta: CertMeta | null; earned_at: string } | null;
}

const ALL_COUNTIES = Object.keys(COUNTY_EN);

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/achievements?device_id=${getDeviceId()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: AchievementsResponse) => {
        if (!alive) return;
        setData(d);
        setState('ok');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  const handleShare = async () => {
    setSharing(true);
    try {
      const dataUrl = await generateTripShareImage('cert-card');
      downloadDataUrl(dataUrl, 'formosa-ride-huandao-certificate.png');
    } catch {
      window.alert('圖片產生失敗，請稍後再試 · Image generation failed');
    } finally {
      setSharing(false);
    }
  };

  const earnedLandmarks = new Set(data?.landmarks ?? []);
  const earnedCounties = new Set(data?.counties ?? []);
  const cert = data?.certificate ?? null;
  const certDate = cert ? new Date(cert.earned_at).toLocaleDateString('en-CA') : '';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary mb-3 font-bold">🏅 Achievements 環島認證</h1>

        {state === 'loading' && (
          <p className="info-secondary mt-8 text-center text-neutral-text">
            ⏳ 載入中… Loading…
          </p>
        )}
        {state === 'error' && (
          <p className="info-secondary mt-8 rounded-xl bg-danger-bg p-4 text-danger-text">
            載入失敗，請稍後再試 · Failed to load
          </p>
        )}

        {state === 'ok' && data && (
          <>
            {/* ── 環島完賽證書 ─────────────────────────── */}
            {cert ? (
              <>
                <div
                  id="cert-card"
                  className="rounded-2xl border-4 border-accent bg-white p-6 text-center"
                >
                  <Image
                    src="/icons/icon-512.png"
                    alt="Brand"
                    width={72}
                    height={72}
                    className="mx-auto rounded-2xl"
                    unoptimized
                  />
                  <p className="info-secondary mt-3 tracking-widest text-accent">
                    CERTIFICATE OF COMPLETION
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-neutral-text">
                    環島完賽證書
                  </h2>
                  <p className="info-secondary mt-2 text-neutral-text">
                    Round-Island Taiwan by Bicycle
                  </p>
                  <p className="mt-4 text-4xl font-bold text-accent">
                    {Number(cert.distance_km).toFixed(0)}
                    <span className="ml-1 text-lg">km</span>
                  </p>
                  <p className="info-secondary mt-1 text-neutral-text">
                    GPS-verified · GPS 軌跡佐證
                  </p>
                  {(cert.meta?.landmarks?.length ?? 0) > 0 && (
                    <p className="info-secondary mt-2 text-neutral-text">
                      經過 {cert.meta?.landmarks?.length} 個關鍵地標 landmarks
                    </p>
                  )}
                  <p className="info-secondary mt-4 text-neutral-text">{certDate}</p>
                  <p className="mt-1 text-sm text-neutral-text">🚴 FormoSA Ride 環島通</p>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing}
                  className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
                >
                  {sharing ? '產生中… Generating…' : '📤 下載證書 Download certificate'}
                </button>
              </>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-neutral-border bg-white p-6 text-center">
                <p className="text-4xl" aria-hidden>
                  🔒
                </p>
                <h2 className="info-primary mt-2 font-bold">環島完賽證書 Round-island certificate</h2>
                <p className="info-secondary mt-2 text-neutral-text">
                  Finish a round-island ride and your certificate is awarded
                  automatically when you end the trip — proven by your GPS track.
                  <br />
                  完成環島後，在「結束旅程」時系統會依你的 GPS 軌跡自動頒發證書。
                </p>
              </div>
            )}

            {/* ── 關鍵地標徽章 ─────────────────────────── */}
            <section className="mt-5">
              <h2 className="info-primary font-bold">
                🧭 Landmarks 關鍵地標（{earnedLandmarks.size}/{LANDMARKS.length}）
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {LANDMARKS.map((lm) => {
                  const on = earnedLandmarks.has(lm.id);
                  return (
                    <div
                      key={lm.id}
                      className={`rounded-2xl border p-3 text-center ${
                        on
                          ? 'border-safe-border bg-safe-bg'
                          : 'border-neutral-border bg-white opacity-60'
                      }`}
                    >
                      <p className="text-3xl" aria-hidden>
                        {on ? lm.emoji : '🔒'}
                      </p>
                      <p className="info-secondary mt-1 font-bold">{lm.name_en}</p>
                      <p className="text-sm text-neutral-text">{lm.name_zh}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── 縣市收集 ─────────────────────────────── */}
            <section className="mt-5">
              <h2 className="info-primary font-bold">
                🗺️ Counties 縣市收集（{earnedCounties.size}/{ALL_COUNTIES.length}）
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALL_COUNTIES.map((c) => {
                  const on = earnedCounties.has(c);
                  return (
                    <span
                      key={c}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        on
                          ? 'border-safe-border bg-safe-bg font-bold text-safe-text'
                          : 'border-neutral-border bg-white text-neutral-text opacity-60'
                      }`}
                    >
                      {on ? '✅' : '⬜'} {COUNTY_EN[c]} {c}
                    </span>
                  );
                })}
              </div>
              <p className="info-secondary mt-2 text-neutral-text">
                County badges are awarded from the GPS tracks of your trips.
                <br />
                縣市徽章依你行程的 GPS 軌跡自動授予。
              </p>
            </section>

            <Link
              href="/"
              className="tap-target mt-5 flex items-center justify-center rounded-xl border border-neutral-border bg-white py-3 font-bold"
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
