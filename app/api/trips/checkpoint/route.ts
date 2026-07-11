// POST /api/trips/checkpoint — 標記特殊地點（Phase 11，v2.0 C4/C6）
// 照片牆（2026-07-11，v2.0 C4 photo_url）：改收 multipart/form-data，
// photo 欄位（選填）上傳至公開 bucket「trip-photos」（路徑含 tripId UUID，不可猜測）。
// 相容舊 JSON 格式（無照片時兩種都收）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface CheckpointInput {
  deviceId: string;
  tripId: string;
  lat: number;
  lng: number;
  note: string;
  photo: File | null;
}

async function parseBody(req: NextRequest): Promise<CheckpointInput | null> {
  const ct = req.headers.get('content-type') ?? '';
  try {
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const photo = fd.get('photo');
      return {
        deviceId: String(fd.get('deviceId') ?? ''),
        tripId: String(fd.get('tripId') ?? ''),
        lat: Number(fd.get('lat')),
        lng: Number(fd.get('lng')),
        note: String(fd.get('note') ?? '').slice(0, 200),
        photo: photo instanceof File && photo.size > 0 ? photo : null,
      };
    }
    const body = (await req.json()) as {
      deviceId?: string;
      tripId?: string;
      lat?: number;
      lng?: number;
      note?: string;
    };
    return {
      deviceId: body.deviceId ?? '',
      tripId: body.tripId ?? '',
      lat: Number(body.lat),
      lng: Number(body.lng),
      note: (body.note ?? '').slice(0, 200),
      photo: null,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const input = await parseBody(req);
  if (!input) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const { deviceId, tripId, lat, lng, note, photo } = input;

  if (!UUID_RE.test(deviceId) || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  if (
    !Number.isFinite(lat) || lat < 20.5 || lat > 26.5 ||
    !Number.isFinite(lng) || lng < 117 || lng > 124.5
  ) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 });
  }
  if (photo && (!PHOTO_TYPES.has(photo.type) || photo.size > MAX_PHOTO_BYTES)) {
    return NextResponse.json({ error: 'Invalid photo (jpeg/png/webp, ≤8MB)' }, { status: 400 });
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

  const { data: cp, error } = await supabase
    .from('trip_checkpoints')
    .insert({
      trip_id: tripId,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      lat,
      lng,
      note: note || null,
    })
    .select('id')
    .single();
  if (error || !cp) {
    console.error('[checkpoint] insert:', error?.code);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  // 照片：上傳失敗不連坐標記（標記本體已成功，照片屬加值）
  let photoUrl: string | null = null;
  if (photo) {
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${tripId}/${cp.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('trip-photos')
      .upload(path, Buffer.from(await photo.arrayBuffer()), {
        contentType: photo.type,
        upsert: true,
      });
    if (upErr) {
      console.error('[checkpoint] photo upload:', upErr.message);
    } else {
      photoUrl = supabase.storage.from('trip-photos').getPublicUrl(path).data.publicUrl;
      await supabase.from('trip_checkpoints').update({ photo_url: photoUrl }).eq('id', cp.id);
    }
  }

  return NextResponse.json({ saved: true, id: cp.id, photo_url: photoUrl });
}
