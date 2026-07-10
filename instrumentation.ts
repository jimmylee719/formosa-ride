// instrumentation.ts — Sentry 伺服器端掛載（Phase 18A）
// Next.js 15 instrumentation hook：依 runtime 載入對應設定。
import * as Sentry from '@sentry/nextjs';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// App Router 伺服器端錯誤（RSC/route handler）自動回報
export const onRequestError = Sentry.captureRequestError;
