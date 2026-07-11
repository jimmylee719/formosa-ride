// types/route.ts — 路線型別與標籤（Phase 5）

export type RouteType =
  | 'full_island'
  | 'west_coast'
  | 'east_coast'
  | 'segment'
  | 'branch'
  | 'custom';

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert';

export interface LineStringGeoJSON {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteListItem {
  id: string;
  slug: string;
  name_zh: string;
  name_en: string;
  type: RouteType;
  distance_km: number;
  difficulty: Difficulty;
  suggested_days: number | null;
  counties: string[];
  official_route_code: string | null;
  is_free_tier: boolean;
  /** 總爬升（2026-07-11 列表加入：山路愛好者選路關鍵） */
  total_ascent_m: number | null;
}

export interface RouteDetail extends RouteListItem {
  geometry: LineStringGeoJSON;
  total_descent_m: number | null;
  max_elevation_m: number | null;
  min_elevation_m: number | null;
  start_name_zh: string | null;
  end_name_zh: string | null;
  description_zh: string | null;
  description_en: string | null;
  tips_zh: string | null;
  tips_en: string | null;
  data_source: string | null;
  managing_authority: string | null;
  source_last_updated: string | null;
  is_loop: boolean;
}

export const ROUTE_TYPE_LABELS: Record<RouteType, { zh: string; en: string; icon: string }> = {
  full_island: { zh: '完整環島', en: 'Full Island Loop', icon: '🏝️' },
  west_coast: { zh: '西部路線', en: 'West Coast', icon: '🌇' },
  east_coast: { zh: '東部路線', en: 'East Coast', icon: '🌊' },
  segment: { zh: '分段路線', en: 'Segment', icon: '🛤️' },
  branch: { zh: '支線', en: 'Branch Route', icon: '🚴' },
  custom: { zh: '自訂路線', en: 'Custom', icon: '✏️' },
};

export const DIFFICULTY_LABELS: Record<
  Difficulty,
  { zh: string; en: string; className: string }
> = {
  easy: { zh: '簡單', en: 'Easy', className: 'bg-safe-bg text-safe-text' },
  moderate: { zh: '中等', en: 'Moderate', className: 'bg-caution-bg text-caution-text' },
  hard: { zh: '困難', en: 'Hard', className: 'bg-warning-bg text-warning-text' },
  expert: { zh: '專家級', en: 'Expert', className: 'bg-danger-bg text-danger-text' },
};
