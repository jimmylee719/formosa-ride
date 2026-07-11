'use client';
// components/poi/POILayer.tsx — POI 圖層（Phase 4）
// 依地圖視角動態載入附近 POI（zoom ≥ 10 才載入，避免低縮放抓全台耗資源），
// 以 DOM Marker 呈現 emoji 圖示（v3.0 D3 圖示對照），點擊後寫入 store 供 POICard 顯示。

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/map-store';
import { POI_ICONS } from '@/lib/poi-icons';
import { defaultTypesForZoom } from '@/lib/poi-default-visibility';
import { getOfflinePoisNear } from '@/lib/offline-store';
import type { POIRecord } from '@/types/poi';

// 需放大到街區級才顯示地點（2026-07-11 Jimmy：低縮放時便利商店等會擠成一團）
const MIN_POI_ZOOM = 13;
const MAX_MARKERS = 120;
const FETCH_LIMIT = 250; // 伺服器截前 N 筆（距離最近優先），低縮放大半徑不炸流量

/** 依縮放層級決定查詢半徑（km）；zoom<10 僅在使用者有篩選時會走到（50km＝API 上限） */
function radiusForZoom(zoom: number): number {
  if (zoom >= 14) return 3;
  if (zoom >= 13) return 5;
  if (zoom >= 12) return 8;
  if (zoom >= 11) return 15;
  if (zoom >= 10) return 25;
  return 50;
}

export function POILayer() {
  const map = useMapStore((s) => s.map);
  const setSelectedPoi = useMapStore((s) => s.setSelectedPoi);
  const activeTypes = useMapStore((s) => s.activeTypes);
  const accommodationSubtypes = useMapStore((s) => s.accommodationSubtypes);
  const setUsingOfflineData = useMapStore((s) => s.setUsingOfflineData);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  // 縮放不足、暫不顯示地點時給提示（避免使用者以為壞掉）
  const [zoomHint, setZoomHint] = useState(false);

  useEffect(() => {
    if (!map) return;
    let disposed = false;
    let controller: AbortController | null = null;
    const markers = markersRef.current;

    const clearMarkers = () => {
      markers.forEach((m) => m.remove());
      markers.clear();
    };

    const renderPois = (pois: POIRecord[]) => {
        const wanted = pois.slice(0, MAX_MARKERS);
        const wantedIds = new Set(wanted.map((p) => p.id));

        // 移除視野外的舊 marker
        markers.forEach((marker, id) => {
          if (!wantedIds.has(id)) {
            marker.remove();
            markers.delete(id);
          }
        });

        // 新增缺少的 marker
        for (const poi of wanted) {
          if (markers.has(poi.id)) continue;
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'poi-marker';
          el.setAttribute('aria-label', poi.name_zh);
          el.textContent = POI_ICONS[poi.type] ?? '📍';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedPoi(poi);
            map.easeTo({ center: [poi.lng, poi.lat] });
          });
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([poi.lng, poi.lat])
            .addTo(map);
          markers.set(poi.id, marker);
        }
    };

    const fetchPois = async () => {
      const zoom = map.getZoom();
      // 統一門檻（2026-07-11 Jimmy）：不論有無篩選，都要放大到街區級（≥13）才顯示，
      // 否則便利商店等密集點會在低縮放擠成一團。10–13 之間給「放大以顯示」提示。
      if (zoom < MIN_POI_ZOOM) {
        clearMarkers();
        setZoomHint(zoom >= 10);
        return;
      }
      setZoomHint(false);
      const c = map.getCenter();
      controller?.abort();
      controller = new AbortController();
      // 使用者選了篩選 → 依使用者；沒選 → 依縮放層級漸進顯示（避免地圖塞滿）
      const effectiveTypes =
        activeTypes.length > 0 ? activeTypes : defaultTypesForZoom(zoom);
      const typesParam =
        effectiveTypes && effectiveTypes.length > 0
          ? `&types=${effectiveTypes.join(',')}`
          : '';
      // 住宿子類型（Phase 15B）：僅在使用者選了住宿時傳遞
      const subtypesParam =
        activeTypes.includes('accommodation') && accommodationSubtypes.length > 0
          ? `&subtypes=${accommodationSubtypes.join(',')}`
          : '';
      try {
        const res = await fetch(
          `/api/pois?lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}&radius=${radiusForZoom(zoom)}&limit=${FETCH_LIMIT}${typesParam}${subtypesParam}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(String(res.status));
        const { pois } = (await res.json()) as { pois: POIRecord[] };
        if (disposed) return;
        setUsingOfflineData(false);
        renderPois(pois);
      } catch (err) {
        if ((err as Error).name === 'AbortError' || disposed) return;
        // 離線回退：改讀已下載的離線包（Phase 11B，v7.0 C）
        try {
          const { pois } = await getOfflinePoisNear(c.lat, c.lng, radiusForZoom(zoom));
          const offlineTypes =
            activeTypes.length > 0 ? activeTypes : defaultTypesForZoom(map.getZoom());
          const filtered = offlineTypes
            ? pois.filter((p) => offlineTypes.includes(p.type))
            : pois;
          if (disposed) return;
          if (filtered.length > 0) setUsingOfflineData(true);
          renderPois(filtered);
        } catch {
          console.error('[POILayer] 線上與離線載入皆失敗');
        }
      }
    };

    map.on('moveend', fetchPois);
    fetchPois();

    return () => {
      disposed = true;
      controller?.abort();
      map.off('moveend', fetchPois);
      clearMarkers();
    };
  }, [map, setSelectedPoi, activeTypes, accommodationSubtypes, setUsingOfflineData]);

  if (!zoomHint) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
      <div className="rounded-full bg-white/95 px-4 py-2 text-center shadow-lg backdrop-blur">
        <p className="info-secondary font-bold text-neutral-text">
          🔍 Zoom in to see places · 放大地圖以顯示地點
        </p>
      </div>
    </div>
  );
}
