// /routes — 路線列表頁（Phase 5；2026-07-11 改為區域分頁籤 + 縣市分組瀏覽）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { RoutesBrowser } from '@/components/route/RoutesBrowser';
import { FooterLinks } from '@/components/ui/FooterLinks';
import { listRoutes } from '@/lib/route-queries';

export const revalidate = 300;

// title 不含站名：layout 的 title.template 會自動附加「| FormoSA Ride」
export const metadata = {
  title: 'Routes 路線',
};

export default async function RoutesPage() {
  const routes = await listRoutes();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary mb-3 font-bold">🛤️ Routes · 路線總覽</h1>
        {routes.length === 0 ? (
          <p className="info-secondary rounded-xl bg-white p-6 text-center text-neutral-text">
            Routes coming soon · 路線資料準備中
          </p>
        ) : (
          <RoutesBrowser routes={routes} />
        )}
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
