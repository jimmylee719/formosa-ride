'use client';
// components/map/NightWarningLayer.tsx — 夜間危險路段圖層（Phase 7B）
// 僅夜間模式顯示；紫色半透明線（v11.0 A8）；點擊彈出原因說明。
// setStyle 會清空自訂圖層，故監聽 style.load 重繪。
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/map-store';
import type { LineStringGeoJSON } from '@/types/route';

const SOURCE_ID = 'night-segments';
const LAYER_ID = 'night-segments-line';

interface NightSegment {
  id: string;
  name_zh: string;
  name_en: string | null;
  geometry: LineStringGeoJSON;
  warning_reason_zh: string | null;
  warning_reason_en: string | null;
  severity: string;
}

export function NightWarningLayer() {
  const map = useMapStore((s) => s.map);
  const isNightMode = useMapStore((s) => s.isNightMode);
  const segmentsRef = useRef<NightSegment[] | null>(null);

  useEffect(() => {
    if (!map || !isNightMode) return;
    let disposed = false;

    const add = () => {
      const segs = segmentsRef.current;
      if (disposed || !segs || map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: segs.map((s) => ({
            type: 'Feature' as const,
            geometry: s.geometry,
            properties: {
              name_zh: s.name_zh,
              reason_zh: s.warning_reason_zh ?? '',
              reason_en: s.warning_reason_en ?? '',
              severity: s.severity,
            },
          })),
        },
      });
      map.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#8B5CF6', // 紫色半透明（v11.0 A8）
          'line-width': ['case', ['==', ['get', 'severity'], 'high'], 6, 4],
          'line-opacity': 0.55,
        },
      });
    };

    const onClick = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }
    ) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, string>;
      new maplibregl.Popup({ maxWidth: '280px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong style="font-size:16px">🌙 ${p.name_zh}</strong>` +
            `<p style="margin:4px 0 0;font-size:14px">此路段在夜間光線不足，不建議在日落後騎行。</p>` +
            `<p style="margin:4px 0 0;font-size:13px;color:#64748B">${p.reason_zh}</p>` +
            `<p style="margin:4px 0 0;font-size:12px;color:#64748B">${p.reason_en}</p>`
        )
        .addTo(map);
    };

    const load = async () => {
      if (!segmentsRef.current) {
        try {
          const res = await fetch('/api/night-segments');
          if (!res.ok) return;
          const json = (await res.json()) as { segments: NightSegment[] };
          segmentsRef.current = json.segments;
        } catch {
          return;
        }
      }
      if (disposed) return;
      if (map.isStyleLoaded()) add();
      else map.once('idle', add);
      map.on('style.load', add); // 夜間深色底圖切換後重繪
      map.on('click', LAYER_ID, onClick);
    };
    load();

    return () => {
      disposed = true;
      map.off('style.load', add);
      map.off('click', LAYER_ID, onClick);
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, isNightMode]);

  return null;
}
