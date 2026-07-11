'use client';
// components/map/MapContainer.tsx — 主地圖元件（Phase 3）
// 底圖 URL 一律經 lib/map-style.ts 取得（Phase 3A 規範），不寫死。

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyleUrl } from '@/lib/map-style';
import { useMapStore } from '@/store/map-store';

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const { center, zoom, setView, setMap } = useMapStore();
  const isNightMode = useMapStore((s) => s.isNightMode);
  const nightApplied = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl('outdoor'),
      center,
      zoom,
      // 台灣範圍外不需要瀏覽，限制範圍可減少無謂的 tile 用量（MapTiler 免費額度）
      maxBounds: [
        [117.0, 20.5], // 西南角（含澎湖、東沙緩衝）
        [124.5, 26.5], // 東北角（含綠島、蘭嶼、龜山島）
      ],
      minZoom: 6,
      maxZoom: 18,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'top-right'
    );
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    // 供應商設定錯誤（假 Key / 假 URL）時明顯報錯，不靜默失敗（v8.0 Phase 3A 測試要求）
    map.on('error', (e) => {
      console.error('[MapContainer] 地圖載入錯誤:', e.error?.message ?? e);
      setLoadFailed(true);
    });
    map.on('load', () => setLoadFailed(false));

    // 隱藏底圖的紅色登山步道圖層（2026-07-11 Jimmy 指示）：
    // outdoor 底圖的 trail_red / trail_longdistance（徒步路線）為紅色實線，
    // 與本系統「紅色＝危險路段」的顏色語言衝突且不可點擊，易被誤認。
    // 僅隱藏紅色系步道；其他顏色步道與粉紅自行車路網保留（對使用者有參考價值）。
    const hideRedTrails = () => {
      for (const layer of map.getStyle()?.layers ?? []) {
        if (/^(trail_red|trail_longdistance|viaferrata)/.test(layer.id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
    };
    map.on('style.load', hideRedTrails); // 初次載入與夜間換底圖後皆執行

    map.on('moveend', () => {
      const c = map.getCenter();
      setView([c.lng, c.lat], map.getZoom());
    });

    if (process.env.NODE_ENV === 'development') {
      // 開發期除錯用，正式 build 不包含
      (window as unknown as Record<string, unknown>).__map = map;
    }
    mapRef.current = map;
    setMap(map);
    return () => {
      setMap(null);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只初始化一次；center/zoom 後續由地圖本身驅動 store

  // 夜間模式：切換深色底圖（v3.0 C1；圖層元件監聽 style.load 自行重繪）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || nightApplied.current === isNightMode) return;
    nightApplied.current = isNightMode;
    map.setStyle(getMapStyleUrl(isNightMode ? 'dark' : 'outdoor'));
  }, [isNightMode]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loadFailed && (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 rounded-lg border-2 border-danger-border bg-danger-bg p-4 text-danger-text"
        >
          <p className="alert-warning">⚠️ 地圖載入失敗</p>
          <p className="info-secondary">
            無法連線到地圖服務，請檢查網路，或稍後再試。
            <br />
            Map failed to load. Please check your connection and try again.
          </p>
        </div>
      )}
    </div>
  );
}
