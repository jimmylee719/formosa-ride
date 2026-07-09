// lib/map-style.ts — 地圖供應商抽象層（v8.0 D2，Phase 3A）
// 全系統唯一「知道」地圖供應商是誰的地方，其他元件一律呼叫 getMapStyleUrl()，
// 禁止在任何元件中寫死底圖 URL。
// 換供應商 = 改兩個環境變數 + 重新部署，不碰任何程式碼。
// 刻意不做：多供應商容錯切換、後台管理介面、依地區選擇供應商（v8.0 D5）。

export type MapStyleName = 'outdoor' | 'dark' | 'satellite';

const STYLE_PATHS: Record<MapStyleName, string> = {
  outdoor: 'maps/outdoor/style.json', // 日間預設（台灣戶外地圖）
  dark: 'maps/streets-v2-dark/style.json', // 夜間模式（v3.0 C1）
  satellite: 'maps/satellite/style.json',
};

export function getMapStyleUrl(style: MapStyleName): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_MAP_PROVIDER_BASE_URL ?? 'https://api.maptiler.com';
  const apiKey = process.env.NEXT_PUBLIC_MAP_PROVIDER_KEY ?? '';
  return `${baseUrl}/${STYLE_PATHS[style]}?key=${apiKey}`;
}
