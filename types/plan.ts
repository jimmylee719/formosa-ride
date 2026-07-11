// types/plan.ts — 旅程規劃型別（Phase 19A）

/** 停靠點：poi_id（資料庫地點）或 custom_name（自訂）擇一 */
export interface PlanStop {
  poi_id: string | null;
  custom_name: string | null;
  custom_google_url: string | null;
  note: string | null;
  /** 顯示用（GET 時由伺服器 join，寫入時忽略）；lat/lng 供分享頁產生導航連結 */
  poi?: {
    name_zh: string;
    name_en: string | null;
    type: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
}

export interface PlanDay {
  day_number: number;
  depart_time: string | null; // 'HH:MM'
  start_name: string | null;
  route_id: string | null;
  notes: string | null;
  stops: PlanStop[];
  /** 顯示用（GET 時 join） */
  route?: { name_zh: string; name_en: string; distance_km: number } | null;
}

export interface TripPlanMeta {
  id: string;
  name: string;
  start_date: string | null;
  notes: string | null;
  updated_at: string;
  day_count: number;
}

export interface TripPlanDetail extends Omit<TripPlanMeta, 'day_count'> {
  days: PlanDay[];
  /** 分享 token（Phase 19B；僅擁有者的 GET 回傳） */
  share_token?: string | null;
}

export interface FavoriteItem {
  id: string;
  poi_id: string | null;
  route_id: string | null;
  poi?: { name_zh: string; name_en: string | null; type: string } | null;
  route?: { name_zh: string; name_en: string; distance_km: number } | null;
}

export const MAX_PLANS_PER_DEVICE = 3;
export const MAX_DAYS_PER_PLAN = 30;
export const MAX_STOPS_PER_DAY = 20;
