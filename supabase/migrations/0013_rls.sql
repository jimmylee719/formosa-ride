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
