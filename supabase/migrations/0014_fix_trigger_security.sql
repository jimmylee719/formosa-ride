-- ============================================================
-- 0014_fix_trigger_security.sql — 觸發器安全性修正（Phase 4A 實測發現）
-- 問題一：handle_new_user 在 Supabase Auth 建立用戶的執行環境中
--         search_path 不含 public，導致「Database error creating new user」。
--         修正：SET search_path = public + 明確 schema 限定。
-- 問題二：update_poi_verification_count 預設以呼叫者身分執行（SECURITY INVOKER），
--         一般登入用戶對 pois 無 UPDATE 權限，觸發器會被 RLS 擋下。
--         修正：改為 SECURITY DEFINER。
-- 可重複執行
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, tier, trial_started_at, trial_expires_at, nationality, preferred_lang)
  VALUES (
    NEW.id, NEW.email, 'trial'::public.member_tier, NOW(), NOW() + INTERVAL '48 hours',
    NEW.raw_user_meta_data ->> 'nationality',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_lang', 'zh')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_poi_verification_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pois SET
    verification_count = verification_count + 1,
    last_verified_at = NOW()
  WHERE id = NEW.poi_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
