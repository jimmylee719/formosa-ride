// store/map-store.ts — 地圖全域狀態（Zustand，v1.0 資料夾結構）
// POI 篩選（Phase 4B）、夜間模式（Phase 7B）將擴充此 store。
import { create } from 'zustand';
import type maplibregl from 'maplibre-gl';
import type { POIRecord } from '@/types/poi';

interface MapState {
  /** 地圖實例（MapContainer 建立後注入，供 POILayer 等圖層元件使用） */
  map: maplibregl.Map | null;
  /** 地圖中心點 [lng, lat]（預設台灣地理中心） */
  center: [number, number];
  zoom: number;
  /** 目前選取的 POI（Phase 4 底部卡片用） */
  selectedPoi: POIRecord | null;
  /** 夜間模式（Phase 7B 由日照邏輯切換） */
  isNightMode: boolean;
  setMap: (map: maplibregl.Map | null) => void;
  setView: (center: [number, number], zoom: number) => void;
  setSelectedPoi: (poi: POIRecord | null) => void;
  setNightMode: (on: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  map: null,
  center: [120.9605, 23.6978],
  zoom: 7,
  selectedPoi: null,
  isNightMode: false,
  setMap: (map) => set({ map }),
  setView: (center, zoom) => set({ center, zoom }),
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  setNightMode: (on) => set({ isNightMode: on }),
}));
