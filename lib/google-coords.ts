// lib/google-coords.ts — 從 Google Maps 連結解析座標（Phase 19A）
// 支援 @lat,lng 與 q=lat,lng 兩種形式；短網址（maps.app.goo.gl）不含座標 → null，
// 由管理員審核時人工確認。

export function parseGoogleCoords(url: string): { lat: number; lng: number } | null {
  const m =
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url) ??
    /[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  // 台灣範圍外視為解析失敗（連結可能指向其他國家的地點）
  if (lat < 20.5 || lat > 26.5 || lng < 117 || lng > 124.5) return null;
  return { lat, lng };
}
