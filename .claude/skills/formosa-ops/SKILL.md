---
name: formosa-ops
description: FormoSA Ride 環島通的日常操作手冊——開發/建置/驗證指令、資料腳本目錄、E2E 測試模式、已知的坑。凡是要在本專案跑指令、改程式、跑匯入腳本、驗證功能、部署或除錯時使用。
---

# FormoSA Ride 營運操作手冊

決策與路線圖在 CLAUDE.md §15；本檔是「怎麼動手」。

## 每次開工的基本流程

1. 小修正：改 → `npx tsc --noEmit` → 本機驗證 → prod build → commit → push（**push 即部署正式站**）
2. 大功能：走 CLAUDE.md §5 PDCA，先界定再動工
3. commit 格式：`feat(範圍): 說明` ＋ `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## 指令速查

```bash
# 型別檢查（每次改完必跑）
npx tsc --noEmit

# 正式建置（獨立 dist 目錄，不會和 dev server 打架——直接用共用 .next 會互相毀損）
NEXT_DIST_DIR=.next-prod npx next build

# dev server：一律用 preview_start（launch.json 的 "dev"），不要用 Bash 起
```

## 資料腳本目錄（scripts/，全部可重複執行）

| 腳本 | 用途 | 備註 |
|---|---|---|
| import-osm-pois.ts `<type|all>` | OSM POI（含露營區 campsite_legal） | 月更自動跑 |
| import-hotels.ts `<HotelList.json>` | 觀光署旅宿 15,652 筆 | 月更自動跑（workflow 先下載 zip） |
| import-attractions-tourism.ts `<AttractionList.json>` | 觀光署景點 6,071 筆（照片/電話/官網） | 月更自動跑；需 migration 0017 |
| import-gov-routes.ts `huandao\|moi <dir>` | 環島路網／內政部地方車道 | huandao 月更；moi 半年手動 |
| build-route-segments.ts `[--stages 9]` | 環島主線切建議日段（台北起點、逆時針） | 主線幾何變動後重跑 |
| precompute-elevation.ts `[--force|--over km]` | 海拔剖面（只算缺的） | 新路線後跑 |
| compute-route-difficulty.ts | 依實測海拔重算難度 | 海拔更新後跑 |
| import-accident-data.ts | 警政署事故熱點（年度） | 每年手動 |
| seed-night-warnings.ts | 夜間警示路段（現 6 條） | 加新路段：改 SEGMENTS 陣列 |
| backup-db.ts `[--cloud]` | 手動備份 | 週備份已自動化 |

**慣例**：腳本缺參數必須 `process.exit(1)` 響亮失敗（曾發生 CI 綠勾假成功事件）。

## E2E 測試模式（實測有效的套路）

- **裝置身分**：API 用 `deviceId`（UUID）；瀏覽器端 localStorage key `formosa_device_id`。
  測試用固定假 UUID（如 `e2e00000-1111-...`），測完把該 device 的資料刪掉
- **管理員 API**：先 `POST /api/admin/login`（body: `{identifier, password}`）拿 cookie jar，
  再帶 `-b jar` 打 /api/admin/*
- **中文 JSON 進 curl**：Windows shell 會弄壞編碼——JSON 先用 node 寫成 UTF-8 檔，
  `curl --data-binary @file`；curl 的 `-F @路徑` 要用 `C:/...` 不能用 `/c/...`
- **直接查 DB**：`.env.local` 取 SUPABASE_SERVICE_ROLE_KEY 打 PostgREST；
  計數用 `Prefer: count=exact` 讀 Content-Range
- **旅途模擬**：dev 環境 `window.__journeySimulate(lat, lng, speedKmh)`；
  地圖實例 `window.__map`（僅 dev）
- **原生 confirm 擋住自動化**：測試前 `window.confirm = () => true`

## 已知的坑（都踩過了）

1. **PostgREST `.in()` 超過 ~100 個 UUID 會靜默失敗**（URL 過長）→ 分批 100
2. **`.or()` 字串拼接有 filter 注入風險** → 拆成多個 `.eq()`/`.ilike()` 查詢合併
3. **RPC 加回傳欄位要 DROP FUNCTION 再 CREATE**（migration 交 Jimmy 貼）
4. **get_pois_along_route RPC 對 80km+ 路線逾時** → 用 bbox 欄位查詢＋Node 端投影
   （見 supply-gaps API）
5. **預覽瀏覽器是隱藏分頁**：rAF 凍結 → 地圖截圖/渲染測試會逾時，**不是 app bug**；
   改用 read_page / javascript_tool / API 驗證
6. **supabase-js 的 FK join 型別推斷成陣列**，to-one 實際回物件 → `as unknown as T`
7. **Route handler 只能 export HTTP 方法**（共用函數放 lib/，否則 build 錯）
8. **route 頁 metadata title 不要含站名**（layout template 會再附加一次）
9. **county 名「臺/台」混用** → 用 lib/county-en.ts 的 normalizeCounty
10. **exactOptionalPropertyTypes**：optional 欄位給 null 要宣告 `| null`
11. dev 曾被舊 prod Service Worker 綁架出白屏 → DevSwCleanup 已處理；再見到先想到它

## 安全鐵律（違反 = 事故）

- repo **公開**：secrets 只進 .env.local（gitignored）/ Vercel env / GitHub Actions secrets；
  聊天與 commit 不出現密鑰值
- 所有 DDL 由 Jimmy 貼 Supabase SQL Editor（migrations/ 目前至 0017）
- `/admin` 絕不出現在前台連結、sitemap、robots allow
- 新表 RLS 預設全鎖（service_role only），API 層驗 deviceId 所有權（見 trips/plans 模式）
- 對外寫入 API 一律：UUID regex、長度截斷、範圍驗證、必要時 checkRateLimit

## 資料現況（2026-07-11 快照）

48,822 POI（含 6,071 觀光署景點、736 露營區、15,652 旅宿）；424 條路線
（主線＋9 日段＋26 支線＋387 地方，海拔全算）；夜間警示 6 條；事故熱點 1,186。
