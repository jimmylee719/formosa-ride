-- ============================================================
-- 0005_caches.sql — 天氣與日出日落快取
-- 依據：v1.0 §7.7 + v3.0 B2
-- 可重複執行
-- ============================================================

-- 天氣快取（有效期 2 小時，由 API 層判斷 fetched_at）
CREATE TABLE IF NOT EXISTS weather_cache (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_key   TEXT NOT NULL,   -- 縣市名稱，例如「花蓮縣」
  lat            NUMERIC,
  lng            NUMERIC,
  current_data   JSONB,
  forecast_data  JSONB,           -- 7 天預報
  wind_data      JSONB,
  typhoon_alert  BOOLEAN DEFAULT FALSE,
  fetched_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_key)
);

-- 日出日落快取（有效期 6 小時，由 API 層判斷）
CREATE TABLE IF NOT EXISTS solar_cache (
  cache_key   TEXT PRIMARY KEY,
  solar_data  JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ DEFAULT NOW()
);
