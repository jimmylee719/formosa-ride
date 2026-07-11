/**
 * scripts/import-attractions-tourism.ts — 觀光署觀光資料庫 v2.0 景點匯入
 * （2026-07-11 Jimmy 指示：官方照片/電話/開放時間/官網補強景點資料）
 *
 * 下載：https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Attraction-json.zip
 * 執行：npx tsx scripts/import-attractions-tourism.ts <AttractionList.json 路徑>
 * 可重複執行：以 (name_zh, type='scenic_attraction') upsert——
 * 與既有 OSM 景點同名者會被官方資料覆寫補強（照片/電話/介紹），屬預期行為。
 * 需先執行 migration 0017（pois.photo_url / website_url）。
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

interface Attraction {
  AttractionID: string;
  AttractionName: string;
  Description: string | null;
  PositionLat: number;
  PositionLon: number;
  PostalAddress: {
    City?: string;
    Town?: string;
    StreetAddress?: string;
  } | null;
  Telephones: Array<{ Tel: string }> | null;
  Images: Array<{ URL: string }> | null;
  ServiceTimeInfo: string | null;
  WebsiteURL: string | null;
  IsAccessibleForFree: boolean | null;
}

interface PoiRow {
  name_zh: string;
  name_en: string;
  type: string;
  location: string;
  address_zh: string | null;
  phone: string | null;
  description_zh: string | null;
  opening_hours: { text: string } | null;
  photo_url: string | null;
  website_url: string | null;
  is_free: boolean;
  source_url: string;
  source_type: string;
  is_free_tier: boolean;
}

async function main(): Promise<void> {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error('用法：npx tsx scripts/import-attractions-tourism.ts <AttractionList.json 路徑>');
    process.exit(1); // 缺參數響亮失敗（CI 假成功事件後的鐵律）
  }
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const list = (JSON.parse(raw) as { Attractions: Attraction[] }).Attractions;
  console.log(`來源共 ${list.length} 筆`);

  const rows: PoiRow[] = [];
  let skipped = 0;
  for (const a of list) {
    const name = (a.AttractionName ?? '').trim().slice(0, 120);
    const lat = Number(a.PositionLat);
    const lng = Number(a.PositionLon);
    if (!name || !(lat > 20.5 && lat < 26.5 && lng > 117 && lng < 124.5)) {
      skipped++;
      continue;
    }
    const addr = a.PostalAddress
      ? `${a.PostalAddress.City ?? ''}${a.PostalAddress.Town ?? ''}${a.PostalAddress.StreetAddress ?? ''}`.trim()
      : '';
    const photo = a.Images?.find((i) => /^https:\/\//.test(i.URL ?? ''))?.URL ?? null;
    const website =
      a.WebsiteURL && /^https?:\/\//.test(a.WebsiteURL) ? a.WebsiteURL.slice(0, 300) : null;
    rows.push({
      name_zh: name,
      name_en: name, // 中文資料集無英文名；名稱以原文呈現（不捏造翻譯）
      type: 'scenic_attraction',
      location: `SRID=4326;POINT(${lng} ${lat})`,
      address_zh: addr || null,
      phone: a.Telephones?.[0]?.Tel?.trim() || null,
      description_zh: (a.Description ?? '').trim().slice(0, 600) || null,
      opening_hours: a.ServiceTimeInfo ? { text: String(a.ServiceTimeInfo).slice(0, 200) } : null,
      photo_url: photo,
      website_url: website,
      is_free: a.IsAccessibleForFree ?? true,
      source_url: `https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Attraction-json.zip#${a.AttractionID}`,
      source_type: 'tourism_admin',
      is_free_tier: true,
    });
  }

  // (name_zh, type) 唯一：同名第 2 筆起加 #序號（同 OSM 匯入慣例，透明可追溯）
  const seen = new Map<string, number>();
  const deduped = rows.map((r) => {
    const n = seen.get(r.name_zh) ?? 0;
    seen.set(r.name_zh, n + 1);
    return n === 0 ? r : { ...r, name_zh: `${r.name_zh} #${n + 1}` };
  });

  let done = 0;
  for (let i = 0; i < deduped.length; i += 500) {
    const batch = deduped.slice(i, i + 500);
    const { error } = await supabase.from('pois').upsert(batch, { onConflict: 'name_zh,type' });
    if (error) throw new Error(`upsert 失敗（第 ${i} 起）：${error.message}`);
    done += batch.length;
    process.stdout.write(`  ${done}/${deduped.length}\r`);
  }
  console.log(`\n✅ 景點匯入完成：${done} 筆（座標異常略過 ${skipped} 筆）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
