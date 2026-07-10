// sentry.server.config.ts — Sentry Node.js 端設定（Phase 18A）
// 免費方案每月 5,000 事件：只收錯誤，不開效能追蹤（tracesSampleRate 0）。
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
});
