// app/admin/(panel)/layout.tsx — 後台面板殼層（Phase 14）
// 完全不使用前台 Header/BottomNavBar，前後台視覺與程式皆隔離。
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-bg">
      <AdminNav />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
