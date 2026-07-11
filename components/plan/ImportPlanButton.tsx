'use client';
// components/plan/ImportPlanButton.tsx — 「加入我的規劃」（Phase 19B）
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDeviceId } from '@/lib/device-id';

export function ImportPlanButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/plans/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), token }),
      });
      const json = (await res.json()) as { id?: string; error?: string; code?: string };
      if (!res.ok || !json.id) {
        setError(
          json.code === 'limit'
            ? 'You already have 3 plans — delete one first. 你已有 3 個行程，請先刪除一個。'
            : (json.error ?? 'Import failed 匯入失敗')
        );
        return;
      }
      router.push(`/plan/${json.id}`);
    } catch {
      setError('Network error 網路錯誤');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={busy}
        className="tap-target w-full rounded-2xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-60"
      >
        {busy ? 'Importing… 匯入中…' : '➕ Add to my plans 加入我的旅程規劃'}
      </button>
      {error && <p className="info-secondary mt-2 text-danger-text">⚠️ {error}</p>}
      <p className="info-secondary mt-2 text-center text-neutral-text">
        You&apos;ll get your own editable copy — changes won&apos;t affect the sender.
        <br />
        會複製一份成你自己的行程，修改不影響對方。
      </p>
    </div>
  );
}
