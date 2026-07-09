// 地圖主頁面（Phase 3）：Header 48px / 地圖全螢幕 / 底部導覽 64px（v1.0 §四）
// 強制登入牆將於 Phase 9 加在此頁之前
import { Suspense } from 'react';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { MapContainer } from '@/components/map/MapContainer';
import { POILayer } from '@/components/poi/POILayer';
import { POICard } from '@/components/poi/POICard';
import { MapFAB } from '@/components/mobile/MapFAB';
import { FilterModal } from '@/components/mobile/FilterModal';
import { RouteLayer } from '@/components/map/RouteLayer';

export default function HomePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="relative flex-1">
        <MapContainer />
        <POILayer />
        {/* useSearchParams 需要 Suspense 邊界（Next 15） */}
        <Suspense fallback={null}>
          <RouteLayer />
        </Suspense>
        <MapFAB />
        <POICard />
      </main>
      <BottomNavBar />
      <FilterModal />
    </div>
  );
}
