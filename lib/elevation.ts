// lib/elevation.ts — 海拔剖面計算（Phase 6，Server 專用）
// 資料來源：MapTiler terrain-rgb-v2 圖磚（免費方案含，2026-07-09 實測 200）
// 解碼公式：elevation = -10000 + (R*65536 + G*256 + B) * 0.1
import 'server-only';
import sharp from 'sharp';

export interface ProfilePoint {
  distance_km: number;
  elevation_m: number;
  grade_pct: number;
}

export interface ElevationProfileResult {
  points: ProfilePoint[];
  maxElevation: number;
  minElevation: number;
  totalAscent: number;
  totalDescent: number;
}

const TILE_ZOOM = 13; // z13/512px ≈ 9.5m 解析度，對路線剖面足夠
const MIN_SAMPLES = 40;
const MAX_SAMPLES = 200;

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** 沿線等距重取樣 */
function resample(
  coords: [number, number][],
  sampleCount: number
): { lnglat: [number, number]; distanceKm: number }[] {
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const prev = cum[i - 1] ?? 0;
    const a = coords[i - 1];
    const b = coords[i];
    cum.push(prev + (a && b ? haversineKm(a, b) : 0));
  }
  const total = cum[cum.length - 1] ?? 0;
  const out: { lnglat: [number, number]; distanceKm: number }[] = [];
  let seg = 0;
  for (let s = 0; s < sampleCount; s++) {
    const target = (total * s) / (sampleCount - 1);
    while (seg < coords.length - 2 && (cum[seg + 1] ?? 0) < target) seg++;
    const segStart = cum[seg] ?? 0;
    const segEnd = cum[seg + 1] ?? segStart;
    const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
    const a = coords[seg];
    const b = coords[seg + 1] ?? a;
    if (!a || !b) continue;
    out.push({
      lnglat: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
      distanceKm: target,
    });
  }
  return out;
}

function lngLatToTilePixel(lng: number, lat: number, zoom: number, tileSize: number) {
  const n = 2 ** zoom;
  const xf = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yf =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.floor(xf);
  const tileY = Math.floor(yf);
  return {
    tileX,
    tileY,
    px: Math.min(tileSize - 1, Math.floor((xf - tileX) * tileSize)),
    py: Math.min(tileSize - 1, Math.floor((yf - tileY) * tileSize)),
  };
}

/** 計算路線海拔剖面（可能拋出錯誤，呼叫端處理） */
export async function computeElevationProfile(
  coords: [number, number][]
): Promise<ElevationProfileResult> {
  if (coords.length < 2) throw new Error('route too short');

  let totalKm = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    if (a && b) totalKm += haversineKm(a, b);
  }
  const sampleCount = Math.max(
    MIN_SAMPLES,
    Math.min(MAX_SAMPLES, Math.round(totalKm / 0.15))
  );
  const samples = resample(coords, sampleCount);

  // 依圖磚分組，每張圖磚只抓一次
  const baseUrl =
    process.env.NEXT_PUBLIC_MAP_PROVIDER_BASE_URL ?? 'https://api.maptiler.com';
  const key = process.env.NEXT_PUBLIC_MAP_PROVIDER_KEY ?? '';
  const tileCache = new Map<
    string,
    { data: Buffer; width: number; channels: number }
  >();

  // 先探測 tile 尺寸（第一張）
  const probe = samples[0];
  if (!probe) throw new Error('no samples');

  const getTile = async (tx: number, ty: number) => {
    const cacheKey = `${tx}/${ty}`;
    const hit = tileCache.get(cacheKey);
    if (hit) return hit;
    const url = `${baseUrl}/tiles/terrain-rgb-v2/${TILE_ZOOM}/${tx}/${ty}.webp?key=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`terrain tile ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const entry = { data, width: info.width, channels: info.channels };
    tileCache.set(cacheKey, entry);
    return entry;
  };

  const rawElev: number[] = [];
  for (const s of samples) {
    // 先以 512 猜測像素位置，取得實際寬度後重算
    const guess = lngLatToTilePixel(s.lnglat[0], s.lnglat[1], TILE_ZOOM, 512);
    const tile = await getTile(guess.tileX, guess.tileY);
    const { px, py } = lngLatToTilePixel(
      s.lnglat[0],
      s.lnglat[1],
      TILE_ZOOM,
      tile.width
    );
    const idx = (py * tile.width + px) * tile.channels;
    const r = tile.data[idx] ?? 0;
    const g = tile.data[idx + 1] ?? 0;
    const b = tile.data[idx + 2] ?? 0;
    rawElev.push(Math.round((-10000 + (r * 65536 + g * 256 + b) * 0.1) * 10) / 10);
  }

  // 移動平均平滑（窗 3），降低雜訊造成的爬升高估
  const smooth = rawElev.map((_, i) => {
    const a = rawElev[Math.max(0, i - 1)] ?? 0;
    const b = rawElev[i] ?? 0;
    const c = rawElev[Math.min(rawElev.length - 1, i + 1)] ?? 0;
    return (a + b + c) / 3;
  });

  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < smooth.length; i++) {
    const d = (smooth[i] ?? 0) - (smooth[i - 1] ?? 0);
    if (d > 0) ascent += d;
    else descent -= d;
  }

  const points: ProfilePoint[] = samples.map((s, i) => {
    const prev = i > 0 ? samples[i - 1] : null;
    const dKm = prev ? s.distanceKm - prev.distanceKm : 0;
    const dElev = prev ? (smooth[i] ?? 0) - (smooth[i - 1] ?? 0) : 0;
    return {
      distance_km: Math.round(s.distanceKm * 100) / 100,
      elevation_m: Math.round((smooth[i] ?? 0) * 10) / 10,
      grade_pct: dKm > 0 ? Math.round((dElev / (dKm * 1000)) * 1000) / 10 : 0,
    };
  });

  return {
    points,
    maxElevation: Math.round(Math.max(...smooth)),
    minElevation: Math.round(Math.min(...smooth)),
    totalAscent: Math.round(ascent),
    totalDescent: Math.round(descent),
  };
}
