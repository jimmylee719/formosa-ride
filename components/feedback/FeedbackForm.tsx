'use client';
// components/feedback/FeedbackForm.tsx — 回饋意見表單（Phase 13，v1.0 §十六）
// data_error 類型額外詢問地點與正確資訊，併入 message 送出。
import { useState } from 'react';

const CATEGORIES = [
  { value: 'bug', label_zh: '系統問題', label_en: 'Bug Report', icon: '🐛' },
  { value: 'suggestion', label_zh: '功能建議', label_en: 'Feature Request', icon: '💡' },
  { value: 'data_error', label_zh: '資料錯誤', label_en: 'Data Error', icon: '📍' },
  { value: 'praise', label_zh: '正面回饋', label_en: 'Praise', icon: '💚' },
  { value: 'other', label_zh: '其他', label_en: 'Other', icon: '💬' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

export function FeedbackForm() {
  const [category, setCategory] = useState<Category>('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [errorPlace, setErrorPlace] = useState('');
  const [errorCorrect, setErrorCorrect] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setState('sending');
    // data_error 的兩個補充欄位併入內文
    const fullMessage =
      category === 'data_error'
        ? `【地點 Where】${errorPlace}\n【正確資訊 Correct info】${errorCorrect}\n\n${message}`.trim()
        : message;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject,
          message: fullMessage,
          email,
          user_lang: 'zh',
          website: '', // 蜜罐：真人永遠是空字串
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrMsg(d?.error ?? '提交失敗，請稍後再試 · Submit failed');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setErrMsg('網路錯誤，請稍後再試 · Network error');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl bg-safe-bg p-6 text-center">
        <p className="text-4xl" aria-hidden>
          🙏
        </p>
        <p className="alert-warning mt-2 text-safe-text">感謝您的回饋！</p>
        <p className="info-secondary mt-1 text-safe-text">
          我們會盡快處理。
          <br />
          Thank you for your feedback! We&apos;ll review it soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 類型 */}
      <fieldset>
        <legend className="info-primary font-bold">
          回饋類型 · Category
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`tap-target flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-3 ${
                category === c.value
                  ? 'border-primary bg-info-bg font-bold'
                  : 'border-neutral-border bg-white'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={c.value}
                checked={category === c.value}
                onChange={() => setCategory(c.value)}
                className="sr-only"
              />
              <span aria-hidden>{c.icon}</span>
              <span className="info-secondary">
                {c.label_zh}
                <br />
                <span className="text-sm text-neutral-text">{c.label_en}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* data_error 專屬欄位（v1.0 §十六） */}
      {category === 'data_error' && (
        <div className="flex flex-col gap-3 rounded-xl bg-caution-bg p-3">
          <label className="info-secondary block">
            <span className="font-bold">是關於哪個地點的錯誤？ Which place?</span>
            <input
              type="text"
              value={errorPlace}
              onChange={(e) => setErrorPlace(e.target.value)}
              maxLength={100}
              placeholder="例：花蓮光復糖廠旁的 7-11"
              className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
            />
          </label>
          <label className="info-secondary block">
            <span className="font-bold">正確資訊應該是什麼？ Correct info?</span>
            <input
              type="text"
              value={errorCorrect}
              onChange={(e) => setErrorCorrect(e.target.value)}
              maxLength={200}
              placeholder="例：已歇業／位置不對／營業時間錯誤"
              className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
            />
          </label>
        </div>
      )}

      {/* 主旨 */}
      <label className="info-secondary block">
        <span className="font-bold">主旨 · Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
        />
      </label>

      {/* 內容 */}
      <label className="info-secondary block">
        <span className="font-bold">詳細內容 · Details</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          className="mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
        />
        <span className="text-sm text-neutral-text">{message.length}/2000</span>
      </label>

      {/* Email（選填） */}
      <label className="info-secondary block">
        <span className="font-bold">Email（選填，希望我們回覆時填寫）</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          placeholder="you@example.com (optional)"
          className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2"
        />
      </label>

      {errMsg && (
        <p role="alert" className="info-secondary rounded-xl bg-danger-bg p-3 text-danger-text">
          ⚠️ {errMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="tap-target w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
      >
        {state === 'sending' ? '送出中… Sending…' : '📨 送出回饋 Submit'}
      </button>
    </form>
  );
}
