// POST /api/trips/complete — 結束整趟旅程（Phase 11C，v8.0 A5）
// 行程標記 completed，所有分享連結設定 24 小時後自動失效（v7.0 A2，補 11A 尾巴）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; tripId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId } = body;
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, status')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  await supabase
    .from('trips')
    .update({ status: 'completed', ended_at: now.toISOString() })
    .eq('id', tripId);

  // 分享連結：行程結束後 24 小時自動失效（v7.0 A2）
  const expires = new Date(now.getTime() + 24 * 3600_000).toISOString();
  await supabase
    .from('trip_share_links')
    .update({ expires_at: expires })
    .eq('trip_id', tripId)
    .is('expires_at', null);

  return NextResponse.json({ completed: true, shareLinksExpireAt: expires });
}
