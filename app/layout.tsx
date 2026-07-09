import type { Metadata, Viewport } from 'next';
import './globals.css';

// 暫時性最小 metadata；完整 SEO（關鍵字、OG、JSON-LD、hreflang）於 Phase 16 / 18B 實作
export const metadata: Metadata = {
  title: {
    default: 'FormoSA Ride 環島通 — Taiwan Bicycle Tour Guide',
    template: '%s | FormoSA Ride 環島通',
  },
  description:
    '台灣自行車環島完整資訊平台 | The complete digital guide for cycling around Taiwan.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16A34A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
