// /api/plans — 行程規劃列表與建立（Phase 19A）
// GET  ?device_id=  → 該裝置的行程清單（含天數統計）
// POST { deviceId, name, startDate? } → 建立（每裝置上限 3 個）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { MAX_PLANS_PER_DEVICE } from '@/types/plan';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  if (!UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid device id' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('trip_plans')
    .select('id, name, start_date, notes, updated_at, plan_days(id)')
    .eq('device_id', deviceId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[api/plans] list error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  const plans = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    start_date: p.start_date,
    notes: p.notes,
    updated_at: p.updated_at,
    day_count: (p.plan_days as unknown[] | null)?.length ?? 0,
  }));
  return NextResponse.json({ plans, max: MAX_PLANS_PER_DEVICE });
}

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; name?: string; startDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const deviceId = body.deviceId ?? '';
  const name = (body.name ?? '').trim().slice(0, 60);
  const startDate = body.startDate ?? null;
  if (!UUID_RE.test(deviceId) || !name) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  if (startDate !== null && !DATE_RE.test(startDate)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const supabase = createServiceClient();
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

  const { data, error } = await supabase
    .from('trip_plans')
    .insert({ device_id: deviceId, name, start_date: startDate })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[api/plans] create error:', error?.message);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
