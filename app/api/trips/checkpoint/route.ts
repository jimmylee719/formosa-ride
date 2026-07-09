// POST /api/trips/checkpoint — 標記特殊地點（Phase 11，v2.0 C4/C6）
// 照片上傳（photo_url）於 Phase 11C 照片牆時加入 Supabase Storage。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: {
    deviceId?: string;
    tripId?: string;
    lat?: number;
    lng?: number;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId, lat, lng } = body;
  const note = (body.note ?? '').slice(0, 200);
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  if (
    !Number.isFinite(lat) || (lat as number) < 20.5 || (lat as number) > 26.5 ||
    !Number.isFinite(lng) || (lng as number) < 117 || (lng as number) > 124.5
  ) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('trip_checkpoints').insert({
    trip_id: tripId,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    lat,
    lng,
    note: note || null,
  });
  if (error) {
    console.error('[checkpoint] insert:', error.code);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
