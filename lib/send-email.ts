// lib/send-email.ts — Resend 寄信薄封裝（Phase 13）
// 直呼 REST API，不引入 SDK 依賴；RESEND_API_KEY 未設定時靜默略過。
// 網域未驗證前 Resend 只能寄到帳號本人信箱（= 管理員信箱），正好符合通知需求；
// 正式網域驗證後改 from 為自有網域（Phase 18B）。

const ADMIN_EMAIL = 'skadoosh.ai.lab@gmail.com';

export async function sendAdminEmail(subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FormoSA Ride <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
