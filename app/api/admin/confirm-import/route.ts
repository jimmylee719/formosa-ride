// POST /api/admin/confirm-import — 確認匯入（Phase 14A，v4.0 C7）
// 收前端送回的驗證結果，逐欄白名單重建 + 複驗後寫庫，並記錄 import_history。
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { precomputeElevationForRoute } from '@/lib/elevation';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import {
  POI_TYPE_MAP,
  ROUTE_TYPE_MAP,
  DIFFICULTY_MAP,
  CORRECTION_FIELD_MAP,
  type PoiRecord,
  type RouteRecord,
  type CorrectionRecord,
} from '@/lib/import-excel';

const POI_TYPES = Object.values(POI_TYPE_MAP);
const ROUTE_TYPES = Object.values(ROUTE_TYPE_MAP);
const DIFFICULTIES = Object.values(DIFFICULTY_MAP);
const POINT_RE = /^SRID=4326;POINT\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\)$/;
const LINESTRING_RE = /^SRID=4326;LINESTRING\((?:-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?,){1,}-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?\)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

function rebuildPoi(r: Record<string, unknown>): PoiRecord | null {
  const nameZh = optStr(r.name_zh);
  const type = String(r.type ?? '');
  const location = String(r.location ?? '');
  const m = POINT_RE.exec(location);
  if (!nameZh || !POI_TYPES.includes(type) || !m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (lat < 21 || lat > 26 || lng < 119 || lng > 122.5) return null;
  return {
    name_zh: nameZh,
    name_en: optStr(r.name_en) ?? nameZh,
    type,
    location,
    address_zh: optStr(r.address_zh),
    phone: optStr(r.phone),
    description_zh: optStr(r.description_zh),
    description_en: optStr(r.description_en),
    is_free: r.is_free === true,
    has_bike_parking: r.has_bike_parking === true,
    has_shower: r.has_shower === true,
    allows_camping: r.allows_camping === true,
    has_charging: r.has_charging === true,
    water_available: r.water_available === true,
    is_24h: r.is_24h === true,
    source_url: optStr(r.source_url),
    source_type: 'manual_excel', // 一律由伺服器決定
    is_free_tier: r.is_free_tier === true,
    verified: true,
  };
}

function rebuildRoute(r: Record<string, unknown>): RouteRecord | null {
  const nameZh = optStr(r.name_zh);
  const slug = String(r.slug ?? '');
  const type = String(r.type ?? '');
  const difficulty = String(r.difficulty ?? '');
  const geometry = String(r.geometry ?? '');
  const distance = Number(r.distance_km);
  if (
    !nameZh ||
    !/^[a-z0-9-]{1,120}$/.test(slug) ||
    !ROUTE_TYPES.includes(type) ||
    !DIFFICULTIES.includes(difficulty) ||
    !LINESTRING_RE.test(geometry) ||
    !Number.isFinite(distance) ||
    distance <= 0
  ) {
    return null;
  }
  const days = Number(r.suggested_days);
  return {
    slug,
    name_zh: nameZh,
    name_en: optStr(r.name_en) ?? nameZh,
    type,
    geometry,
    distance_km: distance,
    difficulty,
    suggested_days: Number.isFinite(days) && days > 0 ? Math.round(days) : null,
    start_name_zh: optStr(r.start_name_zh),
    end_name_zh: optStr(r.end_name_zh),
    counties: Array.isArray(r.counties) ? r.counties.map(String).slice(0, 30) : [],
    description_zh: optStr(r.description_zh),
    description_en: optStr(r.description_en),
    tips_zh: optStr(r.tips_zh),
    managing_authority: optStr(r.managing_authority),
    data_source: 'manual',
  };
}

interface CorrectionResult {
  id: string;
  name: string;
  ok: boolean;
  message: string;
}

async function applyCorrections(
  records: CorrectionRecord[]
): Promise<{ applied: number; results: CorrectionResult[] }> {
  const supabase = createServiceClient();
  const results: CorrectionResult[] = [];
  let applied = 0;

  for (const r of records) {
    const spec = CORRECTION_FIELD_MAP[r.field_zh];
    if (!UUID_RE.test(r.id) || !spec) {
      results.push({ id: r.id, name: r.expected_name, ok: false, message: '格式不正確' });
      continue;
    }
    // 先查 POI，再查路線
    let table: 'pois' | 'routes' = 'pois';
    let { data: row } = await supabase
      .from('pois')
      .select('id, name_zh')
      .eq('id', r.id)
      .maybeSingle();
    if (!row) {
      table = 'routes';
      ({ data: row } = await supabase
        .from('routes')
        .select('id, name_zh')
        .eq('id', r.id)
        .maybeSingle());
    }
    if (!row) {
      results.push({ id: r.id, name: r.expected_name, ok: false, message: '找不到此 ID 的資料' });
      continue;
    }
    if (row.name_zh !== r.expected_name) {
      results.push({
        id: r.id,
        name: r.expected_name,
        ok: false,
        message: `名稱不符（系統內為「${row.name_zh}」），未套用`,
      });
      continue;
    }
    if (spec.poiOnly && table !== 'pois') {
      results.push({
        id: r.id,
        name: r.expected_name,
        ok: false,
        message: `「${r.field_zh}」僅適用於 POI 資料`,
      });
      continue;
    }
    const value =
      r.field_zh === '下架' ? false : spec.boolean ? r.new_value === '是' : r.new_value;
    const { error } = await supabase
      .from(table)
      .update({ [spec.column]: value })
      .eq('id', r.id);
    if (error) {
      results.push({ id: r.id, name: r.expected_name, ok: false, message: '更新失敗' });
    } else {
      applied += 1;
      results.push({
        id: r.id,
        name: r.expected_name,
        ok: true,
        message: r.field_zh === '下架' ? '已下架' : `${r.field_zh} 已更新`,
      });
    }
  }
  return { applied, results };
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    type?: unknown;
    records?: unknown;
    fileName?: unknown;
    errorCount?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const type = String(body.type ?? '');
  const rawRecords = Array.isArray(body.records) ? (body.records as Record<string, unknown>[]) : [];
  const fileName = optStr(body.fileName);
  const errorCount = Number(body.errorCount) || 0;

  if (!['poi', 'route', 'correction'].includes(type) || rawRecords.length === 0) {
    return NextResponse.json({ error: '沒有可匯入的資料' }, { status: 400 });
  }
  if (rawRecords.length > 2000) {
    return NextResponse.json({ error: '單次最多匯入 2000 筆' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let imported = 0;
  let rejected = 0;
  let correctionResults: CorrectionResult[] | undefined;
  let dbError: string | null = null;

  if (type === 'poi') {
    const records = rawRecords.map(rebuildPoi).filter((x): x is PoiRecord => x !== null);
    rejected = rawRecords.length - records.length;
    if (records.length > 0) {
      const { error } = await supabase
        .from('pois')
        .upsert(records, { onConflict: 'name_zh,type' });
      if (error) dbError = error.message;
      else imported = records.length;
    }
  } else if (type === 'route') {
    const records = rawRecords.map(rebuildRoute).filter((x): x is RouteRecord => x !== null);
    rejected = rawRecords.length - records.length;
    if (records.length > 0) {
      const { data: inserted, error } = await supabase
        .from('routes')
        .upsert(records, { onConflict: 'slug' })
        .select('id');
      if (error) dbError = error.message;
      else {
        imported = records.length;
        // 海拔剖面背景預先計算（Phase 15C，v9.0 B2）：回應先送出，計算不讓管理員等
        const ids = (inserted ?? []).map((r) => r.id as string);
        after(async () => {
          for (const routeId of ids) {
            try {
              await precomputeElevationForRoute(routeId);
            } catch (err) {
              console.error(`[confirm-import] 路線 ${routeId} 海拔預先計算失敗:`, err);
            }
          }
        });
      }
    }
  } else {
    const records = rawRecords
      .map((r) => ({
        id: String(r.id ?? ''),
        expected_name: String(r.expected_name ?? ''),
        field_zh: String(r.field_zh ?? ''),
        new_value: String(r.new_value ?? ''),
        reason: optStr(r.reason),
      }))
      .filter((r) => r.id && r.expected_name && r.field_zh);
    rejected = rawRecords.length - records.length;
    const out = await applyCorrections(records);
    imported = out.applied;
    correctionResults = out.results;
  }

  const status = dbError ? 'failed' : errorCount > 0 || rejected > 0 || (correctionResults?.some((c) => !c.ok) ?? false) ? 'partial' : 'completed';
  await supabase.from('import_history').insert({
    upload_type: type,
    file_name: fileName,
    record_count: imported,
    error_count: errorCount + rejected + (correctionResults?.filter((c) => !c.ok).length ?? 0),
    uploaded_by: session.email,
    status,
  });

  if (dbError) {
    console.error('[confirm-import] db error:', dbError);
    return NextResponse.json({ error: '寫入資料庫失敗，請稍後再試' }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    imported,
    rejected,
    ...(correctionResults ? { correctionResults } : {}),
  });
}
