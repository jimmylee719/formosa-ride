// lib/notification-priority.ts — 通知優先順序佇列（Phase 8C，v10.0 B4）
// 同一時間最多只顯示「一條」橫幅；其餘條件於「我的」頁籤完整列出。

export type BannerType =
  | 'sunset_warning' // 最高：天黑安全攸關生命，永遠優先
  | 'night_mode'
  | 'headwind' // 體力相關提醒
  | 'trial_ending'; // 商業性質提醒，優先度最低（Phase 9 接線）

export const PRIORITY_ORDER: BannerType[] = [
  'sunset_warning',
  'night_mode',
  'headwind',
  'trial_ending',
];

export const BANNER_LABELS: Record<BannerType, { zh: string; en: string; icon: string }> = {
  sunset_warning: { zh: '日落警示', en: 'Sunset warning', icon: '🌇' },
  night_mode: { zh: '夜間騎行提醒', en: 'Night riding', icon: '🌙' },
  headwind: { zh: '逆風提醒', en: 'Headwind', icon: '🌬️' },
  trial_ending: { zh: '試用即將到期', en: 'Trial ending', icon: '⏰' },
};

export function getActiveBanner(activeFlags: Set<BannerType>): BannerType | null {
  for (const type of PRIORITY_ORDER) {
    if (activeFlags.has(type)) return type;
  }
  return null;
}
