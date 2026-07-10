// /api/admin/feedback — 回饋管理 API（Phase 14，v1.0 §十六 後台部分）
// GET：列表（可依 status / category 篩選）；PATCH：標記狀態。
// middleware 已驗證 admin_session，未登入到不了這裡。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const STATUSES = ['new', 'reviewed', 'resolved'] as const;
const CATEGORIES = ['bug', 'suggestion', 'data_error', 'praise', 'other'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? '';
  const category = req.nextUrl.searchParams.get('category') ?? '';

  const supabase = createServiceClient();
  let q = supabase
    .from('feedback')
    .select(
      'id, category, subject, message, email, user_lang, device_type, app_version, status, admin_note, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if ((STATUSES as readonly string[]).includes(status)) q = q.eq('status', status);
  if ((CATEGORIES as readonly string[]).includes(category)) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  let body: { id?: unknown; status?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const id = String(body.id ?? '');
  const status = String(body.status ?? '');
  if (!UUID_RE.test(id) || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
