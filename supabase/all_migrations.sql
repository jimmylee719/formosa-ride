-- ============================================================
-- 0001_create_admin_users.sql
-- Phase 0A：後台管理員帳號資料表
-- 依據：v5.0 C1 節 + v11.0 B1 節（username 欄位）
-- 可重複執行（IF NOT EXISTS / DROP POLICY IF EXISTS）
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 管理員帳號與一般會員（user_profiles / auth.users）完全分離，
-- 避免一般會員帳號被盜後波及後台（v5.0 C1）
CREATE TABLE IF NOT EXISTS admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE,             -- v11.0：登入可用 username 或 email
  password_hash   TEXT NOT NULL,           -- bcrypt cost 12，絕不存明文
  display_name    TEXT,
  role            TEXT DEFAULT 'admin',    -- 未來可擴充 'super_admin'
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS：僅 service_role 可存取，前台 anon key 完全無法查詢此表
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_service_only" ON admin_users;
CREATE POLICY "admin_users_service_only" ON admin_users FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role'
);
-- ============================================================
-- 0002_extensions_enums.sql — 擴充套件與列舉型別
-- 依據：v1.0 §7.1–7.2、v3.0 A1、v5.0 B2
-- 可重複執行
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 列舉型別（CREATE TYPE 無 IF NOT EXISTS，以 DO 區塊確保可重複執行）
DO $$ BEGIN
  CREATE TYPE poi_type AS ENUM (
    'convenience_store', 'supermarket', 'water_station',
    'campsite_legal', 'campsite_wild', 'temple_overnight',
    'public_toilet', 'shower', 'bicycle_repair', 'pump_station',
    'bicycle_parking', 'train_station', 'hospital', 'police',
    'scenic_attraction', 'restaurant', 'accommodation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE route_type AS ENUM (
    'full_island', 'west_coast', 'east_coast', 'segment', 'branch', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'hard', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE danger_level AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_tier AS ENUM ('trial', 'free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ============================================================
-- 0003_pois.sql — POI 主資料表
-- 依據：v1.0 §7.3 + v7.0 E2（驗證統計欄）+ v8.0 C2（住宿子分類）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS pois (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh         TEXT NOT NULL,
  name_en         TEXT,
  type            poi_type NOT NULL,
  location        GEOMETRY(POINT, 4326) NOT NULL,
  address_zh      TEXT,
  address_en      TEXT,
  google_place_id TEXT,                    -- Google Maps 深度連結用（非 Places API）
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  description_zh  TEXT,
  description_en  TEXT,
  phone           TEXT,
  website         TEXT,
  opening_hours   JSONB,
  is_free         BOOLEAN DEFAULT FALSE,
  has_bike_parking BOOLEAN DEFAULT FALSE,
  has_shower      BOOLEAN DEFAULT FALSE,
  allows_camping  BOOLEAN DEFAULT FALSE,
  has_wifi        BOOLEAN DEFAULT FALSE,
  has_charging    BOOLEAN DEFAULT FALSE,
  water_available BOOLEAN DEFAULT FALSE,
  is_24h          BOOLEAN DEFAULT FALSE,
  images          TEXT[] DEFAULT '{}',
  source_url      TEXT,
  source_type     TEXT,                    -- 'government','osm','manual','manual_excel','crowdsource'
  accommodation_subtype TEXT,              -- v8.0：僅 type='accommodation' 時有意義
  verification_count INTEGER DEFAULT 0,    -- v7.0：社群驗證統計（觸發器維護）
  last_verified_at TIMESTAMPTZ,
  verified        BOOLEAN DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  is_free_tier    BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pois_location ON pois USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);
CREATE INDEX IF NOT EXISTS idx_pois_is_active ON pois(is_active);
CREATE INDEX IF NOT EXISTS idx_pois_is_free_tier ON pois(is_free_tier);

-- Excel 匯入 upsert 依據（v4.0 C7：onConflict name_zh,type）
CREATE UNIQUE INDEX IF NOT EXISTS uq_pois_name_type ON pois(name_zh, type);

-- 自動同步 lat/lng 與 updated_at
CREATE OR REPLACE FUNCTION update_poi_latlong()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lat := ST_Y(NEW.location);
  NEW.lng := ST_X(NEW.location);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poi_latlong ON pois;
CREATE TRIGGER trg_poi_latlong
  BEFORE INSERT OR UPDATE ON pois
  FOR EACH ROW EXECUTE FUNCTION update_poi_latlong();
-- ============================================================
-- 0004_routes_and_poi_functions.sql — 路線、海拔快取、POI 查詢函數
-- 依據：v1.0 §7.4–7.6 + v4.0 A3（政府資料欄位）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS routes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT UNIQUE NOT NULL,
  name_zh          TEXT NOT NULL,
  name_en          TEXT NOT NULL,
  type             route_type NOT NULL,
  geometry         GEOMETRY(LINESTRING, 4326) NOT NULL,
  distance_km      NUMERIC(8, 2) NOT NULL,
  total_ascent_m   NUMERIC(8, 0),
  total_descent_m  NUMERIC(8, 0),
  max_elevation_m  NUMERIC(8, 0),
  min_elevation_m  NUMERIC(8, 0),
  difficulty       difficulty_level NOT NULL DEFAULT 'moderate',
  suggested_days   INTEGER,
  start_point      GEOMETRY(POINT, 4326),
  end_point        GEOMETRY(POINT, 4326),
  start_name_zh    TEXT,
  start_name_en    TEXT,
  end_name_zh      TEXT,
  end_name_en      TEXT,
  counties         TEXT[] DEFAULT '{}',
  description_zh   TEXT,
  description_en   TEXT,
  tips_zh          TEXT,
  tips_en          TEXT,
  gpx_url          TEXT,
  thumbnail_url    TEXT,
  is_loop          BOOLEAN DEFAULT FALSE,
  -- v4.0 A3：政府開放資料整合欄位
  official_route_code TEXT,               -- 例：'Cycling Route No.1-3'
  data_source      TEXT,                  -- 'taiwanbike','moi_land','moenv','county','manual'
  managing_authority TEXT,
  source_last_updated DATE,
  segment_number   INTEGER,               -- 環島1號線第幾段（1-12）
  parent_route_id  UUID REFERENCES routes(id),
  is_free_tier     BOOLEAN DEFAULT FALSE,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_geometry ON routes USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(type);
CREATE INDEX IF NOT EXISTS idx_routes_slug ON routes(slug);
CREATE INDEX IF NOT EXISTS idx_routes_source ON routes(data_source);
CREATE INDEX IF NOT EXISTS idx_routes_parent ON routes(parent_route_id);

-- 海拔剖面快取（v1.0 §7.6）
CREATE TABLE IF NOT EXISTS elevation_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id      UUID REFERENCES routes(id) ON DELETE CASCADE,
  profile_data  JSONB NOT NULL,  -- [{distance_km, elevation_m, grade_pct}...]
  max_elevation NUMERIC,
  min_elevation NUMERIC,
  total_ascent  NUMERIC,
  total_descent NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id)
);

-- ── POI 查詢函數（v1.0 §7.4）─────────────────────────────

CREATE OR REPLACE FUNCTION get_pois_near_point(
  p_lng NUMERIC,
  p_lat NUMERIC,
  p_radius_km NUMERIC DEFAULT 5,
  p_types poi_type[] DEFAULT NULL,
  p_free_tier_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID, name_zh TEXT, name_en TEXT, type poi_type,
  lat NUMERIC, lng NUMERIC, distance_m NUMERIC,
  is_free BOOLEAN, is_free_tier BOOLEAN,
  opening_hours JSONB, phone TEXT, google_place_id TEXT,
  description_zh TEXT, description_en TEXT,
  has_shower BOOLEAN, allows_camping BOOLEAN,
  has_charging BOOLEAN, water_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name_zh, p.name_en, p.type,
    p.lat, p.lng,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )::NUMERIC AS distance_m,
    p.is_free, p.is_free_tier,
    p.opening_hours, p.phone, p.google_place_id,
    p.description_zh, p.description_en,
    p.has_shower, p.allows_camping,
    p.has_charging, p.water_available
  FROM pois p
  WHERE
    p.is_active = TRUE
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    AND (p_types IS NULL OR p.type = ANY(p_types))
    AND (p_free_tier_only = FALSE OR p.is_free_tier = TRUE)
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_pois_along_route(
  p_route_id UUID,
  p_buffer_km NUMERIC DEFAULT 3,
  p_types poi_type[] DEFAULT NULL,
  p_free_tier_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID, name_zh TEXT, name_en TEXT, type poi_type,
  lat NUMERIC, lng NUMERIC,
  is_free BOOLEAN, is_free_tier BOOLEAN,
  google_place_id TEXT, phone TEXT,
  has_shower BOOLEAN, allows_camping BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name_zh, p.name_en, p.type,
    p.lat, p.lng,
    p.is_free, p.is_free_tier,
    p.google_place_id, p.phone,
    p.has_shower, p.allows_camping
  FROM pois p, routes r
  WHERE
    r.id = p_route_id
    AND p.is_active = TRUE
    AND ST_DWithin(
      p.location::geography,
      r.geometry::geography,
      p_buffer_km * 1000
    )
    AND (p_types IS NULL OR p.type = ANY(p_types))
    AND (p_free_tier_only = FALSE OR p.is_free_tier = TRUE)
  ORDER BY
    ST_LineLocatePoint(r.geometry, p.location) ASC;  -- 按路線行進順序
END;
$$ LANGUAGE plpgsql;
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
-- ============================================================
-- 0006_members_sessions.sql — 會員 profile、試用機制、單裝置 session
-- 依據：v5.0 B2–B3 + v6.0 C/D/E/I + v10.0 D + v12.0 D1（通用欄位命名）
-- 登入方式：Email + 密碼（2026-07-09 Jimmy 指示，無第三方 OAuth）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  display_name      TEXT,
  full_name         TEXT,                    -- v6.0 C1 必填姓名
  phone_e164        TEXT,                    -- E.164 標準格式，如 +886912345678
  tier              member_tier NOT NULL DEFAULT 'trial',
  trial_started_at  TIMESTAMPTZ DEFAULT NOW(),
  trial_expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  upgraded_at       TIMESTAMPTZ,
  upgrade_method    TEXT,                    -- 'lemonsqueezy_payment' | 'admin_manual'
  external_customer_id TEXT,                 -- v12.0 通用命名（原 stripe_customer_id）
  external_payment_id  TEXT,                 -- v12.0 通用命名（原 stripe_payment_id）
  plan_type         TEXT,                    -- 'lifetime_usd' | NULL
  auth_provider     TEXT DEFAULT 'email',    -- 2026-07-09 起僅有 'email'
  device_fingerprint TEXT,                   -- 註冊時輕量指紋，僅供人工複查
  nationality       TEXT,
  preferred_lang    TEXT DEFAULT 'zh',       -- 'zh' | 'en'
  terms_agreed_at   TIMESTAMPTZ,             -- v6.0 I5：同意條款存證
  terms_version     TEXT DEFAULT 'v1.0',
  last_login_at     TIMESTAMPTZ,
  signup_source     TEXT,
  notes             TEXT,                    -- 後台管理員備註
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT unique_phone UNIQUE (phone_e164)  -- 防多帳號濫用的最後防線（v6.0 D2）
);

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires ON user_profiles(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_fingerprint ON user_profiles(device_fingerprint);

-- 註冊時自動建立 profile（48 小時試用起算）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, tier, trial_started_at, trial_expires_at, nationality, preferred_lang)
  VALUES (
    NEW.id, NEW.email, 'trial', NOW(), NOW() + INTERVAL '48 hours',
    NEW.raw_user_meta_data ->> 'nationality',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_lang', 'zh')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 即時計算有效會員等級（v5.0 B3 方法一：查詢時判斷，不依賴排程）
CREATE OR REPLACE FUNCTION get_effective_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  profile RECORD;
BEGIN
  SELECT tier, trial_expires_at INTO profile
  FROM user_profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'free';
  ELSIF profile.tier = 'pro' THEN
    RETURN 'pro';
  ELSIF profile.tier = 'trial' AND profile.trial_expires_at > NOW() THEN
    RETURN 'trial';
  ELSE
    RETURN 'free';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── 單裝置登入 session（v6.0 E2 + v10.0 D2 三十分鐘容許）──────

CREATE TABLE IF NOT EXISTS active_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token   TEXT UNIQUE NOT NULL,
  device_info     TEXT,
  ip_address      TEXT,
  login_at        TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat  TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE,
  revoked_reason  TEXT  -- 'new_device_login' | 'manual_logout' | 'timeout'
);

-- 資料庫層保證：同一用戶最多一筆活躍 session
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_user
  ON active_sessions(user_id) WHERE is_active = TRUE;

-- 逾時清理：30 分鐘容許（v10.0 D2，取代 v6.0 的 5 分鐘）
-- 主要判斷以「讀取時檢查 last_heartbeat」為準，此函數僅作資料清理
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_sessions
  SET is_active = FALSE, revoked_reason = 'timeout'
  WHERE is_active = TRUE AND last_heartbeat < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- 0007_payments.sql — 購買紀錄、付款事件冪等、退款申請、停機紀錄
-- 依據：v6.0 F3–F4 + v12.0 D1–D2（直接以最終通用命名建表，不走 RENAME）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID REFERENCES auth.users(id),
  external_order_id    TEXT UNIQUE,             -- Lemon Squeezy Order ID（v12.0 通用命名）
  external_customer_id TEXT,
  payment_provider     TEXT DEFAULT 'lemonsqueezy',
  email                TEXT,
  amount_usd           NUMERIC DEFAULT 10.00,
  currency             TEXT DEFAULT 'usd',
  status               TEXT DEFAULT 'completed',  -- 'pending','completed','refunded'
  purchased_at         TIMESTAMPTZ DEFAULT NOW(),
  refunded_at          TIMESTAMPTZ,
  refund_amount_usd    NUMERIC,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);

-- Webhook 事件冪等紀錄（v12.0 D2 最終名稱）
CREATE TABLE IF NOT EXISTS processed_payment_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      TEXT UNIQUE NOT NULL,   -- Lemon Squeezy webhook_id
  event_type    TEXT NOT NULL,          -- 'order_created' | 'order_refunded'
  raw_payload   TEXT,                   -- 完整原始 payload，供問題回溯
  processed_at  TIMESTAMPTZ,            -- NULL = 處理中或失敗（後台偵錯橫幅監看此欄）
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_pending
  ON processed_payment_events(created_at) WHERE processed_at IS NULL;

-- 退款申請登記（v2.0 B3；v12.0 起實際退款為後台手動，此表僅供登記與追蹤）
CREATE TABLE IF NOT EXISTS refund_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id     UUID REFERENCES purchases(id),
  user_id         UUID REFERENCES auth.users(id),
  reason          TEXT,   -- 'cooling_off','system_outage','other'
  description     TEXT,
  hours_elapsed   NUMERIC,
  status          TEXT DEFAULT 'pending',  -- 'pending','approved','denied_manual'
  denied_reason   TEXT,
  admin_note      TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 系統停機紀錄（v2.0 B3，供停機退款政策佐證與後台偵錯橫幅）
CREATE TABLE IF NOT EXISTS system_outages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,             -- NULL = 仍在停機中
  duration_minutes NUMERIC GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
  ) STORED,
  affected_service TEXT,   -- 'maptiler','supabase','vercel','weather_api','system'
  severity        TEXT DEFAULT 'major',    -- 'partial','major','complete'
  description     TEXT,
  auto_detected   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- 0008_feedback.sql — 回饋意見
-- 依據：v1.0 §7.9（欄位以 v1.0 為準；v11.0 偵錯 View 對映調整見 0012，
--       採 MASTER_BUILD_PLAN Q4 決議：category='bug' AND status='new'）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category     TEXT NOT NULL,  -- 'bug','suggestion','data_error','praise','other'
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  email        TEXT,
  poi_id       UUID REFERENCES pois(id),
  route_id     UUID REFERENCES routes(id),
  user_lang    TEXT DEFAULT 'zh',
  device_type  TEXT,
  app_version  TEXT,
  status       TEXT DEFAULT 'new',  -- 'new','reviewed','resolved'
  admin_note   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
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
-- ============================================================
-- 0010_safety.sql — 危險路段、禁行路段、夜間警示路段
-- 依據：v3.0 A1–A2
-- 注意：這三張表刻意「不」納入後台 Excel 上傳，維持 scripts/ 腳本更新（v10.0 C5）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS danger_zones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh         TEXT NOT NULL,
  name_en         TEXT,
  level           danger_level NOT NULL DEFAULT 'medium',
  geometry        GEOMETRY(GEOMETRY, 4326) NOT NULL,  -- Point 或 LineString
  road_name       TEXT,
  accident_count  INTEGER,
  accident_source TEXT,   -- 例：'交通部 data.gov.tw 12197'
  data_year       INTEGER,
  reason_zh       TEXT,
  reason_en       TEXT,
  is_night_only   BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_danger_zones_geometry ON danger_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_danger_zones_level ON danger_zones(level);

CREATE TABLE IF NOT EXISTS restricted_roads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh     TEXT NOT NULL,
  name_en     TEXT,
  geometry    GEOMETRY(LINESTRING, 4326) NOT NULL,
  road_type   TEXT,   -- 'highway_national','expressway','other'
  road_number TEXT,   -- '國道1號','台61線' 等
  law_basis   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restricted_roads_geometry ON restricted_roads USING GIST(geometry);

CREATE TABLE IF NOT EXISTS night_warning_segments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_zh         TEXT NOT NULL,
  name_en         TEXT,
  geometry        GEOMETRY(LINESTRING, 4326) NOT NULL,
  warning_reason_zh TEXT,
  warning_reason_en TEXT,
  severity        TEXT DEFAULT 'medium',  -- 'high','medium'
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_night_segments_geometry ON night_warning_segments USING GIST(geometry);

-- 地圖視窗範圍內危險路段查詢（v3.0 A2）
CREATE OR REPLACE FUNCTION get_danger_zones_in_bbox(
  min_lng NUMERIC, min_lat NUMERIC,
  max_lng NUMERIC, max_lat NUMERIC,
  include_night_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID, name_zh TEXT, name_en TEXT, level danger_level,
  geometry TEXT,  -- GeoJSON
  reason_zh TEXT, reason_en TEXT, is_night_only BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.name_zh, d.name_en, d.level,
    ST_AsGeoJSON(d.geometry)::TEXT AS geometry,
    d.reason_zh, d.reason_en, d.is_night_only
  FROM danger_zones d
  WHERE
    d.is_active = TRUE
    AND ST_Intersects(
      d.geometry,
      ST_MakeEnvelope(min_lng::float8, min_lat::float8, max_lng::float8, max_lat::float8, 4326)
    )
    AND (include_night_only = TRUE OR d.is_night_only = FALSE);
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- 0011_community_admin.sql — 社群驗證、匯入紀錄、管理員操作日誌
-- 依據：v7.0 E2 + v4.0 C8 + v5.0 C4
-- 可重複執行
-- ============================================================

-- 社群 POI 驗證（v7.0 E2）
CREATE TABLE IF NOT EXISTS poi_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poi_id      UUID REFERENCES pois(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poi_id, user_id)  -- 同一用戶對同一 POI 只能驗證一次（防刷）
);

CREATE OR REPLACE FUNCTION update_poi_verification_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pois SET
    verification_count = verification_count + 1,
    last_verified_at = NOW()
  WHERE id = NEW.poi_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poi_verification ON poi_verifications;
CREATE TRIGGER trg_poi_verification
  AFTER INSERT ON poi_verifications
  FOR EACH ROW EXECUTE FUNCTION update_poi_verification_count();

-- Excel 批次匯入歷史（v4.0 C8）
CREATE TABLE IF NOT EXISTS import_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_type     TEXT NOT NULL,     -- 'poi','route','correction'
  file_name       TEXT,
  record_count    INTEGER,
  error_count     INTEGER DEFAULT 0,
  uploaded_by     TEXT,              -- 'jimmy' or 'ian'
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'completed'  -- 'completed','partial','failed'
);

-- 管理員操作日誌（v5.0 C4，供升級等手動操作追溯）
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID REFERENCES admin_users(id),
  action          TEXT NOT NULL,     -- 'upgrade_customer','edit_poi','delete_route' 等
  target_user_id  UUID,
  target_table    TEXT,
  target_id       UUID,
  detail          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- 0012_views.sql — 後台管理 Views
-- 依據：v6.0 D4 + v11.0 B3
-- 調整（MASTER_BUILD_PLAN Q4 決議）：
--   admin_pending_alerts 的 feedback 條件改用 v1.0 實際欄位
--   （category='bug' AND status='new'，原稿的 error_report/is_read/content 欄位不存在）
--   system_outages 以 ended_at IS NULL 判斷未解決（原稿 resolved_at 欄位不存在）
-- 可重複執行
-- ============================================================

-- 可疑多帳號複查（v6.0 D4；僅供人工判斷，刻意無一鍵封鎖）
CREATE OR REPLACE VIEW suspicious_multi_accounts
WITH (security_invoker = on) AS
SELECT device_fingerprint,
       COUNT(*) AS account_count,
       array_agg(email) AS emails,
       array_agg(created_at) AS signup_times
FROM user_profiles
WHERE device_fingerprint IS NOT NULL
GROUP BY device_fingerprint
HAVING COUNT(*) > 2
ORDER BY account_count DESC;

-- 後台待處理警示彙整（v11.0 B3，後台首頁 ⚠️ 橫幅資料來源）
CREATE OR REPLACE VIEW admin_pending_alerts
WITH (security_invoker = on) AS
-- 付款 Webhook 處理失敗（超過 5 分鐘仍未標記 processed）
SELECT 'payment_webhook_failed' AS alert_type,
       event_id AS reference,
       '付款 Webhook 處理失敗：' || event_type AS message,
       created_at
FROM processed_payment_events
WHERE processed_at IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes'
UNION ALL
-- 未處理的錯誤回報（超過 1 小時未讀）
SELECT 'user_error_report',
       id::TEXT,
       '用戶回報錯誤：' || LEFT(subject || ' — ' || message, 50),
       created_at
FROM feedback
WHERE category = 'bug'
  AND status = 'new'
  AND created_at < NOW() - INTERVAL '1 hour'
UNION ALL
-- 未解決的系統停機事件
SELECT 'system_outage',
       id::TEXT,
       '系統停機：' || started_at::TEXT || COALESCE('（' || affected_service || '）', ''),
       started_at
FROM system_outages
WHERE ended_at IS NULL
ORDER BY created_at DESC;
-- ============================================================
-- 0013_rls.sql — 全部資料表 Row Level Security
-- 依據：v1.0 §7.10 + v5.0 + v7.0 A2
-- 原則：
--   * service_role（後端 API）天然繞過 RLS，前端 anon/authenticated 依以下政策
--   * 公開資料（POI/路線/安全路段）任何人可讀，寫入僅後端
--   * 個資（profile/行程）僅本人可讀，寫入走後端 API
-- 可重複執行（DROP POLICY IF EXISTS + CREATE）
-- ============================================================

-- ── 公開唯讀資料 ─────────────────────────────────────────
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pois_read_all" ON pois;
CREATE POLICY "pois_read_all" ON pois FOR SELECT USING (TRUE);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routes_read_all" ON routes;
CREATE POLICY "routes_read_all" ON routes FOR SELECT USING (TRUE);

ALTER TABLE elevation_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "elevation_read_all" ON elevation_profiles;
CREATE POLICY "elevation_read_all" ON elevation_profiles FOR SELECT USING (TRUE);

ALTER TABLE danger_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "danger_read_all" ON danger_zones;
CREATE POLICY "danger_read_all" ON danger_zones FOR SELECT USING (TRUE);

ALTER TABLE restricted_roads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restricted_read_all" ON restricted_roads;
CREATE POLICY "restricted_read_all" ON restricted_roads FOR SELECT USING (TRUE);

ALTER TABLE night_warning_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "night_read_all" ON night_warning_segments;
CREATE POLICY "night_read_all" ON night_warning_segments FOR SELECT USING (TRUE);

-- ── 快取（僅後端 API 讀寫）───────────────────────────────
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_cache ENABLE ROW LEVEL SECURITY;
-- 不建立任何 anon 政策 = 前端完全不可見，service_role 繞過 RLS

-- ── 會員資料 ─────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON user_profiles;
CREATE POLICY "profiles_select_own" ON user_profiles FOR SELECT USING (auth.uid() = id);
-- 寫入一律走後端 API（service_role），前端不可直接 UPDATE

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
-- 僅後端 API 管理，無前端政策

-- ── 付款相關（僅後端）────────────────────────────────────
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_outages ENABLE ROW LEVEL SECURITY;

-- ── 回饋（任何人可新增，讀取僅後端）──────────────────────
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_insert_all" ON feedback;
CREATE POLICY "feedback_insert_all" ON feedback FOR INSERT WITH CHECK (TRUE);

-- ── 行程記錄（本人可讀；寫入走後端同步 API）──────────────
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trips_select_own" ON trips;
CREATE POLICY "trips_select_own" ON trips FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE trip_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trip_points_select_own" ON trip_points;
CREATE POLICY "trip_points_select_own" ON trip_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_points.trip_id AND t.user_id = auth.uid())
);
-- 公開追蹤頁（含 Realtime 訂閱）：有「有效分享連結」的行程，其軌跡點可被匿名讀取（v7.0 A4–A5）
DROP POLICY IF EXISTS "trip_points_public_via_share" ON trip_points;
CREATE POLICY "trip_points_public_via_share" ON trip_points FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_share_links l
    WHERE l.trip_id = trip_points.trip_id
      AND l.is_active = TRUE
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
  )
);

ALTER TABLE trip_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkpoints_select_own" ON trip_checkpoints;
CREATE POLICY "checkpoints_select_own" ON trip_checkpoints FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_checkpoints.trip_id AND t.user_id = auth.uid())
);

ALTER TABLE trip_day_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "day_summaries_select_own" ON trip_day_summaries;
CREATE POLICY "day_summaries_select_own" ON trip_day_summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_day_summaries.trip_id AND t.user_id = auth.uid())
);

-- ── 分享連結（有效期內任何人可讀，v7.0 A2）────────────────
ALTER TABLE trip_share_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "share_link_public_read" ON trip_share_links;
CREATE POLICY "share_link_public_read" ON trip_share_links FOR SELECT USING (
  is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
);

-- ── 社群驗證（登入者可新增自己的驗證，公開可讀）───────────
ALTER TABLE poi_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verifications_insert_own" ON poi_verifications;
CREATE POLICY "verifications_insert_own" ON poi_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "verifications_read_all" ON poi_verifications;
CREATE POLICY "verifications_read_all" ON poi_verifications FOR SELECT USING (TRUE);

-- ── 後台專用表（僅後端）──────────────────────────────────
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
-- admin_users 的 RLS 已於 0001 設定
