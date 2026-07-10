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
        en: 'Tap the Filter button at the top-left of the map. Pick a big category, or expand it for details.',
        zh: '點地圖左上角的 Filter 按鈕。點大分類快速選，或展開挑細項。',
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
        en: 'Colored dots are accident hotspots from real police data. You can still ride there — just slow down and keep right.',
        zh: '圓點是真實警政事故熱點。不是不能走，是提醒你騎慢一點、靠右一點。',
      },
      {
        en: 'Dark gray dashed lines are roads where bicycles are not allowed.',
        zh: '深灰虛線是自行車禁止進入的路段。',
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
        en: 'Bottom-left of the map. If someone does not understand you, open it, tap a card to enlarge, and show them.',
        zh: '在地圖左下角。對方聽不懂時，打開小卡、點一下放大，直接拿給對方看。',
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
];

export default function GuidePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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
