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
