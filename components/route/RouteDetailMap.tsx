'use client';
// components/route/RouteDetailMap.tsx — 路線詳情頁小地圖（Phase 5）
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyleUrl } from '@/lib/map-style';
import type { LineStringGeoJSON } from '@/types/route';

export function RouteDetailMap({ geometry }: { geometry: LineStringGeoJSON }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const coords = geometry.coordinates;
    if (!coords || coords.length < 2) return;

    const bounds = coords.reduce(
      (b, c) => b.extend(c as [number, number]),
      new maplibregl.LngLatBounds(
        coords[0] as [number, number],
        coords[0] as [number, number]
      )
    );

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl('outdoor'),
      bounds,
      fitBoundsOptions: { padding: 36 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry, properties: {} },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#16A34A', 'line-width': 5, 'line-opacity': 0.85 },
      });
      // 起終點標記
      new maplibregl.Marker({ color: '#16A34A' })
        .setLngLat(coords[0] as [number, number])
        .addTo(map);
      new maplibregl.Marker({ color: '#DC2626' })
        .setLngLat(coords[coords.length - 1] as [number, number])
        .addTo(map);
    });

    return () => {
      map.remove();
    };
  }, [geometry]);

  return <div ref={containerRef} className="h-56 w-full rounded-2xl" />;
}
