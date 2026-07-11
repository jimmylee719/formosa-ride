// /api/plans/import — 由分享連結複製行程（Phase 19B）
// POST { deviceId, token } → 深拷貝（行程＋日＋停靠點）成為接收者自己的行程。
// 拷貝後兩份互相獨立（如 Google 行程分享）；受每裝置 3 個上限保護。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPlanDetailByToken } from '@/lib/plan-queries';
import { MAX_PLANS_PER_DEVICE } from '@/types/plan';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const deviceId = body.deviceId ?? '';
  const token = body.token ?? '';
  if (!UUID_RE.test(deviceId) || !token) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const source = await getPlanDetailByToken(supabase, token);
  if (!source) {
    return NextResponse.json({ error: 'Share link expired or invalid' }, { status: 404 });
  }

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

  // 深拷貝：主檔（名稱不變，不複製 share_token）→ 日 → 停靠點
  const { data: created, error: planErr } = await supabase
    .from('trip_plans')
    .insert({
      device_id: deviceId,
      name: source.name.slice(0, 60),
      start_date: source.start_date,
      notes: source.notes,
    })
    .select('id')
    .single();
  if (planErr || !created) {
    console.error('[api/plans/import] plan error:', planErr?.message);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }

  if (source.days.length > 0) {
    const { data: insertedDays, error: dayErr } = await supabase
      .from('plan_days')
      .insert(
        source.days.map((d) => ({
          plan_id: created.id,
          day_number: d.day_number,
          depart_time: d.depart_time,
          start_name: d.start_name,
          route_id: d.route_id,
          notes: d.notes,
        }))
      )
      .select('id, day_number');
    if (dayErr || !insertedDays) {
      await supabase.from('trip_plans').delete().eq('id', created.id); // 半成品回滾
      return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
    const idByDay = new Map(insertedDays.map((r) => [r.day_number as number, r.id as string]));
    const stopRows = source.days.flatMap((d) =>
      d.stops.map((s, pos) => ({
        day_id: idByDay.get(d.day_number),
        position: pos + 1,
        poi_id: s.poi_id,
        custom_name: s.custom_name,
        custom_google_url: s.custom_google_url,
        note: s.note,
      }))
    );
    if (stopRows.length > 0) {
      const { error: stopErr } = await supabase.from('plan_stops').insert(stopRows);
      if (stopErr) {
        await supabase.from('trip_plans').delete().eq('id', created.id);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ id: created.id });
}
