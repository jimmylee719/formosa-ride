// /api/plans/preset — 由現成行程範本一鍵建立行程（2026-07-11）
// POST { deviceId, presetId } → 建立 trip_plan + 逐日 plan_days（連到真實日段路線）
// 尊重每裝置 3 個上限；範本只引用真實存在的路線 slug（見 lib/itineraries）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { MAX_PLANS_PER_DEVICE } from '@/types/plan';
import { getItinerary } from '@/lib/itineraries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; presetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const deviceId = body.deviceId ?? '';
  if (!UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid device id' }, { status: 400 });
  }
  const itinerary = getItinerary(body.presetId ?? '');
  if (!itinerary) {
    return NextResponse.json({ error: 'Unknown itinerary' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 每裝置上限
  const { count } = await supabase
    .from('trip_plans')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId);
  if ((count ?? 0) >= MAX_PLANS_PER_DEVICE) {
    return NextResponse.json(
      { error: `Plan limit reached (${MAX_PLANS_PER_DEVICE})`, code: 'limit' },
      { status: 409 }
    );
  }

  // 解析範本引用的日段路線（依 slug）
  const slugs = itinerary.stages.map((s) => s.routeSlug);
  const { data: routes, error: routeErr } = await supabase
    .from('routes')
    .select('id, slug, start_name_en')
    .in('slug', slugs)
    .eq('is_active', true);
  if (routeErr) {
    console.error('[api/plans/preset] route lookup error:', routeErr.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  const bySlug = new Map((routes ?? []).map((r) => [r.slug as string, r]));

  // 建立主檔
  const { data: plan, error: planErr } = await supabase
    .from('trip_plans')
    .insert({ device_id: deviceId, name: itinerary.name_en.slice(0, 60) })
    .select('id')
    .single();
  if (planErr || !plan) {
    console.error('[api/plans/preset] create error:', planErr?.message);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }

  // 逐日：連到日段路線；範本備註合併中英
  const dayRows = itinerary.stages.map((st, i) => {
    const rt = bySlug.get(st.routeSlug);
    const note =
      st.note_en || st.note_zh
        ? `${st.note_en ?? ''} ${st.note_zh ?? ''}`.trim().slice(0, 500)
        : null;
    return {
      plan_id: plan.id,
      day_number: i + 1,
      depart_time: null,
      start_name: (rt?.start_name_en as string | null) ?? null,
      route_id: (rt?.id as string | undefined) ?? null,
      notes: note,
    };
  });
  const { error: daysErr } = await supabase.from('plan_days').insert(dayRows);
  if (daysErr) {
    // 回滾半成品行程，避免留下空殼
    await supabase.from('trip_plans').delete().eq('id', plan.id);
    console.error('[api/plans/preset] days insert error:', daysErr.message);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }

  return NextResponse.json({ id: plan.id });
}
