// POST /api/admin/change-password — 管理員修改密碼（Phase 14，MASTER_BUILD_PLAN Q8 決議）
// middleware 已擋未登入；此處再驗一次 session 並要求輸入目前密碼。
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase-server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await req.json()) as { currentPassword?: unknown; newPassword?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (newPassword.length < 10 || newPassword.length > 128) {
    return NextResponse.json(
      { error: '新密碼需 10–128 字元' },
      { status: 400 }
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: '新密碼不可與目前密碼相同' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, password_hash')
    .eq('id', session.adminId)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: '目前密碼錯誤' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase
    .from('admin_users')
    .update({ password_hash: newHash })
    .eq('id', admin.id);
  if (error) {
    return NextResponse.json({ error: '更新失敗，請稍後再試' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
