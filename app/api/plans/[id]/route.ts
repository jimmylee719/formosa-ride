// /api/plans/[id] — 單一行程（Phase 19A）
// GET    ?device_id=  → 完整內容（日＋停靠點，join POI/路線名稱）
// PUT    { deviceId, name, startDate, notes, days:[{...stops}] } → 整份覆寫
// DELETE { deviceId } → 刪除
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { MAX_DAYS_PER_PLAN, MAX_STOPS_PER_DAY } from '@/types/plan';
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** 驗證行程存在且屬於該裝置；回傳 null = 已回應錯誤 */
async function assertOwner(
  supabase: SupabaseClient,
  planId: string,
  deviceId: string
): Promise<NextResponse | null> {
  if (!UUID_RE.test(planId) || !UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  const { data } = await supabase
    .from('trip_plans')
    .select('id, device_id')
    .eq('id', planId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  const supabase = createServiceClient();
  const denied = await assertOwner(supabase, id, deviceId);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('trip_plans')
    .select(
      `id, name, start_date, notes, updated_at,
       plan_days (
         day_number, depart_time, start_name, route_id, notes,
         routes ( name_zh, name_en, distance_km ),
         plan_stops (
           position, poi_id, custom_name, custom_google_url, note,
           pois ( name_zh, name_en, type )
         )
       )`
    )
    .eq('id', id)
    .single();
  if (error || !data) {
    console.error('[api/plans/id] detail error:', error?.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  type StopRow = {
    position: number;
    poi_id: string | null;
    custom_name: string | null;
    custom_google_url: string | null;
    note: string | null;
    pois: { name_zh: string; name_en: string | null; type: string } | null;
  };
  type DayRow = {
    day_number: number;
    depart_time: string | null;
    start_name: string | null;
    route_id: string | null;
    notes: string | null;
    routes: { name_zh: string; name_en: string; distance_km: number } | null;
    plan_stops: StopRow[];
  };
  // supabase-js 對 FK join 推斷為陣列，實際 to-one 回傳物件 → 經 unknown 轉型
  const days = ((data.plan_days ?? []) as unknown as DayRow[])
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      day_number: d.day_number,
      depart_time: d.depart_time,
      start_name: d.start_name,
      route_id: d.route_id,
      notes: d.notes,
      route: d.routes,
      stops: d.plan_stops
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          poi_id: s.poi_id,
          custom_name: s.custom_name,
          custom_google_url: s.custom_google_url,
          note: s.note,
          poi: s.pois,
        })),
    }));

  return NextResponse.json({
    id: data.id,
    name: data.name,
    start_date: data.start_date,
    notes: data.notes,
    updated_at: data.updated_at,
    days,
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: {
    deviceId?: string;
    name?: string;
    startDate?: string | null;
    notes?: string | null;
    days?: Array<{
      day_number?: number;
      depart_time?: string | null;
      start_name?: string | null;
      route_id?: string | null;
      notes?: string | null;
      stops?: Array<{
        poi_id?: string | null;
        custom_name?: string | null;
        custom_google_url?: string | null;
        note?: string | null;
      }>;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const denied = await assertOwner(supabase, id, body.deviceId ?? '');
  if (denied) return denied;

  const name = (body.name ?? '').trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const startDate = body.startDate ?? null;
  if (startDate !== null && !DATE_RE.test(startDate)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  const rawDays = body.days ?? [];
  if (rawDays.length > MAX_DAYS_PER_PLAN) {
    return NextResponse.json({ error: 'Too many days' }, { status: 400 });
  }

  // 正規化與驗證（day_number 依陣列順序重編，避免用戶端亂序）
  const days = rawDays.map((d, i) => {
    const stops = (d.stops ?? []).slice(0, MAX_STOPS_PER_DAY).map((s) => {
      const poiId = s.poi_id && UUID_RE.test(s.poi_id) ? s.poi_id : null;
      const customName = (s.custom_name ?? '').trim().slice(0, 80) || null;
      return {
        poi_id: poiId,
        custom_name: poiId ? null : customName,
        custom_google_url: (s.custom_google_url ?? '').trim().slice(0, 300) || null,
        note: (s.note ?? '').trim().slice(0, 200) || null,
      };
    });
    return {
      day_number: i + 1,
      depart_time:
        d.depart_time && TIME_RE.test(d.depart_time) ? d.depart_time : null,
      start_name: (d.start_name ?? '').trim().slice(0, 80) || null,
      route_id: d.route_id && UUID_RE.test(d.route_id) ? d.route_id : null,
      notes: (d.notes ?? '').trim().slice(0, 500) || null,
      stops: stops.filter((s) => s.poi_id || s.custom_name),
    };
  });

  // 1. 更新主檔
  const { error: metaErr } = await supabase
    .from('trip_plans')
    .update({ name, start_date: startDate, notes: (body.notes ?? '').slice(0, 500) || null })
    .eq('id', id);
  if (metaErr) {
    console.error('[api/plans/id] meta update error:', metaErr.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // 2. 整份覆寫：刪舊日（stops 隨 CASCADE 刪除）→ 插入新日 → 插入停靠點
  const { error: delErr } = await supabase.from('plan_days').delete().eq('plan_id', id);
  if (delErr) {
    console.error('[api/plans/id] days delete error:', delErr.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (days.length > 0) {
    const { data: inserted, error: dayErr } = await supabase
      .from('plan_days')
      .insert(
        days.map((d) => ({
          plan_id: id,
          day_number: d.day_number,
          depart_time: d.depart_time,
          start_name: d.start_name,
          route_id: d.route_id,
          notes: d.notes,
        }))
      )
      .select('id, day_number');
    if (dayErr || !inserted) {
      console.error('[api/plans/id] days insert error:', dayErr?.message);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    const idByDay = new Map(inserted.map((r) => [r.day_number as number, r.id as string]));
    const stopRows = days.flatMap((d) =>
      d.stops.map((s, pos) => ({
        day_id: idByDay.get(d.day_number),
        position: pos + 1,
        ...s,
      }))
    );
    if (stopRows.length > 0) {
      const { error: stopErr } = await supabase.from('plan_stops').insert(stopRows);
      if (stopErr) {
        console.error('[api/plans/id] stops insert error:', stopErr.message);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const denied = await assertOwner(supabase, id, body.deviceId ?? '');
  if (denied) return denied;
  const { error } = await supabase.from('trip_plans').delete().eq('id', id);
  if (error) {
    console.error('[api/plans/id] delete error:', error.message);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
