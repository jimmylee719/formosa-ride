import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DevSwCleanup } from '@/components/ui/DevSwCleanup';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://formosaride.com';

// 全站 SEO（Phase 16，v1.0 §15.3；依 2026-07-10 指示英文為主、繁中為輔）
// 註：spec 的 hreflang /zh /en 路徑不存在（本系統為同頁雙語內嵌），
//     不對搜尋引擎宣告不存在的網址；語言自動偵測於 Phase 18B。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FormoSA Ride — Taiwan Cycling Tour Guide 環島通',
    template: '%s | FormoSA Ride',
  },
  description:
    'The ultimate Taiwan cycling tour guide: official Cycling Route No.1 maps, campsites, water stations, repair shops, weather, and a calorie calculator — built for foreign cyclists and local riders. | 台灣自行車環島最完整的資訊平台：環島路線地圖、補水站、露營點、維修店、天氣預報、卡路里計算。',
  keywords: [
    'cycling around Taiwan', 'Taiwan bike tour', 'Taiwan cycle route 1',
    'huan dao Taiwan', 'Taiwan bicycle camping', 'Taiwan cycling guide',
    'Taiwan cycling map', 'Taiwan cycling app',
    '腳踏車環島', '自行車環島', '台灣環島路線', '環島一號線',
    '環島露營', '腳踏車補給',
  ],
  authors: [{ name: 'Camper Road Taiwan' }],
  creator: 'Camper Road Taiwan',
  publisher: 'Camper Road Taiwan',
  formatDetection: { telephone: false },
  manifest: '/manifest.json', // PWA（Phase 17）
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'FormoSA Ride' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['zh_TW'],
    url: SITE_URL,
    siteName: 'FormoSA Ride 環島通',
    title: 'Taiwan Cycling Tour Guide | FormoSA Ride 環島通',
    description:
      'Route maps, campsites, supply stops, weather and calorie planning for cycling around Taiwan — all in one app.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FormoSA Ride - Taiwan Cycling Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taiwan Cycling Tour Guide | FormoSA Ride 環島通',
    description:
      'Route maps, campsites, supply stops, weather and calorie planning — one app for cycling around Taiwan.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
      <body>
        <DevSwCleanup />
        {children}
      </body>
    </html>
  );
}
