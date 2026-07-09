// lib/taiwan-counties.ts — 台灣 22 縣市清單（CWA API 的合法 locationName）
// centroid 為近似地理中心，僅用於「以地圖中心挑選最近縣市」的天氣顯示，非精確界線。

export interface County {
  name: string;
  lat: number;
  lng: number;
}

export const TAIWAN_COUNTIES: County[] = [
  { name: '臺北市', lat: 25.04, lng: 121.56 },
  { name: '新北市', lat: 24.91, lng: 121.63 },
  { name: '基隆市', lat: 25.13, lng: 121.74 },
  { name: '桃園市', lat: 24.94, lng: 121.22 },
  { name: '新竹市', lat: 24.8, lng: 120.97 },
  { name: '新竹縣', lat: 24.7, lng: 121.13 },
  { name: '苗栗縣', lat: 24.49, lng: 120.94 },
  { name: '臺中市', lat: 24.15, lng: 120.98 },
  { name: '彰化縣', lat: 23.99, lng: 120.48 },
  { name: '南投縣', lat: 23.83, lng: 120.97 },
  { name: '雲林縣', lat: 23.71, lng: 120.41 },
  { name: '嘉義市', lat: 23.48, lng: 120.45 },
  { name: '嘉義縣', lat: 23.45, lng: 120.51 },
  { name: '臺南市', lat: 23.16, lng: 120.31 },
  { name: '高雄市', lat: 22.99, lng: 120.43 },
  { name: '屏東縣', lat: 22.55, lng: 120.62 },
  { name: '宜蘭縣', lat: 24.6, lng: 121.62 },
  { name: '花蓮縣', lat: 23.75, lng: 121.35 },
  { name: '臺東縣', lat: 22.98, lng: 121.06 },
  { name: '澎湖縣', lat: 23.57, lng: 119.58 },
  { name: '金門縣', lat: 24.44, lng: 118.33 },
  { name: '連江縣', lat: 26.15, lng: 119.95 },
];

export const COUNTY_NAMES = new Set(TAIWAN_COUNTIES.map((c) => c.name));

/** 找出離座標最近的縣市（天氣顯示用的粗略對應） */
export function nearestCounty(lat: number, lng: number): County {
  let best = TAIWAN_COUNTIES[0] as County;
  let bestD = Infinity;
  for (const c of TAIWAN_COUNTIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
