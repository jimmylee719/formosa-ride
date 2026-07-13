-- ============================================================
-- 0018_achievements.sql — 數位環島認證（GPS 佐證的徽章、縣市收集、完賽證書）
-- 依據：2026-07-13 Jimmy 指示（環島認證，規則從寬）
-- 設計說明：
--   1. 會員制（Phase 9）尚未上線 → 以 device_id 綁定，並預留 user_id
--      欄位供日後歸戶（同 trips / trip_plans 表做法）。
--   2. 一種成就 = 一列。type 三類：
--        'county'      key = 縣市代碼（造訪過該縣市）
--        'landmark'    key = 地標 id（見 lib/landmarks.ts）
--        'certificate' key = 'huandao'（完成環島，全系統唯一一張證書）
--   3. UNIQUE(device_id, type, key)：同一裝置同一成就只記一次（可重複 upsert）。
--   4. proof_* 欄位存「達成當下的軌跡點」佐證（哪個 trip、經緯度、時間）。
--   5. RLS 全啟用且不建 anon 政策 = 前端不可直接讀寫，一律經 API（service_role）
--      並驗證 device_id 所有權（同 trips / trip_plans 模式）。不可自行捏造證書。
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,   -- 預留歸戶
  device_id   TEXT NOT NULL,
  type        TEXT NOT NULL,          -- 'county' | 'landmark' | 'certificate'
  key         TEXT NOT NULL,          -- 縣市代碼 / 地標 id / 'huandao'
  trip_id     UUID REFERENCES trips(id) ON DELETE SET NULL,       -- 佐證來源行程
  proof_lat   NUMERIC(10, 7),         -- 佐證軌跡點緯度
  proof_lng   NUMERIC(10, 7),         -- 佐證軌跡點經度
  proof_at    TIMESTAMPTZ,            -- 佐證軌跡點時間
  distance_km NUMERIC,                -- 證書用：完賽總里程
  meta        JSONB,                  -- 彈性快照（縣市清單／達成地標清單等）
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, type, key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_device ON achievements(device_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user   ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type   ON achievements(type);

-- RLS：鎖死，僅 service_role（後端 API）可存取
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
