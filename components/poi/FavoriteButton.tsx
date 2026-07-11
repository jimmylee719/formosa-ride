'use client';
// components/poi/FavoriteButton.tsx — POI 收藏切換（Phase 19A）
// 收藏清單用模組層快取（一個 session 只抓一次），切換時同步更新。
import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';
import type { FavoriteItem } from '@/types/plan';

let favPoiIds: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

async function loadFavorites(): Promise<Set<string>> {
  if (favPoiIds) return favPoiIds;
  loadPromise ??= (async () => {
    try {
      const res = await fetch(`/api/favorites?device_id=${getDeviceId()}`);
      if (!res.ok) return new Set<string>();
      const { favorites } = (await res.json()) as { favorites: FavoriteItem[] };
      favPoiIds = new Set(favorites.flatMap((f) => (f.poi_id ? [f.poi_id] : [])));
      return favPoiIds;
    } catch {
      return new Set<string>();
    }
  })();
  return loadPromise;
}

export function FavoriteButton({ poiId }: { poiId: string }) {
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadFavorites().then((ids) => {
      if (alive) setFavorited(ids.has(poiId));
    });
    return () => {
      alive = false;
    };
  }, [poiId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), poiId }),
      });
      if (res.ok) {
        const { favorited: now } = (await res.json()) as { favorited: boolean };
        setFavorited(now);
        if (favPoiIds) {
          if (now) favPoiIds.add(poiId);
          else favPoiIds.delete(poiId);
        }
      }
    } catch {
      /* 離線時靜默，維持原狀 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={favorited === null || busy}
      aria-pressed={favorited === true}
      className={`tap-target w-full rounded-xl border py-3 font-bold ${
        favorited
          ? 'border-warning-border bg-warning-bg text-warning-text'
          : 'border-neutral-border bg-white'
      } disabled:opacity-60`}
    >
      {favorited === null
        ? '⭐ …'
        : favorited
          ? '⭐ Saved 已收藏（tap to remove 點擊取消）'
          : '☆ Save for trip planning 收藏到旅程規劃'}
    </button>
  );
}
