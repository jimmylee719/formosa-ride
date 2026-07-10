// lib/import-excel.ts — Excel 批次匯入：解析/驗證核心（Phase 14A，v4.0 C 節）
// 純函數，供 import-excel（驗證）與 confirm-import（匯入前複驗）共用。
import type ExcelJS from 'exceljs';

// ── 型別對照（v4.0 C6） ─────────────────────────────────────
export const POI_TYPE_MAP: Record<string, string> = {
  便利商店: 'convenience_store',
  超市: 'supermarket',
  補水站: 'water_station',
  合法露營區: 'campsite_legal',
  野外紮營點: 'campsite_wild',
  廟宇過夜點: 'temple_overnight',
  公共廁所: 'public_toilet',
  淋浴設施: 'shower',
  自行車維修店: 'bicycle_repair',
  打氣站: 'pump_station',
  腳踏車停放區: 'bicycle_parking',
  火車站: 'train_station',
  醫院: 'hospital',
  警察局: 'police',
  景點: 'scenic_attraction',
  餐廳: 'restaurant',
  住宿: 'accommodation',
};
export const VALID_POI_TYPES = Object.keys(POI_TYPE_MAP);

export const ROUTE_TYPE_MAP: Record<string, string> = {
  完整環島: 'full_island',
  西部路線: 'west_coast',
  東部路線: 'east_coast',
  分段路線: 'segment',
  支線: 'branch',
  自訂路線: 'custom',
};
export const DIFFICULTY_MAP: Record<string, string> = {
  簡單: 'easy',
  中等: 'moderate',
  困難: 'hard',
  專家級: 'expert',
};

// 修正範本允許的欄位（v4.0 C4；is_active 兩表皆有，phone/address 僅 POI）
export const CORRECTION_FIELD_MAP: Record<
  string,
  { column: string; poiOnly: boolean; boolean?: boolean }
> = {
  電話: { column: 'phone', poiOnly: true },
  地址: { column: 'address_zh', poiOnly: true },
  中文名稱: { column: 'name_zh', poiOnly: false },
  英文名稱: { column: 'name_en', poiOnly: false },
  中文說明: { column: 'description_zh', poiOnly: false },
  英文說明: { column: 'description_en', poiOnly: false },
  是否營業中: { column: 'is_active', poiOnly: false, boolean: true },
  下架: { column: 'is_active', poiOnly: false }, // 特殊：一律設 false
};

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  suggestion?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── 儲存格正規化 ─────────────────────────────────────────────
export function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim();
    if ('text' in v) return String(v.text).trim();
    if ('result' in v) return v.result == null ? '' : String(v.result).trim();
    return '';
  }
  return String(v).trim();
}

export function cellNumber(v: ExcelJS.CellValue): number | null {
  if (typeof v === 'number') return v;
  const t = cellText(v);
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 是/否欄位：預設值由呼叫端決定（v4.0 C2 註記部分欄位預設「是」） */
function yesNo(v: ExcelJS.CellValue, defaultYes: boolean): boolean {
  const t = cellText(v);
  if (t === '') return defaultYes;
  return t === '是';
}

/** 取工作表資料列（跳過第 1 列標題），回傳 [excelRowNum, cells[]] */
export function sheetDataRows(ws: ExcelJS.Worksheet): Array<[number, ExcelJS.CellValue[]]> {
  const out: Array<[number, ExcelJS.CellValue[]]> = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    // row.values 是 1-indexed（[0] 恆為空）
    const vals = row.values as ExcelJS.CellValue[];
    const cells = vals.slice(1);
    if (cells.every((c) => cellText(c) === '' && typeof c !== 'number')) return; // 全空列略過
    out.push([rowNumber, cells]);
  });
  return out;
}

// ── POI 驗證（v4.0 C2/C6） ──────────────────────────────────
export interface PoiRecord {
  name_zh: string;
  name_en: string;
  type: string;
  location: string;
  address_zh: string | null;
  phone: string | null;
  description_zh: string | null;
  description_en: string | null;
  is_free: boolean;
  has_bike_parking: boolean;
  has_shower: boolean;
  allows_camping: boolean;
  has_charging: boolean;
  water_available: boolean;
  is_24h: boolean;
  source_url: string | null;
  source_type: string;
  is_free_tier: boolean;
  verified: boolean;
}

export function validatePoiRows(
  rows: Array<[number, ExcelJS.CellValue[]]>
): { records: PoiRecord[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const records: PoiRecord[] = [];

  for (const [rowNum, c] of rows) {
    const before = errors.length;
    const nameZh = cellText(c[0]);
    const nameEn = cellText(c[1]);
    const typeZh = cellText(c[2]);
    const lat = cellNumber(c[3]);
    const lng = cellNumber(c[4]);

    if (!nameZh) errors.push({ row: rowNum, field: '中文名稱', message: '此欄必填' });
    if (!typeZh) {
      errors.push({ row: rowNum, field: '類型', message: '此欄必填' });
    } else if (!VALID_POI_TYPES.includes(typeZh)) {
      const suggestion = VALID_POI_TYPES.find(
        (t) => t.includes(typeZh) || typeZh.includes(t)
      );
      errors.push({
        row: rowNum,
        field: '類型',
        message: `「${typeZh}」不在允許的類型清單中`,
        ...(suggestion ? { suggestion: `建議改為「${suggestion}」` } : {}),
      });
    }
    if (lat === null || lat < 21 || lat > 26) {
      errors.push({
        row: rowNum,
        field: '緯度',
        message: '緯度必須是 21–26 之間的數字（台灣範圍）',
      });
    }
    if (lng === null || lng < 119 || lng > 122.5) {
      errors.push({
        row: rowNum,
        field: '經度',
        message: '經度必須是 119–122.5 之間的數字（台灣範圍）',
      });
    }

    if (errors.length > before) continue;
    records.push({
      name_zh: nameZh,
      name_en: nameEn || nameZh,
      type: POI_TYPE_MAP[typeZh] ?? typeZh,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      address_zh: cellText(c[5]) || null,
      phone: cellText(c[6]) || null,
      description_zh: cellText(c[7]) || null,
      description_en: cellText(c[8]) || null,
      is_free: yesNo(c[9], true), // C2：預設「是」
      has_bike_parking: yesNo(c[10], false),
      has_shower: yesNo(c[11], false),
      allows_camping: yesNo(c[12], false),
      has_charging: yesNo(c[13], false),
      water_available: yesNo(c[14], false),
      is_24h: yesNo(c[15], false),
      source_url: cellText(c[16]) || null,
      source_type: 'manual_excel',
      is_free_tier: yesNo(c[17], true), // C6：isFreeTier !== '否'
      verified: true, // Excel 上傳視為已人工確認
    });
  }
  return { records, errors };
}

// ── GPX 解析（路線範本 D 欄對應檔案） ────────────────────────
export function parseGpxToWkt(gpxText: string): string | null {
  const tags = gpxText.match(/<(?:trkpt|rtept)\b[^>]*/g) ?? [];
  const pts: Array<[number, number]> = [];
  for (const tag of tags) {
    const lat = Number(/lat="([^"]+)"/.exec(tag)?.[1]);
    const lon = Number(/lon="([^"]+)"/.exec(tag)?.[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lon, lat]);
  }
  if (pts.length < 2) return null;
  // 超過 2000 點均勻抽稀（DB 儲存與前端繪製都不需要更密）
  const MAX = 2000;
  const step = pts.length > MAX ? pts.length / MAX : 1;
  const kept: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[Math.floor(i)];
    if (p) kept.push(p);
  }
  const last = pts[pts.length - 1];
  const lastKept = kept[kept.length - 1];
  if (last && lastKept && (last[0] !== lastKept[0] || last[1] !== lastKept[1])) {
    kept.push(last);
  }
  return `SRID=4326;LINESTRING(${kept.map(([x, y]) => `${x} ${y}`).join(',')})`;
}

export function slugify(nameEn: string, nameZh: string): string {
  const s = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s) return s;
  // 英文名為空/非拉丁字元：以中文名做確定性雜湊，重跑不會產生重複路線
  let h = 5381;
  for (const ch of nameZh) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return `route-${h.toString(16)}`;
}

// ── 路線驗證（v4.0 C3） ─────────────────────────────────────
export interface RouteRecord {
  slug: string;
  name_zh: string;
  name_en: string;
  type: string;
  geometry: string;
  distance_km: number;
  difficulty: string;
  suggested_days: number | null;
  start_name_zh: string | null;
  end_name_zh: string | null;
  counties: string[];
  description_zh: string | null;
  description_en: string | null;
  tips_zh: string | null;
  managing_authority: string | null;
  data_source: string;
}

export function validateRouteRows(
  rows: Array<[number, ExcelJS.CellValue[]]>,
  gpxFiles: Map<string, string> // 檔名 → GPX 內容
): { records: RouteRecord[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const records: RouteRecord[] = [];

  for (const [rowNum, c] of rows) {
    const before = errors.length;
    const nameZh = cellText(c[0]);
    const nameEn = cellText(c[1]);
    const typeZh = cellText(c[2]);
    const gpxName = cellText(c[3]);
    const distance = cellNumber(c[4]);
    const difficultyZh = cellText(c[5]);

    if (!nameZh) errors.push({ row: rowNum, field: '中文路線名稱', message: '此欄必填' });
    if (!typeZh || !ROUTE_TYPE_MAP[typeZh]) {
      errors.push({
        row: rowNum,
        field: '路線類型',
        message: `「${typeZh || '（空白）'}」不在選單中（完整環島/西部路線/東部路線/分段路線/支線/自訂路線）`,
      });
    }
    let geometry: string | null = null;
    if (!gpxName) {
      errors.push({ row: rowNum, field: 'GPX檔案名稱', message: '此欄必填' });
    } else if (!gpxFiles.has(gpxName)) {
      errors.push({
        row: rowNum,
        field: 'GPX檔案名稱',
        message: `找不到對應的 GPX 檔「${gpxName}」，請與 Excel 一起上傳且檔名完全相符`,
      });
    } else {
      geometry = parseGpxToWkt(gpxFiles.get(gpxName)!);
      if (!geometry) {
        errors.push({
          row: rowNum,
          field: 'GPX檔案名稱',
          message: `「${gpxName}」內找不到有效座標點（需含 trkpt 或 rtept）`,
        });
      }
    }
    if (distance === null || distance <= 0) {
      errors.push({ row: rowNum, field: '總距離(公里)', message: '必須是大於 0 的數字' });
    }
    if (!difficultyZh || !DIFFICULTY_MAP[difficultyZh]) {
      errors.push({
        row: rowNum,
        field: '難度',
        message: `「${difficultyZh || '（空白）'}」不在選單中（簡單/中等/困難/專家級）`,
      });
    }

    if (errors.length > before) continue;
    const counties = cellText(c[9])
      .split(/[、,，;\s]+/)
      .filter(Boolean);
    records.push({
      slug: slugify(nameEn, nameZh),
      name_zh: nameZh,
      name_en: nameEn || nameZh,
      type: ROUTE_TYPE_MAP[typeZh]!,
      geometry: geometry!,
      distance_km: distance!,
      difficulty: DIFFICULTY_MAP[difficultyZh]!,
      suggested_days: cellNumber(c[6]),
      start_name_zh: cellText(c[7]) || null,
      end_name_zh: cellText(c[8]) || null,
      counties,
      description_zh: cellText(c[10]) || null,
      description_en: cellText(c[11]) || null,
      tips_zh: cellText(c[12]) || null,
      managing_authority: cellText(c[13]) || null,
      data_source: 'manual',
    });
  }
  return { records, errors };
}

// ── 修正資料驗證（v4.0 C4） ─────────────────────────────────
export interface CorrectionRecord {
  id: string;
  expected_name: string;
  field_zh: string;
  new_value: string;
  reason: string | null;
}

export function validateCorrectionRows(
  rows: Array<[number, ExcelJS.CellValue[]]>
): { records: CorrectionRecord[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const records: CorrectionRecord[] = [];

  for (const [rowNum, c] of rows) {
    const before = errors.length;
    const id = cellText(c[0]);
    const name = cellText(c[1]);
    const fieldZh = cellText(c[2]);
    const newValue = cellText(c[3]);

    if (!UUID_RE.test(id)) {
      errors.push({ row: rowNum, field: '資料ID', message: '必須是系統匯出的 UUID 格式' });
    }
    if (!name) errors.push({ row: rowNum, field: '資料名稱', message: '此欄必填（供核對）' });
    if (!CORRECTION_FIELD_MAP[fieldZh]) {
      errors.push({
        row: rowNum,
        field: '要修改的欄位',
        message: `「${fieldZh || '（空白）'}」不支援，可用：${Object.keys(CORRECTION_FIELD_MAP).join(' / ')}`,
      });
    } else if (fieldZh !== '下架' && !newValue) {
      errors.push({ row: rowNum, field: '新內容', message: '此欄必填' });
    }

    if (errors.length > before) continue;
    records.push({
      id,
      expected_name: name,
      field_zh: fieldZh,
      new_value: newValue,
      reason: cellText(c[4]) || null,
    });
  }
  return { records, errors };
}
