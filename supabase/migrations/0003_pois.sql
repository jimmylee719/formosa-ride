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
