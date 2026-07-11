// lib/itineraries.ts — 現成行程範本（2026-07-11）
// 一鍵把「已規劃好的行程」灌進使用者的 Plan（可再自行編輯）。
//
// 鐵律（2026-07-11 Jimmy 前提）：**絕不新增或修改任何正式路線資料**
// （政府引進的資料一律不動）。行程是純資料層，只「引用」已存在的路線 slug。
// 區域行程＝現有 9 個環島日段（huandao-stage-1..9，皆實測幾何/海拔）的子集，
// 因此不需要在 DB 產生任何新路線。想要非環島、單區的行程也一樣——挑既有路線組合。
// 純資料模組，Server/Client 皆可 import。

export interface ItineraryDay {
  routeSlug: string; // 對應既有路線 slug
  note_en?: string;
  note_zh?: string;
}

export interface Itinerary {
  id: string;
  name_en: string;
  name_zh: string;
  days: number;
  distance_km: number;
  total_ascent_m: number;
  difficulty_en: string;
  difficulty_zh: string;
  summary_en: string;
  summary_zh: string;
  stages: ItineraryDay[];
}

export const ITINERARIES: Itinerary[] = [
  {
    id: 'huandao-9',
    name_en: '9-Day Round-Island · Cycling Route No.1',
    name_zh: '環島 9 日・環島1號線',
    days: 9,
    distance_km: 948, // 9 日段實測距離總和
    total_ascent_m: 7422, // 9 日段實測爬升總和
    difficulty_en: '3 easy · 4 moderate · 1 hard · 1 expert day',
    difficulty_zh: '3 易・4 中・1 難・1 專家級',
    summary_en:
      'The classic counter-clockwise loop from Taipei, split into nine ~105 km days. Days 8–9 cross the mountains — the toughest part.',
    summary_zh:
      '從台北出發的經典逆時針環島，切成 9 天、每天約 105 公里。第 8–9 天翻山，是最硬的一段。',
    stages: [
      { routeSlug: 'huandao-stage-1' },
      { routeSlug: 'huandao-stage-2' },
      { routeSlug: 'huandao-stage-3' },
      { routeSlug: 'huandao-stage-4' },
      {
        routeSlug: 'huandao-stage-5',
        note_en: 'Longer climb today (~950 m).',
        note_zh: '今天爬升較多（約 950 公尺）。',
      },
      { routeSlug: 'huandao-stage-6' },
      { routeSlug: 'huandao-stage-7' },
      {
        routeSlug: 'huandao-stage-8',
        note_en: 'Hardest day — big mountain climb (~2,600 m). Consider a train skip if unsure.',
        note_zh: '最硬的一天——大爬升（約 2,600 公尺）。沒把握可考慮搭火車跳過。',
      },
      {
        routeSlug: 'huandao-stage-9',
        note_en: 'Hilly finish back to Taipei (~1,200 m).',
        note_zh: '回台北的多坡收尾（約 1,200 公尺）。',
      },
    ],
  },
  // ── 區域行程（非全環島）：現有日段的子集，零新增資料 ──
  {
    id: 'westcoast-3',
    name_en: 'West Coast Flat · 3 Days (one-way)',
    name_zh: '西海岸平路・3 天（單程）',
    days: 3,
    distance_km: 316,
    total_ascent_m: 833,
    difficulty_en: 'All easy · flat, dense supplies',
    difficulty_zh: '全易・平路、補給密集',
    summary_en:
      'The flat western third of Route No.1 (stages 2–4): Hsinchu → Changhua → Tainan → Pingtung. Perfect first bike trip — take the high-speed rail back from the south.',
    summary_zh:
      '環島1號線平坦的西段（第 2–4 段）：新竹→彰化→台南→屏東。最適合第一次騎行——回程搭高鐵北返。',
    stages: [
      { routeSlug: 'huandao-stage-2', note_en: 'West Coast Day 1', note_zh: '西海岸第 1 天' },
      { routeSlug: 'huandao-stage-3', note_en: 'West Coast Day 2', note_zh: '西海岸第 2 天' },
      { routeSlug: 'huandao-stage-4', note_en: 'West Coast Day 3', note_zh: '西海岸第 3 天' },
    ],
  },
  {
    id: 'south-east-3',
    name_en: 'South Cape & East Coast · 3 Days',
    name_zh: '南迴＋花東・3 天',
    days: 3,
    distance_km: 316,
    total_ascent_m: 2218,
    difficulty_en: 'All moderate · scenic, some climbs',
    difficulty_zh: '全中・風景路線、有坡',
    summary_en:
      'The scenic south-east of Route No.1 (stages 5–7): Pingtung → the South Cape → Hualien → the East Rift Valley. Rolling hills, ocean and mountains — without the hardest Suhua climb.',
    summary_zh:
      '環島1號線風景最好的南東段（第 5–7 段）：屏東→南迴→花蓮→花東縱谷。有起伏、有海有山，但避開最硬的蘇花大爬升。',
    stages: [
      { routeSlug: 'huandao-stage-5', note_en: 'South Cape Day 1', note_zh: '南迴第 1 天' },
      { routeSlug: 'huandao-stage-6', note_en: 'To Hualien Day 2', note_zh: '往花蓮第 2 天' },
      { routeSlug: 'huandao-stage-7', note_en: 'East Rift Valley Day 3', note_zh: '花東縱谷第 3 天' },
    ],
  },
  {
    id: 'western-half-5',
    name_en: 'Taipei to the South · 5 Days (western half)',
    name_zh: '台北到南部・5 天（西半圈）',
    days: 5,
    distance_km: 527,
    total_ascent_m: 2353,
    difficulty_en: '3 easy · 2 moderate',
    difficulty_zh: '3 易・2 中',
    summary_en:
      'The western half of the island (stages 1–5): Taipei all the way down to Pingtung. Mostly flat, city-to-city — a relaxed way to see the west without committing to the full loop.',
    summary_zh:
      '環島的西半圈（第 1–5 段）：從台北一路南下到屏東。多為平路、城市到城市——不必挑戰全環島也能輕鬆玩遍西部。',
    stages: [
      { routeSlug: 'huandao-stage-1' },
      { routeSlug: 'huandao-stage-2' },
      { routeSlug: 'huandao-stage-3' },
      { routeSlug: 'huandao-stage-4' },
      {
        routeSlug: 'huandao-stage-5',
        note_en: 'Longer climb today (~950 m).',
        note_zh: '今天爬升較多（約 950 公尺）。',
      },
    ],
  },
];

export function getItinerary(id: string): Itinerary | undefined {
  return ITINERARIES.find((i) => i.id === id);
}
