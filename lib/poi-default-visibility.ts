// lib/poi-default-visibility.ts — 無篩選時的縮放漸進顯示（Phase 15A UX 調整）
// 問題：全台 2.6 萬 POI 全部顯示會塞滿地圖。
// 原則：拉遠只看「旅程規劃關鍵點」（稀少且重要），拉近才逐層加入高密度類型；
//       使用者手動選了篩選 → 完全尊重使用者選擇，不套用此規則。
import type { POIType } from '@/types/poi';

/** zoom < 12：稀少且對環島規劃最關鍵
 *（Phase 15B 起 accommodation 有 1.5 萬筆，移到中層避免拉遠時洗版）*/
const TIER_FAR: POIType[] = [
  'bicycle_repair',
  'train_station',
  'hospital',
  'scenic_attraction',
  'campsite_legal',
  'temple_overnight',
];

/** zoom 12–13：加入補給、安全與住宿 */
const TIER_MID: POIType[] = [
  ...TIER_FAR,
  'convenience_store',
  'supermarket',
  'water_station',
  'pump_station',
  'police',
  'accommodation',
];

/** zoom ≥ 14：全部顯示（含公廁等高密度類型） */
export function defaultTypesForZoom(zoom: number): POIType[] | null {
  if (zoom >= 14) return null; // null = 不限制類型
  if (zoom >= 12) return TIER_MID;
  return TIER_FAR;
}
