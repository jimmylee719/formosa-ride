'use client';
// app/global-error.tsx — 全域錯誤邊界（Phase 18A）
// App Router 客戶端崩潰的最後防線：回報 Sentry + 給使用者可行動的畫面。
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-TW">
      <body>
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: 48 }} aria-hidden>
            🚴💨
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            Something went wrong 出了一點狀況
          </h1>
          <p style={{ color: '#64748B' }}>
            The error has been reported. Please try again.
            <br />
            錯誤已自動回報，請再試一次。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '10px 24px',
              borderRadius: 12,
              background: '#16A34A',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again 重試
          </button>
        </div>
      </body>
    </html>
  );
}
