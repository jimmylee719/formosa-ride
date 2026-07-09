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
