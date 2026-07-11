// lib/itineraries.ts — 現成行程範本（2026-07-11）
// 一鍵把「已規劃好的行程」灌進使用者的 Plan（可再自行編輯）。
// 誠實原則（三鐵則）：只引用「真實存在的路線」。目前唯一能百分百誠實提供的是
// 「9 天全環島」——即 9 個環島日段（huandao-stage-1..9），皆為實測幾何與海拔。
// 其他天數（3/5/7）需另建真實內容（區域路線）或重切主線，待 Jimmy 定調後再加。
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
];

export function getItinerary(id: string): Itinerary | undefined {
  return ITINERARIES.find((i) => i.id === id);
}
