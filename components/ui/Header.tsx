// components/ui/Header.tsx — 頂部固定 Header（48px，v1.0 §四）
// 右側：天氣小圖示 + 日落倒數（Phase 7）+ ❓ 使用說明（Phase 16C，v10.0 A1）
import Link from 'next/link';
import { SolarWidget } from '@/components/weather/SolarWidget';
import { WeatherWidget } from '@/components/weather/WeatherWidget';

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border bg-white px-3">
      <span className="text-lg font-bold text-primary">🚴 FormoSA Ride</span>
      <div className="flex items-center gap-2">
        <WeatherWidget />
        <SolarWidget />
        <Link
          href="/guide"
          aria-label="How to use 使用說明"
          className="tap-target flex items-center justify-center rounded-full text-lg"
        >
          ❓
        </Link>
      </div>
    </header>
  );
}
