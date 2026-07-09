// lib/supabase.ts — 瀏覽器端 Supabase client（anon key，可公開）
// 登入 session 由 Supabase Auth 管理（Phase 9 起使用）
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);
