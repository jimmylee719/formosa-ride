// lib/elevation-precompute.ts — 單一路線海拔預先計算（Phase 15C，v9.0 B2）
// 計算 → 寫入 elevation_profiles 快取 → 回寫 routes 統計欄位。
// 供 confirm-import（匯入後背景觸發）與 scripts/precompute-elevation.ts（批次）共用。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { computeElevationProfile, type TileEntry } from './elevation-core';

interface LineStringGeom {
  type: string;
  coordinates: [number, number][];
}

export async function precomputeElevationForRoute(
  routeId: string,
  options?: {
    supabase?: SupabaseClient;
    tileCache?: Map<string, TileEntry>;
  }
): Promise<{ ok: boolean; reason?: string }> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

  const { data: route } = await supabase
    .from('routes')
    .select('geometry')
    .eq('id', routeId)
    .maybeSingle();
  const geometry = route?.geometry as LineStringGeom | undefined;
  if (!geometry?.coordinates || geometry.coordinates.length < 2) {
    return { ok: false, reason: 'no geometry' };
  }

  const profile = await computeElevationProfile(geometry.coordinates, options?.tileCache);

  const { error: e1 } = await supabase.from('elevation_profiles').upsert(
    {
      route_id: routeId,
      profile_data: profile.points,
      max_elevation: profile.maxElevation,
      min_elevation: profile.minElevation,
      total_ascent: profile.totalAscent,
      total_descent: profile.totalDescent,
    },
    { onConflict: 'route_id' }
  );
  if (e1) return { ok: false, reason: e1.message };

  await supabase
    .from('routes')
    .update({
      total_ascent_m: profile.totalAscent,
      total_descent_m: profile.totalDescent,
      max_elevation_m: profile.maxElevation,
      min_elevation_m: profile.minElevation,
    })
    .eq('id', routeId);

  return { ok: true };
}
