'use client';
// /admin/places — 用戶建議地點審核（Phase 19A）
// 用戶在旅程規劃輸入的自訂地點 → 這裡審核 → 一鍵採用寫入 POI 資料庫（全站可見）。
import { useCallback, useEffect, useState } from 'react';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';

interface SuggestedRow {
  id: string;
  name: string;
  google_url: string | null;
  parsed_lat: number | null;
  parsed_lng: number | null;
  poi_type: string | null;
  note: string | null;
  status: 'pending' | 'adopted' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
}

const TYPE_OPTIONS = Object.entries(POI_LABELS) as Array<
  [POIType, { zh: string; en: string }]
>;

function PendingCard({
  row,
  onDone,
}: {
  row: SuggestedRow;
  onDone: () => void;
}) {
  const [lat, setLat] = useState(row.parsed_lat?.toString() ?? '');
  const [lng, setLng] = useState(row.parsed_lng?.toString() ?? '');
  const [poiType, setPoiType] = useState(row.poi_type ?? '');
  const [nameEn, setNameEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: 'adopt' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/suggested-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          action,
          ...(action === 'adopt'
            ? {
                lat: Number(lat),
                lng: Number(lng),
                poiType,
                ...(nameEn.trim() ? { nameEn: nameEn.trim() } : {}),
              }
            : {}),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? '操作失敗');
        return;
      }
      onDone();
    } catch {
      setError('網路錯誤');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-border bg-white p-4">
      <p className="font-bold">📍 {row.name}</p>
      <p className="mt-1 text-sm text-neutral-text">
        {new Date(row.created_at).toLocaleString('zh-TW')}
        {row.google_url && (
          <>
            {' · '}
            <a
              href={row.google_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-info-border underline"
            >
              開啟 Google Maps ↗
            </a>
          </>
        )}
      </p>
      {row.note && <p className="mt-1 text-sm">💬 {row.note}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className="text-sm">
          緯度 lat{row.parsed_lat != null && '（已自動解析）'}
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="23.5"
            className="mt-1 w-full rounded-lg border border-neutral-border p-2"
          />
        </label>
        <label className="text-sm">
          經度 lng
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="121.0"
            className="mt-1 w-full rounded-lg border border-neutral-border p-2"
          />
        </label>
        <label className="text-sm">
          分類
          <select
            value={poiType}
            onChange={(e) => setPoiType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-border bg-white p-2"
          >
            <option value="">— 選擇 —</option>
            {TYPE_OPTIONS.map(([value, l]) => (
              <option key={value} value={value}>
                {POI_ICONS[value]} {l.zh}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          英文名（選填，預設同中文）
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-border p-2"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-danger-text">⚠️ {error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !lat || !lng || !poiType}
          onClick={() => void act('adopt')}
          className="rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          ✅ 採用（寫入地圖）
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('reject')}
          className="rounded-lg border border-neutral-border px-4 py-2 disabled:opacity-50"
        >
          退回
        </button>
      </div>
    </div>
  );
}

export default function AdminPlacesPage() {
  const [pending, setPending] = useState<SuggestedRow[]>([]);
  const [handled, setHandled] = useState<SuggestedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/suggested-places');
      if (res.ok) {
        const json = (await res.json()) as {
          pending: SuggestedRow[];
          handled: SuggestedRow[];
        };
        setPending(json.pending);
        setHandled(json.handled);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-bold">📍 用戶建議地點</h1>
      <p className="mt-1 text-sm text-neutral-text">
        用戶在旅程規劃輸入的自訂地點。採用後立即寫入 POI 資料庫，全站用戶可見；
        座標未自動解析時，請開啟 Google 連結確認後手動填入。
      </p>

      {loading ? (
        <p className="mt-4 text-neutral-text">載入中…</p>
      ) : (
        <>
          <h2 className="mt-4 font-bold">待審核（{pending.length}）</h2>
          <div className="mt-2 flex flex-col gap-3">
            {pending.length === 0 && (
              <p className="rounded-xl bg-white p-4 text-neutral-text">
                目前沒有待審核的建議 🎉
              </p>
            )}
            {pending.map((row) => (
              <PendingCard key={row.id} row={row} onDone={() => void load()} />
            ))}
          </div>

          {handled.length > 0 && (
            <>
              <h2 className="mt-6 font-bold">近期已處理</h2>
              <div className="mt-2 flex flex-col gap-2">
                {handled.map((row) => (
                  <p
                    key={row.id}
                    className="rounded-xl bg-white p-3 text-sm text-neutral-text"
                  >
                    {row.status === 'adopted' ? '✅ 已採用' : '🚫 已退回'}｜{row.name}
                    {row.reviewed_at &&
                      `｜${new Date(row.reviewed_at).toLocaleString('zh-TW')}`}
                  </p>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
