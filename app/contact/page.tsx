'use client';
// /contact — 聯絡我們（Phase 16D，v11.0 E 節）
// 信箱直達 + 表單（寫入 feedback 表 → 後台未讀 + 警示橫幅 + 提交者確認信）。
import { useState } from 'react';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';

const CONTACT = 'skadoosh.ai.lab@gmail.com';

// v11.0 E：主題四選一 → 對應 feedback 分類
const SUBJECTS = [
  { label: 'System issue 系統問題', category: 'bug' },
  { label: 'Route data error 路線資料錯誤', category: 'data_error' },
  { label: 'Payment 付款問題', category: 'other' },
  { label: 'Other 其他', category: 'other' },
] as const;

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setState('sending');
    const chosen = SUBJECTS[subjectIdx] ?? SUBJECTS[0];
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: chosen.category,
          subject: chosen.label,
          message,
          email,
          name,
          confirm: true,
          user_lang: 'zh',
          website: '', // 蜜罐
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrMsg(d?.error ?? 'Failed to send 送出失敗');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setErrMsg('Network error 網路錯誤，請稍後再試');
      setState('idle');
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary font-bold">✉️ Contact Us · 聯絡我們</h1>

        <section className="mt-3 rounded-2xl bg-white p-4">
          <p className="info-secondary">
            Email us directly 直接寄信給我們：
          </p>
          <a
            href={`mailto:${CONTACT}`}
            className="info-primary mt-1 block font-bold text-info-text underline"
          >
            📧 {CONTACT}
          </a>
        </section>

        {state === 'done' ? (
          <section className="mt-3 rounded-2xl bg-safe-bg p-6 text-center">
            <p className="text-4xl" aria-hidden>
              ✅
            </p>
            <p className="info-primary mt-2 font-bold text-safe-text">
              Message sent! 已送出！
            </p>
            <p className="info-secondary mt-1 text-safe-text">
              We usually reply within 2 business days.
              <br />
              我們通常在 2 個工作天內回覆。
            </p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 rounded-2xl bg-white p-4">
            <p className="info-secondary font-bold">Or fill the form 或填寫表單：</p>

            <label className="info-secondary mt-3 block">
              Name 姓名（optional 選填）
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
              />
            </label>

            <label className="info-secondary mt-3 block">
              Email（required 必填）
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
              />
            </label>

            <label className="info-secondary mt-3 block">
              Subject 主題
              <select
                value={subjectIdx}
                onChange={(e) => setSubjectIdx(Number(e.target.value))}
                className="tap-target mt-1 w-full rounded-lg border border-neutral-border bg-white px-3 py-2"
              >
                {SUBJECTS.map((s, i) => (
                  <option key={s.label} value={i}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="info-secondary mt-3 block">
              Message 訊息內容
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={5}
                maxLength={2000}
                rows={5}
                className="mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
              />
            </label>

            {errMsg && (
              <p role="alert" className="info-secondary mt-3 rounded-xl bg-danger-bg p-3 text-danger-text">
                ⚠️ {errMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'sending'}
              className="tap-target mt-4 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
            >
              {state === 'sending' ? 'Sending… 送出中…' : '📨 Send 送出'}
            </button>
            <p className="mt-2 text-center text-sm text-neutral-text">
              We usually reply within 2 business days. 我們通常在 2 個工作天內回覆。
            </p>
          </form>
        )}
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
