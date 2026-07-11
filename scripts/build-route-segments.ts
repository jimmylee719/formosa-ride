/**
 * scripts/build-route-segments.ts — 環島1號線建議日段（2026-07-11 由紀情境模擬結論）
 *
 * 問題：主線 939.5km 太長，旅程規劃無法逐日連結路線，智慧提醒（日落/補給）
 *       全部觸發不了（>150km 上限）。
 * 做法：把主線實際幾何「等距切成 9 段」（環島經典 9 日節奏，約 104km/日），
 *       起訖以最近縣市標示。誠實框架：這是系統建議日段，非官方分段，
 *       description 內明確聲明。
 * 執行：npx tsx scripts/build-route-segments.ts [--stages 9]
 * 可重複執行：slug（huandao-stage-N）upsert；主線同時補 suggested_days=9。
 * 切完請跑 precompute-elevation.ts 讓新段有海拔剖面。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { TAIWAN_COUNTIES } from '../lib/taiwan-counties';
import { COUNTY_EN, normalizeCounty } from '../lib/county-en';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

type Coord = [number, number];

function distKm(a: Coord, b: Coord): number {
  const mPerDegLng = 111.32 * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * mPerDegLng, (b[1] - a[1]) * 111.32);
}

function nearestCountyName(lng: number, lat: number): string {
  let best = TAIWAN_COUNTIES[0];
  let bestD = Infinity;
  for (const c of TAIWAN_COUNTIES) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return normalizeCounty(best?.name ?? '');
}

async function main(): Promise<void> {
  const stagesIdx = process.argv.indexOf('--stages');
  const STAGES = stagesIdx >= 0 ? Number(process.argv[stagesIdx + 1]) : 9;
  if (!Number.isInteger(STAGES) || STAGES < 2 || STAGES > 20) {
    console.error('stages 需為 2–20 的整數');
    process.exit(1);
  }

  const { data: main, error } = await supabase
    .from('routes')
    .select('id, name_zh, distance_km, geometry')
    .eq('type', 'full_island')
    .single();
  if (error || !main) throw new Error(`找不到環島主線：${error?.message}`);

  let coords = (main.geometry as { coordinates: Coord[] }).coordinates;

  // 迴圈正規化（2026-07-11）：OSM 縫合的起點與方向是任意的。
  // 1. 旋轉：把最接近台北車站的頂點設為起點（環島慣例出發地）
  // 2. 方向：慣例為逆時針（西岸南下、東岸北上，東海岸靠海側騎）——
  //    若出發後 50km 落在台北以東（宜蘭方向），代表順時針 → 反轉
  const TPE: Coord = [121.5170, 25.0478];
  const rotateToNearest = (cs: Coord[]): Coord[] => {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c) continue;
      const d = distKm(c, TPE);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return [...cs.slice(bestIdx), ...cs.slice(0, bestIdx)];
  };
  coords = rotateToNearest(coords);
  {
    let km = 0;
    let probe: Coord = coords[0] as Coord;
    for (let i = 1; i < coords.length && km < 50; i++) {
      const a = coords[i - 1];
      const b = coords[i];
      if (a && b) km += distKm(a, b);
      probe = (coords[i] ?? probe) as Coord;
    }
    if (probe[0] > TPE[0] + 0.15) {
      console.log('  偵測為順時針（50km 處已在台北以東）→ 反轉為逆時針');
      coords = rotateToNearest([...coords].reverse());
    }
  }

  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    cum.push((cum[i - 1] ?? 0) + (a && b ? distKm(a, b) : 0));
  }
  const total = cum[cum.length - 1] ?? 0;
  console.log(`主線 ${main.name_zh}：${coords.length} 點，實測 ${total.toFixed(1)} km → 切 ${STAGES} 段`);

  const rows = [];
  let fromIdx = 0;
  for (let s = 1; s <= STAGES; s++) {
    const targetKm = (total * s) / STAGES;
    // 找到累積里程跨越 target 的頂點（最後一段取到終點）
    let toIdx = coords.length - 1;
    if (s < STAGES) {
      toIdx = cum.findIndex((k) => k >= targetKm);
      if (toIdx < fromIdx + 2) toIdx = fromIdx + 2; // 防退化
    }
    const seg = coords.slice(fromIdx, toIdx + 1);
    const segKm = (cum[toIdx] ?? 0) - (cum[fromIdx] ?? 0);
    const start = seg[0] as Coord;
    const end = seg[seg.length - 1] as Coord;
    const startCounty = nearestCountyName(start[0], start[1]);
    const endCounty = nearestCountyName(end[0], end[1]);

    // 沿段每 ~10km 取樣算行經縣市
    const countySet = new Set<string>();
    for (let i = 0; i < seg.length; i += Math.max(1, Math.floor(seg.length / Math.ceil(segKm / 10)))) {
      const c = seg[i];
      if (c) countySet.add(nearestCountyName(c[0], c[1]));
    }
    countySet.add(startCounty);
    countySet.add(endCounty);

    const startEn = COUNTY_EN[startCounty] ?? startCounty;
    const endEn = COUNTY_EN[endCounty] ?? endCounty;
    rows.push({
      slug: `huandao-stage-${s}`,
      name_zh: `環島1號線 建議第${s}天：${startCounty}→${endCounty}`,
      name_en: `Route No.1 — Suggested Day ${s}: ${startEn} → ${endEn}`,
      type: 'segment',
      distance_km: Math.round(segKm * 10) / 10,
      difficulty: 'moderate',
      suggested_days: 1,
      counties: [...countySet],
      geometry: `SRID=4326;LINESTRING(${seg.map((c) => `${c[0]} ${c[1]}`).join(',')})`,
      description_zh:
        `環島1號線的系統建議日段（依實際路網等距切分為 ${STAGES} 天，非官方分段）。` +
        `此段約 ${segKm.toFixed(0)} 公里，起訖點以最近縣市標示，實際過夜地點請依住宿調整。`,
      description_en:
        `A suggested daily stage of Cycling Route No.1, generated by splitting the real route geometry into ${STAGES} even days (not an official division). ` +
        `About ${segKm.toFixed(0)} km; start/end labeled by nearest county — adjust your overnight stop to your lodging.`,
      data_source: '環島1號線實際幾何等距切分（系統產生）',
      is_loop: false,
      is_free_tier: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    console.log(`  第${s}段 ${startCounty}→${endCounty}：${segKm.toFixed(1)} km（${seg.length} 點）`);
    fromIdx = toIdx;
  }

  for (let i = 0; i < rows.length; i += 3) {
    const { error: upErr } = await supabase
      .from('routes')
      .upsert(rows.slice(i, i + 3), { onConflict: 'slug' });
    if (upErr) throw new Error(`upsert 失敗：${upErr.message}`);
  }

  // 主線補建議天數（環島經典 9 日節奏）
  await supabase.from('routes').update({ suggested_days: STAGES }).eq('id', main.id);
  console.log(`✅ ${STAGES} 個日段完成，主線 suggested_days=${STAGES}。請接著跑 precompute-elevation.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
