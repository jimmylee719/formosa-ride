// /routes — 路線列表頁（Phase 5，取代暫置頁）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { RouteCard } from '@/components/route/RouteCard';
import { listRoutes } from '@/lib/route-queries';

export const revalidate = 300;

export const metadata = {
  title: '路線 Routes',
};

export default async function RoutesPage() {
  const routes = await listRoutes();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary mb-3 font-bold">
          🛤️ 路線總覽 · All Routes
        </h1>
        {routes.length === 0 ? (
          <p className="info-secondary rounded-xl bg-white p-6 text-center text-neutral-text">
            路線資料準備中 · Routes coming soon
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((r) => (
              <RouteCard key={r.id} route={r} />
            ))}
          </div>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
