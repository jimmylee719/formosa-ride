/**
 * scripts/compute-route-difficulty.ts — 依實測海拔重算路線難度
 * （2026-07-11 德國情侶情境模擬：387 條地方路線全標 easy 是匯入預設值，誤導山路愛好者）
 *
 * 規則（總爬升與每公里爬升率取較高者；資料來自 precompute 的 terrain 海拔）：
 *   expert   總爬升 ≥2000m 或 ≥18 m/km
 *   hard     總爬升 ≥1000m 或 ≥12 m/km
 *   moderate 總爬升 ≥400m  或 ≥6 m/km
 *   easy     其餘
 * 執行：npx tsx scripts/compute-route-difficulty.ts
 * 可重複執行；無海拔資料的路線跳過不動。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

function difficultyOf(ascentM: number, distanceKm: number): string {
  const rate = distanceKm > 0 ? ascentM / distanceKm : 0;
  // 爬升率需搭配最低總爬升（短路線幾十公尺的坡不構成難度）
  if (ascentM >= 2000 || (rate >= 18 && ascentM >= 800)) return 'expert';
  if (ascentM >= 1000 || (rate >= 12 && ascentM >= 400)) return 'hard';
  if (ascentM >= 400 || (rate >= 6 && ascentM >= 150)) return 'moderate';
  return 'easy';
}

async function main(): Promise<void> {
  const { data: routes, error } = await supabase
    .from('routes')
    .select('id, name_zh, distance_km, total_ascent_m, difficulty')
    .eq('is_active', true);
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  let changed = 0;
  for (const r of routes ?? []) {
    if (r.total_ascent_m == null) continue;
    const next = difficultyOf(Number(r.total_ascent_m), Number(r.distance_km));
    counts[next] = (counts[next] ?? 0) + 1;
    if (next !== r.difficulty) {
      const { error: upErr } = await supabase
        .from('routes')
        .update({ difficulty: next })
        .eq('id', r.id);
      if (upErr) throw new Error(`${r.name_zh}: ${upErr.message}`);
      changed++;
    }
  }
  console.log(`✅ 重算完成：異動 ${changed} 條`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
