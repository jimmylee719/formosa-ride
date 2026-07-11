// /api/suggested-places — 用戶建議地點（Phase 19A）
// POST { deviceId, name, googleUrl?, poiType?, note? }
// 用戶在規劃中新增自訂停靠點時同步回報 → 進入後台審核佇列，
// 管理員一鍵採用即寫入 pois（用戶資料 → 官方資料的通道）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseGoogleCoords } from '@/lib/google-coords';
import { POI_LABELS } from '@/lib/poi-icons';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!(await checkRateLimit('suggest', ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: {
    deviceId?: string;
    name?: string;
    googleUrl?: string;
    poiType?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const deviceId = body.deviceId ?? '';
  const name = (body.name ?? '').trim().slice(0, 80);
  const googleUrl = (body.googleUrl ?? '').trim().slice(0, 300);
  const poiType = (body.poiType ?? '').trim();
  if (!UUID_RE.test(deviceId) || !name) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  if (googleUrl && !/^https:\/\/(www\.google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(googleUrl)) {
    return NextResponse.json({ error: 'Invalid Google Maps URL' }, { status: 400 });
  }

  const coords = googleUrl ? parseGoogleCoords(googleUrl) : null;
  const supabase = createServiceClient();
  const { error } = await supabase.from('suggested_places').insert({
    device_id: deviceId,
    name,
    google_url: googleUrl || null,
    parsed_lat: coords?.lat ?? null,
    parsed_lng: coords?.lng ?? null,
    poi_type: poiType in POI_LABELS ? poiType : null,
    note: (body.note ?? '').trim().slice(0, 200) || null,
  });
  if (error) {
    console.error('[api/suggested-places] insert error:', error.message);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
