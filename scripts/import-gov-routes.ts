/**
 * scripts/import-gov-routes.ts — 政府路線資料整合（Phase 15A，v4.0 A 節）
 *
 * 子命令：
 *   huandao        環島1號線主線 + 全部編號支線（OSM ncn 官方路線關聯，ODbL）
 *   moi <資料夾>    內政部國土管理署「自行車道」115年上半年 GeoJSON
 *                  （data.gov.tw/dataset/90135；跳過 ROAD_NET=環1* 者避免與主線重複；
 *                    僅收 ≥5km 的地方自行車道，通學步道等短路段不進路線列表）
 *
 * 資料來源決策（v4.0 A2 優先順序的落實說明）：
 *   - 臺灣騎跡 taiwanbike.tw 需申請資料介接，改用 OSM 上的官方環島1號線路網
 *     （relation 5692631 主線 + ncn 支線，與官方牌面一致）
 *   - 環境部 28238 KML 為 108 年舊資料且與國土署 115 年資料重疊，不匯入（避免重複與過時）
 * 可重複執行：以 slug upsert。
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { stitch, decimate, toWkt, chainKm, joinMajorChains, type Coord } from './osm-utils';
import { nearestCounty } from '../lib/taiwan-counties';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const UA = 'FormoSARide-seed/0.1 (skadoosh.ai.lab@gmail.com)';
const MAIN_LOOP_RELATION = 5692631; // 環島1號線（逆時針＝經典環島方向）

function hashHex(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return h.toString(16);
}

function countiesOf(chain: Coord[]): string[] {
  const set = new Set<string>();
  const step = Math.max(1, Math.floor(chain.length / 60));
  for (let i = 0; i < chain.length; i += step) {
    const p = chain[i];
    if (p) set.add(nearestCounty(p[1], p[0]).name);
  }
  return [...set];
}

interface OsmRelation {
  id: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; role: string; geometry?: Array<{ lat: number; lon: number }> }>;
}

async function overpass(query: string): Promise<OsmRelation[]> {
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return ((await res.json()) as { elements: OsmRelation[] }).elements;
}

function relationToChain(rel: OsmRelation): Coord[] {
  const ways: Coord[][] = (rel.members ?? [])
    .filter((m) => m.type === 'way' && m.geometry && m.geometry.length >= 2)
    .map((m) => m.geometry!.map((g) => [g.lon, g.lat] as Coord));
  // 大型官方關聯的成員未必依序、且含圓環/岔口碎段：
  // 子鏈分解（0.15km 緊縫合）→ 捨棄 <1km 碎片 → 就近排序串接
  // （環島1號線實測：964km、頭尾距離 0.5km，與官方 939.5km 相符）
  return joinMajorChains(ways, 1);
}

interface RouteRow {
  slug: string;
  name_zh: string;
  name_en: string;
  type: string;
  geometry: string;
  distance_km: number;
  difficulty: string;
  start_name_zh?: string | null;
  end_name_zh?: string | null;
  counties: string[];
  tips_zh?: string | null;
  official_route_code?: string | null;
  data_source: string;
  managing_authority?: string | null;
  is_loop?: boolean;
  is_free_tier?: boolean;
}

async function upsertRoutes(rows: RouteRow[]): Promise<void> {
  // routes 表無 updated_at 自動觸發器 → 匯入時明確蓋時間戳，月更才可稽核
  const stamped = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  for (let i = 0; i < stamped.length; i += 100) {
    const { error } = await supabase
      .from('routes')
      .upsert(stamped.slice(i, i + 100), { onConflict: 'slug' });
    if (error) throw new Error(`upsert 失敗：${error.message}`);
  }
}

/** 環島1號線主線 + 編號支線（OSM ncn 關聯） */
async function importHuandao(): Promise<void> {
  console.log('=== 環島1號線主線（OSM relation 5692631）===');
  const [main] = await overpass(`[out:json][timeout:300];relation(${MAIN_LOOP_RELATION});out geom;`);
  if (!main) throw new Error('抓不到主線關聯');
  const chain = decimate(relationToChain(main), 4000);
  const km = chainKm(chain);
  console.log(`  縫合後 ${chain.length} 點，全長 ${km.toFixed(1)} km（OSM 標示 ${main.tags?.distance ?? '?'} km）`);
  const rows: RouteRow[] = [
    {
      slug: 'cycling-route-no-1',
      name_zh: '環島1號線',
      name_en: 'Taiwan Cycling Route No. 1',
      type: 'full_island',
      geometry: toWkt(chain),
      distance_km: Number(main.tags?.distance) || Math.round(km * 10) / 10,
      difficulty: 'moderate',
      counties: countiesOf(chain),
      official_route_code: 'Cycling Route No.1',
      data_source: 'taiwanbike', // 官方路網（幾何取自 OSM 之官方路線標記）
      managing_authority: '交通部',
      is_loop: true,
      is_free_tier: true, // 招牌路線免費版可見
      tips_zh: '官方環島路線（逆時針方向），全程有「環島1號線」指標可循',
    },
  ];

  console.log('=== 環島支線（ncn，ref=環島1-N）===');
  const rels = await overpass(
    `[out:json][timeout:300];relation["route"="bicycle"]["network"="ncn"]["ref"~"^環島1-"](21.8,119.3,25.4,122.1);out geom;`
  );
  // 同一 ref 有順/逆時針兩個關聯：優先取「逆時針」，否則取第一個
  const byRef = new Map<string, OsmRelation>();
  for (const r of rels) {
    const ref = r.tags?.ref ?? '';
    const existing = byRef.get(ref);
    if (!existing || (r.tags?.name ?? '').includes('逆時針')) byRef.set(ref, r);
  }
  console.log(`  共 ${byRef.size} 條支線`);
  for (const [ref, rel] of byRef) {
    const chain2 = decimate(relationToChain(rel), 1500);
    if (chain2.length < 2) {
      console.warn(`  ⚠️ ${ref} 幾何不足，略過`);
      continue;
    }
    const km2 = chainKm(chain2);
    const rawName = (rel.tags?.name ?? ref).replace(/\s*[(（][^)）]*[)）]\s*$/, '');
    const code = ref.replace('環島1-', 'Cycling Route No.1-');
    rows.push({
      slug: `cycling-route-no-1-${ref.replace('環島1-', '')}`,
      name_zh: rawName,
      name_en: `Cycling Route No.1 Branch ${ref.replace('環島1-', '')}`,
      type: 'branch',
      geometry: toWkt(chain2),
      distance_km: Math.round(km2 * 10) / 10,
      difficulty: 'moderate',
      counties: countiesOf(chain2),
      official_route_code: code,
      data_source: 'taiwanbike',
      managing_authority: '交通部',
    });
    console.log(`  ${ref} ${rawName}：${km2.toFixed(1)} km`);
  }
  await upsertRoutes(rows);
  console.log(`✅ 環島路網完成：主線 1 + 支線 ${rows.length - 1}`);
}

/** 國土署全國自行車道（地方路線，≥5km，跳過環1路網避免重複） */
async function importMoi(dir: string): Promise<void> {
  const files = ['202606_EAST.geojson', '202606_MIDDLE.geojson', '202606_NORTH.geojson', '202606_SOUTH.geojson'];
  const rows: RouteRow[] = [];
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      features: Array<{
        geometry: { type: string; coordinates: number[][][] };
        properties: Record<string, string>;
      }>;
    };
    for (const feat of d.features) {
      const p = feat.properties;
      const lengthM = Number(p.B_LENGTH);
      if (!Number.isFinite(lengthM) || lengthM < 5000) continue;
      if ((p.ROAD_NET ?? '').startsWith('環1')) continue; // 環島路網已由 OSM 匯入
      if (feat.geometry.type !== 'MultiLineString') continue;
      const parts = feat.geometry.coordinates.map((line) => line.map(([x, y]) => [x, y] as Coord));
      const chain = decimate(stitch(parts, 0.5), 800);
      if (chain.length < 2) continue;
      const name = (p.NAME ?? '').trim();
      if (!name) continue;
      rows.push({
        slug: `moi-${hashHex(`${name}|${p.CITY}`)}`,
        name_zh: name,
        name_en: name, // 資料無英文名，以中文名存放（DB NOT NULL）
        type: 'custom',
        geometry: toWkt(chain),
        distance_km: Math.round(lengthM / 100) / 10,
        difficulty: 'easy', // 地方自行車道多為休閒等級
        start_name_zh: p.SP_DESC || null,
        end_name_zh: p.EP_DESC || null,
        counties: [p.CITY].filter((c): c is string => Boolean(c)),
        tips_zh: p.ROAD_LIGHT === '有' ? '路段有照明' : p.ROAD_LIGHT === '無' ? '路段無照明，夜間請避免騎乘' : null,
        data_source: 'moi_land',
        managing_authority: p.MGR_MCH || null,
      });
    }
  }
  console.log(`國土署地方自行車道（≥5km、非環1路網）：${rows.length} 條`);
  await upsertRoutes(rows);
  console.log('✅ moi 匯入完成');
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'huandao') await importHuandao();
  else if (cmd === 'moi' && arg) await importMoi(arg);
  else {
    console.error('用法：npx tsx scripts/import-gov-routes.ts huandao | moi <GeoJSON資料夾>');
    process.exit(1); // 缺參數必須響亮失敗（CI 曾因 exit 0 假成功，2026-07-11）
  }
  const { count } = await supabase.from('routes').select('*', { count: 'exact', head: true });
  console.log(`routes 資料表目前共 ${count} 筆`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
