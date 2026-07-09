// lib/headwind-check.ts — 逆風判斷（Phase 7C，v8.0 B2）
// 純函數、無副作用。風向與行進方向夾角 135°~180° 且風速 ≥15km/h 視為逆風。
// 刻意不做「建議改道」：系統不規劃路線，只誠實告知現況（v8.0 B3）。

export interface HeadwindResult {
  isHeadwind: boolean;
  windSpeedKmh: number;
  angleDifference: number;
}

export function checkHeadwind(
  userHeadingDeg: number,
  windDirectionDeg: number,
  windSpeedKmh: number
): HeadwindResult {
  let diff = Math.abs(userHeadingDeg - windDirectionDeg);
  if (diff > 180) diff = 360 - diff;

  const isHeadwind = diff >= 135 && windSpeedKmh >= 15;

  return { isHeadwind, windSpeedKmh, angleDifference: diff };
}
