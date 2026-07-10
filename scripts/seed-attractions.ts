/**
 * scripts/seed-attractions.ts — 外國旅客必去景點預載（Phase 15，v1.0 §13.4）
 * 座標一律照規格原文，不自行查估。
 * 執行：npx tsx scripts/seed-attractions.ts（可重複執行，upsert）
 *
 * 規格清單中「澎湖菊島」「綠島」未附座標，暫不匯入（待取得確切座標後補，
 * 不憑印象填座標）。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

// v1.0 §13.4（座標照規格原文）
const ATTRACTIONS: Array<[zh: string, en: string, lat: number, lng: number]> = [
  ['太魯閣國家公園', 'Taroko National Park', 24.1597, 121.6218],
  ['九份老街', 'Jiufen Old Street', 25.1089, 121.8442],
  ['阿里山國家風景區', 'Alishan National Scenic Area', 23.51, 120.8024],
  ['野柳地質公園', 'Yehliu Geopark', 25.2059, 121.6913],
  ['十分瀑布', 'Shifen Waterfall', 25.0477, 121.7791],
  ['日月潭', 'Sun Moon Lake', 23.858, 120.9186],
  ['清境農場', 'Qingjing Farm', 24.0887, 121.1593],
  ['奧萬大國家森林遊樂區', 'Aowanda National Forest Recreation Area', 23.91, 121.144],
  ['墾丁國家公園', 'Kenting National Park', 21.9546, 120.7963],
  ['奇美博物館', 'Chimei Museum', 22.977, 120.2445],
  ['六堆客家文化園區', 'Liudui Hakka Cultural Park', 22.664, 120.576],
  ['清水斷崖', 'Qingshui Cliff', 24.26, 121.631],
  ['知本溫泉', 'Zhiben Hot Springs', 22.74, 121.06],
  ['三仙台', 'Sanxiantai', 23.1224, 121.4384],
  ['伯朗大道', 'Mr. Brown Avenue', 23.1004, 121.1808],
];

async function main(): Promise<void> {
  const rows = ATTRACTIONS.map(([zh, en, lat, lng]) => ({
    name_zh: zh,
    name_en: en,
    type: 'scenic_attraction',
    location: `SRID=4326;POINT(${lng} ${lat})`,
    is_free_tier: true, // §13.4：標記 is_free_tier = true
    source_type: 'manual',
    verified: true,
  }));
  const { error } = await supabase.from('pois').upsert(rows, { onConflict: 'name_zh,type' });
  if (error) throw new Error(error.message);
  console.log(`✅ 精選景點匯入完成：${rows.length} 筆`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
