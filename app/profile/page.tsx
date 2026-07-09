// /profile — 「我的」頁籤（會員功能於 Phase 9 實作）
// Phase 8C：次要提醒完整清單放置於此（v10.0 B4）
import { Suspense } from 'react';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { ActiveAlertsList } from '@/components/mobile/ActiveAlertsList';

export default function ProfilePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-neutral-bg p-4">
        <Suspense fallback={null}>
          <ActiveAlertsList />
        </Suspense>
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center">
          <p className="text-4xl" aria-hidden>
            🚧
          </p>
          <h1 className="alert-warning">我的</h1>
          <p className="info-secondary">
            My Account
            <br />
            會員功能建置中（Phase 9）· Coming soon
          </p>
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
