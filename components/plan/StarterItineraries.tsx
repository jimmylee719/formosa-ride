'use client';
// components/plan/StarterItineraries.tsx — 現成行程一鍵套用（2026-07-11）
// 兩組 9 天情境模擬：新手/懶得逐日挑的人，一鍵生成可編輯的環島行程。
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDeviceId } from '@/lib/device-id';
import { ITINERARIES } from '@/lib/itineraries';

export function StarterItineraries() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const use = async (presetId: string) => {
    if (busyId) return;
    setBusyId(presetId);
    setError(null);
    try {
      const res = await fetch('/api/plans/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), presetId }),
      });
      const json = (await res.json()) as { id?: string; error?: string; code?: string };
      if (res.status === 409 && json.code === 'limit') {
        setError('You already have 3 plans — delete one first. 已達 3 個上限，請先刪除一個。');
        return;
      }
      if (!res.ok || !json.id) {
        setError(json.error ?? 'Could not create 建立失敗');
        return;
      }
      router.push(`/plan/${json.id}`);
    } catch {
      setError('Network error 網路錯誤');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mb-4">
      <h2 className="info-primary font-bold">✨ Ready-made itineraries · 現成行程</h2>
      <p className="info-secondary mb-2 text-neutral-text">
        One tap creates an editable plan. 一鍵生成，之後可自由修改。
      </p>
      {error && (
        <p className="info-secondary mb-2 rounded-xl bg-danger-bg p-3 text-danger-text">⚠️ {error}</p>
      )}
      <div className="flex flex-col gap-3">
        {ITINERARIES.map((it) => (
          <div key={it.id} className="rounded-2xl border border-primary/30 bg-white p-4 shadow-sm">
            <p className="info-primary font-bold">{it.name_en}</p>
            <p className="info-secondary text-neutral-text">{it.name_zh}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-info-bg px-3 py-0.5 text-sm text-info-text">
                🗓️ {it.days} days 天
              </span>
              <span className="info-secondary font-bold">📏 ~{it.distance_km} km</span>
              <span className="info-secondary">⛰️ +{it.total_ascent_m.toLocaleString()} m</span>
            </div>
            <p className="info-secondary mt-1 text-neutral-text">
              {it.difficulty_en} · {it.difficulty_zh}
            </p>
            <p className="info-secondary mt-2">{it.summary_en}</p>
            <p className="mt-1 text-sm text-neutral-text">{it.summary_zh}</p>
            <button
              type="button"
              onClick={() => void use(it.id)}
              disabled={busyId !== null}
              className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
            >
              {busyId === it.id ? 'Creating… 建立中…' : 'Use this itinerary 使用這個行程'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
