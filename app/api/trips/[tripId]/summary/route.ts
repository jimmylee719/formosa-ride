// GET /api/trips/[tripId]/summary?device=... — 多日旅程總結（Phase 11C，v8.0 A2）
// 彙整層：get_trip_summary RPC + 每日清單 + 標記點，不新增任何追蹤邏輯。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const deviceId = req.nextUrl.searchParams.get('device') ?? '';
  if (!UUID_RE.test(tripId) || !UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, status, started_at, ended_at')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [{ data: totals }, { data: days }, { data: checkpoints }] = await Promise.all([
    supabase.rpc('get_trip_summary', { p_trip_id: tripId }),
    supabase
      .from('trip_day_summaries')
      .select('day_number, date, distance_km, riding_minutes, rest_minutes, calories, max_elevation')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true }),
    supabase
      .from('trip_checkpoints')
      .select('id, lat, lng, note, photo_url, marked_at')
      .eq('trip_id', tripId)
      .order('marked_at', { ascending: true }),
  ]);

  return NextResponse.json({
    tripStatus: trip.status,
    startedAt: trip.started_at,
    endedAt: trip.ended_at,
    totals: (totals as unknown[])?.[0] ?? null,
    days: days ?? [],
    checkpoints: checkpoints ?? [],
  });
}
