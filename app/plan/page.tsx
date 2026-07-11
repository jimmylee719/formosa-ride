// /plan — 旅程規劃列表（Phase 19A，2026-07-11 Jimmy 指示）
// 取代原 /calculator 的導覽位置；每裝置上限 3 個行程。
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';
import { PlanList } from '@/components/plan/PlanList';
import { StarterItineraries } from '@/components/plan/StarterItineraries';

export const metadata = {
  title: 'Trip Planner 旅程規劃',
  description:
    'Plan your Taiwan round-island trip day by day: departure times, supply stops, lodging — export and share. 台灣環島旅程規劃。',
};

export default function PlanPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary mb-1 font-bold">🗓️ Trip Planner · 旅程規劃</h1>
        <p className="info-secondary mb-3 text-neutral-text">
          Plan each day before you arrive — stops, lodging, departure times.
          <br />
          出發前把每一天排好——停靠點、住宿、出發時間。
        </p>
        <StarterItineraries />
        <PlanList />
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
