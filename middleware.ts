// middleware.ts — /admin 全路徑保護（Phase 14，v5.0 E2）
//              + 語言自動偵測（Phase 18B，v11.0 C4）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ── 後台保護（未登入：頁面 → 登入頁；API → 401）──
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
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

  // ── 語言自動偵測（v11.0 C4）：依 Accept-Language 設定 lang cookie ──
  // 站內文案為英文為主中文為輔的雙語內嵌，英文用戶天然看到英文；
  // 此 cookie 供未來完整 i18n 與個別元件語序使用。
  if (!req.cookies.get('lang')) {
    const acceptLanguage = req.headers.get('accept-language') ?? 'zh-TW';
    const lang = acceptLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const response = NextResponse.next();
    response.cookies.set('lang', lang, { maxAge: 365 * 24 * 60 * 60, path: '/' });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // 後台 + 前台頁面（排除 API、靜態資源與檔案）
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!api|_next|.*\\..*).*)'],
};
