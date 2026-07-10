// next.config.ts（Next 15 起支援 TS 設定檔，符合規格原始要求）
import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// PWA（Phase 17，v7.0 G1）：dev 停用（Serwist 需 webpack build）
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: false, // 避免表單填寫到一半被強制重整（v7.0 G1）
  disable: process.env.NODE_ENV === 'development' || process.env.DISABLE_SERWIST === '1',
});

// 安全性 HTTP Headers（v7.0 F5 節）
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // production 驗證可用獨立輸出目錄（NEXT_DIST_DIR=.next-prod），
  // 避免 dev server 與 build 共用 .next 互相覆寫（本機實測多次踩雷）
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
