// lib/calories.ts — 卡路里計算引擎（Phase 6，v1.0 §11 MET 公式）
// 純函數、無副作用，前後端皆可使用。

export const MET_TABLE = {
  flat_easy: 6.8, // 平路 < 16km/h
  flat_moderate: 8.0, // 平路 16-19km/h
  flat_fast: 10.0, // 平路 > 19km/h
  uphill_3: 10.5, // 上坡 1-3%
  uphill_6: 13.0, // 上坡 3-6%
  uphill_10: 15.0, // 上坡 6-10%
  uphill_steep: 16.0, // 上坡 >10%
  downhill: 4.0, // 下坡（省力）
} as const;

/**
 * 騎行中即時 MET（Phase 19A 升級）：實測速度＋實測坡度雙因子。
 * 坡度未知（GPS 無海拔）時回退純速度表。
 * 坡度來源為 GPS 海拔差，已在 tracker 端以 ≥100m 距離窗平滑並夾限 ±20%。
 */
export function metForRide(speedKmh: number, gradePct: number | null): number {
  if (speedKmh < 2) return 0; // 靜止
  if (gradePct != null) {
    if (gradePct > 10) return MET_TABLE.uphill_steep;
    if (gradePct > 6) return MET_TABLE.uphill_10;
    if (gradePct > 3) return MET_TABLE.uphill_6;
    if (gradePct > 1) return MET_TABLE.uphill_3; // 1% 以下視為平路（GPS 海拔噪音帶）
    if (gradePct < -3) return MET_TABLE.downhill;
  }
  if (speedKmh < 16) return MET_TABLE.flat_easy;
  if (speedKmh < 19) return MET_TABLE.flat_moderate;
  return MET_TABLE.flat_fast;
}

export const SPEED_MODIFIER = {
  beginner: 0.8, // 初級：-20% 速度
  intermediate: 1.0,
  advanced: 1.2, // 進階：+20% 速度
} as const;

export type FitnessLevel = keyof typeof SPEED_MODIFIER;

export interface ElevationSample {
  distance_km: number;
  elevation_m: number;
}

export interface CalorieResult {
  totalCalories: number;
  totalTimeHours: number;
  totalWaterMl: number;
  carbsPerHour: number;
  totalCarbsG: number;
  refillEveryMinutes: number;
  refillCalories: number;
}

export function calculateCalories(params: {
  weightKg: number;
  elevationProfile: ElevationSample[];
  fitnessLevel: FitnessLevel;
}): CalorieResult {
  const { weightKg, elevationProfile, fitnessLevel } = params;
  const speedMod = SPEED_MODIFIER[fitnessLevel];

  let totalCalories = 0;
  let totalTimeHours = 0;

  for (let i = 1; i < elevationProfile.length; i++) {
    const cur = elevationProfile[i];
    const prev = elevationProfile[i - 1];
    if (!cur || !prev) continue;
    const segmentKm = cur.distance_km - prev.distance_km;
    if (segmentKm <= 0) continue;
    const elevDiff = cur.elevation_m - prev.elevation_m;
    const gradePct = (elevDiff / (segmentKm * 1000)) * 100;

    let met: number;
    let baseSpeedKmh: number;
    if (gradePct > 10) {
      met = MET_TABLE.uphill_steep;
      baseSpeedKmh = 6;
    } else if (gradePct > 6) {
      met = MET_TABLE.uphill_10;
      baseSpeedKmh = 8;
    } else if (gradePct > 3) {
      met = MET_TABLE.uphill_6;
      baseSpeedKmh = 10;
    } else if (gradePct > 0) {
      met = MET_TABLE.uphill_3;
      baseSpeedKmh = 13;
    } else if (gradePct < -3) {
      met = MET_TABLE.downhill;
      baseSpeedKmh = 28;
    } else {
      met = MET_TABLE.flat_moderate;
      baseSpeedKmh = 18;
    }

    const speedKmh = baseSpeedKmh * speedMod;
    const segmentHours = segmentKm / speedKmh;
    totalCalories += met * weightKg * segmentHours;
    totalTimeHours += segmentHours;
  }

  // 補水：每小時約 650ml（500-750 取中）
  const totalWaterMl = Math.round(totalTimeHours * 650);

  return {
    totalCalories: Math.round(totalCalories),
    totalTimeHours: Math.round(totalTimeHours * 10) / 10,
    totalWaterMl,
    carbsPerHour: 50, // 每小時碳水建議 40-60g 取中
    totalCarbsG: Math.round(totalTimeHours * 50),
    refillEveryMinutes: 90,
    refillCalories:
      totalTimeHours > 0
        ? Math.round(totalCalories / (totalTimeHours / 1.5))
        : 0,
  };
}
