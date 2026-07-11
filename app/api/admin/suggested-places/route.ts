// /api/admin/suggested-places — 用戶建議地點審核（Phase 19A）
// GET：待審清單＋近期已處理；POST：採用（寫入 pois）或退回。
// middleware 已驗證管理員身分。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { POI_LABELS } from '@/lib/poi-icons';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const supabase = createServiceClient();
  const [pending, handled] = await Promise.all([
    supabase
      .from('suggested_places')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('suggested_places')
      .select('*')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(20),
  ]);
  if (pending.error || handled.error) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
  }
  return NextResponse.json({ pending: pending.data ?? [], handled: handled.data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: {
    id?: string;
    action?: string;
    lat?: number;
    lng?: number;
    poiType?: string;
    nameEn?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || !UUID_RE.test(id) || !['adopt', 'reject'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from('suggested_places')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: '找不到這筆建議' }, { status: 404 });
  if (row.status !== 'pending') {
    return NextResponse.json({ error: '已處理過' }, { status: 409 });
  }

  if (action === 'reject') {
    await supabase
      .from('suggested_places')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // 採用：座標（表單覆寫優先，其次自動解析值）＋分類必備
  const lat = Number(body.lat ?? row.parsed_lat);
  const lng = Number(body.lng ?? row.parsed_lng);
  const poiType = String(body.poiType ?? row.poi_type ?? '');
  if (!Number.isFinite(lat) || lat < 20.5 || lat > 26.5 || !Number.isFinite(lng) || lng < 117 || lng > 124.5) {
    return NextResponse.json({ error: '座標缺失或超出台灣範圍，請手動填入' }, { status: 400 });
  }
  if (!(poiType in POI_LABELS)) {
    return NextResponse.json({ error: '請選擇 POI 分類' }, { status: 400 });
  }

  const nameEn = (body.nameEn ?? '').trim().slice(0, 120) || (row.name as string);
  // 免費設施判定沿用匯入腳本邏輯：商業類型不標示免費
  const commercial = ['convenience_store', 'supermarket', 'bicycle_repair', 'restaurant', 'accommodation'];
  const { data: poi, error: poiErr } = await supabase
    .from('pois')
    .insert({
      name_zh: row.name,
      name_en: nameEn,
      type: poiType,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      is_free: !commercial.includes(poiType),
      source_type: 'user_suggestion',
      source_url: (row.google_url as string | null) ?? null,
      is_free_tier: true, // 社群貢獻資料開放給所有用戶
    })
    .select('id')
    .single();
  if (poiErr || !poi) {
    // 最常見：同名同類型已存在（unique name_zh,type）
    return NextResponse.json(
      { error: `寫入 POI 失敗：${poiErr?.message ?? '未知錯誤'}` },
      { status: 500 }
    );
  }

  await supabase
    .from('suggested_places')
    .update({
      status: 'adopted',
      adopted_poi_id: poi.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  return NextResponse.json({ ok: true, poiId: poi.id });
}
