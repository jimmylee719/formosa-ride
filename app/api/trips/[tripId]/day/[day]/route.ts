// GET /api/trips/[tripId]/day/[day]?device=... — 讀取日摘要（Phase 11，v2.0 C9）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; day: string }> }
) {
  const { tripId, day } = await params;
  const deviceId = req.nextUrl.searchParams.get('device') ?? '';
  const dayNumber = Number(day);
  if (
    !UUID_RE.test(tripId) ||
    !UUID_RE.test(deviceId) ||
    !Number.isInteger(dayNumber) ||
    dayNumber < 1
  ) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, started_at')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: summary } = await supabase
    .from('trip_day_summaries')
    .select(
      'day_number, date, distance_km, riding_minutes, rest_minutes, calories, max_elevation'
    )
    .eq('trip_id', tripId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (!summary) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ summary });
}
