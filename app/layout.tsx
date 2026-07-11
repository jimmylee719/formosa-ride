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
    'The ultimate Taiwan round-island guide for cyclists and walkers: official Cycling Route No.1 maps, campsites, water stations, repair shops, weather, and a day-by-day trip planner — built for foreign travellers and local riders circling Taiwan by bike or on foot. | 台灣環島最完整的資訊平台（自行車環島＋徒步環島皆適用）：環島路線地圖、補水站、露營點、維修店、天氣預報、旅程規劃。',
  keywords: [
    'cycling around Taiwan', 'Taiwan bike tour', 'Taiwan cycle route 1',
    'huan dao Taiwan', 'Taiwan bicycle camping', 'Taiwan cycling guide',
    'Taiwan cycling map', 'Taiwan cycling app',
    // 高意圖長尾（規劃/天數/租車）：兩組 9 天情境模擬後補（2026-07-11）
    'Taiwan cycling itinerary', '9 day Taiwan cycling', 'Taiwan cycle route 1 map',
    'how many days to cycle around Taiwan', 'Taiwan bike rental', 'round island Taiwan',
    // 徒步環島（2026-07-11 Jimmy 指示：補給/天氣/住宿/安全資訊對徒步者同樣適用）
    'walking around Taiwan', 'Taiwan walking tour', 'hiking around Taiwan',
    'Taiwan round island on foot', 'Taiwan on foot',
    '腳踏車環島', '自行車環島', '單車環島', '台灣環島路線', '環島一號線',
    '環島露營', '腳踏車補給', '環島規劃', '環島行程', '環島9天', '環島路線推薦',
    '徒步環島', '走路環島', '環島徒步', '徒步環島路線', '環島補給',
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
      'Route maps, a 9-day round-island itinerary, campsites, supply stops, weather and a day-by-day trip planner for cycling or walking around Taiwan — all in one app.',
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
      'Route maps, a 9-day itinerary, campsites, supply stops, weather and a trip planner — one app for cycling or walking around Taiwan.',
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

// JSON-LD 結構化資料（Phase 18B，v11.0 C3）：讓 Google 讀懂這是旅遊工具
// 註：規格中的 offers（USD$10）待 Phase 9A 付款開放後再加入——
//     不對搜尋引擎宣告目前買不到的商品。
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'FormoSA Ride 環島通',
      description:
        'Digital guide for travelling around Taiwan island — by bicycle or on foot: maps, supplies, weather, accommodation and safety info',
      url: SITE_URL,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web, iOS, Android (PWA)',
      featureList: [
        'Cycling Route No.1 Taiwan interactive map',
        'Day-by-day round-island trip planner (share & export)',
        '9 suggested day stages (~105 km each) for a round-island trip',
        'Route difficulty filter by real elevation gain',
        'Real-time danger zone alerts',
        'Sunset/sunrise warnings',
        'Offline map support',
        'POI: campsites, repair shops, convenience stores, lodging',
        'GPS trip recording',
        'Bilingual phrasebook (Chinese/English)',
        'Works for cycling and walking round-island trips',
      ],
    },
    {
      '@type': 'TouristAttraction',
      '@id': `${SITE_URL}/#route`,
      name: 'Taiwan Cycling Route No.1',
      description:
        'The round-island Cycling Route No.1 (about 940 km) — ridden by cyclists and walked by round-island hikers, typically over ~9 days',
      touristType: ['Cyclist', 'Hiker', 'Backpacker', 'Solo Traveller'],
      geo: {
        '@type': 'GeoShape',
        description: 'Circumnavigating Taiwan island by bicycle',
      },
    },
    {
      '@type': 'Organization',
      name: 'Camper Road Taiwan 露途臺灣',
      url: SITE_URL,
      email: 'skadoosh.ai.lab@gmail.com',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'skadoosh.ai.lab@gmail.com',
        availableLanguage: ['Chinese', 'English'],
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 英文為主（2026-07-10 指示）：主要語言標記與 OG locale 一致
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // JSON-LD 為自家常數序列化，無使用者輸入
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <DevSwCleanup />
        {children}
      </body>
    </html>
  );
}
