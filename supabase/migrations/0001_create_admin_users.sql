-- ============================================================
-- 0001_create_admin_users.sql
-- Phase 0A：後台管理員帳號資料表
-- 依據：v5.0 C1 節 + v11.0 B1 節（username 欄位）
-- 可重複執行（IF NOT EXISTS / DROP POLICY IF EXISTS）
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 管理員帳號與一般會員（user_profiles / auth.users）完全分離，
-- 避免一般會員帳號被盜後波及後台（v5.0 C1）
CREATE TABLE IF NOT EXISTS admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE,             -- v11.0：登入可用 username 或 email
  password_hash   TEXT NOT NULL,           -- bcrypt cost 12，絕不存明文
  display_name    TEXT,
  role            TEXT DEFAULT 'admin',    -- 未來可擴充 'super_admin'
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS：僅 service_role 可存取，前台 anon key 完全無法查詢此表
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_service_only" ON admin_users;
CREATE POLICY "admin_users_service_only" ON admin_users FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role'
);
