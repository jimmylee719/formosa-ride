'use client';
// components/mobile/ShareModal.tsx — 位置分享面板（Phase 11A，v7.0 A3）
import { useCallback, useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';

interface ShareLink {
  share_token: string;
  recipient_label: string | null;
  is_active: boolean;
  view_count: number;
  last_viewed_at: string | null;
}

export function ShareModal({
  tripId,
  onClose,
}: {
  tripId: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/trips/share?device=${getDeviceId()}&tripId=${tripId}`
    );
    if (res.ok) {
      const d = (await res.json()) as { links: ShareLink[] };
      setLinks(d.links);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    await fetch('/api/trips/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        tripId,
        recipientLabel: label,
      }),
    });
    setLabel('');
    await load();
    setBusy(false);
  };

  const disable = async (token: string) => {
    await fetch('/api/trips/share', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), tripId, shareToken: token }),
    });
    await load();
  };

  const copy = async (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt('複製此連結 Copy this link:', url);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80%] w-full overflow-y-auto rounded-t-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="info-primary font-bold">📍 分享即時位置給家人朋友</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉 Close"
            className="close-x"
          >
            ✕
          </button>
        </div>
        <p className="info-secondary mt-1 text-neutral-text">
          對方不需要安裝或註冊，打開連結就能看到你的位置。
        </p>

        <div className="mt-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="幫連結取名（例：媽媽看的）"
            maxLength={50}
            className="tap-target min-w-0 flex-1 rounded-xl border border-neutral-border px-3 py-2"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="tap-target shrink-0 rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50"
          >
            產生連結
          </button>
        </div>

        {links.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-border">
            {links.map((l) => (
              <li key={l.share_token} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="info-secondary min-w-0 flex-1 truncate font-bold">
                    {l.recipient_label || '未命名連結'}
                    {!l.is_active && (
                      <span className="ml-1 text-neutral-text">（已停用）</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-neutral-text">
                    👁️ {l.view_count} 次
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-info-border">
                  /track/{l.share_token}
                </p>
                {l.is_active && (
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void copy(l.share_token)}
                      className="tap-target flex-1 rounded-lg bg-info-bg py-2 text-sm font-bold text-info-text"
                    >
                      {copied === l.share_token ? '✅ 已複製！' : '📋 複製連結'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void disable(l.share_token)}
                      className="tap-target flex-1 rounded-lg bg-neutral-bg py-2 text-sm text-neutral-text"
                    >
                      🚫 停用
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-sm text-neutral-text">
          ⏰ 連結將於行程結束後 24 小時自動失效，你也可以隨時停用。
        </p>
      </div>
    </div>
  );
}
