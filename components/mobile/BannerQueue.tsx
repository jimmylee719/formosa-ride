'use client';
// components/mobile/BannerQueue.tsx — 單一橫幅佇列（Phase 8C，v10.0 B4）
// 收集所有提醒條件 → getActiveBanner() 決定唯一顯示的橫幅；
// 關閉後遞補下一優先級；完整清單見「我的」頁籤（ActiveAlertsList）。
// QA 覆寫：?sunset=1 強制日落警示（配合 ?night=1、?heading= 可組合測試）。
import { useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { useSolar } from '@/lib/solar';
import { useHeadwind } from '@/lib/use-headwind';
import {
  getActiveBanner,
  type BannerType,
} from '@/lib/notification-priority';
import { NightSafetyBanner } from '@/components/mobile/NightSafetyBanner';

export function useActiveAlertFlags(): Set<BannerType> {
  const center = useMapStore((s) => s.center);
  const isNightMode = useMapStore((s) => s.isNightMode);
  const solar = useSolar(center[1], center[0]);
  const headwind = useHeadwind();

  const flags = new Set<BannerType>();
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  // 日落警示：橘（60分內）/紅（30分內）才升級為橫幅（v3.0 B4；黃色僅 Header 變色）
  if (
    params.get('sunset') === '1' ||
    (solar && !solar.isNight && (solar.warningLevel === 'orange' || solar.warningLevel === 'red'))
  ) {
    flags.add('sunset_warning');
  }
  // 夜間：自足判斷（store 由地圖頁的 NightModeController 維護，
  // 非地圖頁改以日照資料直接判斷，並支援 ?night 覆寫）
  const nightOverride = params.get('night');
  const isNight =
    nightOverride === '1'
      ? true
      : nightOverride === '0'
        ? false
        : isNightMode || (solar?.isNight ?? false);
  if (isNight) flags.add('night_mode');
  if (headwind?.isHeadwind) flags.add('headwind');
  // trial_ending：Phase 9 會員系統接線（目前恆為 false）
  return flags;
}

export function BannerQueue() {
  const [dismissed, setDismissed] = useState<Set<BannerType>>(new Set());
  const center = useMapStore((s) => s.center);
  const solar = useSolar(center[1], center[0]);
  const headwind = useHeadwind();
  const flags = useActiveAlertFlags();

  const visible = new Set([...flags].filter((f) => !dismissed.has(f)));
  const active = getActiveBanner(visible);
  if (!active) return null;

  const dismiss = (t: BannerType) =>
    setDismissed((prev) => new Set(prev).add(t));

  if (active === 'night_mode') {
    return <NightSafetyBanner onDismiss={() => dismiss('night_mode')} />;
  }

  if (active === 'sunset_warning') {
    const red = solar?.warningLevel === 'red';
    const mins = solar?.minutesToSunset ?? 0;
    return (
      <div
        role="alert"
        className={`absolute inset-x-3 top-3 z-20 rounded-2xl border-2 p-4 shadow-lg ${
          red
            ? 'border-danger-border bg-danger-bg text-danger-text'
            : 'border-warning-border bg-warning-bg text-warning-text'
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="alert-critical">
            {red
              ? '⚠️⚠️ 馬上找安全的地方停下來！天就要黑了'
              : `⚠️ 快天黑了！現在就找今晚的住宿或露營地`}
          </p>
          <button
            type="button"
            onClick={() => dismiss('sunset_warning')}
            aria-label="關閉 Close"
            className="tap-target -mr-2 -mt-2 text-xl"
          >
            ✕
          </button>
        </div>
        <p className="info-secondary mt-1">
          {red
            ? 'Find a safe place to stop — darkness is coming soon!'
            : `Sunset in ${mins > 0 ? mins : '–'} min — find tonight's shelter now`}
        </p>
      </div>
    );
  }

  if (active === 'headwind' && headwind) {
    return (
      <div
        role="alert"
        className="headwind-notice absolute inset-x-3 top-3 z-20 rounded-2xl bg-info-bg p-4 text-info-text shadow-lg"
      >
        <div className="flex items-start justify-between">
          <p className="info-primary font-bold">
            🌬️ 目前為逆風（風速 {Math.round(headwind.windSpeedKmh)} km/h），騎行會比較吃力
          </p>
          <button
            type="button"
            onClick={() => dismiss('headwind')}
            aria-label="關閉 Close"
            className="tap-target -mr-2 -mt-2 text-xl"
          >
            ✕
          </button>
        </div>
        <p className="info-secondary">
          Headwind detected ({Math.round(headwind.windSpeedKmh)} km/h) — riding will be
          tougher than usual
        </p>
      </div>
    );
  }

  return null;
}
