// store/map-store.ts — 地圖全域狀態（Zustand，v1.0 資料夾結構）
// POI 篩選（Phase 4B）、夜間模式（Phase 7B）將擴充此 store。
import { create } from 'zustand';
import type maplibregl from 'maplibre-gl';
import type { POIRecord, POIType } from '@/types/poi';

/** 點擊危險/禁行路段後的警示卡資料（Phase 8） */
export interface SelectedDanger {
  kind: 'danger' | 'restricted';
  level: 'high' | 'medium' | 'low' | 'restricted';
  name_zh: string;
  name_en: string | null;
  reason_zh: string | null;
  reason_en: string | null;
  accident_count: number | null;
  accident_source: string | null;
  data_year: number | null;
  road_number: string | null;
  law_basis: string | null;
}

interface MapState {
  /** 地圖實例（MapContainer 建立後注入，供 POILayer 等圖層元件使用） */
  map: maplibregl.Map | null;
  /** 地圖中心點 [lng, lat]（預設台灣地理中心） */
  center: [number, number];
  zoom: number;
  /** 目前選取的 POI（Phase 4 底部卡片用） */
  selectedPoi: POIRecord | null;
  /** 目前選取的危險/禁行路段（Phase 8 警示卡用） */
  selectedDanger: SelectedDanger | null;
  /** 夜間模式（Phase 7B 由日照邏輯切換） */
  isNightMode: boolean;
  /** POI 篩選（Phase 4B）：空陣列 = 顯示全部類型 */
  activeTypes: POIType[];
  isFilterOpen: boolean;
  /** 目前顯示的是離線包資料（Phase 11B：fetch 失敗時回退 IndexedDB） */
  usingOfflineData: boolean;
  setMap: (map: maplibregl.Map | null) => void;
  setView: (center: [number, number], zoom: number) => void;
  setSelectedPoi: (poi: POIRecord | null) => void;
  setSelectedDanger: (d: SelectedDanger | null) => void;
  setNightMode: (on: boolean) => void;
  toggleType: (type: POIType) => void;
  /** 大分類一鍵切換：該組全選 ↔ 全取消（v10.0「多數時候只需點 1 次」） */
  toggleGroup: (types: POIType[]) => void;
  /** 直接設定篩選（夜間橫幅快捷鈕等情境用） */
  setActiveTypes: (types: POIType[]) => void;
  clearFilters: () => void;
  setFilterOpen: (open: boolean) => void;
  setUsingOfflineData: (on: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  map: null,
  center: [120.9605, 23.6978],
  zoom: 7,
  selectedPoi: null,
  selectedDanger: null,
  isNightMode: false,
  activeTypes: [],
  isFilterOpen: false,
  usingOfflineData: false,
  setMap: (map) => set({ map }),
  setView: (center, zoom) => set({ center, zoom }),
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  setSelectedDanger: (d) => set({ selectedDanger: d }),
  setNightMode: (on) => set({ isNightMode: on }),
  toggleType: (type) =>
    set((s) => ({
      activeTypes: s.activeTypes.includes(type)
        ? s.activeTypes.filter((t) => t !== type)
        : [...s.activeTypes, type],
    })),
  toggleGroup: (types) =>
    set((s) => {
      const allSelected = types.every((t) => s.activeTypes.includes(t));
      return {
        activeTypes: allSelected
          ? s.activeTypes.filter((t) => !types.includes(t))
          : [...new Set([...s.activeTypes, ...types])],
      };
    }),
  setActiveTypes: (types) => set({ activeTypes: types }),
  clearFilters: () => set({ activeTypes: [] }),
  setFilterOpen: (open) => set({ isFilterOpen: open }),
  setUsingOfflineData: (on) => set({ usingOfflineData: on }),
}));
