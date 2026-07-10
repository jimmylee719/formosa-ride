/**
 * scripts/precompute-elevation.ts — 全部路線海拔批次預先計算（Phase 15C，v9.0 B）
 * 執行：npx tsx scripts/precompute-elevation.ts [--force] [--over <km>]
 *   預設只算「尚無 elevation_profiles 快取」的路線（可重複執行）；
 *   --force 全部重算；--over 30 只重算距離 >30km 者（取樣上限調整後用）。
 * 跨路線共用 terrain 圖磚快取（FIFO 上限 400 磚），大幅減少 MapTiler 圖磚請求。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createTileCache } from '../lib/elevation-core';
import { precomputeElevationForRoute } from '../lib/elevation-precompute';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const overIdx = process.argv.indexOf('--over');
  const overKm = overIdx >= 0 ? Number(process.argv[overIdx + 1]) : null;

  const { data: routes, error } = await supabase
    .from('routes')
    .select('id, name_zh, distance_km')
    .eq('is_active', true)
    .order('distance_km', { ascending: false });
  if (error || !routes) throw new Error(error?.message ?? 'no routes');

  const { data: cachedRows } = await supabase
    .from('elevation_profiles')
    .select('route_id');
  const cachedIds = new Set((cachedRows ?? []).map((r) => r.route_id as string));

  const targets =
    overKm !== null && Number.isFinite(overKm)
      ? routes.filter((r) => Number(r.distance_km) > overKm)
      : force
        ? routes
        : routes.filter((r) => !cachedIds.has(r.id));
  console.log(
    `路線共 ${routes.length} 條，已有快取 ${cachedIds.size} 條，本次計算 ${targets.length} 條`
  );

  const tileCache = createTileCache();
  let ok = 0;
  let fail = 0;
  for (const [i, r] of targets.entries()) {
    try {
      const res = await precomputeElevationForRoute(r.id, { supabase, tileCache });
      if (res.ok) {
        ok++;
      } else {
        fail++;
        console.warn(`  ⚠️ ${r.name_zh}：${res.reason}`);
      }
    } catch (e) {
      fail++;
      console.warn(`  ⚠️ ${r.name_zh}：${(e as Error).message}`);
    }
    if ((i + 1) % 20 === 0 || i === targets.length - 1) {
      console.log(`  進度 ${i + 1}/${targets.length}（成功 ${ok}／失敗 ${fail}）圖磚快取 ${tileCache.size}`);
    }
    // 禮讓 MapTiler：每條路線之間稍停
    await new Promise((res2) => setTimeout(res2, 150));
  }
  console.log(`\n🏁 完成：成功 ${ok}、失敗 ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
