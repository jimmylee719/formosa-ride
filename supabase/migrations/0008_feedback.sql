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
