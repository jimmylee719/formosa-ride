'use client';
// components/track/TrackMap.tsx — 公開追蹤地圖（Phase 11A，v7.0 A5）
// Supabase Realtime 訂閱 trip_points INSERT，無需手動重新整理。
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyleUrl } from '@/lib/map-style';
import { supabase } from '@/lib/supabase';

const TRAIL_SOURCE = 'track-trail';
const TRAIL_LAYER = 'track-trail-line';

export function TrackMap({
  tripId,
  initialPoints,
  onUpdate,
}: {
  tripId: string;
  initialPoints: [number, number][];
  onUpdate: (lat: number, lng: number, recordedAt: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const pointsRef = useRef<[number, number][]>(initialPoints);
  const lastEventRef = useRef<string | null>(null); // 事件去重（雙訂閱/重連時防重複計算）
  const [live, setLive] = useState(false);

  // 地圖初始化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const last = pointsRef.current[pointsRef.current.length - 1];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl('outdoor'),
      center: last ?? [120.9605, 23.6978],
      zoom: last ? 14 : 7,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource(TRAIL_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: pointsRef.current },
          properties: {},
        },
      });
      map.addLayer({
        id: TRAIL_LAYER,
        type: 'line',
        source: TRAIL_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#3B82F6', 'line-width': 4, 'line-opacity': 0.7 },
      });
      if (last) {
        const el = document.createElement('div');
        el.className = 'track-dot';
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(last)
          .addTo(map);
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime 訂閱（v7.0 A5）
  useEffect(() => {
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_points',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: number;
            lat: number;
            lng: number;
            recorded_at: string;
          };
          const eventKey = `${row.id}-${row.recorded_at}`;
          if (lastEventRef.current === eventKey) return; // 去重
          lastEventRef.current = eventKey;
          const lngLat: [number, number] = [Number(row.lng), Number(row.lat)];
          pointsRef.current = [...pointsRef.current, lngLat];
          const map = mapRef.current;
          if (map) {
            const src = map.getSource(TRAIL_SOURCE) as maplibregl.GeoJSONSource | undefined;
            src?.setData({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: pointsRef.current },
              properties: {},
            });
            if (!markerRef.current) {
              const el = document.createElement('div');
              el.className = 'track-dot';
              markerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat(lngLat)
                .addTo(map);
            } else {
              markerRef.current.setLngLat(lngLat);
            }
            map.easeTo({ center: lngLat });
          }
          onUpdate(Number(row.lat), Number(row.lng), row.recorded_at);
        }
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, onUpdate]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <span
        className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-sm font-bold ${
          live ? 'bg-safe-bg text-safe-text' : 'bg-neutral-bg text-neutral-text'
        }`}
      >
        {live ? '🟢 即時連線中 Live' : '⏳ 連線中 Connecting…'}
      </span>
    </div>
  );
}
