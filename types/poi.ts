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
}
