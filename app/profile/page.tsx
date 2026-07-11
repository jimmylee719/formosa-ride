// /profile — 「我的」頁籤（會員功能於 Phase 9 實作）
// Phase 8C：次要提醒完整清單放置於此（v10.0 B4）
import { Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { ActiveAlertsList } from '@/components/mobile/ActiveAlertsList';
import { FooterLinks } from '@/components/ui/FooterLinks';
import { InstallAppButton } from '@/components/ui/InstallAppButton';

export default function ProfilePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-neutral-bg p-4">
        <Suspense fallback={null}>
          <ActiveAlertsList />
        </Suspense>
        {/* PWA 安裝（Phase 17A，v4.0 B4 永久位置：「我的」頁）；已安裝自動隱藏 */}
        <div className="w-full">
          <InstallAppButton />
        </div>
        <Link
          href="/feedback"
          className="tap-target flex w-full items-center justify-between rounded-2xl bg-white p-4"
        >
          <span className="info-primary font-bold">📨 Feedback 回饋意見</span>
          <span aria-hidden>›</span>
        </Link>
        <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center">
          <p className="text-4xl" aria-hidden>
            🚧
          </p>
          <h1 className="alert-warning">My Account 我的</h1>
          <p className="info-secondary">
            Member features coming soon
            <br />
            會員功能建置中（Phase 9）
          </p>
        </div>
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
