// next.config.ts（Next 15 起支援 TS 設定檔，符合規格原始要求）
// Serwist PWA 包裝將於 Phase 17 加入此檔。
import type { NextConfig } from 'next';

// 安全性 HTTP Headers（v7.0 F5 節）
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
