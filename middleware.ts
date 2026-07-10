// middleware.ts — /admin 全路徑保護（Phase 14，v5.0 E2）
// 未登入：頁面 → 重導向登入頁；API → 401 JSON。
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 登入頁與登入 API 本身放行，避免無限重導向
  if (path === '/admin/login' || path === '/api/admin/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
