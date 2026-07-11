'use client';
// components/mobile/NewcomerBanner.tsx — 首頁新手引導（2026-07-11）
// 墨西哥情侶情境：完全不懂台灣者落地即是全螢幕地圖，缺「從這開始」。
// 一次性、可關閉；點擊或關閉後不再出現（localStorage）。
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'formosa_newcomer_dismissed';

export function NewcomerBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== '1') setShow(true);
    } catch {
      /* localStorage 不可用時就不顯示 */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* 忽略 */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-center">
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-primary/30 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <Link
          href="/plan"
          onClick={dismiss}
          className="tap-target flex-1 text-sm font-bold text-primary"
        >
          🚴 New to Taiwan? Plan a round-island trip →
          <span className="block text-xs font-normal text-neutral-text">
            第一次來台灣？一鍵開始規劃環島 →
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss 關閉"
          className="tap-target shrink-0 rounded-full px-2 text-neutral-text"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
