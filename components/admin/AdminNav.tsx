'use client';
// components/admin/AdminNav.tsx — 後台導覽列（Phase 14）
// 含「🌐 前往前台網站」單向連結（v11.0 B5）；前台無任何反向連結。
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/dashboard', label: '📊 儀表板' },
  { href: '/admin/import', label: '📤 批次上傳' },
  { href: '/admin/places', label: '📍 建議地點' },
  { href: '/admin/feedback', label: '📨 回饋意見' },
  { href: '/admin/security', label: '🛡️ 安全複查' },
  { href: '/admin/settings', label: '⚙️ 帳號設定' },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <header className="flex flex-wrap items-center gap-2 bg-navy px-4 py-3 text-white">
      <span className="mr-2 font-bold">🔧 FormoSA Ride 後台</span>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            pathname.startsWith(n.href) ? 'bg-white/20 font-bold' : 'hover:bg-white/10'
          }`}
        >
          {n.label}
        </Link>
      ))}
      <span className="flex-1" />
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg px-3 py-1.5 text-sm hover:bg-white/10"
      >
        🌐 前往前台網站
      </a>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
      >
        登出
      </button>
    </header>
  );
}
