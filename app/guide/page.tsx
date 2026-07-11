// /guide — 使用說明（Phase 16C，v10.0 A 節）
// 依 2026-07-10 Jimmy 指示：直接的功能說明，不採用「旅程故事」敘事。
// 寫作原則維持 v10 A1：句子短、無術語、大 emoji 視覺錨點；英文為主中文為輔。
// 純靜態頁（同 /phrasebook 做法），Phase 17 Serwist 預先快取後離線可讀。
import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';

export const metadata = {
  title: 'How to Use 使用說明',
  description:
    'How to use FormoSA Ride: map, filters, safety alerts, journey mode, offline packs, SOS and more. 環島通使用說明。',
};

interface Section {
  icon: string;
  title_en: string;
  title_zh: string;
  body: Array<{ en: string; zh: string }>;
}

const SECTIONS: Section[] = [
  {
    icon: '🗺️',
    title_en: 'The Map',
    title_zh: '地圖',
    body: [
      {
        en: 'The blue dot is you. Pinch with two fingers to zoom, just like viewing photos.',
        zh: '藍色的點就是你。兩指縮放地圖，跟看照片一樣。',
      },
      {
        en: 'Icons are places: 🏪 convenience store, 💧 drinking water, 🚻 toilet, 🔧 bike shop, 🏥 hospital, 🏨 lodging.',
        zh: '圖示代表地點：🏪 便利商店、💧 飲水、🚻 廁所、🔧 修車店、🏥 醫院、🏨 住宿。',
      },
      {
        en: 'Tap an icon to see address, phone and details. Zoom in to see more places.',
        zh: '點一下圖示看地址、電話與細節。地圖拉近會顯示更多地點。',
      },
    ],
  },
  {
    icon: '🔍',
    title_en: 'Filter Places',
    title_zh: '篩選地點',
    body: [
      {
        en: 'Tap "🔍 Supplies · Stay · Sights" at the top-left of the map. Pick a big category, or expand it for details.',
        zh: '點地圖左上角的「🔍 找補給・住宿・景點」。點大分類快速選，或展開挑細項。',
      },
      {
        en: 'When you select Accommodation, extra options appear: hotel, homestay, hostel and more.',
        zh: '選了「住宿」會多出細項：旅館、民宿、青年旅舍等。',
      },
    ],
  },
  {
    icon: '🚦',
    title_en: 'Safety Colors',
    title_zh: '安全顏色',
    body: [
      {
        en: 'Red = extra dangerous. Orange = be careful. Yellow = stay alert.',
        zh: '🔴 紅色＝比較危險。🟠 橘色＝要注意。🟡 黃色＝保持警覺。',
      },
      {
        en: 'Accident hotspots (real police data) are not drawn on the map. Instead, Journey Mode warns you automatically when you get close to one.',
        zh: '事故熱點（真實警政資料）不畫在地圖上。改為旅途模式中接近時自動跳出警示。',
      },
      {
        en: 'Dark gray dashed lines are roads where bicycles are not allowed. Remember: every national freeway in Taiwan bans bicycles.',
        zh: '深灰虛線是自行車禁止進入的路段。記住：全台所有國道都禁行自行車。',
      },
    ],
  },
  {
    icon: '🌅',
    title_en: 'Sunset Timer',
    title_zh: '日落提醒',
    body: [
      {
        en: 'The clock at the top shows when it gets dark. Orange or red means: find a place to stay soon.',
        zh: '畫面上方的小時鐘告訴你多久天黑。變橘或紅，代表該找住的地方了。',
      },
      {
        en: 'At night the map turns dark and shows unlit road warnings. Night riding on mountain roads is dangerous.',
        zh: '天黑後地圖變深色，並顯示無照明路段警示。夜騎山路真的很危險。',
      },
    ],
  },
  // 旅程規劃（Phase 19A）
  {
    icon: '🗓️',
    title_en: 'Trip Planner',
    title_zh: '旅程規劃',
    body: [
      {
        en: 'Tap "Plan" in the bottom bar. Create up to 3 trips (e.g. coast vs. mountain) and plan day by day: departure time, stops, lodging.',
        zh: '點下方「Plan 規劃」。最多建立 3 個行程（例如海線、山線），逐日排：出發時間、停靠點、住宿。',
      },
      {
        en: 'Tap ⭐ on any place card on the map to save it, then add saved places to your plan quickly. Not in our database? Enter your own place with a Google Maps link.',
        zh: '在地圖上點任何地點卡的 ⭐ 收藏，規劃時快速加入。資料庫沒有的地點，可自訂輸入並附 Google Maps 連結。',
      },
    ],
  },
  {
    icon: '🚴',
    title_en: 'Journey Mode',
    title_zh: '旅途模式',
    body: [
      {
        en: 'Tap "Start Journey" on the map. The app records distance, speed, time and calories.',
        zh: '點地圖上的「Start Journey」。系統記錄距離、速度、時間與卡路里。',
      },
      {
        en: 'Share: send a link so family can watch your live location. Mark: save a spot you like.',
        zh: 'Share 分享：給家人一條連結即時看你位置。Mark 標記：記下喜歡的地點。',
      },
      {
        en: 'Tap "End Day" each evening. Multi-day trips continue tomorrow — the app will ask.',
        zh: '每晚點「End Day 結束」。多日旅程隔天可續接，系統會問你。',
      },
      {
        en: 'After the trip: see your summary, download a share card, or export a GPX file.',
        zh: '旅程結束後：看總結報告、下載分享卡，或匯出 GPX 檔。',
      },
    ],
  },
  {
    icon: '📦',
    title_en: 'Offline Packs',
    title_zh: '離線下載包',
    body: [
      {
        en: 'Before mountain sections, open a route page and tap "Download". Places along the route stay available without signal.',
        zh: '進山區前，到路線頁點「Download 下載離線包」。沒訊號也查得到沿線地點。',
      },
    ],
  },
  {
    icon: '💬',
    title_en: 'Phrasebook',
    title_zh: '溝通小卡',
    body: [
      {
        en: 'Inside the SOS page (hold the SOS button 2 seconds). If someone does not understand you, open a card, tap to enlarge, and show them.',
        zh: '在 SOS 頁面裡（長按 SOS 按鈕 2 秒）。對方聽不懂時，打開小卡、點一下放大，直接拿給對方看。',
      },
      {
        en: 'Tap 🔊 to play the Chinese audio.',
        zh: '點 🔊 可播放中文發音。',
      },
    ],
  },
  {
    icon: '🆘',
    title_en: 'Emergency (SOS)',
    title_zh: '緊急狀況',
    body: [
      {
        en: 'Press and hold the red SOS button (bottom bar) for 2 seconds.',
        zh: '長按下方紅色 SOS 按鈕 2 秒。',
      },
      {
        en: 'Call 119 (ambulance) or 110 (police) with one tap. The page also shows your location to read out.',
        zh: '一鍵撥 119 救護車或 110 報警。頁面會顯示你的位置，可直接唸給對方聽。',
      },
    ],
  },
  {
    icon: '🖨️',
    title_en: 'Paper Backup Card',
    title_zh: '行前備用卡',
    body: [
      {
        en: 'On any route page, tap "Pre-trip backup card" and print it. If your phone dies, paper still works.',
        zh: '在路線頁點「行前備用卡」並列印。手機沒電時，紙本依然有效。',
      },
    ],
  },
  // 徒步環島（2026-07-11）：補給/天氣/住宿/安全/溝通小卡對徒步者同樣適用
  {
    icon: '🚶',
    title_en: 'Walking around Taiwan?',
    title_zh: '徒步環島？',
    body: [
      {
        en: 'This app works for round-island walkers too. Supplies, water, toilets, lodging, weather, sunset alerts, the phrasebook and SOS are all just as useful on foot.',
        zh: '這個 App 對徒步環島同樣好用。補給、飲水、廁所、住宿、天氣、日落提醒、溝通小卡和 SOS，走路環島一樣用得上。',
      },
      {
        en: 'Journey Mode records walking trips the same way — distance, time and daily summaries.',
        zh: '旅途模式一樣能記錄徒步旅程——距離、時間與每日總結。',
      },
    ],
  },
];

// 常見問題（2026-07-11 墨西哥/菲律賓 9 天情境模擬）：
// 回答首次來台者實際會 Google 的問題——同時是新手上手，也是高意圖長尾 SEO 內容。
const FAQ: Array<{ q_en: string; q_zh: string; a_en: string; a_zh: string }> = [
  {
    q_en: 'How many days does it take to cycle around Taiwan?',
    q_zh: '騎腳踏車環島要幾天？',
    a_en: 'Most riders circle Taiwan on Cycling Route No.1 (about 940 km) in around 9 days, averaging ~105 km a day. This app gives you 9 ready-made day stages you can drop straight into a plan. Walking round-island takes much longer — usually 20–30 days.',
    a_zh: '多數人沿「環島1號線」（約 940 公里）約 9 天完成，平均一天約 105 公里。系統提供 9 個現成日段，可直接排進行程。徒步環島則久得多，通常 20–30 天。',
  },
  {
    q_en: 'Which direction should I ride, and where do I start?',
    q_zh: '該順時針還逆時針？從哪裡出發？',
    a_en: 'Counter-clockwise is the most popular direction (you ride on the side nearer the coast). Many start and finish in Taipei — our 9 suggested day stages are laid out that way, but you can start anywhere.',
    a_zh: '逆時針最多人選（靠海側騎乘）。很多人從台北出發並繞回台北——系統的 9 個建議日段就是這樣排的，但你從哪裡開始都可以。',
  },
  {
    q_en: 'Is cycling around Taiwan safe? Do I need experience?',
    q_zh: '環島安全嗎？需要很有經驗嗎？',
    a_en: 'Route No.1 mostly follows well-supplied roads — convenience stores are everywhere. Use the difficulty filter on the Routes page to pick flatter stages and avoid mountains. The app also warns you near accident hotspots and before sunset. Avoid night riding on mountain roads.',
    a_zh: '環島1號線大多沿補給充足的道路，便利商店到處都是。用路線頁的難度篩選挑平緩路段、避開山區。系統也會在接近事故熱點與日落前提醒你。避免夜騎山路。',
  },
  {
    q_en: 'Where do I sleep along the way?',
    q_zh: '沿途住哪裡？',
    a_en: 'Hotels, homestays, hostels and campgrounds are all on the map — filter by lodging type. Add the ones you like to your daily plan so each day has a place to stay.',
    a_zh: '旅館、民宿、青年旅舍與露營區都在地圖上——可依住宿類型篩選。把喜歡的加進當日行程，每天都有落腳處。',
  },
  {
    q_en: 'Do I need to speak Chinese?',
    q_zh: '需要會講中文嗎？',
    a_en: 'No. The app is English-first with Chinese alongside. If someone cannot understand you, open the bilingual phrasebook (inside the SOS page), tap to enlarge a card, and show it.',
    a_zh: '不用。介面英文為主、中文為輔。對方聽不懂時，打開雙語溝通小卡（在 SOS 頁裡），點一下放大直接給對方看。',
  },
  {
    q_en: 'Can I do a round-island trip on foot instead of by bike?',
    q_zh: '可以徒步環島而不是騎車嗎？',
    a_en: 'Yes. Supplies, water, toilets, lodging, weather, sunset alerts, the phrasebook and SOS all work the same on foot, and Journey Mode records walking trips too.',
    a_zh: '可以。補給、飲水、廁所、住宿、天氣、日落提醒、溝通小卡與 SOS 徒步一樣適用，旅途模式也能記錄步行旅程。',
  },
  {
    q_en: 'How do I plan my whole trip in the app?',
    q_zh: '怎麼在系統裡規劃整趟行程？',
    a_en: 'Open "Plan" in the bottom bar, create a trip, and add a day for each stage. For each day pick a route (or one of the 9 day stages), set your departure time and stops, then share the link or export a PDF for your group.',
    a_zh: '點下方「Plan 規劃」，建立行程，逐日新增。每天挑一條路線（或 9 個日段之一），設出發時間與停靠點，再把連結分享給同伴或匯出 PDF。',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q_en,
    acceptedAnswer: { '@type': 'Answer', text: f.a_en },
  })),
};

export default function GuidePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary font-bold">❓ How to Use · 使用說明</h1>

        {SECTIONS.map((s) => (
          <section key={s.title_en} className="mt-3 rounded-2xl bg-white p-4">
            <h2 className="info-primary font-bold">
              <span className="mr-2 text-2xl" aria-hidden>
                {s.icon}
              </span>
              {s.title_en} {s.title_zh}
            </h2>
            {s.body.map((b) => (
              <div key={b.en} className="mt-2">
                <p className="info-secondary">{b.en}</p>
                <p className="text-sm text-neutral-text">{b.zh}</p>
              </div>
            ))}
          </section>
        ))}

        {/* 常見問題（首次環島者最常 Google 的問題） */}
        <section className="mt-4">
          <h2 className="info-primary font-bold">
            <span className="mr-2 text-2xl" aria-hidden>
              🙋
            </span>
            FAQ · 常見問題
          </h2>
          {FAQ.map((f) => (
            <div key={f.q_en} className="mt-3 rounded-2xl bg-white p-4">
              <h3 className="info-secondary font-bold">{f.q_en}</h3>
              <p className="text-sm font-bold text-neutral-text">{f.q_zh}</p>
              <p className="info-secondary mt-2">{f.a_en}</p>
              <p className="mt-1 text-sm text-neutral-text">{f.a_zh}</p>
            </div>
          ))}
        </section>

        <p className="info-secondary mt-4 text-center text-neutral-text">
          Still have questions? Tell us via{' '}
          <Link href="/feedback" className="underline">
            Feedback
          </Link>{' '}
          — we reply as soon as we can!
          <br />
          還有問題嗎？歡迎透過「回饋意見」告訴我們，我們會盡快回覆你！
        </p>
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
