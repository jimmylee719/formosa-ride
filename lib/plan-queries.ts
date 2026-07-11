// lib/plan-queries.ts — 行程完整內容查詢（Phase 19B，Server 專用）
// 供 /api/plans/[id]（擁有者）與 /plan/shared/[token]（分享唯讀頁）共用。
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TripPlanDetail } from '@/types/plan';

const DETAIL_SELECT = `id, name, start_date, notes, updated_at, share_token,
  plan_days (
    day_number, depart_time, start_name, route_id, notes,
    routes ( name_zh, name_en, distance_km ),
    plan_stops (
      position, poi_id, custom_name, custom_google_url, note,
      pois ( name_zh, name_en, type, lat, lng )
    )
  )`;

interface StopRow {
  position: number;
  poi_id: string | null;
  custom_name: string | null;
  custom_google_url: string | null;
  note: string | null;
  pois: {
    name_zh: string;
    name_en: string | null;
    type: string;
    lat: number | null;
    lng: number | null;
  } | null;
}
interface DayRow {
  day_number: number;
  depart_time: string | null;
  start_name: string | null;
  route_id: string | null;
  notes: string | null;
  routes: { name_zh: string; name_en: string; distance_km: number } | null;
  plan_stops: StopRow[];
}

export interface PlanDetailWithToken extends TripPlanDetail {
  share_token: string | null;
}

function shape(data: Record<string, unknown>): PlanDetailWithToken {
  // supabase-js 對 FK join 推斷為陣列，實際 to-one 回傳物件 → 經 unknown 轉型
  const days = ((data.plan_days ?? []) as unknown as DayRow[])
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      day_number: d.day_number,
      depart_time: d.depart_time,
      start_name: d.start_name,
      route_id: d.route_id,
      notes: d.notes,
      route: d.routes,
      stops: d.plan_stops
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          poi_id: s.poi_id,
          custom_name: s.custom_name,
          custom_google_url: s.custom_google_url,
          note: s.note,
          poi: s.pois,
        })),
    }));
  return {
    id: data.id as string,
    name: data.name as string,
    start_date: data.start_date as string | null,
    notes: data.notes as string | null,
    updated_at: data.updated_at as string,
    share_token: data.share_token as string | null,
    days,
  };
}

export async function getPlanDetail(
  supabase: SupabaseClient,
  planId: string
): Promise<PlanDetailWithToken | null> {
  const { data, error } = await supabase
    .from('trip_plans')
    .select(DETAIL_SELECT)
    .eq('id', planId)
    .maybeSingle();
  if (error || !data) return null;
  return shape(data as Record<string, unknown>);
}

export async function getPlanDetailByToken(
  supabase: SupabaseClient,
  token: string
): Promise<PlanDetailWithToken | null> {
  if (!/^[0-9a-f]{32,64}$/i.test(token)) return null;
  const { data, error } = await supabase
    .from('trip_plans')
    .select(DETAIL_SELECT)
    .eq('share_token', token)
    .maybeSingle();
  if (error || !data) return null;
  return shape(data as Record<string, unknown>);
}
