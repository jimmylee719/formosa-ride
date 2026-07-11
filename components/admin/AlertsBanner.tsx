'use client';
// components/admin/AlertsBanner.tsx — 後台 ⚠️ 偵錯警示橫幅（Phase 14D，v11.0 B3）
// 有未處理事件才顯示；逐項可標記已處理。
import { useEffect, useState } from 'react';

interface PendingAlert {
  alert_type: string;
  reference: string;
  message: string;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  payment_webhook_failed: '💳 付款Webhook',
  user_error_report: '🐛 錯誤回報',
  system_outage: '🔴 系統停機',
  suggested_place: '📍 建議地點',
};

export function AlertsBanner() {
  const [alerts, setAlerts] = useState<PendingAlert[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/alerts')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { alerts: PendingAlert[] }) => {
        if (alive) setAlerts(d.alerts);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const resolve = async (a: PendingAlert) => {
    setBusy(a.reference);
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_type: a.alert_type, reference: a.reference }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((x) => x.reference !== a.reference));
      }
    } finally {
      setBusy(null);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border-2 border-danger-border bg-danger-bg p-4"
    >
      <p className="font-bold text-danger-text">
        ⚠️ {alerts.length} 個系統問題需要處理
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {alerts.map((a) => (
          <li
            key={`${a.alert_type}-${a.reference}`}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-sm"
          >
            <span className="font-bold">{TYPE_LABEL[a.alert_type] ?? a.alert_type}</span>
            <span className="flex-1">{a.message}</span>
            <span className="text-neutral-text">
              {new Date(a.created_at).toLocaleString('zh-TW')}
            </span>
            {a.alert_type === 'suggested_place' ? (
              // 建議地點：到審核頁採用/退回，不在橫幅直接消化
              <a
                href="/admin/places"
                className="rounded-lg border border-neutral-border px-3 py-1.5 font-bold"
              >
                → 前往審核
              </a>
            ) : (
              <button
                type="button"
                onClick={() => resolve(a)}
                disabled={busy === a.reference}
                className="rounded-lg border border-neutral-border px-3 py-1.5 font-bold disabled:opacity-50"
              >
                ✓ 標記已處理
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
