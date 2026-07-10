/**
 * scripts/import-accident-data.ts — 警政署事故資料 → 自行車事故熱點（Phase 15）
 *
 * 資料來源：內政部警政署「傷亡道路交通事故資料」
 *   data.gov.tw/dataset/177136（114 年度，ZIP 內含 A1 一檔 + A2 十二檔 CSV）
 * 執行：npx tsx scripts/import-accident-data.ts <CSV所在目錄> <西元年度>
 * 可重複執行：同來源同年度先刪後插，不產生重複。
 *
 * 欄位依 114 年實際檔案校準（2026-07-10 下載確認）：
 *   發生日期 / 發生時間 / 事故類別名稱(A1|A2) / 發生地點 / 經度 / 緯度 /
 *   當事者區分-類別-子類別名稱-車種（每一「當事者」一列，同一事故多列）
 * 自行車認定：車種 =「腳踏自行車」或「電動輔助自行車」
 *   （「微型電動二輪車」屬電動滑板車類，不計入）
 *
 * 聚合邏輯（Phase 8 骨架設計）：
 *   同一事故（日期+時間+座標）只計一次 → 500m 網格聚合 →
 *   ≥20 件 high、≥10 件 medium、≥5 件 low → 寫入 danger_zones（Point）
 */
import { createReadStream, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

const BIKE_TYPES = new Set(['腳踏自行車', '電動輔助自行車']);
const SOURCE_LABEL = '內政部警政署 data.gov.tw/dataset/177136';
// 500m 網格（緯度 0.0045°；經度以台灣中緯度 23.5°N 換算 0.0049°）
const D_LAT = 0.0045;
const D_LNG = 0.0049;

/** 最簡 CSV 欄位切割（支援雙引號包覆欄位；實測檔案僅極少數欄位含引號） */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ',' && !inQuote) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

interface Accident {
  lat: number;
  lng: number;
  isA1: boolean;
  place: string;
}

async function parseFile(path: string, accidents: Map<string, Accident>): Promise<number> {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let idx: Record<string, number> | null = null;
  let bikeRows = 0;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, '');
    const cells = splitCsv(line);
    if (!idx) {
      idx = {};
      cells.forEach((h, i) => {
        idx![h.trim()] = i;
      });
      for (const col of ['發生日期', '發生時間', '事故類別名稱', '發生地點', '經度', '緯度', '當事者區分-類別-子類別名稱-車種']) {
        if (idx[col] === undefined) throw new Error(`${path} 缺少欄位「${col}」`);
      }
      continue;
    }
    const vehicle = cells[idx['當事者區分-類別-子類別名稱-車種']!] ?? '';
    if (!BIKE_TYPES.has(vehicle.trim())) continue;
    const lat = Number(cells[idx['緯度']!]);
    const lng = Number(cells[idx['經度']!]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 21 || lat > 26.5 || lng < 118 || lng > 122.5) continue;
    bikeRows++;
    const key = `${cells[idx['發生日期']!]}|${cells[idx['發生時間']!]}|${lng.toFixed(6)}|${lat.toFixed(6)}`;
    if (!accidents.has(key)) {
      accidents.set(key, {
        lat,
        lng,
        isA1: (cells[idx['事故類別名稱']!] ?? '').trim() === 'A1',
        place: (cells[idx['發生地點']!] ?? '').trim(),
      });
    }
  }
  return bikeRows;
}

/** 從「發生地點」擷取縣市＋鄉鎮市區（例：南投縣埔里鎮） */
function adminFromPlace(place: string): string {
  const m = /^(.{2,3}?[縣市])(.{1,4}?[鄉鎮市區])?/.exec(place);
  return m ? `${m[1]}${m[2] ?? ''}` : '';
}

async function main(): Promise<void> {
  const [dir, yearArg] = process.argv.slice(2);
  if (!dir || !yearArg) {
    console.log('用法：npx tsx scripts/import-accident-data.ts <CSV所在目錄> <西元年度>');
    process.exit(0);
  }
  const year = Number(yearArg);
  if (!Number.isInteger(year) || year < 2000) throw new Error('年度需為西元年，例如 2025');

  const files = readdirSync(dir).filter((f) => /交通事故資料.*\.csv$/i.test(f));
  if (files.length === 0) throw new Error(`目錄內找不到事故 CSV：${dir}`);
  console.log(`找到 ${files.length} 個事故 CSV，開始解析（僅計入：${[...BIKE_TYPES].join('、')}）…`);

  const accidents = new Map<string, Accident>();
  for (const f of files) {
    const n = await parseFile(join(dir, f), accidents);
    console.log(`  ${f}：自行車當事者列 ${n}`);
  }
  console.log(`去重後自行車相關事故：${accidents.size} 件`);

  // 500m 網格聚合
  interface Cell {
    count: number;
    a1: number;
    sumLat: number;
    sumLng: number;
    place: string;
  }
  const cells = new Map<string, Cell>();
  for (const a of accidents.values()) {
    const key = `${Math.floor(a.lat / D_LAT)}|${Math.floor(a.lng / D_LNG)}`;
    const c = cells.get(key) ?? { count: 0, a1: 0, sumLat: 0, sumLng: 0, place: a.place };
    c.count++;
    if (a.isA1) c.a1++;
    c.sumLat += a.lat;
    c.sumLng += a.lng;
    cells.set(key, c);
  }

  const nameSeen = new Map<string, number>();
  const zones = [...cells.values()]
    .filter((c) => c.count >= 5)
    .map((c) => {
      const level = c.count >= 20 ? 'high' : c.count >= 10 ? 'medium' : 'low';
      const admin = adminFromPlace(c.place);
      let name = `${admin}自行車事故熱點`;
      const n = nameSeen.get(name) ?? 0;
      nameSeen.set(name, n + 1);
      if (n > 0) name = `${name} #${n + 1}`;
      const lat = c.sumLat / c.count;
      const lng = c.sumLng / c.count;
      return {
        name_zh: name,
        name_en: 'Bicycle accident hotspot',
        level,
        geometry: `SRID=4326;POINT(${lng.toFixed(6)} ${lat.toFixed(6)})`,
        accident_count: c.count,
        accident_source: SOURCE_LABEL,
        data_year: year,
        reason_zh: `${year} 年警政署資料：此區域（約 500 公尺）自行車相關事故 ${c.count} 件${c.a1 > 0 ? `，其中死亡事故 ${c.a1} 件` : ''}，行經請特別留意`,
        reason_en: `${c.count} bicycle-related accidents within ~500 m in ${year} (NPA open data)${c.a1 > 0 ? `, incl. ${c.a1} fatal` : ''}. Ride with extra care.`,
        is_night_only: false,
      };
    });

  console.log(
    `形成熱點 ${zones.length} 處（high ${zones.filter((z) => z.level === 'high').length}／medium ${zones.filter((z) => z.level === 'medium').length}／low ${zones.filter((z) => z.level === 'low').length}）`
  );

  // 冪等：同來源同年度先刪後插
  const { error: delErr } = await supabase
    .from('danger_zones')
    .delete()
    .eq('accident_source', SOURCE_LABEL)
    .eq('data_year', year);
  if (delErr) throw new Error(`清除舊資料失敗：${delErr.message}`);

  for (let i = 0; i < zones.length; i += 500) {
    const { error } = await supabase.from('danger_zones').insert(zones.slice(i, i + 500));
    if (error) throw new Error(`寫入失敗（第 ${i} 起）：${error.message}`);
    process.stdout.write(`  ${Math.min(i + 500, zones.length)}/${zones.length}\r`);
  }
  console.log(`\n✅ 完成：danger_zones 新增 ${zones.length} 筆自行車事故熱點（${year} 年）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
