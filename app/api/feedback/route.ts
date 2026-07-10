// POST /api/feedback — 回饋意見提交（Phase 13，v1.0 §7.9/§十六）
// 任何人可提交（無需登入）；後端完整驗證，不只靠前端。
// 速率限制：Upstash 滑動視窗（Phase 18A，lib/rate-limit.ts）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { sendAdminEmail, sendEmail } from '@/lib/send-email';
import { checkRateLimit } from '@/lib/rate-limit';

const CATEGORIES = ['bug', 'suggestion', 'data_error', 'praise', 'other'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_VERSION = '0.1.0';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 蜜罐欄位：機器人會填，真人看不到；填了就假裝成功
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  // 每 IP 10 分鐘最多 3 則（Phase 18A：Upstash 跨實例共享）
  if (!(await checkRateLimit('feedback', ip))) {
    return NextResponse.json(
      { error: '提交太頻繁，請稍後再試 · Too many requests' },
      { status: 429 }
    );
  }

  const category = String(body.category ?? '');
  const subject = String(body.subject ?? '').trim();
  let message = String(body.message ?? '').trim();
  const email = String(body.email ?? '').trim();
  const userLang = body.user_lang === 'en' ? 'en' : 'zh';
  // /contact 表單擴充（Phase 16D）：選填姓名、送出確認信
  const name = String(body.name ?? '').trim().slice(0, 60);
  const wantConfirm = body.confirm === true;
  if (name) message = `【Name 姓名】${name}\n${message}`;
  const poiId = typeof body.poi_id === 'string' ? body.poi_id : '';
  const routeId = typeof body.route_id === 'string' ? body.route_id : '';

  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (subject.length < 2 || subject.length > 100) {
    return NextResponse.json(
      { error: '主旨需 2–100 字 · Subject must be 2–100 chars' },
      { status: 400 }
    );
  }
  if (message.length < 5 || message.length > 2000) {
    return NextResponse.json(
      { error: '內容需 5–2000 字 · Message must be 5–2000 chars' },
      { status: 400 }
    );
  }
  if (email !== '' && (email.length > 254 || !EMAIL_RE.test(email))) {
    return NextResponse.json(
      { error: 'Email 格式不正確 · Invalid email' },
      { status: 400 }
    );
  }
  if (poiId !== '' && !UUID_RE.test(poiId)) {
    return NextResponse.json({ error: 'Invalid poi_id' }, { status: 400 });
  }
  if (routeId !== '' && !UUID_RE.test(routeId)) {
    return NextResponse.json({ error: 'Invalid route_id' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent') ?? '';
  const deviceType = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';

  const supabase = createServiceClient();
  const { error } = await supabase.from('feedback').insert({
    category,
    subject,
    message,
    email: email || null,
    poi_id: poiId || null,
    route_id: routeId || null,
    user_lang: userLang,
    device_type: deviceType,
    app_version: APP_VERSION,
  });
  if (error) {
    console.error('[feedback] insert failed:', error.message);
    return NextResponse.json(
      { error: '儲存失敗，請稍後再試 · Save failed' },
      { status: 500 }
    );
  }

  // 通知管理員（fire-and-forget：寄信失敗不影響提交結果）
  void sendAdminEmail(
    `[FormoSA Ride 回饋] ${category}: ${subject}`,
    `類型 Category: ${category}\n主旨 Subject: ${subject}\n\n${message}\n\n` +
      `回覆信箱 Reply-to: ${email || '（未留）'}\n語言: ${userLang} · 裝置: ${deviceType}`
  );

  // 聯絡表單：寄「已收到」確認信給提交者（v11.0 E；網域驗證前 Resend 可能拒收，見 send-email.ts）
  if (wantConfirm && email) {
    void sendEmail(
      email,
      'We received your message — FormoSA Ride 已收到您的訊息',
      `Hi${name ? ` ${name}` : ''},\n\n` +
        'Thank you for contacting FormoSA Ride. We received your message and will reply within 2 business days.\n\n' +
        '感謝您聯絡環島通，我們已收到您的訊息，通常會在 2 個工作天內回覆。\n\n' +
        `Your message 您的訊息：\n${subject}\n\n— FormoSA Ride · Camper Road Taiwan`
    );
  }

  return NextResponse.json({ ok: true });
}
