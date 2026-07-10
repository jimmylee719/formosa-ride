-- ============================================================
-- 0015_danger_zones_accident_fields.sql — 危險路段 RPC 補回事故統計欄
-- 依據：v3.0 A5（警示卡需顯示事故件數、資料來源、年度）
-- Phase 15：匯入警政署 114 年事故資料後，前端卡片需要這些欄位。
-- 變更回傳型別需先 DROP（CREATE OR REPLACE 不允許改 RETURNS TABLE）。
-- 可重複執行
-- ============================================================

DROP FUNCTION IF EXISTS get_danger_zones_in_bbox(NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN);

CREATE FUNCTION get_danger_zones_in_bbox(
  min_lng NUMERIC, min_lat NUMERIC,
  max_lng NUMERIC, max_lat NUMERIC,
  include_night_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID, name_zh TEXT, name_en TEXT, level danger_level,
  geometry TEXT,  -- GeoJSON
  reason_zh TEXT, reason_en TEXT, is_night_only BOOLEAN,
  accident_count INTEGER, accident_source TEXT, data_year INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.name_zh, d.name_en, d.level,
    ST_AsGeoJSON(d.geometry)::TEXT AS geometry,
    d.reason_zh, d.reason_en, d.is_night_only,
    d.accident_count, d.accident_source, d.data_year
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
