/**
 * scripts/import-hotels.ts — 觀光署合法旅宿匯入（Phase 15B，v8.0 C 節）
 * 資料來源：交通部觀光署「旅館民宿 - 觀光資訊資料庫」（data.gov.tw/dataset/7780，每日更新）
 *   下載：https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Hotel-json.zip
 * 執行：npx tsx scripts/import-hotels.ts <HotelList.json 路徑>
 * 可重複執行：以 (name_zh, type) upsert。
 *
 * HotelClasses 代碼（以執照號碼實證，2026-07-10）：
 *   1 國際觀光旅館（交觀業字）、2 一般觀光旅館（交觀宿字）→ hotel
 *   3 一般旅館（縣市旅館執照）→ guesthouse；名稱含「青年旅舍/青年旅館/Hostel」→ hostel、
 *     含「膠囊」→ capsule_hotel（名稱自證，不另行推測）
 *   4 民宿（縣市民宿執照）→ homestay
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

interface Hotel {
  HotelID: string;
  HotelName: string;
  Description?: string | null;
  PositionLat?: number | null;
  PositionLon?: number | null;
  HotelClasses?: number[];
  PostalAddress?: { City?: string; Town?: string; StreetAddress?: string } | null;
  Telephones?: Array<{ Tel?: string }> | null;
  WebsiteURL?: string | null;
}

function subtypeOf(h: Hotel): string {
  const name = h.HotelName ?? '';
  if (/膠囊/.test(name)) return 'capsule_hotel';
  if (/青年旅舍|青年旅館|hostel/i.test(name)) return 'hostel';
  const cls = h.HotelClasses ?? [];
  if (cls.includes(1) || cls.includes(2)) return 'hotel';
  if (cls.includes(4)) return 'homestay';
  return 'guesthouse'; // class 3 與未標示者
}

async function main(): Promise<void> {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error('用法：npx tsx scripts/import-hotels.ts <HotelList.json 路徑>');
    process.exit(1); // 缺參數必須響亮失敗（CI 曾因 exit 0 假成功，2026-07-11）
  }
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const hotels = (JSON.parse(raw) as { Hotels: Hotel[] }).Hotels;
  console.log(`來源共 ${hotels.length} 筆`);

  const seen = new Map<string, number>();
  const rows = hotels
    .filter(
      (h) =>
        h.HotelName &&
        typeof h.PositionLat === 'number' &&
        typeof h.PositionLon === 'number' &&
        h.PositionLat >= 21 &&
        h.PositionLat <= 26.5 &&
        h.PositionLon >= 118 &&
        h.PositionLon <= 122.5
    )
    .map((h) => {
      let name = h.HotelName.trim();
      const n = seen.get(name) ?? 0;
      seen.set(name, n + 1);
      if (n > 0) name = `${name} #${n + 1}`;
      const addr = h.PostalAddress;
      return {
        name_zh: name,
        name_en: name, // 資料庫多數無英文名，以中文名存放
        type: 'accommodation',
        location: `SRID=4326;POINT(${h.PositionLon} ${h.PositionLat})`,
        address_zh: addr
          ? `${addr.City ?? ''}${addr.Town ?? ''}${addr.StreetAddress ?? ''}` || null
          : null,
        phone: h.Telephones?.[0]?.Tel || null,
        description_zh: (h.Description ?? '').slice(0, 300) || null,
        website: h.WebsiteURL || null,
        accommodation_subtype: subtypeOf(h),
        is_free: false,
        is_free_tier: false,
        source_type: 'government',
        source_url: `https://media.taiwan.net.tw/zh-tw/portal/travel/details/${h.HotelID.toLowerCase()}`,
        verified: true, // 政府執照登記資料
      };
    });

  const bySubtype: Record<string, number> = {};
  rows.forEach((r) => {
    bySubtype[r.accommodation_subtype] = (bySubtype[r.accommodation_subtype] ?? 0) + 1;
  });
  console.log(`有效 ${rows.length} 筆，子類型分布：`, bySubtype);

  let done = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('pois').upsert(batch, { onConflict: 'name_zh,type' });
    if (error) throw new Error(`upsert 失敗（第 ${i} 起）：${error.message}`);
    done += batch.length;
    process.stdout.write(`  ${done}/${rows.length}\r`);
  }
  console.log(`\n✅ 旅宿匯入完成：${done} 筆`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
