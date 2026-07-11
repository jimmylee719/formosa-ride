-- ============================================================
-- 0017_pois_photo_website.sql — POI 照片與官網欄位（2026-07-11 Jimmy 指示）
-- 匯入交通部觀光署「觀光資料庫 v2.0」景點（6,000+ 筆，含官方照片/電話/
-- 開放時間/官網）需要的兩個新欄位。照片為官方開放資料圖床 URL，不落地儲存。
-- 可重複執行
-- ============================================================

ALTER TABLE pois ADD COLUMN IF NOT EXISTS photo_url   TEXT;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS website_url TEXT;
