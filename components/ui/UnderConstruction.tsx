// components/ui/UnderConstruction.tsx — 暫置頁共用元件（各功能於對應 Phase 替換）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';

export function UnderConstruction({
  titleZh,
  titleEn,
  phase,
}: {
  titleZh: string;
  titleEn: string;
  phase: string;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-4xl" aria-hidden>
          🚧
        </p>
        <h1 className="alert-warning">{titleZh}</h1>
        <p className="info-secondary">
          {titleEn}
          <br />
          此功能建置中（{phase}）· Coming soon
        </p>
      </main>
      <BottomNavBar />
    </div>
  );
}
