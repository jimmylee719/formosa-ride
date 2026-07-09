# CLAUDE.md — FormoSA Ride 環島通
# Claude Code 專案作業協定（整合 Genesis Protocol）

> 本檔案在每次 Claude Code 啟動時自動讀取。
> 適用人員：Jimmy（開發者兼管理員），合夥人：Ian
> 更新日期：2025年

---

## 0. 三條不可違反的鐵則（先讀，永遠有效）

1. **不捏造。** 來源、技術規格、API 文件、版本號、套件名稱——查不到就說「需查證」，絕不生成看起來像真的但實則不存在的資料。技術類內容尤其嚴格：套件名打錯、API 不存在、SQL 語法錯誤都算捏造。
2. **後版本取代前版本。** 本專案有 12 份版本化規格文件（v01~v12），永遠以版本號最高、或明確標示「取代」字樣的規格為準。有疑問時停下來問 Jimmy，不要自行猜測。
3. **事實與推論分開標示。** 有文件依據的是「事實」，其餘標為「推論／假設」。不得把猜測包裝成確定結論。

---

## 1. 專案身份

**系統名稱：** FormoSA Ride 環島通
**產品定位：** 台灣自行車環島旅客完整資訊平台（手機優先 PWA，電腦版自適應）
**商業模式：** SaaS 買斷制 — USD$10 一次付費，永久使用，**完全無訂閱方案**
**試用機制：** 反向試用（Reverse Trial）— 註冊即享 48 小時完整 Pro 功能，到期自動降為免費版
**目標客群：** 全球外籍旅客（含新加坡、德國、荷蘭、以色列、日韓等）+ 台灣本地騎士
**管理員信箱：** skadoosh.ai.lab@gmail.com
**規格文件位置：** `specs/` 資料夾，共 13 份文件

---

## 2. 最終技術棧（不可偏離，任何例外需 Jimmy 確認）

```
框架：        Next.js 14（App Router）+ TypeScript strict mode
地圖引擎：    MapLibre GL JS（開源，非 Mapbox）
地圖底圖：    MapTiler Cloud（免費方案）
底圖管理：    lib/map-style.ts（統一抽象層，2個環境變數控制，不寫死 URL）
POI 資料：    OpenStreetMap Overpass API（免費，無需 API Key）
資料庫：      Supabase + PostGIS（PostgreSQL）
PWA：         Serwist（@serwist/next）—— next-pwa 已停止維護3年，禁止使用
天氣：        交通部中央氣象署 Open Data API
日出日落：    SunriseSunset.io（免費，無需 API Key）
付款：        Lemon Squeezy（台灣直接收款，2024年被Stripe收購）
Email：       Resend.com（免費方案每天100封）
部署：        Vercel
錯誤監控：    Sentry（免費方案每月5,000事件）
速率限制：    @upstash/ratelimit
```

---

## 3. 版本覆蓋規則（最重要，必須完整遵守）

specs/ 資料夾的文件是迭代版本，後版本取代前版本中同一功能的設計：

| 功能 | 不要做（舊版） | 必須採用（最終版） | 出處 |
|---|---|---|---|
| 地圖引擎 | Mapbox GL JS | MapLibre GL JS | v01 已更正 |
| 地圖底圖 URL | 寫死在各元件中 | lib/map-style.ts 統一抽象層 | v08 |
| POI 資料來源 | Google Places API | OSM Overpass API | v01 已更正 |
| PWA 套件 | next-pwa | @serwist/next（Serwist） | v07 |
| 登入方式 | Magic Link / 訪客模式 / Google/Facebook/LINE OAuth | 強制登入 + Email/密碼註冊登入（無任何第三方登入） | **2026-07-09 Jimmy 指示（取代 v06 OAuth）** |
| 付款供應商 | Stripe | Lemon Squeezy | **v12（最新）** |
| 付款環境變數 | STRIPE_* 系列 | LEMONSQUEEZY_* + PAYMENT_ENABLED | **v12（最新）** |
| Webhook 事件 | checkout.session.completed | order_created / order_refunded | **v12（最新）** |
| DB 資料表 | processed_stripe_events | processed_payment_events | **v12（最新）** |
| DB 欄位 | stripe_payment_id | external_order_id | **v12（最新）** |
| 付款開關 | STRIPE_ENABLED | PAYMENT_ENABLED（部署初期=false） | **v12（最新）** |
| 付費方案 | USD$10 買斷 + NT$250 年費 | 僅 USD$10 一次買斷，無訂閱 | v06 |
| Session 心跳 | 5分鐘無心跳即判離線 | 30分鐘容許時間 + 同裝置重連恢復 | v10 |
| POI 篩選器 | 17種類型平鋪 | 5大分類漸進式展開 | v10 |
| 提醒橫幅 | 多個同時顯示 | 單一優先順序佇列 | v10 |
| 退款方式 | Stripe API 自動發起 | Lemon Squeezy 後台手動 + Webhook 連動 | v12 |

**判斷規則：** 同一功能出現在多份文件中，以版本號最高者為準。有疑問停下來問，不自行猜測。

---

## 4. 建置前必做（每次啟動後第一件事）

**開始寫任何 app/ 程式碼之前，先輸出 `MASTER_BUILD_PLAN.md`。**

此文件需包含：
1. 整合 specs/ 所有文件後，你對系統架構的理解（300字）
2. 版本覆蓋規則確認清單（確認你知道哪些舊設計不做）
3. 52個 Phase 的完整執行順序，每個 Phase 標記：預估工時、主要異動檔案、測試方式
4. 需 Jimmy 先準備好的外部 API Key 清單
5. 任何你在文件中發現的邏輯矛盾或疑問

**等 Jimmy 回覆「確認，開始建置」才開始執行 Phase 0A。**

---

## 5. 建置工作流程（Genesis Protocol PDCA 變體）

每個 Phase 完成後，按順序執行：

```
A. 界定（Define）
   覆述這個 Phase 的目標、成功標準、會動到的檔案。
   把隱含假設外顯，只在「不問就無法動工」時問一個問題。

B. 執行（Do）
   逐步推進，每步產出最小可驗證增量，不一次傾倒未驗證的程式碼。

C. 驗證（Check）
   對照 specs/ 文件中這個 Phase 的測試項目逐一確認。
   程式：實際執行，測邊界條件。
   資料庫：SQL 能執行，資料結構符合 schema。
   API：實際打一次確認回應格式正確。

D. 確認（Act）
   輸出本 Phase 完成摘要（3-5行），列出通過的測試項目。
   明確問：「Phase N 已完成，是否繼續 Phase N+1？」
   等 Jimmy 回覆「繼續」才往下做。
```

**每完成5個 Phase，主動輸出進度總結：**
「目前已完成 Phase X-Y，系統現在可以做到：[用使用者角度描述]，下一個里程碑是：[說明]」

---

## 6. 安全敏感 Phase 的額外自我核查

涉及付款、登入、退費、管理員帳號的 Phase 完成後，額外逐項確認：

```
□ 是否有任何 Secret Key / API Key / 密碼出現在前端程式碼？
□ .env.local 是否在 .gitignore 中（確認不會被提交）？
□ Lemon Squeezy Webhook 是否驗證了 x-signature header？
□ 付款冪等性：processed_payment_events 表是否防止重複處理？
□ /admin 路徑是否完全不出現在前台任何 <a href>、sitemap、robots.txt allow 中？
□ 管理員帳號初始化腳本（seed-admin.ts）執行後是否已刪除？
□ 錯誤訊息是否洩漏系統內部資訊（stack trace、DB 結構等）？
□ 所有使用者輸入是否有後端驗證（不只靠前端）？
```

---

## 7. 環境變數清單（建置時的最終版本）

```bash
# 地圖（MapLibre + MapTiler）
NEXT_PUBLIC_MAP_PROVIDER_BASE_URL=https://api.maptiler.com
NEXT_PUBLIC_MAP_PROVIDER_KEY=                    # maptiler.com/cloud 申請，免費

# 資料庫（Supabase）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=                   # 前端用，可公開
SUPABASE_SERVICE_ROLE_KEY=                       # 僅後端用，絕不出現在前端

# 天氣（中央氣象署）
CWA_API_KEY=                                     # opendata.cwa.gov.tw 申請，免費

# 付款（Lemon Squeezy，v12.0）
PAYMENT_ENABLED=false                            # 部署初期設 false，接通金流後改 true
LEMONSQUEEZY_API_KEY=                            # 網站上線後填入
LEMONSQUEEZY_STORE_ID=                           # 網站上線後填入
LEMONSQUEEZY_PRODUCT_ID=                         # 網站上線後填入
LEMONSQUEEZY_WEBHOOK_SECRET=                     # 網站上線後填入

# Email（Resend.com）
RESEND_API_KEY=                                  # resend.com，免費方案每天100封

# 後台管理
ADMIN_JWT_SECRET=                                # 自訂強密碼，管理員 session 簽章

# Cron 排程
CRON_SECRET=                                     # 自訂強密碼，驗證 Vercel Cron 請求

# 錯誤監控（Sentry）
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# 速率限制（Upstash）
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 部署
NEXT_PUBLIC_SITE_URL=                            # 正式網域，例如 https://formosaride.com

# ── 以下已廢棄，不使用 ──────────────────────────────────────
# STRIPE_SECRET_KEY            → 已由 LEMONSQUEEZY_API_KEY 取代
# STRIPE_WEBHOOK_SECRET        → 已由 LEMONSQUEEZY_WEBHOOK_SECRET 取代
# STRIPE_PRICE_LIFETIME_USD    → 已由 LEMONSQUEEZY_PRODUCT_ID 取代
# NEXT_PUBLIC_MAPTILER_KEY     → 已由 NEXT_PUBLIC_MAP_PROVIDER_KEY 取代
```

---

## 8. 程式碼品質標準

```typescript
// TypeScript 設定（tsconfig.json 必須包含）
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}

// 禁止：
const data: any = ...        // 不允許 any 型別
import withPWA from 'next-pwa'  // 禁用，改用 Serwist
style: `https://api.maptiler.com/...`  // 禁止寫死，改用 getMapStyleUrl()
```

**手機 UI 最低標準：**
- 所有可點擊元件：最小 44×44px（符合 Apple HIG 規範）
- 重要警示文字：不小於 22px
- 所有面向使用者的文字：必須同時提供繁體中文與英文版本

---

## 9. 刻意不做的設計（勿「幫忙補齊」）

以下是評估後決定不做的功能，不是遺漏，看到這些情境不要自行實作：

| 不做的功能 | 理由 |
|---|---|
| 危險路段/夜間路段的 Excel 後台上傳介面 | 一年更新不到兩次，做了反而增加維護負擔 |
| Pro 會員降級為免費的 API 或按鈕 | 系統中完全不存在降級邏輯，唯一路徑是退款流程 |
| 可疑多帳號自動封鎖 | 避免誤判家庭共用裝置，僅顯示供人工複查 |
| 地圖多供應商自動容錯切換 | 過度設計，換供應商只需改環境變數即可 |
| 即時導航（turn-by-turn） | 系統只提供資訊參考，使用者自行決定路線 |
| Stripe 任何整合 | 已由 Lemon Squeezy 完全取代（v12.0） |

---

## 10. 兩階段付款部署說明

Lemon Squeezy 申請帳號時需要可正常訪問的網站 URL，因此：

**第一階段（現在建置時）：**
- `PAYMENT_ENABLED=false`
- 用戶點升級按鈕看到「付款功能即將開放」提示
- 所有其他功能（地圖、試用、帳號、路線）正常運作

**第二階段（網站上線後）：**
- 前往 lemonsqueezy.com 申請帳號，填入正式網址
- 建立商品、設定 Webhook、連結 PayPal
- 填入四個 LEMONSQUEEZY_* 環境變數
- 將 `PAYMENT_ENABLED` 改為 `true`，重新部署

---

## 11. 完整 Phase 清單（52個，依序執行）

```
Phase 0A  後台管理員帳號安全初始化（最優先，任何建置前執行）
Phase 0   環境準備
Phase 1   專案初始化
Phase 2   資料庫設計（所有資料表、RLS、SQL函數）
Phase 3   MapLibre 地圖建設
Phase 3A  地圖供應商抽象層（lib/map-style.ts，與Phase 3同步）
Phase 4   POI 顯示系統
Phase 4A  社群POI驗證機制
Phase 4B  POI篩選器分類簡化（5大分類漸進式展開）
Phase 5   路線系統
Phase 6   海拔剖面與卡路里計算
Phase 7   天氣系統（交通部中央氣象署）
Phase 7B  夜間騎行警示
Phase 7C  逆風提醒（純函數）
Phase 8   道路安全警示系統
Phase 8C  通知優先順序系統（單一橫幅佇列）
Phase 9   強制登入（Email+密碼，無第三方登入）+ 防濫用
Phase 9A  Pro升級付款（Lemon Squeezy，兩階段部署）
Phase 9B  試用到期排程（Vercel Cron，每小時）
Phase 9C  單裝置登入限制（UNIQUE INDEX + 踢出機制）
Phase 9D  滑動式合約確認機制（捲到底+勾選+後端驗證）
Phase 9E  山區斷訊session修正（30分鐘容許 + 同裝置恢復）
Phase 10  退費機制（48h退款，唯一合法降級路徑）
Phase 11  行程記錄（IndexedDB本地優先 + Supabase同步）
Phase 11A 即時位置分享（Supabase Realtime + 唯讀公開連結）
Phase 11B 路線離線下載包（IndexedDB預先下載）
Phase 11C 多日旅程總結報告（SQL彙整，不新增追蹤邏輯）
Phase 11D 行程記錄匯出GPX（trip_points → GPX 1.1格式）
Phase 12  SOS緊急資訊（119/110/旅遊熱線，長按2秒保護）
Phase 13  回饋意見功能
Phase 13A 雙語溝通小卡（/phrasebook，Web Speech API，離線可用）
Phase 14  後台管理系統（/admin，完全隔離前台）
Phase 14A 後台Excel批次上傳（POI/路線/修正三種範本）
Phase 14B 後台顧客管理（獨立管理員帳號 + 單向升級）
Phase 14C 後台安全複查 + 匯入紀錄
Phase 14D 後台偵錯通知系統（⚠️警示橫幅）
Phase 15  資料匯入（Overpass API + 政府開放資料）
Phase 15A 政府路線資料整合（4個機關）
Phase 15B 住宿類型細分（accommodation_subtype欄位）
Phase 15C 路線匯入海拔預先計算（非同步背景）
Phase 16  SEO 與多語言
Phase 16A 隱私政策更新 + 政府資源頁（/resources）
Phase 16B 出發前PDF備用卡（瀏覽器原生列印）
Phase 16C 使用說明頁（/guide，七站故事，離線可用）
Phase 16D 聯絡頁面 + 隱私政策最終版（/contact）
Phase 17  PWA設定（Serwist，含溝通小卡強制預先快取）
Phase 17A PWA安裝按鈕（iOS教學 + Android原生）
Phase 18  系統穩定性強化（速率限制 + Sentry + 備份 + Dependabot）
Phase 18B SEO最終優化 + 語言自動偵測 + 付款確認Email
Phase 18  正式部署（Vercel + 自訂域名 + Google Search Console）
```

---

## 12. 上線前驗收清單（全部通過才能部署）

```
前台：
□ 英文瀏覽器自動顯示英文版（Accept-Language 偵測）
□ Email/密碼註冊、登入、忘記密碼（重設信）流程正常
□ 手機號碼重複被攔截，Email 重複被攔截
□ 合約捲動到底解鎖勾選框，後端強制驗證
□ 試用48小時到期後正確降級（Cron 驗證）
□ 升級按鈕顯示「即將開放」（第一階段 PAYMENT_ENABLED=false）
□ 山區模擬斷網10分鐘後重連，session 自動恢復
□ 地圖顯示台灣戶外地圖（MapTiler outdoor style）
□ 5大分類篩選器正常，漸進式展開
□ SOS 頁面長按2秒才開啟，119/110 可直接撥打
□ 溝通小卡頁面斷網後仍可開啟（Serwist 預先快取）
□ 旅程總結可匯出 GPX，在 Google Earth 可開啟

後台：
□ /admin/login 不出現在任何前台連結或 sitemap
□ 管理員可用 username 或 email 任一方式登入
□ Stripe Webhook（舊）未被接入——只有 Lemon Squeezy Webhook
□ 後台偵錯橫幅在有未處理事件時正確顯示
□ 後台有「前往前台網站」按鈕，前台無後台反向連結
□ Pro 會員不出現升級按鈕，系統無降級入口

安全：
□ git log 中無任何 API Key 或密碼
□ .env.local 在 .gitignore 中
□ /admin 在 robots.txt 標記 Disallow
□ 管理員帳號初始化腳本已刪除
```

---

## 13. Git Commit 訊息建議格式

每完成一個 Phase，提供建議 commit 訊息（Jimmy 決定是否實際提交）：

```
格式：feat(PhaseXX): 簡短說明（不超過72字）

範例：
feat(Phase9A): add Lemon Squeezy checkout with PAYMENT_ENABLED flag
feat(Phase11A): add real-time trip sharing via Supabase Realtime
fix(Phase9E): extend session heartbeat timeout to 30min for mountain areas
refactor(Phase3A): centralize MapTiler URLs in lib/map-style.ts
```

---

## 14. 規格文件讀取指引

| 規格文件 | 主要內容 |
|---|---|
| specs/v01_完整建置手冊.md | 系統架構、DB schema、地圖/POI/路線/天氣/卡路里核心規格 |
| specs/v02_系統優化補充手冊.md | 退費機制、行程記錄（⚠️v05/v06/v12已取代部分內容） |
| specs/v03_安全功能規格.md | 危險路段、日出日落、夜間騎行警示 |
| specs/v04_路線資料與PWA與後台上傳.md | 政府路線資料、PWA、Excel批次上傳 |
| specs/v05_會員制與試用模式.md | 48小時試用、會員系統（⚠️v06已取代訂閱方案、v12已取代付款） |
| specs/v06_login_security.md | 強制登入、OAuth、手機唯一性、單裝置限制、Stripe安全（⚠️v12已取代Stripe） |
| specs/v07_safety_experience_pack.md | 位置分享、溝通小卡、離線下載、Serwist（取代next-pwa） |
| specs/v08_simplicity_pack.md | 多日總結、逆風提醒、住宿細分、地圖供應商抽象層 |
| specs/v09_gpx_export_elevation.md | GPX匯出、海拔預先計算 |
| specs/v10_guide_simplify_stability.md | 使用說明頁、前後台簡化、山區斷訊修正 |
| specs/v11_final_optimization.md | 完整用戶模擬、後台偵錯、SEO、管理員初始化、聯絡資訊 |
| specs/v12_lemonsqueezy_payment.md | **最新** Lemon Squeezy 完整規格，取代所有 Stripe 內容 |
| specs/v41_FINAL_complete_manual.docx | 整合版手冊（人類可讀），確認整體脈絡用 |

---

*本檔案由 Jimmy 與 Claude 協作生成，依 Genesis Protocol 作業標準維護。*
*如需更新本檔案，告知 Claude「更新 CLAUDE.md 的 [具體項目]」即可。*
