-- ============================================================
-- 0009_trips.sql — 行程記錄、軌跡點、標記點、日摘要、分享連結、總結函數
-- 依據：v2.0 C4 + v7.0 A2 + v8.0 A2
-- 整合調整（已記錄於 MASTER_BUILD_PLAN）：
--   1. trips 新增 user_id（v2.0 設計時尚無會員制，v6.0 強制登入後行程應歸屬會員；
--      保留 device_id 供離線裝置識別）
--   2. trip_day_summaries 新增 total_ascent_m（v8.0 get_trip_summary 原稿誤用
--      SUM(max_elevation) 當總爬升，屬規格錯誤，此處修正）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id       TEXT,
  title           TEXT,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  status          TEXT DEFAULT 'active',   -- 'active','paused','completed'
  total_distance_km  NUMERIC DEFAULT 0,
  total_time_minutes NUMERIC DEFAULT 0,
  total_calories     NUMERIC DEFAULT 0,
  max_elevation_m    NUMERIC,
  min_elevation_m    NUMERIC,
  total_ascent_m     NUMERIC DEFAULT 0,
  start_county    TEXT,
  end_county      TEXT,
  is_synced       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_device ON trips(device_id);

CREATE TABLE IF NOT EXISTS trip_points (
  id          BIGSERIAL PRIMARY KEY,
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  location    GEOMETRY(POINT, 4326),
  lat         NUMERIC(10, 7) NOT NULL,
  lng         NUMERIC(10, 7) NOT NULL,
  elevation_m NUMERIC,
  speed_kmh   NUMERIC,
  accuracy_m  NUMERIC,
  is_rest     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_trip_points_trip_id ON trip_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_points_recorded_at ON trip_points(recorded_at);
CREATE INDEX IF NOT EXISTS idx_trip_points_location ON trip_points USING GIST(location);

CREATE TABLE IF NOT EXISTS trip_checkpoints (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
  location    GEOMETRY(POINT, 4326),
  lat         NUMERIC(10, 7),
  lng         NUMERIC(10, 7),
  note        TEXT,
  photo_url   TEXT,
  marked_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_checkpoints_trip ON trip_checkpoints(trip_id);

CREATE TABLE IF NOT EXISTS trip_day_summaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number      INTEGER NOT NULL,
  date            DATE NOT NULL,
  distance_km     NUMERIC DEFAULT 0,
  riding_minutes  NUMERIC DEFAULT 0,
  rest_minutes    NUMERIC DEFAULT 0,
  calories        NUMERIC DEFAULT 0,
  start_county    TEXT,
  end_county      TEXT,
  max_elevation   NUMERIC,
  total_ascent_m  NUMERIC DEFAULT 0,   -- 整合調整 2：每日爬升，供總結正確加總
  start_point     GEOMETRY(POINT, 4326),
  end_point       GEOMETRY(POINT, 4326),
  summary_image_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_summaries_trip ON trip_day_summaries(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_summaries_date ON trip_day_summaries(date DESC);

-- 即時位置分享連結（v7.0 A2）
CREATE TABLE IF NOT EXISTS trip_share_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
  share_token     TEXT UNIQUE NOT NULL,
  recipient_label TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,     -- 行程結束後 24 小時自動失效
  view_count      INTEGER DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_token ON trip_share_links(share_token);

-- 多日旅程總結（v8.0 A2，爬升改用 total_ascent_m 正確加總）
CREATE OR REPLACE FUNCTION get_trip_summary(p_trip_id UUID)
RETURNS TABLE(
  total_days INTEGER,
  total_distance_km NUMERIC,
  total_ascent_m NUMERIC,
  total_calories NUMERIC,
  total_riding_minutes NUMERIC,
  counties_visited TEXT[],
  checkpoint_count INTEGER,
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT d.day_number)::INTEGER,
    COALESCE(SUM(d.distance_km), 0),
    COALESCE(SUM(d.total_ascent_m), 0),
    COALESCE(SUM(d.calories), 0),
    COALESCE(SUM(d.riding_minutes), 0),
    ARRAY_AGG(DISTINCT d.start_county) FILTER (WHERE d.start_county IS NOT NULL),
    (SELECT COUNT(*)::INTEGER FROM trip_checkpoints c WHERE c.trip_id = p_trip_id),
    MIN(d.date),
    MAX(d.date)
  FROM trip_day_summaries d
  WHERE d.trip_id = p_trip_id;
END;
$$ LANGUAGE plpgsql;

-- Supabase Realtime：追蹤頁需要訂閱 trip_points 的 INSERT（v7.0 A5）
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE trip_points;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
