// /privacy — 隱私權政策（Phase 16A，v1.0 §14 全文）
// 依現況誠實更新（原文為 v1.0 時代所寫）：
//   Stripe → Lemon Squeezy（v12.0 取代）；聯絡信箱統一 skadoosh.ai.lab@gmail.com；
//   行程記錄／位置分享會上傳軌跡（Phase 11 實況）；本地儲存鍵名對齊實作。
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FooterLinks } from '@/components/ui/FooterLinks';

export const metadata = {
  title: 'Privacy Policy 隱私權政策',
  description:
    'FormoSA Ride privacy policy — what we collect, how we use it, and your rights. 環島通隱私權政策。',
};

const CONTACT = 'skadoosh.ai.lab@gmail.com';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="info-primary mt-6 font-bold">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <article className="rounded-2xl bg-white p-5 text-sm leading-relaxed">
          <h1 className="info-primary text-lg font-bold">
            Privacy Policy 隱私權政策
          </h1>
          <p className="mt-1 text-neutral-text">
            Last updated 最後更新：2026-07-10
          </p>

          <H2>1. About This Policy 關於本政策</H2>
          <p className="mt-1">
            This Privacy Policy describes how FormoSA Ride (the &quot;Platform&quot;,
            &quot;we&quot;, &quot;us&quot;), operated by Camper Road Taiwan, collects, uses,
            and protects your personal information.
          </p>
          <p className="mt-1 text-neutral-text">
            本隱私權政策說明 FormoSA Ride 環島通（以下簡稱「本平台」、「我們」）
            如何收集、使用及保護您的個人資料。本平台由露途臺灣（Camper Road
            Taiwan）運營。聯絡方式 Contact：{CONTACT}
          </p>

          <H2>2. Data We Collect 我們收集的資料</H2>
          <p className="mt-2 font-bold">2.1 You provide 您主動提供：</p>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>電子郵件（提交回饋時選填；未來會員功能上線後註冊需提供）</li>
            <li>
              付款資訊（未來開放購買時由 Lemon Squeezy 代為處理，本平台不儲存信用卡號）
            </li>
            <li>回饋意見內容（改善服務品質）</li>
          </ul>
          <p className="mt-2 font-bold">2.2 Automatically collected 自動收集：</p>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>地理位置（GPS）：僅在您允許時啟用，用於顯示附近地點與旅途記錄</li>
            <li>裝置資訊：除錯與服務優化</li>
            <li>IP 位址：伺服器安全監控（不用於追蹤個人）</li>
          </ul>
          <p className="mt-2 font-bold">
            2.3 Journey recording 行程記錄（請留意）：
          </p>
          <p className="mt-1 text-neutral-text">
            當您主動開啟「旅途模式」時，騎乘軌跡會先儲存在您的裝置，並以匿名裝置識別碼
            同步至我們的資料庫（供多日總結、GPX 匯出使用）；開啟「位置分享」時，
            擁有分享連結的人可即時看到您的位置。您可隨時結束分享；
            如需刪除行程資料請聯繫 {CONTACT}。
            <br />
            When you start Journey Mode, your track is stored locally and synced
            under an anonymous device ID. Live-sharing makes your position visible
            to anyone holding the share link until you stop sharing.
          </p>
          <p className="mt-2 font-bold">2.4 We do NOT 我們不做：</p>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>不追蹤您在其他網站的行為 · No cross-site tracking</li>
            <li>不販售您的任何資料給第三方 · We never sell your data</li>
            <li>不使用第三方追蹤 Cookie · No third-party tracking cookies</li>
          </ul>

          <H2>3. How We Use Your Data 資料使用目的</H2>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>提供服務：路線、地點、天氣、卡路里計算、行程記錄</li>
            <li>服務通知與回饋處理</li>
            <li>匿名分析以改善平台功能</li>
            <li>防止濫用與不當存取</li>
          </ul>

          <H2>4. Local Storage 本地儲存</H2>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>formosa_device_id（localStorage）：匿名裝置識別碼，供行程同步</li>
            <li>formosa_last_trip（localStorage）：多日旅程銜接</li>
            <li>IndexedDB：行程軌跡本地備份、路線離線下載包</li>
            <li>Cache API：PWA 離線快取</li>
          </ul>

          <H2>5. Third-Party Services 第三方服務</H2>
          <ul className="mt-1 list-disc pl-5 text-neutral-text">
            <li>MapTiler Cloud（地圖底圖）— maptiler.com/privacy-policy</li>
            <li>OpenStreetMap（地點資料，ODbL）— openstreetmap.org/copyright</li>
            <li>Supabase（資料庫託管）— supabase.com/privacy</li>
            <li>Vercel（網站託管）— vercel.com/legal/privacy-policy</li>
            <li>Lemon Squeezy（未來付款處理）— lemonsqueezy.com/privacy</li>
            <li>Resend（Email 發送）— resend.com/legal/privacy-policy</li>
            <li>交通部中央氣象署、警政署、觀光署、內政部國土管理署（政府開放資料）</li>
            <li>SunriseSunset.io（日出日落時刻）</li>
          </ul>

          <H2>6. Data Security 資料安全</H2>
          <p className="mt-1 text-neutral-text">
            所有資料傳輸使用 HTTPS/TLS 加密；付款資訊由 Lemon Squeezy 依 PCI DSS
            規範處理，本平台不接觸信用卡資料；定期進行安全審查。
          </p>

          <H2>7. Your Rights 您的權利</H2>
          <p className="mt-1 text-neutral-text">
            依台灣《個人資料保護法》及歐盟 GDPR，您有查詢、更正、刪除（被遺忘權）、
            反對處理與資料可攜等權利。行使權利請聯繫 {CONTACT}，我們將於 30 天內回覆。
            <br />
            Under Taiwan&apos;s PDPA and the GDPR you may request access,
            correction, deletion, objection, or portability of your data —
            contact {CONTACT}; we respond within 30 days.
          </p>

          <H2>8. Location Data 地理位置資料</H2>
          <p className="mt-1 text-neutral-text">
            一般瀏覽時，您的位置僅在裝置端使用（顯示附近地點），不會上傳。
            僅在您開啟「旅途模式」或「位置分享」時，軌跡點才會上傳以提供同步與
            分享功能（見第 2.3 節）。您可隨時在裝置設定撤回位置授權。
          </p>

          <H2>9. Children&apos;s Privacy 兒童隱私</H2>
          <p className="mt-1 text-neutral-text">
            本平台不針對 13 歲以下兒童，也不刻意收集兒童資料。
            若發現有兒童資料被誤收，請聯繫我們立即刪除。
          </p>

          <H2>10. Policy Changes 政策變更</H2>
          <p className="mt-1 text-neutral-text">
            本政策若有重大變更，我們將在平台首頁顯示通知並更新頂部的「最後更新日期」。
            繼續使用本平台即視為您接受更新後的政策。
          </p>

          <H2>11. Contact Us 聯絡我們</H2>
          <p className="mt-1 text-neutral-text">
            露途臺灣 Camper Road Taiwan
            <br />
            桃園市，台灣 Taoyuan City, Taiwan
            <br />
            Email：
            <a href={`mailto:${CONTACT}`} className="underline">
              {CONTACT}
            </a>
          </p>
        </article>
        <FooterLinks />
      </main>
      <BottomNavBar />
    </div>
  );
}
