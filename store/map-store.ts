// store/map-store.ts — 地圖全域狀態（Zustand，v1.0 資料夾結構）
// 目前僅地圖核心狀態；POI 篩選（Phase 4B）、夜間模式（Phase 7B）將擴充此 store。
import { create } from 'zustand';

interface MapState {
  /** 地圖中心點 [lng, lat]（預設台灣地理中心） */
  center: [number, number];
  zoom: number;
  /** 目前選取的 POI id（Phase 4 底部卡片用） */
  selectedPoiId: string | null;
  /** 夜間模式（Phase 7B 由日照邏輯切換） */
  isNightMode: boolean;
  setView: (center: [number, number], zoom: number) => void;
  setSelectedPoiId: (id: string | null) => void;
  setNightMode: (on: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [120.9605, 23.6978],
  zoom: 7,
  selectedPoiId: null,
  isNightMode: false,
  setView: (center, zoom) => set({ center, zoom }),
  setSelectedPoiId: (id) => set({ selectedPoiId: id }),
  setNightMode: (on) => set({ isNightMode: on }),
}));
