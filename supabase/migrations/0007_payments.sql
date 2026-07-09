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
