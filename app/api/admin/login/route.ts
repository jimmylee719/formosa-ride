// POST /api/admin/login — 管理員登入（Phase 14，v5.0 C1 + v11.0 B2）
// 接受 username 或 email；bcrypt 比對；成功簽發 8 小時 JWT 寫入 httpOnly cookie。
// 帳號不存在與密碼錯誤回同一訊息，且都做一次 bcrypt 比對（降低時間差探測）。
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase-server';
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, signAdminToken } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// 供「帳號不存在」時空跑一次比對的假 hash（冷啟動時生成，非任何真密碼）
const DUMMY_HASH = bcrypt.hashSync(`dummy-${Date.now()}`, 12);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  // 登入嘗試限制：每 IP 15 分鐘 5 次（Phase 18A：Upstash 跨實例共享）
  if (!(await checkRateLimit('login', ip))) {
    return NextResponse.json(
      { error: '嘗試次數過多，請 15 分鐘後再試' },
      { status: 429 }
    );
  }

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { identifier?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const identifier = String(body.identifier ?? '').trim();
  const password = String(body.password ?? '');
  if (!identifier || !password) {
    return NextResponse.json({ error: '請輸入帳號與密碼' }, { status: 400 });
  }

  // 分兩次 eq 查詢（不用 .or() 字串拼接，杜絕 PostgREST filter 注入）
  const supabase = createServiceClient();
  let { data: admin } = await supabase
    .from('admin_users')
    .select('id, email, username, password_hash, role')
    .eq('email', identifier)
    .maybeSingle();
  if (!admin) {
    ({ data: admin } = await supabase
      .from('admin_users')
      .select('id, email, username, password_hash, role')
      .eq('username', identifier)
      .maybeSingle());
  }

  const valid = await bcrypt.compare(password, admin?.password_hash ?? DUMMY_HASH);
  if (!admin || !valid) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
  }

  const token = await signAdminToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role ?? 'admin',
  });

  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/', // 需涵蓋 /admin 與 /api/admin 兩個路徑
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  return res;
}
