// lib/phrasebook-data.ts — 溝通小卡靜態內容（Phase 13A）
// 依據：v7.0 B2 四大分類 + v11.0 H 節腳踏車零件 6 句（補強 A5 缺口）。
// 純靜態資料，離線可用是本功能的核心價值（v7.0 B4）。

export interface Phrase {
  zh: string;
  en: string;
  /** 日文輔助（2026-07-11 由紀情境模擬：日本旅客佔比高） */
  ja?: string;
  /** 使用提示（如：指著零件給對方看），不屬於句子本身 */
  hint_zh?: string;
  hint_en?: string;
}

export interface PhraseCategory {
  id: string;
  icon: string;
  title_zh: string;
  title_en: string;
  phrases: Phrase[];
}

export const PHRASEBOOK: PhraseCategory[] = [
  {
    id: 'emergency',
    icon: '🆘',
    title_zh: '緊急求助',
    title_en: 'Emergency',
    phrases: [
      { zh: '救命！', ja: '助けて！', en: 'Help!' },
      { zh: '我受傷了', ja: 'けがをしました', en: "I'm injured" },
      { zh: '請幫我叫救護車', ja: '救急車を呼んでください', en: 'Please call an ambulance' },
      { zh: '我的腳踏車壞了', ja: '自転車が壊れました', en: 'My bicycle is broken' },
    ],
  },
  {
    id: 'daily',
    icon: '🍱',
    title_zh: '日常需求',
    title_en: 'Daily Needs',
    phrases: [
      { zh: '請問哪裡有水？', ja: 'お水はどこで手に入りますか？', en: 'Where can I find water?' },
      { zh: '請問可以借廁所嗎？', ja: 'トイレをお借りできますか？', en: 'May I use the restroom?' },
      { zh: '請問附近有住宿嗎？', ja: '近くに宿はありますか？', en: 'Is there accommodation nearby?' },
      { zh: '請問這裡可以紮營嗎？', ja: 'ここでキャンプしてもいいですか？', en: 'Can I camp here?' },
      { zh: '多少錢？', ja: 'いくらですか？', en: 'How much does it cost?' },
    ],
  },
  {
    id: 'bike',
    icon: '🔧',
    title_zh: '腳踏車相關',
    title_en: 'Bicycle',
    phrases: [
      // v7.0 B2 原有 4 句
      { zh: '請問哪裡有腳踏車店？', ja: '自転車屋はどこですか？', en: 'Where is a bike shop?' },
      { zh: '我需要打氣', ja: '空気入れを貸してください', en: 'I need air for my tire' },
      { zh: '鏈條鬆了/斷了', ja: 'チェーンが緩んだ／切れました', en: 'The chain is loose/broken' },
      { zh: '煞車有問題', ja: 'ブレーキの調子が悪いです', en: "There's a problem with the brakes" },
      // v11.0 H 節新增 6 句（零件用語）
      { zh: '後輪爆胎了', ja: '後輪がパンクしました', en: 'My rear tire is flat' },
      { zh: '前輪爆胎了', ja: '前輪がパンクしました', en: 'My front tire is flat' },
      { zh: '鏈條斷掉了', ja: 'チェーンが切れました', en: 'The chain is broken' },
      {
        zh: '這個零件壞了', ja: 'この部品が壊れました',
        en: 'This part is broken',
        hint_zh: '指著零件給對方看',
        hint_en: 'Point at the part',
      },
      { zh: '煞車失靈', ja: 'ブレーキが効きません', en: "My brakes aren't working" },
      { zh: '有修理工具嗎？', ja: '修理工具はありますか？', en: 'Do you have repair tools?' },
    ],
  },
  {
    id: 'directions',
    icon: '🧭',
    title_zh: '交通問路',
    title_en: 'Directions',
    phrases: [
      { zh: '請問往台東怎麼走？', ja: '台東へはどう行けばいいですか？', en: 'How do I get to Taitung?' },
      { zh: '這條路安全嗎？', ja: 'この道は安全ですか？', en: 'Is this road safe?' },
      { zh: '火車站在哪裡？', ja: '駅はどこですか？', en: 'Where is the train station?' },
    ],
  },
];
