// lib/poi-icons.ts — POI 圖示與雙語標籤對照（v3.0 D3 節）
import type { POIType } from '@/types/poi';

export const POI_ICONS: Record<POIType, string> = {
  convenience_store: '🏪',
  supermarket: '🛒',
  water_station: '💧',
  campsite_legal: '⛺',
  campsite_wild: '🏕️',
  temple_overnight: '🏛️',
  public_toilet: '🚻',
  shower: '🚿',
  bicycle_repair: '🔧',
  pump_station: '💨',
  bicycle_parking: '🅿️',
  train_station: '🚉',
  hospital: '🏥',
  police: '🚔',
  scenic_attraction: '📸',
  restaurant: '🍜',
  accommodation: '🏨',
};

export const POI_LABELS: Record<POIType, { zh: string; en: string }> = {
  convenience_store: { zh: '便利商店', en: 'Convenience Store' },
  supermarket: { zh: '超市', en: 'Supermarket' },
  water_station: { zh: '補水站', en: 'Water Station' },
  campsite_legal: { zh: '合法露營區', en: 'Campsite' },
  campsite_wild: { zh: '野外紮營點', en: 'Wild Camping Spot' },
  temple_overnight: { zh: '廟宇過夜點', en: 'Temple (Overnight)' },
  public_toilet: { zh: '公共廁所', en: 'Public Toilet' },
  shower: { zh: '淋浴設施', en: 'Shower' },
  bicycle_repair: { zh: '自行車維修店', en: 'Bike Repair' },
  pump_station: { zh: '打氣站', en: 'Air Pump' },
  bicycle_parking: { zh: '單車停放區', en: 'Bike Parking' },
  train_station: { zh: '火車站', en: 'Train Station' },
  hospital: { zh: '醫院', en: 'Hospital' },
  police: { zh: '警察局', en: 'Police' },
  scenic_attraction: { zh: '景點', en: 'Attraction' },
  restaurant: { zh: '餐廳', en: 'Restaurant' },
  accommodation: { zh: '住宿', en: 'Accommodation' },
};
