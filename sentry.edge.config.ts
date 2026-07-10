// sentry.edge.config.ts — Sentry Edge Runtime 設定（middleware 用，Phase 18A）
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
});
