-- ============================================================
-- 0006_members_sessions.sql — 會員 profile、試用機制、單裝置 session
-- 依據：v5.0 B2–B3 + v6.0 C/D/E/I + v10.0 D + v12.0 D1（通用欄位命名）
-- 登入方式：Email + 密碼（2026-07-09 Jimmy 指示，無第三方 OAuth）
-- 可重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  display_name      TEXT,
  full_name         TEXT,                    -- v6.0 C1 必填姓名
  phone_e164        TEXT,                    -- E.164 標準格式，如 +886912345678
  tier              member_tier NOT NULL DEFAULT 'trial',
  trial_started_at  TIMESTAMPTZ DEFAULT NOW(),
  trial_expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  upgraded_at       TIMESTAMPTZ,
  upgrade_method    TEXT,                    -- 'lemonsqueezy_payment' | 'admin_manual'
  external_customer_id TEXT,                 -- v12.0 通用命名（原 stripe_customer_id）
  external_payment_id  TEXT,                 -- v12.0 通用命名（原 stripe_payment_id）
  plan_type         TEXT,                    -- 'lifetime_usd' | NULL
  auth_provider     TEXT DEFAULT 'email',    -- 2026-07-09 起僅有 'email'
  device_fingerprint TEXT,                   -- 註冊時輕量指紋，僅供人工複查
  nationality       TEXT,
  preferred_lang    TEXT DEFAULT 'zh',       -- 'zh' | 'en'
  terms_agreed_at   TIMESTAMPTZ,             -- v6.0 I5：同意條款存證
  terms_version     TEXT DEFAULT 'v1.0',
  last_login_at     TIMESTAMPTZ,
  signup_source     TEXT,
  notes             TEXT,                    -- 後台管理員備註
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT unique_phone UNIQUE (phone_e164)  -- 防多帳號濫用的最後防線（v6.0 D2）
);

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires ON user_profiles(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_fingerprint ON user_profiles(device_fingerprint);

-- 註冊時自動建立 profile（48 小時試用起算）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, tier, trial_started_at, trial_expires_at, nationality, preferred_lang)
  VALUES (
    NEW.id, NEW.email, 'trial', NOW(), NOW() + INTERVAL '48 hours',
    NEW.raw_user_meta_data ->> 'nationality',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_lang', 'zh')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 即時計算有效會員等級（v5.0 B3 方法一：查詢時判斷，不依賴排程）
CREATE OR REPLACE FUNCTION get_effective_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  profile RECORD;
BEGIN
  SELECT tier, trial_expires_at INTO profile
  FROM user_profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'free';
  ELSIF profile.tier = 'pro' THEN
    RETURN 'pro';
  ELSIF profile.tier = 'trial' AND profile.trial_expires_at > NOW() THEN
    RETURN 'trial';
  ELSE
    RETURN 'free';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── 單裝置登入 session（v6.0 E2 + v10.0 D2 三十分鐘容許）──────

CREATE TABLE IF NOT EXISTS active_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token   TEXT UNIQUE NOT NULL,
  device_info     TEXT,
  ip_address      TEXT,
  login_at        TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat  TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE,
  revoked_reason  TEXT  -- 'new_device_login' | 'manual_logout' | 'timeout'
);

-- 資料庫層保證：同一用戶最多一筆活躍 session
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_user
  ON active_sessions(user_id) WHERE is_active = TRUE;

-- 逾時清理：30 分鐘容許（v10.0 D2，取代 v6.0 的 5 分鐘）
-- 主要判斷以「讀取時檢查 last_heartbeat」為準，此函數僅作資料清理
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  UPDATE active_sessions
  SET is_active = FALSE, revoked_reason = 'timeout'
  WHERE is_active = TRUE AND last_heartbeat < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;
