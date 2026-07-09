'use client';
// components/map/RouteLayer.tsx — 主地圖路線圖層（Phase 5）
// 由 /?route=<id> 查詢參數驅動：載入該路線 GeoJSON、繪製綠色線並縮放至範圍。
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/map-store';
import type { LineStringGeoJSON } from '@/types/route';

const SOURCE_ID = 'active-route';
const LAYER_ID = 'active-route-line';

export function RouteLayer() {
  const map = useMapStore((s) => s.map);
  const routeId = useSearchParams().get('route');

  useEffect(() => {
    if (!map || !routeId) return;
    let disposed = false;
    let readd: (() => void) | null = null;

    const draw = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}`);
        if (!res.ok || disposed) return;
        const { route } = (await res.json()) as {
          route: { geometry: LineStringGeoJSON };
        };
        const coords = route.geometry.coordinates;
        if (!coords || coords.length < 2) return;

        const add = () => {
          if (disposed || map.getSource(SOURCE_ID)) return;
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: { type: 'Feature', geometry: route.geometry, properties: {} },
          });
          map.addLayer({
            id: LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#16A34A', 'line-width': 5, 'line-opacity': 0.85 },
          });
          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new maplibregl.LngLatBounds(
              coords[0] as [number, number],
              coords[0] as [number, number]
            )
          );
          map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
        };

        // 'idle' 在樣式就緒後必定觸發，不像 'load' 可能在註冊前就已發生（競態）
        if (map.isStyleLoaded()) add();
        else map.once('idle', add);
        // 夜間模式 setStyle 會清空自訂圖層，監聽 style.load 重繪（Phase 7B）
        readd = add;
        map.on('style.load', add);
      } catch (err) {
        console.error('[RouteLayer] 載入路線失敗:', err);
      }
    };

    draw();

    return () => {
      disposed = true;
      try {
        if (readd) map.off('style.load', readd);
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* 地圖已銷毀 */
      }
    };
  }, [map, routeId]);

  return null;
}
