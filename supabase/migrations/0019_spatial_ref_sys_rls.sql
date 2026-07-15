-- ============================================================
-- 0019_spatial_ref_sys_rls.sql — 修正 Supabase 安全建議 rls_disabled_in_public
-- 背景（2026-07-15）：Supabase Advisor 標記 public.spatial_ref_sys「未啟用 RLS」。
--   spatial_ref_sys 是 PostGIS 內建的「座標參考系統定義表」（EPSG/SRID 對照），
--   內容為公開的地理測量標準資料，不含任何使用者/業務資料。它預設不啟用 RLS，
--   是所有使用 PostGIS 的 Supabase 專案都會被標記的已知項目。
--   本系統其餘 30 張表皆已啟用 RLS 並實測擋下匿名讀寫（error 42501），無資料外洩。
--
-- 修正：對 spatial_ref_sys 啟用 RLS（不建任何政策 = 匿名一律拒絕）。
--   PostGIS 內部運算以表擁有者/超級使用者身分執行，會略過 RLS，故不影響地圖/空間功能。
--
-- ⚠️ 若此行報錯「must be owner of table spatial_ref_sys」（部分 Supabase 專案 anon
--    對此表另有 GRANT），改用下方註解的 REVOKE 版本移除匿名存取即可。
-- 可重複執行
-- ============================================================

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- 備援方案（若上面因擁有權報錯，改跑這行；移除匿名/登入角色的存取權）：
-- REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
