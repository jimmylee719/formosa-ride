/**
 * scripts/seed-night-warnings.ts — 夜間警示路段種子資料（Phase 7B，v3.0 C2）
 * 路段幾何來自 OpenStreetMap（ODbL），以 ref 標籤抓取實際公路路型後縫合。
 * 執行：npx tsx scripts/seed-night-warnings.ts
 * 可重複執行（已存在同名路段則跳過）。
 *
 * ⚠️ 尚待匯入（Phase 15 資料匯入階段處理，v3.0 C2 清單）：
 *   台18線（阿里山公路）、台14甲線（清境-合歡山）、台24線
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

interface SegmentSpec {
  name_zh: string;
  name_en: string;
  severity: 'high' | 'medium';
  reason_zh: string;
  reason_en: string;
  /** Overpass 查詢：公路 ref 正規表示式 + bbox (south,west,north,east)
   *  OSM 台灣省道 ref 為純數字（實測：台9=「9」、舊蘇花=「9丁」、可能組合「9;9丁」） */
  refRegex: string;
  bbox: [number, number, number, number];
}

// 初始資料（v3.0 C2；文字照規格，幾何取自 OSM）
const SEGMENTS: SegmentSpec[] = [
  {
    name_zh: '蘇花公路（台9線）崇德至蘇澳段',
    name_en: "Suhua Highway (Route 9) Chongde to Su'ao",
    severity: 'high',
    reason_zh: '山壁緊鄰，落石風險高，大型車輛多，無照明路段長達數十公里',
    reason_en: 'Rock fall risk, heavy truck traffic, minimal lighting for tens of km',
    refRegex: '(^|;)9(丁)?(;|$)',
    bbox: [24.13, 121.6, 24.62, 121.88],
  },
  {
    name_zh: '台11線（東海岸）花蓮沿海段',
    name_en: 'Route 11 (East Coast) Hualien coastal section',
    severity: 'medium',
    reason_zh: '靠海側路肩窄，夜間無照明，視線受限',
    reason_en: 'Narrow shoulder near sea, no lighting, limited visibility at night',
    refRegex: '(^|;)11(;|$)',
    bbox: [23.4, 121.3, 24.03, 121.66],
  },
];

type Coord = [number, number];

function distKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** 貪婪端點縫合多段 way → 最長連續鏈 */
function stitch(ways: Coord[][], toleranceKm = 0.12): Coord[] {
  const pool = [...ways].sort((a, b) => b.length - a.length);
  let chain = pool.shift() ?? [];
  let extended = true;
  while (extended && pool.length) {
    extended = false;
    for (let i = 0; i < pool.length; i++) {
      const w = pool[i];
      if (!w) continue;
      const cs = chain[0];
      const ce = chain[chain.length - 1];
      const ws = w[0];
      const we = w[w.length - 1];
      if (!cs || !ce || !ws || !we) continue;
      if (distKm(ce, ws) < toleranceKm) {
        chain = chain.concat(w.slice(1));
      } else if (distKm(ce, we) < toleranceKm) {
        chain = chain.concat([...w].reverse().slice(1));
      } else if (distKm(cs, we) < toleranceKm) {
        chain = w.slice(0, -1).concat(chain);
      } else if (distKm(cs, ws) < toleranceKm) {
        chain = [...w].reverse().slice(0, -1).concat(chain);
      } else {
        continue;
      }
      pool.splice(i, 1);
      extended = true;
      break;
    }
  }
  return chain;
}

/** 取樣至最多 maxPoints 點（保留頭尾） */
function decimate(coords: Coord[], maxPoints = 1500): Coord[] {
  if (coords.length <= maxPoints) return coords;
  const step = (coords.length - 1) / (maxPoints - 1);
  const out: Coord[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const c = coords[Math.round(i * step)];
    if (c) out.push(c);
  }
  return out;
}

async function fetchRoadChain(spec: SegmentSpec): Promise<Coord[]> {
  const [s, w, n, e] = spec.bbox;
  const query = `[out:json][timeout:60];
way["ref"~"${spec.refRegex}"]["highway"~"^(trunk|primary|secondary)$"](${s},${w},${n},${e});
out geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'FormoSARide-seed/0.1 (skadoosh.ai.lab@gmail.com)' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as {
    elements: { geometry?: { lat: number; lon: number }[] }[];
  };
  const ways: Coord[][] = data.elements
    .filter((el) => (el.geometry?.length ?? 0) > 1)
    .map((el) => (el.geometry ?? []).map((g) => [g.lon, g.lat] as Coord));
  const chain = stitch(ways);
  return decimate(chain);
}

async function main() {
  for (const spec of SEGMENTS) {
    const { data: existing } = await supabase
      .from('night_warning_segments')
      .select('id')
      .eq('name_zh', spec.name_zh)
      .maybeSingle();
    if (existing) {
      console.log(`↷ 已存在，跳過：${spec.name_zh}`);
      continue;
    }
    console.log(`⏳ 抓取 OSM：${spec.name_zh}（ref~${spec.refRegex}）…`);
    const chain = await fetchRoadChain(spec);
    if (chain.length < 10) {
      console.error(`✗ 縫合失敗（僅 ${chain.length} 點）：${spec.name_zh}`);
      continue;
    }
    let km = 0;
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1];
      const b = chain[i];
      if (a && b) km += distKm(a, b);
    }
    const wkt =
      'SRID=4326;LINESTRING(' +
      chain.map((c) => `${c[0].toFixed(6)} ${c[1].toFixed(6)}`).join(',') +
      ')';
    const { error } = await supabase.from('night_warning_segments').insert({
      name_zh: spec.name_zh,
      name_en: spec.name_en,
      geometry: wkt,
      warning_reason_zh: spec.reason_zh,
      warning_reason_en: spec.reason_en,
      severity: spec.severity,
      is_active: true,
    });
    if (error) {
      console.error(`✗ 寫入失敗：${spec.name_zh}`, error.message);
    } else {
      console.log(`✓ 已匯入：${spec.name_zh}（${chain.length} 點，約 ${km.toFixed(1)} km）`);
    }
  }
}

main();
