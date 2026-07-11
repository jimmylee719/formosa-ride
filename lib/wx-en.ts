// lib/wx-en.ts — 氣象署天氣現象中→英翻譯（2026-07-11，外國旅客看得懂預報）
// CWA Wx 為固定官方用語組合（天空狀態＋降水/霧），採組合式解析：
// 先比對天空前綴，再翻譯剩餘降水描述；無法解析的部分原樣保留（不硬翻）。
// 純函數，前後端皆可用。

const SKY: Array<[RegExp, string]> = [
  [/^晴時多雲/, 'Sunny, partly cloudy'],
  [/^多雲時晴/, 'Partly cloudy with sun'],
  [/^多雲時陰/, 'Cloudy, overcast at times'],
  [/^陰時多雲/, 'Overcast, some clouds'],
  [/^晴天?/, 'Sunny'],
  [/^多雲/, 'Cloudy'],
  [/^陰天?/, 'Overcast'],
];

// 順序敏感：長詞在前
const RAIN: Array<[RegExp, string]> = [
  [/短暫陣雨或雷雨/, 'brief showers or thunderstorms'],
  [/陣雨或雷雨/, 'showers or thunderstorms'],
  [/短暫雷陣雨/, 'brief thunderstorms'],
  [/雷陣雨/, 'thunderstorms'],
  [/短暫陣雨/, 'brief showers'],
  [/短暫雨/, 'brief rain'],
  [/陣雨/, 'showers'],
  [/雷雨/, 'thunderstorms'],
  [/有雨/, 'rain'],
  [/降雨/, 'rain'],
  [/有霧/, 'fog'],
  [/有靄/, 'mist'],
  [/有閃電/, 'lightning'],
  [/有雷/, 'thunder'],
  [/降雪/, 'snow'],
  [/有雪/, 'snow'],
  [/冰霰/, 'sleet'],
];

const MODIFIERS: Array<[RegExp, string]> = [
  [/午後/, 'afternoon'],
  [/局部/, 'local'],
  [/山區/, 'in mountains'],
];

/** '陰短暫陣雨或雷雨' → 'Overcast, brief showers or thunderstorms'；解析失敗回 null */
export function wxToEn(zh: string): string | null {
  let rest = zh.trim();
  if (!rest) return null;

  let sky = '';
  for (const [re, en] of SKY) {
    if (re.test(rest)) {
      sky = en;
      rest = rest.replace(re, '');
      break;
    }
  }

  const mods: string[] = [];
  for (const [re, en] of MODIFIERS) {
    if (re.test(rest)) {
      mods.push(en);
      rest = rest.replace(re, '');
    }
  }

  let rain = '';
  for (const [re, en] of RAIN) {
    if (re.test(rest)) {
      rain = en;
      rest = rest.replace(re, '');
      break;
    }
  }

  // 還剩無法解析的中文 → 放棄翻譯（顯示端回退原文），不產生錯誤英文
  if (rest.trim()) return null;
  if (!sky && !rain) return null;

  const rainPart = rain ? [...mods, rain].join(' ') : '';
  if (sky && rainPart) return `${sky}, ${rainPart}`;
  return sky || rainPart.charAt(0).toUpperCase() + rainPart.slice(1);
}
