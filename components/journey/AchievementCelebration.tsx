'use client';
// components/journey/AchievementCelebration.tsx — 完賽慶祝彈窗（2026-07-14）
// 「結束整趟旅程」後，day-summary 會把本趟新獲得的成就 key 陣列存進 sessionStorage；
// 總結頁掛載此元件，讀到就跳一次慶祝彈窗，導向 /achievements。讀取後即清除（只跳一次）。
import { useEffect, useState } from 'react';
import Link from 'next/link';

export const NEW_ACHIEVEMENTS_KEY = 'formosa_new_achievements';

export function AchievementCelebration() {
  const [keys, setKeys] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NEW_ACHIEVEMENTS_KEY);
      if (!raw) return;
      sessionStorage.removeItem(NEW_ACHIEVEMENTS_KEY); // 只跳一次
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.length > 0) setKeys(arr as string[]);
    } catch {
      /* sessionStorage 不可用或解析失敗 → 靜默略過 */
    }
  }, []);

  if (!keys) return null;

  const cert = keys.includes('certificate:huandao');
  const landmarks = keys.filter((k) => k.startsWith('landmark:')).length;
  const counties = keys.filter((k) => k.startsWith('county:')).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setKeys(null)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h2 className="alert-warning mt-2 text-neutral-text">
          New achievements! 獲得新認證！
        </h2>

        <ul className="mt-4 flex flex-col gap-2">
          {cert && (
            <li className="rounded-xl bg-accent p-3 font-bold text-white">
              🏆 Round-island certificate 環島完賽證書
            </li>
          )}
          {landmarks > 0 && (
            <li className="info-secondary rounded-xl bg-safe-bg p-3 font-bold text-safe-text">
              🧭 {landmarks} landmark badge{landmarks > 1 ? 's' : ''} 個地標徽章
            </li>
          )}
          {counties > 0 && (
            <li className="info-secondary rounded-xl bg-safe-bg p-3 font-bold text-safe-text">
              🗺️ {counties} county badge{counties > 1 ? 's' : ''} 個縣市徽章
            </li>
          )}
        </ul>

        <Link
          href="/achievements"
          className="tap-target mt-5 block rounded-xl bg-primary py-3 font-bold text-white"
        >
          🏅 View achievements 查看認證
        </Link>
        <button
          type="button"
          onClick={() => setKeys(null)}
          className="tap-target mt-2 w-full rounded-xl border border-neutral-border py-3 font-bold"
        >
          Close 關閉
        </button>
      </div>
    </div>
  );
}
