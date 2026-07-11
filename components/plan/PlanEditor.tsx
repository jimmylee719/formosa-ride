'use client';
// components/plan/PlanEditor.tsx — 行程編輯器（Phase 19A）
// 本機編輯 state → 「儲存」整份 PUT（行程資料量小，整存比逐筆同步簡單可靠）。
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDeviceId } from '@/lib/device-id';
import { POI_ICONS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';
import type { PlanDay, PlanStop, TripPlanDetail } from '@/types/plan';
import { MAX_DAYS_PER_PLAN } from '@/types/plan';
import { AddStopSheet } from '@/components/plan/AddStopSheet';

interface RouteOption {
  id: string;
  name_zh: string;
  name_en: string;
  type: string;
  distance_km: number;
}

export function PlanEditor({ planId }: { planId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlanDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [addStopFor, setAddStopFor] = useState<number | null>(null);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/plans/${planId}?device_id=${getDeviceId()}`);
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        setPlan((await res.json()) as TripPlanDetail);
      } catch {
        setLoadError(true);
      }
    })();
  }, [planId]);

  // 官方路線選單（環島主線＋支線；地方車道太多不進下拉）
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/routes');
        if (res.ok) {
          const { routes: all } = (await res.json()) as { routes: RouteOption[] };
          setRoutes(all.filter((r) => r.type !== 'custom'));
        }
      } catch {
        setRoutes([]);
      }
    })();
  }, []);

  const mutate = (fn: (p: TripPlanDetail) => TripPlanDetail) => {
    setPlan((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  };

  const updateDay = (i: number, patch: Partial<PlanDay>) =>
    mutate((p) => ({
      ...p,
      days: p.days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    }));

  const addDay = () =>
    mutate((p) => ({
      ...p,
      days: [
        ...p.days,
        {
          day_number: p.days.length + 1,
          depart_time: null,
          start_name: null,
          route_id: null,
          notes: null,
          stops: [],
        },
      ],
    }));

  const removeDay = (i: number) => {
    if (!window.confirm(`Remove Day ${i + 1}? 移除第 ${i + 1} 天？`)) return;
    mutate((p) => ({
      ...p,
      days: p.days.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day_number: idx + 1 })),
    }));
  };

  const addStop = (dayIdx: number, stop: PlanStop) =>
    mutate((p) => ({
      ...p,
      days: p.days.map((d, idx) =>
        idx === dayIdx ? { ...d, stops: [...d.stops, stop] } : d
      ),
    }));

  const removeStop = (dayIdx: number, stopIdx: number) =>
    mutate((p) => ({
      ...p,
      days: p.days.map((d, idx) =>
        idx === dayIdx ? { ...d, stops: d.stops.filter((_, s) => s !== stopIdx) } : d
      ),
    }));

  const moveStop = (dayIdx: number, stopIdx: number, dir: -1 | 1) =>
    mutate((p) => ({
      ...p,
      days: p.days.map((d, idx) => {
        if (idx !== dayIdx) return d;
        const stops = [...d.stops];
        const target = stopIdx + dir;
        if (target < 0 || target >= stops.length) return d;
        const a = stops[stopIdx];
        const b = stops[target];
        if (!a || !b) return d;
        stops[stopIdx] = b;
        stops[target] = a;
        return { ...d, stops };
      }),
    }));

  const save = async () => {
    if (!plan || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          name: plan.name,
          startDate: plan.start_date,
          notes: plan.notes,
          days: plan.days,
        }),
      });
      if (res.ok) {
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      } else {
        window.alert('Save failed 儲存失敗，請再試一次');
      }
    } catch {
      window.alert('Offline — changes not saved 離線中，尚未儲存');
    } finally {
      setSaving(false);
    }
  };

  // 分享連結（Phase 19B）：建立/複製/停用
  const shareUrl = plan?.share_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/plan/shared/${plan.share_token}`
    : null;

  const enableShare = async () => {
    if (!plan || shareBusy) return;
    setShareBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      if (res.ok) {
        const { token } = (await res.json()) as { token: string };
        setPlan((p) => (p ? { ...p, share_token: token } : p));
      }
    } finally {
      setShareBusy(false);
    }
  };

  const disableShare = async () => {
    if (!plan || shareBusy) return;
    if (!window.confirm('Disable the share link? 停用分享連結？（已拿到連結的人將無法再開啟）')) return;
    setShareBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      if (res.ok) setPlan((p) => (p ? { ...p, share_token: null } : p));
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy manually 請手動複製:', shareUrl);
    }
  };

  if (loadError) {
    return (
      <p className="info-secondary rounded-2xl bg-white p-6 text-center text-neutral-text">
        Plan not found 找不到這個行程
        <Link href="/plan" className="mt-2 block underline">
          ← Back to plans 回行程列表
        </Link>
      </p>
    );
  }
  if (!plan) {
    return <p className="info-secondary text-neutral-text">⏳ Loading… 載入中…</p>;
  }

  return (
    <div className="pb-24">
      <button
        type="button"
        onClick={() => router.push('/plan')}
        className="info-secondary tap-target text-neutral-text underline"
      >
        ← Plans 行程列表
      </button>

      {/* 行程主檔 */}
      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="info-secondary block font-bold">
          Trip name 行程名稱
          <input
            type="text"
            value={plan.name}
            maxLength={60}
            onChange={(e) => mutate((p) => ({ ...p, name: e.target.value }))}
            className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
          />
        </label>
        <label className="info-secondary mt-3 block font-bold">
          Start date 出發日
          <input
            type="date"
            value={plan.start_date ?? ''}
            onChange={(e) =>
              mutate((p) => ({ ...p, start_date: e.target.value || null }))
            }
            className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
          />
        </label>
      </div>

      {/* 分享與列印（Phase 19B） */}
      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <Link
            href={`/plan/${plan.id}/print`}
            className="tap-target flex-1 rounded-xl border border-neutral-border py-3 text-center font-bold"
          >
            🖨️ Print / PDF
          </Link>
          {!shareUrl ? (
            <button
              type="button"
              onClick={() => void enableShare()}
              disabled={shareBusy}
              className="tap-target flex-1 rounded-xl border border-neutral-border py-3 font-bold disabled:opacity-50"
            >
              🔗 Share 分享
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void disableShare()}
              disabled={shareBusy}
              className="tap-target flex-1 rounded-xl border border-neutral-border py-3 text-neutral-text disabled:opacity-50"
            >
              🚫 Stop sharing 停用分享
            </button>
          )}
        </div>
        {shareUrl && (
          <div className="mt-3">
            <p className="info-secondary text-neutral-text">
              Anyone with this link can view (read-only) and copy this plan.
              拿到連結的人可查看（唯讀）並複製這份行程。
            </p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-xl border border-neutral-border p-2 text-sm text-neutral-text"
              />
              <button
                type="button"
                onClick={() => void copyShareUrl()}
                className="tap-target shrink-0 rounded-xl bg-primary px-4 py-2 font-bold text-white"
              >
                {copied ? '✅' : 'Copy 複製'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 逐日 */}
      {plan.days.map((day, i) => (
        <section key={i} className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="info-primary font-bold">
              Day {i + 1} 第 {i + 1} 天
              {plan.start_date &&
                ` · ${new Date(new Date(plan.start_date).getTime() + i * 86400_000).toISOString().slice(5, 10)}`}
            </h2>
            <button
              type="button"
              onClick={() => removeDay(i)}
              className="tap-target text-sm text-neutral-text underline"
            >
              Remove 移除
            </button>
          </div>

          <div className="mt-2 flex gap-3">
            <label className="info-secondary block flex-1 font-bold">
              Depart 出發時間
              <input
                type="time"
                value={day.depart_time ?? ''}
                onChange={(e) => updateDay(i, { depart_time: e.target.value || null })}
                className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
              />
            </label>
            <label className="info-secondary block flex-[2] font-bold">
              From 出發地
              <input
                type="text"
                value={day.start_name ?? ''}
                maxLength={80}
                placeholder="e.g. Taipei Main Station"
                onChange={(e) => updateDay(i, { start_name: e.target.value || null })}
                className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
              />
            </label>
          </div>

          <label className="info-secondary mt-3 block font-bold">
            Follow route 走哪條路線（optional 可略過）
            <select
              value={day.route_id ?? ''}
              onChange={(e) => updateDay(i, { route_id: e.target.value || null })}
              className="tap-target mt-1 w-full rounded-xl border border-neutral-border bg-white p-3"
            >
              <option value="">— None 不指定 —</option>
              {(routes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_en || r.name_zh}（{r.distance_km} km）
                </option>
              ))}
            </select>
          </label>

          {/* 停靠點 */}
          <p className="info-secondary mt-3 font-bold">Stops 停靠點</p>
          {day.stops.length === 0 && (
            <p className="info-secondary text-neutral-text">
              No stops yet 尚未加入停靠點
            </p>
          )}
          <ol className="mt-1 flex flex-col gap-2">
            {day.stops.map((s, si) => (
              <li
                key={si}
                className="flex items-center gap-2 rounded-xl border border-neutral-border p-2"
              >
                <span className="text-xl" aria-hidden>
                  {s.poi ? (POI_ICONS[s.poi.type as POIType] ?? '📍') : '✏️'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="info-secondary block truncate font-bold">
                    {si + 1}. {s.poi ? s.poi.name_en || s.poi.name_zh : s.custom_name}
                  </span>
                  {s.poi && (
                    <span className="block truncate text-sm text-neutral-text">
                      {s.poi.name_zh}
                    </span>
                  )}
                  {s.custom_google_url && (
                    <a
                      href={s.custom_google_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-info-text underline"
                    >
                      Google Maps ↗
                    </a>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => moveStop(i, si, -1)}
                  aria-label="Move up 上移"
                  className="tap-target text-neutral-text"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStop(i, si, 1)}
                  aria-label="Move down 下移"
                  className="tap-target text-neutral-text"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(i, si)}
                  aria-label="Remove 移除"
                  className="tap-target text-neutral-text"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setAddStopFor(i)}
            className="tap-target mt-2 w-full rounded-xl border-2 border-dashed border-neutral-border py-3 text-neutral-text"
          >
            ＋ Add stop 新增停靠點
          </button>

          <label className="info-secondary mt-3 block font-bold">
            Day notes 當日備註
            <textarea
              value={day.notes ?? ''}
              maxLength={500}
              rows={2}
              onChange={(e) => updateDay(i, { notes: e.target.value || null })}
              className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
            />
          </label>
        </section>
      ))}

      {plan.days.length < MAX_DAYS_PER_PLAN && (
        <button
          type="button"
          onClick={addDay}
          className="tap-target mt-3 w-full rounded-2xl border-2 border-dashed border-neutral-border py-4 font-bold text-neutral-text"
        >
          ＋ Add day 新增一天
        </button>
      )}

      {/* 儲存列（固定底部，導覽列上方） */}
      <div className="fixed inset-x-0 bottom-16 z-20 px-4 pb-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className={`tap-target w-full rounded-2xl py-4 font-bold text-white shadow-lg ${
            savedFlash ? 'bg-safe-border' : 'bg-primary'
          } disabled:opacity-60`}
        >
          {saving
            ? 'Saving… 儲存中…'
            : savedFlash
              ? '✅ Saved 已儲存'
              : dirty
                ? 'Save 儲存變更'
                : 'Saved 已是最新'}
        </button>
      </div>

      {addStopFor !== null && (
        <AddStopSheet
          onAdd={(stop) => addStop(addStopFor, stop)}
          onClose={() => setAddStopFor(null)}
        />
      )}
    </div>
  );
}
