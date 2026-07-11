-- ============================================================
-- 0016_trip_plans.sql — 旅程規劃（Phase 19A，2026-07-11 Jimmy 指示）
-- 行程規劃（每裝置上限 3 個，於 API 層強制）、收藏、用戶建議地點審核佇列。
-- 設計說明：
--   1. 會員制（Phase 9）尚未上線 → 以 device_id 綁定，並預留 user_id
--      欄位供日後歸戶（同 trips 表做法）。
--   2. share_token 供 Phase 19B 分享連結使用，本階段先建欄位。
--   3. RLS：全部啟用且不建 anon 政策 = 前端不可直接讀寫，
--      一律經 API（service_role）並驗證 device_id 所有權（同 trips 模式）。
-- 可重複執行
-- ============================================================

-- 行程（規劃主檔）
CREATE TABLE IF NOT EXISTS trip_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  start_date  DATE,
  notes       TEXT,
  share_token TEXT UNIQUE,            -- Phase 19B 分享連結
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trip_plans_device ON trip_plans(device_id);

-- 行程日
CREATE TABLE IF NOT EXISTS plan_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
  day_number  INT NOT NULL,
  depart_time TEXT,                   -- 'HH:MM'，純顯示用
  start_name  TEXT,                   -- 出發地（自由文字）
  route_id    UUID REFERENCES routes(id) ON DELETE SET NULL,  -- 可連結官方路線
  notes       TEXT,
  UNIQUE (plan_id, day_number)
);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan ON plan_days(plan_id);

-- 每日停靠點（poi_id 或 custom_name 擇一必填）
CREATE TABLE IF NOT EXISTS plan_stops (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id            UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  position          INT NOT NULL,
  poi_id            UUID REFERENCES pois(id) ON DELETE SET NULL,
  custom_name       TEXT,
  custom_google_url TEXT,
  note              TEXT,
  CHECK (poi_id IS NOT NULL OR custom_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_plan_stops_day ON plan_stops(day_id);

-- 收藏（POI 或路線，各自唯一）
CREATE TABLE IF NOT EXISTS plan_favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id  TEXT NOT NULL,
  poi_id     UUID REFERENCES pois(id) ON DELETE CASCADE,
  route_id   UUID REFERENCES routes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (poi_id IS NOT NULL OR route_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_device_poi
  ON plan_favorites(device_id, poi_id) WHERE poi_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_device_route
  ON plan_favorites(device_id, route_id) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fav_device ON plan_favorites(device_id);

-- 用戶建議地點（自訂停靠點同步進入審核佇列，管理員一鍵採用寫入 pois）
CREATE TABLE IF NOT EXISTS suggested_places (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  google_url     TEXT,
  parsed_lat     DOUBLE PRECISION,    -- 從 Google 連結自動解析（可為空）
  parsed_lng     DOUBLE PRECISION,
  poi_type       TEXT,                -- 用戶選填的分類建議
  note           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending','adopted','rejected'
  adopted_poi_id UUID REFERENCES pois(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_suggested_status ON suggested_places(status);

-- updated_at 自動更新（沿用 0014 的 security definer 修正模式）
CREATE OR REPLACE FUNCTION touch_trip_plans_updated_at()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_trip_plans_updated ON trip_plans;
CREATE TRIGGER trg_trip_plans_updated
  BEFORE UPDATE ON trip_plans
  FOR EACH ROW EXECUTE FUNCTION touch_trip_plans_updated_at();

-- RLS：全部鎖死，僅 service_role（後端 API）可存取
ALTER TABLE trip_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_favorites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_places  ENABLE ROW LEVEL SECURITY;
