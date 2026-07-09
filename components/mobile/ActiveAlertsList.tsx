'use client';
// components/mobile/ActiveAlertsList.tsx — 目前提醒完整清單（Phase 8C，v10.0 B4）
// 主畫面只顯示最高優先橫幅；此清單在「我的」頁籤列出全部現行條件。
import { useActiveAlertFlags } from '@/components/mobile/BannerQueue';
import { BANNER_LABELS, PRIORITY_ORDER } from '@/lib/notification-priority';

export function ActiveAlertsList() {
  const flags = useActiveAlertFlags();
  const active = PRIORITY_ORDER.filter((t) => flags.has(t));

  return (
    <section className="w-full rounded-2xl bg-white p-4 text-left">
      <h2 className="info-primary font-bold">🔔 目前提醒 · Active alerts</h2>
      {active.length === 0 ? (
        <p className="info-secondary mt-1 text-neutral-text">
          目前沒有提醒 · No active alerts
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-border">
          {active.map((t) => (
            <li key={t} className="flex items-center gap-2 py-2">
              <span aria-hidden>{BANNER_LABELS[t].icon}</span>
              <span className="info-secondary flex-1">{BANNER_LABELS[t].zh}</span>
              <span className="text-sm text-neutral-text">{BANNER_LABELS[t].en}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
