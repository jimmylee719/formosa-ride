// lib/supabase-server.ts — 伺服器端 Supabase clients（僅限 Server 環境 import）
// service client 使用 SUPABASE_SERVICE_ROLE_KEY，繞過 RLS——絕不可讓此檔進入前端 bundle。
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/** 公開資料查詢用（遵循 RLS，等同前端權限） */
export function createAnonServerClient(): SupabaseClient {
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: { persistSession: false },
  });
}

/** 特權操作用（繞過 RLS，僅限後端邏輯：webhook、admin、cron） */
export function createServiceClient(): SupabaseClient {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false },
  });
}
