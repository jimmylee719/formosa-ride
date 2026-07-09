// lib/milestones.ts — 里程碑系統（Phase 11，v2.0 C8）
// 距離里程碑照 v2.0 清單；縣市里程碑以 nearestCounty 近似判斷（無反向地理編碼服務）。

export interface Milestone {
  km: number;
  message_zh: string;
  message_en: string;
}

export const MILESTONES: Milestone[] = [
  { km: 100, message_zh: '🎉 已完成 100 公里！', message_en: '🎉 100km Milestone!' },
  { km: 200, message_zh: '💪 200 公里！繼續加油！', message_en: '💪 200km! Keep going!' },
  { km: 300, message_zh: '🌊 300 公里！', message_en: '🌊 300km!' },
  { km: 400, message_zh: '⛰️ 400 公里！', message_en: '⛰️ 400km!' },
  { km: 500, message_zh: '🦅 500 公里！', message_en: '🦅 500km!' },
  { km: 600, message_zh: '🏆 600 公里！超過一半了！', message_en: '🏆 600km! More than halfway!' },
  { km: 750, message_zh: '🚀 750 公里！', message_en: '🚀 750km! Almost home!' },
  { km: 900, message_zh: '🎊 900 公里！最後衝刺！', message_en: '🎊 900km! Final push!' },
  { km: 968, message_zh: '🥇 環島完成！恭喜你！', message_en: '🥇 You completed the loop! LEGEND!' },
];

/** 檢查從 prevKm → newKm 是否跨越里程碑（回傳最高一個） */
export function crossedMilestone(prevKm: number, newKm: number): Milestone | null {
  let hit: Milestone | null = null;
  for (const m of MILESTONES) {
    if (prevKm < m.km && newKm >= m.km) hit = m;
  }
  return hit;
}

/** 縣市變換訊息（近似判斷，進入新縣市時顯示） */
export function countyChangeMessage(county: string): { zh: string; en: string } {
  return {
    zh: `📍 進入${county}了！`,
    en: `📍 Entering ${county}!`,
  };
}
