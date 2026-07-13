// /resources — 政府觀光資源連結（Phase 16A，v5.0 D2 清單照抄）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';

export const metadata = {
  title: 'Round-Island Cycling Guide & Official Resources 環島指南與政府觀光資源',
  description:
    'Taiwan round-island cycling guide — Cycling Route No.1 facts, pre-ride safety checklist, and tips for international cyclists, sourced from the Tourism Administration. 台灣環島指南：環島1號線資訊、行前安全檢查、國際旅客須知，資料來源觀光署。',
};

// 環島指南內容（忠實引用交通部觀光署 taiwanbike.tw，非捏造；每區塊標註來源頁）
// 來源：/travel/country（環島1號線）、/about/disseminate（騎乘安全）、/about/foreign（國際旅客）
const ROUTE_FACTS: Array<{ en: string; zh: string }> = [
  { en: 'Backbone: Provincial Highways Tai-1 + Tai-9', zh: '主軸：省道台1線＋台9線' },
  { en: 'Total length: 960.8 km', zh: '全長：960.8 公里' },
  { en: 'About 9 days for a full loop', zh: '環島一圈約需 9 天' },
  { en: 'Supply stations roughly every 20 km', zh: '沿線每隔約 20 公里設補給站' },
  { en: 'Ride clockwise or counter-clockwise', zh: '可順時針或逆時針騎行' },
  { en: 'Opened 30 Dec 2015', zh: '2015 年 12 月 30 日通車' },
  {
    en: 'Branch lines (-1, -2, -3) link stations & scenic spots into a "grand loop"',
    zh: '環支線（-1／-2／-3）串連車站與景點，可組成「大環島」',
  },
];

const BEFORE_YOU_RIDE: Array<{ en: string; zh: string }> = [
  { en: 'Wear a proper cycling helmet', zh: '配戴專用安全帽' },
  { en: 'Front and rear lights fitted', zh: '裝設自行車前燈與尾燈' },
  { en: 'Tie shoelaces tight; avoid overly long pant legs', zh: '鞋帶綁緊、褲管長度勿過長' },
  { en: 'Carry drinking water', zh: '攜帶飲用水' },
];

const BIKE_CHECK: Array<{ en: string; zh: string }> = [
  { en: 'Frame / body — no visible damage', zh: '自行車外觀有無損壞' },
  { en: 'Brakes — not too tight or too loose', zh: '煞車是否太緊或太鬆' },
  { en: 'Gears shift properly', zh: '變速功能是否正常' },
  { en: 'Saddle height set and secure', zh: '座墊高矮、是否會鬆動' },
  { en: 'Chain seated (no derailment)', zh: '是否有脫鏈情形' },
  { en: 'Tire pressure adequate', zh: '輪胎胎壓是否過高或不足' },
  { en: 'Lights work; reflectors clean and intact', zh: '前後燈功能正常、反光裝置清潔完整' },
];

const FOR_INTERNATIONAL: Array<{ en: string; zh: string }> = [
  {
    en: 'Bikes on planes: rules and fees vary by airline (China Airlines, EVA Air, Cathay Pacific, Starlux) — check each carrier',
    zh: '攜車搭機：尺寸與收費依各航空公司規定不同（華航、長榮、國泰、星宇），請先查各航空公司',
  },
  {
    en: 'Airport transfer from Taoyuan, Songshan, Taichung, Kaohsiung (HSR, coach, taxi, rental/charter)',
    zh: '機場轉運：桃園、松山、台中、高雄（高鐵、客運、計程車、租／包車）',
  },
  {
    en: 'Rentals: scenic-spot stations, professional shops (many with English sites & support), guided tours, or YouBike public bikes',
    zh: '租車：景點租借站、專業車店（多有英文網站與後勤）、領騎導覽、或 YouBike 公共自行車',
  },
];

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

        {/* ── 環島指南（引用觀光署 taiwanbike.tw，忠實整理）──────────── */}
        <section className="mt-6">
          <h2 className="info-primary font-bold">
            🚴 Round-Island Cycling Guide · 環島指南
          </h2>
          <p className="info-secondary mt-1 text-neutral-text">
            Key facts and safety essentials, sourced from the Tourism
            Administration. 重點資訊與安全須知，資料來源交通部觀光署。
          </p>

          {/* 環島1號線 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="info-primary font-bold">
              🛤️ Cycling Route No.1 · 環島1號線
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {ROUTE_FACTS.map((f) => (
                <li key={f.zh} className="info-secondary flex gap-2">
                  <span aria-hidden>•</span>
                  <span>
                    {f.en}
                    <span className="block text-neutral-text">{f.zh}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 行前準備 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="info-primary font-bold">
              🎒 Before you ride · 行前準備
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {BEFORE_YOU_RIDE.map((f) => (
                <li key={f.zh} className="info-secondary flex gap-2">
                  <span aria-hidden>✅</span>
                  <span>
                    {f.en}
                    <span className="block text-neutral-text">{f.zh}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 騎前檢查 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="info-primary font-bold">
              🔧 Pre-ride bike check · 騎前檢查
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {BIKE_CHECK.map((f) => (
                <li key={f.zh} className="info-secondary flex gap-2">
                  <span aria-hidden>🔎</span>
                  <span>
                    {f.en}
                    <span className="block text-neutral-text">{f.zh}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 國際旅客 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="info-primary font-bold">
              🌏 For international cyclists · 國際旅客
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {FOR_INTERNATIONAL.map((f) => (
                <li key={f.zh} className="info-secondary flex gap-2">
                  <span aria-hidden>•</span>
                  <span>
                    {f.en}
                    <span className="block text-neutral-text">{f.zh}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 來源標註（誠實引用，非捏造） */}
          <a
            href="https://taiwanbike.tw/travel/country/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-2xl bg-neutral-bg p-3 text-center"
          >
            <p className="info-secondary text-neutral-text">
              Source · 資料來源：交通部觀光署 Taiwan Bike
              <span className="block text-sm text-info-text underline">
                taiwanbike.tw
              </span>
            </p>
          </a>
        </section>

        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
