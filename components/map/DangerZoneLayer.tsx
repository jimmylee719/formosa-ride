'use client';
// components/map/DangerZoneLayer.tsx — 危險路段 + 禁行路段圖層（Phase 8，v3.0 A4）
// 高風險：紅實線 + 2 秒緩慢閃爍；中風險：橘虛線；低風險：黃虛線；禁行：深灰虛線。
// 點擊任一路段 → 寫入 store，由 DangerWarningCard 顯示底部警示卡。
import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore, type SelectedDanger } from '@/store/map-store';
import type { LineStringGeoJSON } from '@/types/route';

const DANGER_SOURCE = 'danger-zones';
const DANGER_LAYER = 'danger-zones-line';
const RESTRICTED_SOURCE = 'restricted-roads';
const RESTRICTED_LAYER = 'restricted-roads-line';
const MIN_ZOOM = 7;

interface DangerFeature {
  id: string;
  name_zh: string;
  name_en: string | null;
  level: 'high' | 'medium' | 'low';
  geometry: LineStringGeoJSON;
  reason_zh: string | null;
  reason_en: string | null;
  is_night_only: boolean;
}

interface RestrictedRoad {
  id: string;
  name_zh: string;
  name_en: string | null;
  geometry: LineStringGeoJSON;
  road_type: string | null;
  road_number: string | null;
  law_basis: string | null;
}

export function DangerZoneLayer() {
  const map = useMapStore((s) => s.map);
  const isNightMode = useMapStore((s) => s.isNightMode);
  const setSelectedDanger = useMapStore((s) => s.setSelectedDanger);
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!map) return;
    let disposed = false;
    let restrictedCache: RestrictedRoad[] | null = null;

    const addRestricted = () => {
      if (disposed || !restrictedCache || map.getSource(RESTRICTED_SOURCE)) return;
      map.addSource(RESTRICTED_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: restrictedCache.map((r) => ({
            type: 'Feature' as const,
            geometry: r.geometry,
            properties: {
              name_zh: r.name_zh,
              name_en: r.name_en ?? '',
              road_number: r.road_number ?? '',
              law_basis: r.law_basis ?? '',
            },
          })),
        },
      });
      map.addLayer({
        id: RESTRICTED_LAYER,
        type: 'line',
        source: RESTRICTED_SOURCE,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': '#334155', // 深灰 = 禁行（顏色語言 §5.3）
          'line-width': 4,
          'line-opacity': 0.8,
          'line-dasharray': [2, 1.5],
        },
      });
    };

    // 骨架：空資料的 source + layer（style 就緒時建立，之後只 setData，避免競態）
    const addDangerScaffold = () => {
      if (disposed || map.getSource(DANGER_SOURCE)) return;
      map.addSource(DANGER_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: DANGER_LAYER,
        type: 'line',
        source: DANGER_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'level'],
            'high', '#DC2626',
            'medium', '#D97706',
            '#CA8A04', // low
          ],
          'line-width': ['match', ['get', 'level'], 'high', 6, 'medium', 4, 3],
          'line-opacity': 0.7,
        },
      });
    };

    const upsertDangerSource = async () => {
      if (map.getZoom() < MIN_ZOOM) return;
      const b = map.getBounds();
      try {
        const res = await fetch(
          `/api/danger-zones?bbox=${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}&night_mode=${isNightMode}`
        );
        if (!res.ok || disposed) return;
        const { features } = (await res.json()) as { features: DangerFeature[] };
        const fc = {
          type: 'FeatureCollection' as const,
          features: features.map((f) => ({
            type: 'Feature' as const,
            geometry: f.geometry,
            properties: {
              name_zh: f.name_zh,
              name_en: f.name_en ?? '',
              level: f.level,
              reason_zh: f.reason_zh ?? '',
              reason_en: f.reason_en ?? '',
            },
          })),
        };
        const src = map.getSource(DANGER_SOURCE) as maplibregl.GeoJSONSource | undefined;
        if (!src) {
          // 骨架尚未建立（style 未就緒）：等地圖閒置後重試，避免這批資料被丟掉
          map.once('idle', () => void upsertDangerSource());
          return;
        }
        src.setData(fc);
      } catch {
        /* 網路錯誤靜默，下次 moveend 重試 */
      }
    };

    const onClickDanger = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }
    ) => {
      const p = e.features?.[0]?.properties as Record<string, string> | undefined;
      if (!p) return;
      setSelectedDanger({
        kind: 'danger',
        level: (p.level as SelectedDanger['level']) ?? 'medium',
        name_zh: p.name_zh ?? '',
        name_en: p.name_en || null,
        reason_zh: p.reason_zh || null,
        reason_en: p.reason_en || null,
        accident_count: null,
        accident_source: null,
        data_year: null,
        road_number: null,
        law_basis: null,
      });
    };

    const onClickRestricted = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }
    ) => {
      const p = e.features?.[0]?.properties as Record<string, string> | undefined;
      if (!p) return;
      setSelectedDanger({
        kind: 'restricted',
        level: 'restricted',
        name_zh: p.name_zh ?? '',
        name_en: p.name_en || null,
        reason_zh: null,
        reason_en: null,
        accident_count: null,
        accident_source: null,
        data_year: null,
        road_number: p.road_number || null,
        law_basis: p.law_basis || null,
      });
    };

    const setupAll = async () => {
      if (!restrictedCache) {
        try {
          const res = await fetch('/api/restricted-roads');
          if (res.ok) {
            restrictedCache = ((await res.json()) as { roads: RestrictedRoad[] }).roads;
          }
        } catch {
          restrictedCache = [];
        }
      }
      if (disposed) return;
      const add = () => {
        addRestricted();
        addDangerScaffold();
        void upsertDangerSource();
      };
      if (map.isStyleLoaded()) add();
      else map.once('idle', add);
      map.on('style.load', add); // 夜間換底圖後重繪
    };

    void setupAll();
    map.on('moveend', upsertDangerSource);
    map.on('click', DANGER_LAYER, onClickDanger);
    map.on('click', RESTRICTED_LAYER, onClickRestricted);

    // 高風險閃爍：每 2 秒 opacity 0.4 ↔ 0.8（v3.0 A4）
    let dim = false;
    flashTimer.current = setInterval(() => {
      if (!map.getLayer(DANGER_LAYER)) return;
      dim = !dim;
      map.setPaintProperty(DANGER_LAYER, 'line-opacity', [
        'match',
        ['get', 'level'],
        'high', dim ? 0.4 : 0.8,
        0.7,
      ]);
    }, 2000);

    return () => {
      disposed = true;
      if (flashTimer.current) clearInterval(flashTimer.current);
      map.off('moveend', upsertDangerSource);
      map.off('click', DANGER_LAYER, onClickDanger);
      map.off('click', RESTRICTED_LAYER, onClickRestricted);
      for (const layer of [DANGER_LAYER, RESTRICTED_LAYER]) {
        if (map.getLayer(layer)) map.removeLayer(layer);
      }
      for (const src of [DANGER_SOURCE, RESTRICTED_SOURCE]) {
        if (map.getSource(src)) map.removeSource(src);
      }
    };
  }, [map, isNightMode, setSelectedDanger]);

  return null;
}
