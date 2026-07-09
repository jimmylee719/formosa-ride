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
