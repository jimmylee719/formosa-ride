// app/admin/layout.tsx — 後台共用外層（Phase 14）
// 只負責 noindex；面板殼層在 (panel)/layout.tsx，登入頁不套殼。
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FormoSA Ride 後台管理',
  robots: { index: false, follow: false }, // 後台一律不允許索引（v5.0 E3）
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
