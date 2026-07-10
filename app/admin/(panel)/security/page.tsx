// /admin/security — 可疑多帳號複查（Phase 14C，v10.0 C2 + v6.0 D4）
// 純查詢顯示，供人工判斷；刻意不提供「一鍵封鎖」——避免誤判家庭共用裝置（§9 不做清單）。
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface SuspiciousRow {
  device_fingerprint: string;
  account_count: number;
  emails: string[];
  signup_times: string[];
}

export default async function SecurityReviewPage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('suspicious_multi_accounts')
    .select('*')
    .order('account_count', { ascending: false });
  const rows = (data ?? []) as SuspiciousRow[];

  return (
    <>
      <h1 className="text-xl font-bold">🛡️ 可疑多帳號複查</h1>
      <p className="mt-1 text-sm text-neutral-text">
        以下裝置指紋對應超過 2 個帳號，請人工判斷是否為惡意多開。
        系統不做自動封鎖（家庭共用裝置屬正常情境）。
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-danger-bg p-4 text-sm text-danger-text">
          查詢失敗，請稍後再試。
        </p>
      )}
      {!error && rows.length === 0 && (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm text-neutral-text">
          ✅ 目前沒有可疑多帳號。
          （會員系統於 Phase 9 上線後，此頁才會開始累積資料。）
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.device_fingerprint} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-caution-bg px-3 py-1 text-sm font-bold text-caution-text">
                  {r.account_count} 個帳號
                </span>
                <span className="truncate text-sm text-neutral-text">
                  指紋：{r.device_fingerprint}
                </span>
              </div>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-text">
                    <th className="py-1 font-normal">Email</th>
                    <th className="py-1 font-normal">註冊時間</th>
                  </tr>
                </thead>
                <tbody>
                  {r.emails.map((email, i) => (
                    <tr key={email} className="border-t border-neutral-border">
                      <td className="py-1">{email}</td>
                      <td className="py-1">
                        {r.signup_times[i]
                          ? new Date(r.signup_times[i]).toLocaleString('zh-TW')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
