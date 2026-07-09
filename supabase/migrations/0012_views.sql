-- ============================================================
-- 0012_views.sql — 後台管理 Views
-- 依據：v6.0 D4 + v11.0 B3
-- 調整（MASTER_BUILD_PLAN Q4 決議）：
--   admin_pending_alerts 的 feedback 條件改用 v1.0 實際欄位
--   （category='bug' AND status='new'，原稿的 error_report/is_read/content 欄位不存在）
--   system_outages 以 ended_at IS NULL 判斷未解決（原稿 resolved_at 欄位不存在）
-- 可重複執行
-- ============================================================

-- 可疑多帳號複查（v6.0 D4；僅供人工判斷，刻意無一鍵封鎖）
CREATE OR REPLACE VIEW suspicious_multi_accounts
WITH (security_invoker = on) AS
SELECT device_fingerprint,
       COUNT(*) AS account_count,
       array_agg(email) AS emails,
       array_agg(created_at) AS signup_times
FROM user_profiles
WHERE device_fingerprint IS NOT NULL
GROUP BY device_fingerprint
HAVING COUNT(*) > 2
ORDER BY account_count DESC;

-- 後台待處理警示彙整（v11.0 B3，後台首頁 ⚠️ 橫幅資料來源）
CREATE OR REPLACE VIEW admin_pending_alerts
WITH (security_invoker = on) AS
-- 付款 Webhook 處理失敗（超過 5 分鐘仍未標記 processed）
SELECT 'payment_webhook_failed' AS alert_type,
       event_id AS reference,
       '付款 Webhook 處理失敗：' || event_type AS message,
       created_at
FROM processed_payment_events
WHERE processed_at IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes'
UNION ALL
-- 未處理的錯誤回報（超過 1 小時未讀）
SELECT 'user_error_report',
       id::TEXT,
       '用戶回報錯誤：' || LEFT(subject || ' — ' || message, 50),
       created_at
FROM feedback
WHERE category = 'bug'
  AND status = 'new'
  AND created_at < NOW() - INTERVAL '1 hour'
UNION ALL
-- 未解決的系統停機事件
SELECT 'system_outage',
       id::TEXT,
       '系統停機：' || started_at::TEXT || COALESCE('（' || affected_service || '）', ''),
       started_at
FROM system_outages
WHERE ended_at IS NULL
ORDER BY created_at DESC;
