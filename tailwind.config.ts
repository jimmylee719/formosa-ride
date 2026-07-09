import type { Config } from 'tailwindcss';

// 顏色語言（v3.0 D2 節，全站統一）：
// 紅=危險/禁止/緊急、橘=注意/警告、黃=提醒、綠=安全/完成、藍=資訊、深灰=禁行、navy=品牌
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#16A34A', // 主色綠（安全/完成/品牌）
        accent: '#EA580C', // 強調橘
        danger: {
          bg: '#FEE2E2',
          text: '#7F1D1D',
          border: '#DC2626',
        },
        warning: {
          bg: '#FEF3C7',
          text: '#78350F',
          border: '#D97706',
        },
        caution: {
          bg: '#FEFCE8',
          text: '#713F12',
          border: '#CA8A04',
        },
        safe: {
          bg: '#DCFCE7',
          text: '#14532D',
          border: '#16A34A',
        },
        info: {
          bg: '#DBEAFE',
          text: '#1E3A8A',
          border: '#3B82F6',
        },
        neutral: {
          bg: '#F1F5F9',
          text: '#334155',
          border: '#94A3B8',
        },
        navy: '#1E293B', // 品牌/標題/夜間橫幅底色
        restricted: '#334155', // 禁行路段深灰
      },
      minHeight: {
        tap: '44px', // Apple HIG 最小點擊區域
      },
      minWidth: {
        tap: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
