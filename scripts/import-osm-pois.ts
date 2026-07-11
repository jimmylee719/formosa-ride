/**
 * scripts/import-osm-pois.ts — 全台 POI 批次匯入（Phase 15，v1.0 §13）
 * 資料來源：OpenStreetMap Overpass API（ODbL，免費無 Key；v1.0 已更正取代 Google Places）
 * 執行：npx tsx scripts/import-osm-pois.ts <類型|all>
 *   類型：convenience_store supermarket bicycle_repair pump_station water_station
 *         public_toilet train_station hospital police shower
 * 可重複執行：以 (name_zh, type) upsert，不會產生重複。
 *
 * 刻意不匯入（不憑 OSM 標籤猜測，v1.0 §13 指定人工整理）：
 *   temple_overnight（可否過夜需人工查證，§13.5）
 *   campsite_legal / campsite_wild（「合法」與否 OSM 無法保證，§13.1 用政府資料）
 *   restaurant / bicycle_parking / accommodation（量大噪音高；住宿改用觀光署資料，Phase 15A/15B）
 *   scenic_attraction（§13.4 精選清單另由 seed-attractions.ts 匯入）
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

// 台灣本島 + 澎湖 + 綠島/蘭嶼（金馬不在環島範圍）：south,west,north,east
const TW_BBOX = '21.8,119.3,25.4,122.1';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface TypeSpec {
  /** Overpass 標籤選擇器（套用於 nwr） */
  selector: string;
  /** 無名稱時的預設中文/英文名（加 #osmId 保持唯一） */
  fallbackZh: string;
  fallbackEn: string;
  /** 便利商店專用：僅保留主要連鎖（v1.0 §13.2） */
  chainFilter?: boolean;
  isFreeTier?: boolean;
  extra?: Partial<PoiRow>;
}

const TYPE_SPECS: Record<string, TypeSpec> = {
  convenience_store: {
    selector: '["shop"="convenience"]',
    fallbackZh: '便利商店',
    fallbackEn: 'Convenience store',
    chainFilter: true,
    isFreeTier: true, // v1.0 §13.2：便利商店屬免費版可見
    extra: { has_charging: true, water_available: true }, // v1.0 §13.2
  },
  supermarket: {
    selector: '["shop"="supermarket"]',
    fallbackZh: '超市',
    fallbackEn: 'Supermarket',
  },
  bicycle_repair: {
    selector: '["shop"="bicycle"]',
    fallbackZh: '自行車行',
    fallbackEn: 'Bike shop',
  },
  pump_station: {
    selector: '["amenity"="bicycle_repair_station"]',
    fallbackZh: '打氣站',
    fallbackEn: 'Bike pump station',
  },
  water_station: {
    selector: '["amenity"="drinking_water"]',
    fallbackZh: '飲水點',
    fallbackEn: 'Drinking water',
  },
  public_toilet: {
    selector: '["amenity"="toilets"]',
    fallbackZh: '公廁',
    fallbackEn: 'Public toilet',
  },
  train_station: {
    selector: '["railway"="station"]["station"!="subway"]',
    fallbackZh: '車站',
    fallbackEn: 'Train station',
  },
  hospital: {
    selector: '["amenity"="hospital"]',
    fallbackZh: '醫院',
    fallbackEn: 'Hospital',
  },
  police: {
    selector: '["amenity"="police"]',
    fallbackZh: '警察局',
    fallbackEn: 'Police station',
  },
  shower: {
    selector: '["amenity"="shower"]',
    fallbackZh: '淋浴間',
    fallbackEn: 'Shower',
  },
  // 露營區（2026-07-11 德國情侶情境模擬：野營旅客核心需求）。
  // OSM tourism=camp_site 為既有露營場所；登記狀態 OSM 無從查證，
  // UI 標籤已改為中性的「露營區/Campground」，不宣稱合法性。
  campsite_legal: {
    selector: '["tourism"="camp_site"]',
    fallbackZh: '露營區',
    fallbackEn: 'Campground',
    isFreeTier: true,
  },
};

// v1.0 §13.2 主要連鎖（名稱或品牌需命中其一）
const CHAIN_KEYWORDS = ['7-eleven', '7-11', '統一超商', '全家', 'familymart', '萊爾富', 'hi-life', 'ok'];

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface PoiRow {
  name_zh: string;
  name_en: string;
  type: string;
  location: string;
  address_zh: string | null;
  phone: string | null;
  is_free: boolean;
  has_charging: boolean;
  has_shower: boolean;
  water_available: boolean;
  is_24h: boolean;
  source_url: string;
  source_type: string;
  is_free_tier: boolean;
}

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FormoSARide-seed/0.1 (skadoosh.ai.lab@gmail.com)',
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) {
          console.warn(`  ${endpoint} HTTP ${res.status}，重試/換端點…`);
          await new Promise((r) => setTimeout(r, 15_000));
          continue;
        }
        const data = (await res.json()) as { elements: OsmElement[] };
        return data.elements;
      } catch (e) {
        console.warn(`  ${endpoint} 失敗：${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 15_000));
      }
    }
  }
  throw new Error('所有 Overpass 端點都失敗');
}

/** 中文優先組名：name → name:zh → brand(+branch)；無名則 fallback + #id */
function composeNames(el: OsmElement, spec: TypeSpec): { zh: string; en: string } {
  const t = el.tags ?? {};
  const branch = t.branch ? ` ${t.branch}` : '';
  let zh = t['name:zh'] || t.name || '';
  if (!zh && t.brand) zh = `${t.brand}${branch}`;
  else if (zh && t.branch && !zh.includes(t.branch)) zh = `${zh}${branch}`;
  if (!zh) zh = `${spec.fallbackZh} #${el.id}`;
  let en = t['name:en'] || t['name:en-US'] || '';
  if (!en) en = /^[\x20-\x7E]+$/.test(zh) ? zh : `${spec.fallbackEn}`;
  return { zh: zh.trim(), en: en.trim() };
}

function isChain(el: OsmElement): boolean {
  const hay = `${el.tags?.name ?? ''} ${el.tags?.brand ?? ''} ${el.tags?.['brand:en'] ?? ''} ${el.tags?.['name:en'] ?? ''}`.toLowerCase();
  return CHAIN_KEYWORDS.some((k) => hay.includes(k));
}

function toRow(el: OsmElement, type: string, spec: TypeSpec): PoiRow | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;
  if (lat < 21 || lat > 26 || lng < 119 || lng > 122.5) return null;
  const t = el.tags ?? {};
  const { zh, en } = composeNames(el, spec);
  const address =
    t['addr:full'] ||
    [t['addr:city'], t['addr:district'], t['addr:street'], t['addr:housenumber']]
      .filter(Boolean)
      .join('') ||
    null;
  return {
    name_zh: zh,
    name_en: en,
    type,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    address_zh: address,
    phone: t.phone || t['contact:phone'] || null,
    is_free: t.fee ? t.fee === 'no' : type !== 'convenience_store' && type !== 'supermarket' && type !== 'bicycle_repair',
    has_charging: spec.extra?.has_charging ?? false,
    has_shower: type === 'shower' || t.shower === 'yes',
    water_available: spec.extra?.water_available ?? t.drinking_water === 'yes',
    is_24h: t.opening_hours === '24/7',
    source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    source_type: 'osm',
    is_free_tier: spec.isFreeTier ?? false,
  };
}

async function importType(type: string): Promise<void> {
  const spec = TYPE_SPECS[type];
  if (!spec) throw new Error(`未知類型：${type}`);
  console.log(`\n=== ${type} ===`);
  const query = `[out:json][timeout:180];nwr${spec.selector}(${TW_BBOX});out center tags;`;
  const elements = await fetchOverpass(query);
  console.log(`  Overpass 回傳 ${elements.length} 筆`);

  let rows = elements
    .filter((el) => (spec.chainFilter ? isChain(el) : true))
    .map((el) => toRow(el, type, spec))
    .filter((r): r is PoiRow => r !== null);

  // (name_zh, type) 需唯一：同名者第 2 筆起加 #序號（透明可追溯，不捏造名稱）
  const seen = new Map<string, number>();
  rows = rows.map((r) => {
    const n = seen.get(r.name_zh) ?? 0;
    seen.set(r.name_zh, n + 1);
    return n === 0 ? r : { ...r, name_zh: `${r.name_zh} #${n + 1}` };
  });
  console.log(`  整理後 ${rows.length} 筆，開始批次 upsert…`);

  let done = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('pois')
      .upsert(batch, { onConflict: 'name_zh,type' });
    if (error) throw new Error(`upsert 失敗（第 ${i} 起）：${error.message}`);
    done += batch.length;
    process.stdout.write(`  ${done}/${rows.length}\r`);
  }
  console.log(`  ✅ ${type} 完成：${done} 筆`);
  // Overpass 禮讓：類型之間停 10 秒
  await new Promise((r) => setTimeout(r, 10_000));
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? 'all';
  const types = arg === 'all' ? Object.keys(TYPE_SPECS) : [arg];
  for (const type of types) {
    await importType(type);
  }
  const { count } = await supabase.from('pois').select('*', { count: 'exact', head: true });
  console.log(`\n🏁 全部完成。pois 資料表目前共 ${count} 筆。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
