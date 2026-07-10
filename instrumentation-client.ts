// instrumentation-client.ts — Sentry 瀏覽器端設定（Phase 18A）
// 只收錯誤（免費方案配額 5,000/月）；不開 Replay 與效能追蹤。
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
});

// App Router 路由轉場掛鉤（SDK 要求匯出）
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
