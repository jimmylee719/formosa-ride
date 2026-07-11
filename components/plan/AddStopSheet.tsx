'use client';
// components/plan/AddStopSheet.tsx — 停靠點挑選（Phase 19A）
// 三種來源：搜尋 POI 資料庫／收藏清單／自訂輸入（自訂會同步回報管理員審核）。
import { useEffect, useRef, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';
import type { FavoriteItem, PlanStop } from '@/types/plan';

type Tab = 'search' | 'favorites' | 'custom';

interface SearchHit {
  id: string;
  name_zh: string;
  name_en: string | null;
  type: string;
}

export function AddStopSheet({
  onAdd,
  onClose,
}: {
  onAdd: (stop: PlanStop) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[] | null>(null);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 搜尋（300ms 去抖動）
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/pois/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const { results } = (await res.json()) as { results: SearchHit[] };
          setHits(results);
        }
      } catch {
        /* 網路錯誤靜默 */
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [q]);

  // 收藏（切到該頁籤才載入）
  useEffect(() => {
    if (tab !== 'favorites' || favorites !== null) return;
    void (async () => {
      try {
        const res = await fetch(`/api/favorites?device_id=${getDeviceId()}`);
        if (res.ok) {
          const { favorites: list } = (await res.json()) as { favorites: FavoriteItem[] };
          setFavorites(list.filter((f) => f.poi_id));
        } else {
          setFavorites([]);
        }
      } catch {
        setFavorites([]);
      }
    })();
  }, [tab, favorites]);

  const addPoi = (id: string, poi: { name_zh: string; name_en: string | null; type: string }) => {
    onAdd({ poi_id: id, custom_name: null, custom_google_url: null, note: null, poi });
    onClose();
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const url = customUrl.trim();
    onAdd({
      poi_id: null,
      custom_name: name,
      custom_google_url: url || null,
      note: null,
      poi: null,
    });
    // 同步回報管理員（不阻塞使用者；失敗靜默，僅影響後台佇列）
    void fetch('/api/suggested-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        name,
        ...(url ? { googleUrl: url } : {}),
      }),
    }).catch(() => undefined);
    onClose();
  };

  const icon = (type: string) => POI_ICONS[type as POIType] ?? '📍';
  const label = (type: string) => POI_LABELS[type as POIType]?.en ?? type;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40">
      <div className="max-h-[85%] overflow-y-auto rounded-t-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="info-primary font-bold">Add a stop 新增停靠點</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 關閉"
            className="close-x"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              ['search', '🔍 Search 搜尋'],
              ['favorites', '⭐ Saved 收藏'],
              ['custom', '✏️ Custom 自訂'],
            ] as Array<[Tab, string]>
          ).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`tap-target flex-1 rounded-full border px-2 py-2 text-sm ${
                tab === key
                  ? 'border-primary bg-primary font-bold text-white'
                  : 'border-neutral-border bg-white'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <div className="mt-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Store / hotel / place name 商店、旅館、地點名稱"
              className="tap-target w-full rounded-xl border border-neutral-border p-3"
            />
            <div className="mt-2 flex flex-col gap-2">
              {searching && (
                <p className="info-secondary text-neutral-text">⏳ Searching…</p>
              )}
              {!searching && q.trim().length >= 2 && hits.length === 0 && (
                <p className="info-secondary text-neutral-text">
                  No match — try the Custom tab 找不到，可改用「自訂」輸入
                </p>
              )}
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() =>
                    addPoi(h.id, { name_zh: h.name_zh, name_en: h.name_en, type: h.type })
                  }
                  className="tap-target rounded-xl border border-neutral-border p-3 text-left"
                >
                  <span className="info-primary">
                    {icon(h.type)} {h.name_en || h.name_zh}
                  </span>
                  <span className="info-secondary block text-neutral-text">
                    {h.name_zh} · {label(h.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'favorites' && (
          <div className="mt-3 flex flex-col gap-2">
            {favorites === null && (
              <p className="info-secondary text-neutral-text">⏳ Loading…</p>
            )}
            {favorites !== null && favorites.length === 0 && (
              <p className="info-secondary text-neutral-text">
                No saved places yet — tap ⭐ on any place card on the map.
                <br />
                還沒有收藏。在地圖上點任何地點卡片的 ⭐ 即可收藏。
              </p>
            )}
            {(favorites ?? []).map((f) =>
              f.poi_id && f.poi ? (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addPoi(f.poi_id as string, f.poi as NonNullable<typeof f.poi>)}
                  className="tap-target rounded-xl border border-neutral-border p-3 text-left"
                >
                  <span className="info-primary">
                    {icon(f.poi.type)} {f.poi.name_en || f.poi.name_zh}
                  </span>
                  <span className="info-secondary block text-neutral-text">
                    {f.poi.name_zh} · {label(f.poi.type)}
                  </span>
                </button>
              ) : null
            )}
          </div>
        )}

        {tab === 'custom' && (
          <div className="mt-3">
            <label className="info-secondary block font-bold">
              Place name 地點名稱 *
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={80}
                placeholder="e.g. 阿嬤的麵店 Grandma's noodles"
                className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
              />
            </label>
            <label className="info-secondary mt-3 block font-bold">
              Google Maps link 連結（optional 可略過）
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                maxLength={300}
                placeholder="https://maps.google.com/…"
                className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
              />
            </label>
            <p className="info-secondary mt-2 text-neutral-text">
              Custom places are also sent to us for review — good finds get added to
              the map for everyone. 自訂地點會同步回報給我們審核，好地點會上架到地圖分享給所有人。
            </p>
            <button
              type="button"
              onClick={addCustom}
              disabled={!customName.trim()}
              className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
            >
              Add 加入
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
