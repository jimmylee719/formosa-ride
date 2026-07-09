/**
 * scripts/seed-danger-zones.ts — 危險路段與禁行路段種子資料（Phase 8，v3.0 A1）
 * 幾何來自 OpenStreetMap（ODbL）。執行：npx tsx scripts/seed-danger-zones.ts
 * 可重複執行（同名跳過）。
 *
 * ⚠️ 事故統計數字（accident_count/data_year）刻意留空：
 *    待 Phase 15 以 data.gov.tw 事故開放資料計算後回填，不預先填寫未經查證的數字。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fetchStitchedChain, toWkt, chainKm } from './osm-utils';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

async function seedDangerZones() {
  const name = '蘇花公路（台9線）崇德至蘇澳段';
  const { data: existing } = await supabase
    .from('danger_zones')
    .select('id')
    .eq('name_zh', name)
    .maybeSingle();
  if (existing) {
    console.log(`↷ danger_zones 已存在，跳過：${name}`);
    return;
  }
  console.log('⏳ 抓取蘇花公路路型…');
  const chain = await fetchStitchedChain(
    `way["ref"~"(^|;)9(丁)?(;|$)"]["highway"~"^(trunk|primary|secondary)$"](24.13,121.6,24.62,121.88);`
  );
  if (chain.length < 10) throw new Error('蘇花縫合失敗');
  const { error } = await supabase.from('danger_zones').insert({
    name_zh: name,
    name_en: "Suhua Highway (Route 9) Chongde–Su'ao",
    level: 'high',
    geometry: toWkt(chain),
    road_name: '台9線（蘇花公路）',
    accident_source: '交通部道路交通事故開放資料（data.gov.tw，精確統計待 Phase 15 匯入）',
    reason_zh: '山壁緊鄰、落石風險高、大型車輛多、彎道視距不足',
    reason_en: 'Cliffside road with rockfall risk, heavy truck traffic, blind curves',
    is_night_only: false,
    is_active: true,
  });
  if (error) throw new Error(error.message);
  console.log(`✓ danger_zones 已匯入：${name}（${chain.length} 點，約 ${chainKm(chain).toFixed(1)} km）`);
}

async function seedRestrictedRoads() {
  const name = '國道5號（蔣渭水高速公路）宜蘭段';
  const { data: existing } = await supabase
    .from('restricted_roads')
    .select('id')
    .eq('name_zh', name)
    .maybeSingle();
  if (existing) {
    console.log(`↷ restricted_roads 已存在，跳過：${name}`);
    return;
  }
  console.log('⏳ 抓取國道5號路型…');
  const chain = await fetchStitchedChain(
    `way["highway"="motorway"]["ref"="5"](24.55,121.6,25.0,121.9);`
  );
  if (chain.length < 10) throw new Error('國道5縫合失敗');
  const { error } = await supabase.from('restricted_roads').insert({
    name_zh: name,
    name_en: 'National Freeway 5 (Yilan section)',
    geometry: toWkt(chain),
    road_type: 'highway_national',
    road_number: '國道5號',
    law_basis: '高速公路禁止慢車（含自行車）通行',
    is_active: true,
  });
  if (error) throw new Error(error.message);
  console.log(`✓ restricted_roads 已匯入：${name}（${chain.length} 點，約 ${chainKm(chain).toFixed(1)} km）`);
}

async function main() {
  await seedDangerZones();
  await seedRestrictedRoads();
}

main().catch((e) => {
  console.error('✗ 匯入失敗:', (e as Error).message);
  process.exit(1);
});
