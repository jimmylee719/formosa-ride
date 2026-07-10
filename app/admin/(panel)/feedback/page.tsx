'use client';
// /admin/feedback — 回饋管理（Phase 14，v1.0 §十六）
// 列表 + 依狀態/類型篩選 + 標記已查看/已處理。
import { useCallback, useEffect, useState } from 'react';

interface FeedbackRow {
  id: string;
  category: string;
  subject: string;
  message: string;
  email: string | null;
  user_lang: string;
  device_type: string | null;
  app_version: string | null;
  status: 'new' | 'reviewed' | 'resolved';
  created_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  bug: '🐛 系統問題',
  suggestion: '💡 功能建議',
  data_error: '📍 資料錯誤',
  praise: '💚 正面回饋',
  other: '💬 其他',
};

const STATUS_LABEL: Record<FeedbackRow['status'], string> = {
  new: '🔴 未處理',
  reviewed: '🟡 已查看',
  resolved: '🟢 已處理',
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    const res = await fetch(`/api/admin/feedback?${params}`);
    if (res.ok) {
      const d = (await res.json()) as { items: FeedbackRow[] };
      setItems(d.items);
    }
    setLoading(false);
  }, [status, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (id: string, newStatus: FeedbackRow['status']) => {
    const res = await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold">📨 回饋意見管理</h1>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-border bg-white px-3 py-2 text-sm"
        >
          <option value="">全部狀態</option>
          <option value="new">未處理</option>
          <option value="reviewed">已查看</option>
          <option value="resolved">已處理</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-neutral-border bg-white px-3 py-2 text-sm"
        >
          <option value="">全部類型</option>
          <option value="bug">系統問題</option>
          <option value="suggestion">功能建議</option>
          <option value="data_error">資料錯誤</option>
          <option value="praise">正面回饋</option>
          <option value="other">其他</option>
        </select>
      </div>

      {loading && <p className="info-secondary mt-4">⏳ 載入中…</p>}
      {!loading && items.length === 0 && (
        <p className="info-secondary mt-4 rounded-xl bg-white p-4">目前沒有符合的回饋。</p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {items.map((f) => (
          <li key={f.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{CATEGORY_LABEL[f.category] ?? f.category}</span>
              <span className="text-sm">{STATUS_LABEL[f.status]}</span>
              <span className="flex-1" />
              <span className="text-sm text-neutral-text">
                {new Date(f.created_at).toLocaleString('zh-TW')} · {f.device_type ?? '?'} ·
                v{f.app_version ?? '?'}
              </span>
            </div>
            <p className="mt-1 font-bold">{f.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-text">{f.message}</p>
            {f.email && (
              <p className="mt-1 text-sm">
                回覆信箱：
                <a href={`mailto:${f.email}`} className="underline">
                  {f.email}
                </a>
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {f.status !== 'reviewed' && f.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => mark(f.id, 'reviewed')}
                  className="rounded-lg border border-neutral-border px-3 py-1.5 text-sm"
                >
                  🟡 標記已查看
                </button>
              )}
              {f.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => mark(f.id, 'resolved')}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white"
                >
                  🟢 標記已處理
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
