// lib/county-en.ts — 台灣縣市英文名（通用羅馬化，2026-07-11 自 RoutesBrowser 抽出共用）
// 鍵為「台」寫法；查詢前先以 normalizeCounty 正規化（資料來源混用「臺/台」）。

export const COUNTY_EN: Record<string, string> = {
  台北市: 'Taipei',
  新北市: 'New Taipei',
  基隆市: 'Keelung',
  桃園市: 'Taoyuan',
  新竹市: 'Hsinchu City',
  新竹縣: 'Hsinchu County',
  苗栗縣: 'Miaoli',
  台中市: 'Taichung',
  彰化縣: 'Changhua',
  南投縣: 'Nantou',
  雲林縣: 'Yunlin',
  嘉義市: 'Chiayi City',
  嘉義縣: 'Chiayi County',
  台南市: 'Tainan',
  高雄市: 'Kaohsiung',
  屏東縣: 'Pingtung',
  宜蘭縣: 'Yilan',
  花蓮縣: 'Hualien',
  台東縣: 'Taitung',
  澎湖縣: 'Penghu',
  金門縣: 'Kinmen',
  連江縣: 'Matsu (Lienchiang)',
};

/** 「臺」→「台」正規化 */
export const normalizeCounty = (county: string): string => county.replace(/^臺/, '台');
