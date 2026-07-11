// lib/rider-weight.ts — 騎士體重設定（Phase 19A）
// 卡路里 = MET × 體重 × 時間：體重是估算準確度影響最大的變數。
// localStorage 保存（會員制 Phase 9 後可改存個人資料）。

const KEY = 'formosa_rider_weight';
export const DEFAULT_WEIGHT_KG = 70;
const MIN_KG = 30;
const MAX_KG = 200;

export function getRiderWeightKg(): number {
  if (typeof window === 'undefined') return DEFAULT_WEIGHT_KG;
  const raw = Number(window.localStorage.getItem(KEY));
  return Number.isFinite(raw) && raw >= MIN_KG && raw <= MAX_KG ? raw : DEFAULT_WEIGHT_KG;
}

/** 回傳實際存入的值（超範圍會被拒絕並維持原值） */
export function setRiderWeightKg(kg: number): number {
  if (typeof window === 'undefined') return DEFAULT_WEIGHT_KG;
  if (Number.isFinite(kg) && kg >= MIN_KG && kg <= MAX_KG) {
    window.localStorage.setItem(KEY, String(Math.round(kg)));
  }
  return getRiderWeightKg();
}
