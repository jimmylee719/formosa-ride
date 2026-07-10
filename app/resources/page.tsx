// /resources — 政府觀光資源連結（Phase 16A，v5.0 D2 清單照抄）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';

export const metadata = {
  title: 'Official Government Resources 政府觀光資源',
  description:
    'Official Taiwan government tourism and cycling resources. 官方可信賴的政府觀光資訊連結。',
};

// v5.0 D2 連結清單（官方來源，同時滿足資料授權引用要求）
const RESOURCES = [
  {
    icon: '🏛️',
    name_en: 'Tourism Administration, MOTC',
    name_zh: '交通部觀光署',
    url: 'https://admin.taiwan.net.tw',
    desc_en: 'Official Taiwan tourism portal',
    desc_zh: '台灣官方觀光入口網站',
  },
  {
    icon: '🚴',
    name_en: 'Taiwan Bike (National Cycling Network)',
    name_zh: '臺灣騎跡（國家自行車道路網）',
    url: 'https://taiwanbike.tw',
    desc_en: 'Official round-island cycling route system',
    desc_zh: '環島自行車路線官方查詢系統',
  },
  {
    icon: '🌤️',
    name_en: 'Central Weather Administration',
    name_zh: '交通部中央氣象署',
    url: 'https://www.cwa.gov.tw',
    desc_en: 'Official weather and typhoon warnings',
    desc_zh: '台灣官方天氣與颱風警報',
  },
  {
    icon: '📊',
    name_en: 'Government Open Data Platform',
    name_zh: '政府資料開放平台',
    url: 'https://data.gov.tw',
    desc_en: 'Source of route and POI data used by this platform',
    desc_zh: '本系統路線與景點資料來源',
  },
  {
    icon: '🏕️',
    name_en: 'Taiwan Forest Recreation',
    name_zh: '全國登山步道資訊網',
    url: 'https://recreation.forest.gov.tw',
    desc_en: 'Legal campsites and trail information',
    desc_zh: '合法露營區與步道資訊',
  },
] as const;

export default function ResourcesPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary font-bold">
          🏛️ Official Government Resources · 政府觀光資源
        </h1>
        <p className="info-secondary mt-1 text-neutral-text">
          Trusted official sources for planning your trip.
          官方可信賴的觀光資訊連結。
        </p>

        <ul className="mt-3 flex flex-col gap-3">
          {RESOURCES.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl bg-white p-4 shadow-sm"
              >
                <p className="info-primary font-bold">
                  {r.icon} {r.name_en}
                </p>
                <p className="info-secondary text-neutral-text">{r.name_zh}</p>
                <p className="mt-1 text-sm text-info-text underline">
                  {r.url.replace('https://', '')}
                </p>
                <p className="mt-1 text-sm text-neutral-text">
                  {r.desc_en} · {r.desc_zh}
                </p>
              </a>
            </li>
          ))}
          <li className="rounded-2xl bg-safe-bg p-4">
            <p className="info-primary font-bold text-safe-text">
              ☎️ 24hr Tourist Hotline 旅遊諮詢熱線
            </p>
            <a href="tel:0800011765" className="alert-warning block text-safe-text underline">
              0800-011-765
            </a>
            <p className="mt-1 text-sm text-safe-text">
              Toll-free, 24hr, CN/EN/JP · 免付費，24 小時中英日語服務
            </p>
          </li>
        </ul>
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
