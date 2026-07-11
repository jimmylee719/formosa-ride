// components/ui/Header.tsx — 頂部固定 Header（48px，v1.0 §四）
// 右側：天氣小圖示 + 日落倒數（Phase 7）+ ❓ 使用說明（Phase 16C，v10.0 A1）
// Logo：Jimmy 提供的品牌圖（2026-07-11 取代 🚴 emoji）
import Link from 'next/link';
import Image from 'next/image';
import { SolarWidget } from '@/components/weather/SolarWidget';
import { WeatherWidget } from '@/components/weather/WeatherWidget';

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border bg-white px-3">
      <span className="flex items-center gap-2 text-lg font-bold text-primary">
        <Image
          src="/icons/icon-192.png"
          alt=""
          aria-hidden
          width={30}
          height={30}
          className="rounded-md"
          priority
        />
        FormoSA Ride
      </span>
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
