// /routes — 路線列表頁（Phase 5；Phase 15A 起依類型分區塊，英文為主）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { RouteCard } from '@/components/route/RouteCard';
import { listRoutes } from '@/lib/route-queries';
import type { RouteListItem } from '@/types/route';

export const revalidate = 300;

export const metadata = {
  title: 'Routes 路線 | FormoSA Ride',
};

// 分區塊呈現：官方環島路網最優先，地方自行車道殿後（Phase 15A）
const SECTIONS: Array<{ types: string[]; title_en: string; title_zh: string; icon: string }> = [
  {
    types: ['full_island', 'west_coast', 'east_coast', 'segment'],
    title_en: 'Round-Island Main Routes',
    title_zh: '環島主路線',
    icon: '🚴',
  },
  {
    types: ['branch'],
    title_en: 'Official Branch Lines',
    title_zh: '環島支線',
    icon: '🛤️',
  },
  {
    types: ['custom'],
    title_en: 'Local Bike Paths',
    title_zh: '地方自行車道',
    icon: '🌳',
  },
];

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
          SECTIONS.map((sec) => {
            const items = routes.filter((r: RouteListItem) => sec.types.includes(r.type));
            if (items.length === 0) return null;
            return (
              <section key={sec.title_en} className="mb-5">
                <h2 className="info-primary mb-2 font-bold">
                  {sec.icon} {sec.title_en}
                  <span className="info-secondary ml-2 font-normal text-neutral-text">
                    {sec.title_zh}（{items.length}）
                  </span>
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((r) => (
                    <RouteCard key={r.id} route={r} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
