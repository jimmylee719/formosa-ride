'use client';
// components/mobile/BottomNavBar.tsx — 底部快捷欄（64px，v1.0 §四）
// 地圖 | 路線 | 規劃 | SOS | 我的；每個項目 ≥44×44px
// （2026-07-11 Jimmy 指示：第 3 格由卡路里計算改為旅程規劃）
// SOS 需長按 2 秒才開啟（v10.0/v11.0 A9：防誤觸保護）。

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// 英文為主（2026-07-10 指示）；zh 併列於同行小字
const LEFT_ITEMS = [
  { href: '/', icon: '🗺️', label_zh: '地圖', label_en: 'Map' },
  { href: '/routes', icon: '🛤️', label_zh: '路線', label_en: 'Routes' },
  { href: '/plan', icon: '🗓️', label_zh: '規劃', label_en: 'Plan' },
] as const;
const PROFILE_ITEM = { href: '/profile', icon: '👤', label_zh: '我的', label_en: 'Me' } as const;
type NavItem = (typeof LEFT_ITEMS)[number] | typeof PROFILE_ITEM;

const SOS_HOLD_MS = 2000;

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const beginHold = () => {
    if (holdTimer.current) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      router.push('/emergency');
    }, SOS_HOLD_MS);
  };

  const cancelHold = () => {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    // 放太早：提示需要長按（防誤觸設計，v10.0）
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 2500);
  };

  const renderItem = (item: NavItem) => {
    const active =
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`tap-target flex min-w-tap flex-1 flex-col items-center justify-center gap-0.5 ${
          active ? 'font-bold text-primary' : 'text-neutral-text'
        }`}
      >
        <span className="text-xl leading-none" aria-hidden>
          {item.icon}
        </span>
        <span className="text-[10px] leading-none">
          {item.label_en} {item.label_zh}
        </span>
      </Link>
    );
  };

  return (
    <>
      {hint && (
        <p
          role="status"
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-4 py-2 text-sm font-bold text-white shadow-lg"
        >
          ⏱ 長按 2 秒開啟 SOS · Hold 2s for SOS
        </p>
      )}
      <nav className="flex h-16 shrink-0 items-stretch justify-around border-t border-neutral-border bg-white">
        {LEFT_ITEMS.map(renderItem)}

        {/* SOS：長按 2 秒開啟（按住時紅色由下往上填滿） */}
        <button
          type="button"
          aria-label="長按 2 秒開啟緊急頁 Hold 2 seconds to open Emergency"
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') beginHold();
          }}
          onKeyUp={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className={`tap-target relative flex min-w-tap flex-1 select-none flex-col items-center justify-center gap-0.5 overflow-hidden ${
            pathname.startsWith('/emergency')
              ? 'font-bold text-danger-text'
              : 'text-danger-border'
          }`}
          style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
        >
          <span
            aria-hidden
            className={`absolute inset-x-0 bottom-0 bg-danger-border/30 ${
              holding ? 'h-full transition-[height] duration-[2000ms] ease-linear' : 'h-0'
            }`}
          />
          <span className="relative text-xl leading-none" aria-hidden>
            🆘
          </span>
          <span className="relative text-xs font-bold leading-none">SOS</span>
        </button>

        {renderItem(PROFILE_ITEM)}
      </nav>
    </>
  );
}
