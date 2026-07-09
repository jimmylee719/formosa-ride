// /api/trips/share — 位置分享連結管理（Phase 11A，v7.0 A2–A3）
// POST 建立、GET 列表、PATCH 停用。皆需 deviceId 核對（行程擁有者才可管理）。
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verifyOwner(tripId: string, deviceId: string) {
  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return { supabase, status: 404 as const };
  if (trip.device_id !== deviceId) return { supabase, status: 403 as const };
  return { supabase, status: 200 as const };
}

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; tripId?: string; recipientLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId } = body;
  const recipientLabel = (body.recipientLabel ?? '').slice(0, 50) || null;
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  const { supabase, status } = await verifyOwner(tripId, deviceId);
  if (status !== 200) return NextResponse.json({ error: 'Denied' }, { status });

  const shareToken = randomBytes(8).toString('base64url'); // 11 字元 URL-safe
  const { error } = await supabase.from('trip_share_links').insert({
    trip_id: tripId,
    share_token: shareToken,
    recipient_label: recipientLabel,
    is_active: true,
  });
  if (error) {
    console.error('[share] insert:', error.code);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
  return NextResponse.json({ shareToken });
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('device') ?? '';
  const tripId = req.nextUrl.searchParams.get('tripId') ?? '';
  if (!UUID_RE.test(deviceId) || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  const { supabase, status } = await verifyOwner(tripId, deviceId);
  if (status !== 200) return NextResponse.json({ error: 'Denied' }, { status });

  const { data } = await supabase
    .from('trip_share_links')
    .select('share_token, recipient_label, is_active, expires_at, view_count, last_viewed_at, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ links: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  let body: { deviceId?: string; tripId?: string; shareToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId, shareToken } = body;
  if (
    !deviceId || !UUID_RE.test(deviceId) ||
    !tripId || !UUID_RE.test(tripId) ||
    !shareToken || shareToken.length > 32
  ) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }
  const { supabase, status } = await verifyOwner(tripId, deviceId);
  if (status !== 200) return NextResponse.json({ error: 'Denied' }, { status });

  const { error } = await supabase
    .from('trip_share_links')
    .update({ is_active: false })
    .eq('trip_id', tripId)
    .eq('share_token', shareToken);
  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ disabled: true });
}
