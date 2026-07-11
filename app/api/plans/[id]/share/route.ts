// /api/plans/[id]/share — 行程分享連結（Phase 19B）
// POST { deviceId } → 產生（或回傳既有）share_token；DELETE → 停用分享。
// 連結為 64 字元隨機 token，不可猜測；停用後舊連結立即失效。
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownedPlan(planId: string, deviceId: string) {
  if (!UUID_RE.test(planId) || !UUID_RE.test(deviceId)) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('trip_plans')
    .select('id, device_id, share_token')
    .eq('id', planId)
    .maybeSingle();
  if (!data || data.device_id !== deviceId) return null;
  return { supabase, plan: data };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const owned = await ownedPlan(id, body.deviceId ?? '');
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let token = owned.plan.share_token as string | null;
  if (!token) {
    token = randomBytes(32).toString('hex');
    const { error } = await owned.supabase
      .from('trip_plans')
      .update({ share_token: token })
      .eq('id', id);
    if (error) {
      console.error('[api/plans/share] error:', error.message);
      return NextResponse.json({ error: 'Share failed' }, { status: 500 });
    }
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return NextResponse.json({ token, url: `${base}/plan/shared/${token}` });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const owned = await ownedPlan(id, body.deviceId ?? '');
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await owned.supabase.from('trip_plans').update({ share_token: null }).eq('id', id);
  return NextResponse.json({ ok: true });
}
