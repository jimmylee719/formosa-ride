// types/poi.ts — POI 型別（對應 get_pois_near_point RPC 回傳欄位）

export type POIType =
  | 'convenience_store'
  | 'supermarket'
  | 'water_station'
  | 'campsite_legal'
  | 'campsite_wild'
  | 'temple_overnight'
  | 'public_toilet'
  | 'shower'
  | 'bicycle_repair'
  | 'pump_station'
  | 'bicycle_parking'
  | 'train_station'
  | 'hospital'
  | 'police'
  | 'scenic_attraction'
  | 'restaurant'
  | 'accommodation';

/** 住宿子類型（v8.0 C2：純文字非 enum） */
export const ACCOMMODATION_SUBTYPES = [
  { value: 'hotel', en: 'Hotel', zh: '觀光旅館' },
  { value: 'guesthouse', en: 'Inn / B&B', zh: '一般旅館' },
  { value: 'homestay', en: 'Homestay', zh: '民宿' },
  { value: 'hostel', en: 'Hostel', zh: '青年旅舍' },
  { value: 'capsule_hotel', en: 'Capsule', zh: '膠囊旅館' },
] as const;

export type AccommodationSubtype = (typeof ACCOMMODATION_SUBTYPES)[number]['value'];

export interface POIRecord {
  id: string;
  name_zh: string;
  name_en: string | null;
  type: POIType;
  lat: number;
  lng: number;
  distance_m: number;
  is_free: boolean;
  is_free_tier: boolean;
  opening_hours: Record<string, string> | null;
  phone: string | null;
  google_place_id: string | null;
  description_zh: string | null;
  description_en: string | null;
  has_shower: boolean;
  allows_camping: boolean;
  has_charging: boolean;
  water_available: boolean;
  /** 社群驗證統計（Phase 4A，由 /api/pois 合併自 pois 表） */
  verification_count: number;
  last_verified_at: string | null;
  /** 住宿子類型（Phase 15B，由 /api/pois 合併；僅 type='accommodation' 有值） */
  accommodation_subtype: string | null;
}

/** 「近期已驗證」判斷（v7.0 E3：30 天內累積 ≥3 人）*/
export function isRecentlyVerified(poi: {
  verification_count: number;
  last_verified_at: string | null;
}): boolean {
  if (poi.verification_count < 3 || !poi.last_verified_at) return false;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(poi.last_verified_at).getTime() < THIRTY_DAYS_MS;
}
