'use client';
// components/poi/POILayer.tsx — POI 圖層（Phase 4）
// 依地圖視角動態載入附近 POI（zoom ≥ 10 才載入，避免低縮放抓全台耗資源），
// 以 DOM Marker 呈現 emoji 圖示（v3.0 D3 圖示對照），點擊後寫入 store 供 POICard 顯示。

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/map-store';
import { POI_ICONS } from '@/lib/poi-icons';
import { defaultTypesForZoom } from '@/lib/poi-default-visibility';
import { getOfflinePoisNear } from '@/lib/offline-store';
import type { POIRecord } from '@/types/poi';

const MIN_POI_ZOOM = 10;
const MAX_MARKERS = 200;

/** 依縮放層級決定查詢半徑（km） */
function radiusForZoom(zoom: number): number {
  if (zoom >= 14) return 3;
  if (zoom >= 13) return 5;
  if (zoom >= 12) return 8;
  if (zoom >= 11) return 15;
  return 25;
}

export function POILayer() {
  const map = useMapStore((s) => s.map);
  const setSelectedPoi = useMapStore((s) => s.setSelectedPoi);
  const activeTypes = useMapStore((s) => s.activeTypes);
  const accommodationSubtypes = useMapStore((s) => s.accommodationSubtypes);
  const setUsingOfflineData = useMapStore((s) => s.setUsingOfflineData);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

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
      if (zoom < MIN_POI_ZOOM) {
        clearMarkers();
        return;
      }
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
          `/api/pois?lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}&radius=${radiusForZoom(zoom)}${typesParam}${subtypesParam}`,
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

  return null;
}
