'use client';
// /admin/settings — 帳號設定：修改密碼（Phase 14，MASTER_BUILD_PLAN Q8 決議）
// 初始密碼 skadoosh 過弱（v11 自註），上線前務必在此改為強密碼。
import { useState } from 'react';

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: '兩次輸入的新密碼不一致' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMsg({ ok: false, text: d?.error ?? '更新失敗' });
      } else {
        setMsg({ ok: true, text: '✅ 密碼已更新' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');
      }
    } catch {
      setMsg({ ok: false, text: '網路錯誤，請稍後再試' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold">⚙️ 帳號設定</h1>
      <form onSubmit={handleSubmit} className="mt-4 max-w-sm rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">修改密碼</h2>
        <p className="mt-1 text-sm text-neutral-text">
          新密碼至少 10 字元；正式上線前請務必更換初始密碼。
        </p>
        <label className="mt-3 block text-sm font-bold">
          目前密碼
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          新密碼（至少 10 字元）
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          再次輸入新密碼
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            className="tap-target mt-1 w-full rounded-lg border border-neutral-border px-3 py-2 font-normal"
          />
        </label>
        {msg && (
          <p
            role="alert"
            className={`mt-3 rounded-lg p-2 text-sm ${
              msg.ok ? 'bg-safe-bg text-safe-text' : 'bg-danger-bg text-danger-text'
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="tap-target mt-4 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? '更新中…' : '更新密碼'}
        </button>
      </form>
    </>
  );
}
