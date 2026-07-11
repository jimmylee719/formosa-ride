// lib/poi-category-groups.ts — POI 五大分類（v10.0 B2，Phase 4B）
// 純前端分組設定：資料庫 poi_type 完全不變，只改變 UI 呈現方式。
import type { POIType } from '@/types/poi';

export interface CategoryGroup {
  key: string;
  label_zh: string;
  label_en: string;
  icon: string;
  types: POIType[];
}

export const POI_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: 'supply',
    icon: '🛒',
    label_zh: '補給',
    label_en: 'Supplies',
    types: ['convenience_store', 'supermarket', 'water_station'],
  },
  {
    key: 'rest',
    icon: '🏕️',
    label_zh: '休息過夜',
    label_en: 'Rest & Sleep',
    types: ['campsite_legal', 'campsite_wild', 'temple_overnight', 'accommodation'],
  },
  {
    // 2026-07-11 Jimmy 指示：打氣站/單車停放區不顯示（腳踏車店即可涵蓋；
    // 台灣到處可停車）。資料仍在 DB，只是 UI 不再提供。
    key: 'repair',
    icon: '🔧',
    label_zh: '維修',
    label_en: 'Bike Repair',
    types: ['bicycle_repair'],
  },
  {
    key: 'safety',
    icon: '🆘',
    label_zh: '安全救助',
    label_en: 'Safety',
    types: ['hospital', 'police', 'public_toilet', 'shower'],
  },
  {
    key: 'explore',
    icon: '📸',
    label_zh: '景點探索',
    label_en: 'Attractions',
    types: ['scenic_attraction', 'restaurant', 'train_station'],
  },
];
