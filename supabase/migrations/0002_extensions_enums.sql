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
