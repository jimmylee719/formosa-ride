// lib/landmarks.ts — 環島認證：關鍵地標（2026-07-13 Jimmy 指示，用我提的地標）
// 內容：台灣本島四極點燈塔 + 兩個東岸代表地標。
//
// ⚠️ 座標為「概略值」（依公開常識標定，非實地測量）。因此每個地標刻意採用
//    「寬鬆半徑」（radius_km 數公里）——騎士行經該地標一帶即算達成，小幅座標
//    誤差不影響判定。若日後需精準座標，請以官方測量資料覆蓋並縮小半徑。
//    （鐵則：不捏造精確數據——此處以寬鬆半徑誠實吸收概略座標的不確定性。）

export interface Landmark {
  id: string;
  name_en: string;
  name_zh: string;
  /** 概略緯度（WGS84） */
  lat: number;
  /** 概略經度（WGS84） */
  lng: number;
  /** 達成半徑（公里）——刻意從寬 */
  radius_km: number;
  /** 徽章圖示 */
  emoji: string;
  /** 一句話說明（雙語） */
  blurb_en: string;
  blurb_zh: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'fugui',
    name_en: 'Cape Fugui Lighthouse (Northernmost)',
    name_zh: '富貴角燈塔（極北點）',
    lat: 25.298,
    lng: 121.537,
    radius_km: 4,
    emoji: '🧭',
    blurb_en: "Taiwan's northernmost point, New Taipei.",
    blurb_zh: '台灣本島最北端，新北石門。',
  },
  {
    id: 'eluanbi',
    name_en: 'Eluanbi Lighthouse (Southernmost)',
    name_zh: '鵝鑾鼻燈塔（極南點）',
    lat: 21.902,
    lng: 120.851,
    radius_km: 4,
    emoji: '🌴',
    blurb_en: "Taiwan's southern cape, Kenting, Pingtung.",
    blurb_zh: '台灣本島最南端，屏東墾丁。',
  },
  {
    id: 'sandiao',
    name_en: 'Cape Santiao Lighthouse (Easternmost)',
    name_zh: '三貂角燈塔（極東點）',
    lat: 25.007,
    lng: 121.999,
    radius_km: 4,
    emoji: '🌅',
    blurb_en: "Taiwan's easternmost point, Gongliao, New Taipei.",
    blurb_zh: '台灣本島最東端，新北貢寮。',
  },
  {
    id: 'guosheng',
    name_en: 'Guosheng Lighthouse (Westernmost)',
    name_zh: '國聖燈塔（極西點）',
    lat: 23.108,
    lng: 120.036,
    radius_km: 4,
    emoji: '🌾',
    blurb_en: "Taiwan's westernmost point, Qigu, Tainan.",
    blurb_zh: '台灣本島最西端，台南七股。',
  },
  {
    id: 'taroko',
    name_en: 'Taroko Gorge Entrance',
    name_zh: '太魯閣口',
    lat: 24.158,
    lng: 121.622,
    radius_km: 3,
    emoji: '⛰️',
    blurb_en: 'Gateway to Taroko, Xincheng, Hualien.',
    blurb_zh: '太魯閣峽谷門戶，花蓮新城。',
  },
  {
    id: 'qingshui',
    name_en: 'Qingshui Cliffs (Suhua)',
    name_zh: '清水斷崖（蘇花）',
    lat: 24.213,
    lng: 121.657,
    radius_km: 5,
    emoji: '🌊',
    blurb_en: 'Iconic sea cliffs on the Suhua coast, Hualien.',
    blurb_zh: '蘇花公路標誌性海崖，花蓮。',
  },
];

export const LANDMARK_BY_ID: Record<string, Landmark> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l])
);
