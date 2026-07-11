'use client';
// components/plan/PlanList.tsx — 行程清單＋建立（Phase 19A）
// 每裝置上限 3 個（伺服器強制，這裡同步顯示）。
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDeviceId } from '@/lib/device-id';
import { MAX_PLANS_PER_DEVICE, type TripPlanMeta } from '@/types/plan';

export function PlanList() {
  const router = useRouter();
  const [plans, setPlans] = useState<TripPlanMeta[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans?device_id=${getDeviceId()}`);
      if (!res.ok) throw new Error();
      const { plans: list } = (await res.json()) as { plans: TripPlanMeta[] };
      setPlans(list);
    } catch {
      setPlans([]);
      setError('Failed to load plans 載入失敗，請檢查網路');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          name: name.trim(),
          ...(startDate ? { startDate } : {}),
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? 'Create failed 建立失敗');
        return;
      }
      router.push(`/plan/${json.id}`);
    } catch {
      setError('Network error 網路錯誤');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (plan: TripPlanMeta) => {
    if (
      !window.confirm(
        `Delete "${plan.name}"? This cannot be undone.\n刪除「${plan.name}」？無法復原。`
      )
    ) {
      return;
    }
    await fetch(`/api/plans/${plan.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    void load();
  };

  if (plans === null) {
    return <p className="info-secondary text-neutral-text">⏳ Loading… 載入中…</p>;
  }

  const atLimit = plans.length >= MAX_PLANS_PER_DEVICE;

  return (
    <div className="flex flex-col gap-3">
      {error && !creating && (
        <p className="info-secondary rounded-xl bg-danger-bg p-3 text-danger-text">⚠️ {error}</p>
      )}
      {plans.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => router.push(`/plan/${p.id}`)}
            className="tap-target w-full text-left"
          >
            <p className="info-primary font-bold">🗓️ {p.name}</p>
            <p className="info-secondary mt-1 text-neutral-text">
              {p.day_count > 0
                ? `${p.day_count} day${p.day_count > 1 ? 's' : ''} ${p.day_count} 天`
                : 'Empty — tap to plan 尚未規劃，點擊開始'}
              {p.start_date && ` · departs 出發 ${p.start_date}`}
            </p>
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(p)}
            className="tap-target mt-1 text-sm text-neutral-text underline"
          >
            Delete 刪除
          </button>
        </div>
      ))}

      {creating ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="info-secondary block font-bold">
            Trip name 行程名稱
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. West Coast 4 days 西海岸4天"
              className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
            />
          </label>
          <label className="info-secondary mt-3 block font-bold">
            Start date 出發日（optional 可略過）
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
            />
          </label>
          {error && <p className="info-secondary mt-2 text-danger-text">⚠️ {error}</p>}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="tap-target flex-1 rounded-xl border border-neutral-border py-3"
            >
              Cancel 取消
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy || !name.trim()}
              className="tap-target flex-1 rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? '…' : 'Create 建立'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={atLimit}
          className="tap-target rounded-2xl border-2 border-dashed border-neutral-border py-4 font-bold text-neutral-text disabled:opacity-60"
        >
          {atLimit
            ? `Plan limit reached (${MAX_PLANS_PER_DEVICE}) 已達上限 ${MAX_PLANS_PER_DEVICE} 個`
            : '＋ New trip plan 新增行程'}
        </button>
      )}

      {plans.length === 0 && !creating && (
        <p className="info-secondary rounded-2xl bg-white p-4 text-center text-neutral-text">
          Start by creating your first trip — you can plan up to {MAX_PLANS_PER_DEVICE}
          (e.g. coast route vs. mountain route).
          <br />
          建立你的第一個行程吧——最多可同時規劃 {MAX_PLANS_PER_DEVICE} 個（例如海線、山線各一）。
        </p>
      )}
    </div>
  );
}
