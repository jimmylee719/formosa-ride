'use client';
// /admin/login — 後台登入頁（Phase 14，v5.0 C1 + v11.0 B2）
// 此頁不得出現在前台任何連結、sitemap、robots allow 中。
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? '登入失敗');
        setBusy(false);
        return;
      }
      router.push('/admin/dashboard');
    } catch {
      setError('網路錯誤，請稍後再試');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h1 className="text-center text-xl font-bold">🔧 後台管理登入</h1>
        <label className="mt-4 block text-sm font-bold">
          帳號（username 或 email）
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          密碼
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2 font-normal"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-bg p-2 text-sm text-danger-text">
            ⚠️ {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="tap-target mt-4 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  );
}
