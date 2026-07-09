'use client';
// components/mobile/BottomNavBar.tsx — 底部快捷欄（64px，v1.0 §四）
// 地圖 | 路線 | 計算 | SOS | 我的；每個項目 ≥44×44px

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '🗺️', label_zh: '地圖', label_en: 'Map' },
  { href: '/routes', icon: '🛤️', label_zh: '路線', label_en: 'Routes' },
  { href: '/calculator', icon: '🔥', label_zh: '計算', label_en: 'Calories' },
  { href: '/emergency', icon: '🆘', label_zh: 'SOS', label_en: 'SOS' },
  { href: '/profile', icon: '👤', label_zh: '我的', label_en: 'Me' },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-16 shrink-0 items-stretch justify-around border-t border-neutral-border bg-white">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tap-target flex min-w-tap flex-1 flex-col items-center justify-center gap-0.5 ${
              active ? 'font-bold text-primary' : 'text-neutral-text'
            } ${item.href === '/emergency' ? 'text-danger-border' : ''}`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {item.icon}
            </span>
            <span className="text-xs leading-none">{item.label_zh}</span>
          </Link>
        );
      })}
    </nav>
  );
}
