// /admin/dashboard — 後台儀表板（Phase 14）
// 系統核心數據總覽 + 最近匯入紀錄（Phase 14C，v10.0 C4）；警示橫幅於 Phase 14D 加入。
import { createServiceClient } from '@/lib/supabase-server';

interface ImportHistoryRow {
  id: string;
  upload_type: string;
  file_name: string | null;
  record_count: number | null;
  error_count: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: string;
}

const UPLOAD_TYPE_LABEL: Record<string, string> = {
  poi: 'POI上傳',
  route: '路線上傳',
  correction: '修正資料',
};

const STATUS_LABEL: Record<string, string> = {
  completed: '✅ 完成',
  partial: '🟡 部分成功',
  failed: '❌ 失敗',
};

export const dynamic = 'force-dynamic';

async function count(
  table: string,
  filter?: { col: string; val: string }
): Promise<number> {
  const supabase = createServiceClient();
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count: n } = await q;
  return n ?? 0;
}

async function recentImports(): Promise<ImportHistoryRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('import_history')
    .select('id, upload_type, file_name, record_count, error_count, uploaded_by, uploaded_at, status')
    .order('uploaded_at', { ascending: false })
    .limit(5);
  return (data ?? []) as ImportHistoryRow[];
}

export default async function AdminDashboardPage() {
  const [pois, routes, trips, feedbackNew, dangerZones, imports] = await Promise.all([
    count('pois'),
    count('routes'),
    count('trips'),
    count('feedback', { col: 'status', val: 'new' }),
    count('danger_zones'),
    recentImports(),
  ]);

  const stats = [
    { label: 'POI 地點', value: pois, icon: '📍' },
    { label: '路線', value: routes, icon: '🛤️' },
    { label: '行程（旅途）', value: trips, icon: '🚴' },
    { label: '危險路段', value: dangerZones, icon: '⚠️' },
    { label: '未處理回饋', value: feedbackNew, icon: '📨', href: '/admin/feedback' },
  ];

  return (
    <>
      <h1 className="text-xl font-bold">📊 儀表板</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href ?? '#'}
            className={`rounded-2xl bg-white p-4 text-center shadow-sm ${
              s.href ? '' : 'pointer-events-none'
            }`}
          >
            <p className="text-2xl" aria-hidden>
              {s.icon}
            </p>
            <p
              className={`text-3xl font-bold ${
                s.label === '未處理回饋' && s.value > 0 ? 'text-danger-text' : ''
              }`}
            >
              {s.value.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-text">{s.label}</p>
          </a>
        ))}
      </div>
      {/* 最近匯入紀錄（Phase 14C，v10.0 C4：加在儀表板即可，不另開頁面） */}
      <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">📥 最近匯入紀錄</h2>
        {imports.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-text">
            尚無匯入紀錄。到「📤 批次上傳」進行第一次匯入。
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-border text-sm">
            {imports.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-neutral-text">
                  {new Date(h.uploaded_at).toLocaleString('zh-TW')}
                </span>
                <span className="font-bold">
                  {UPLOAD_TYPE_LABEL[h.upload_type] ?? h.upload_type}
                </span>
                <span>
                  {h.record_count ?? 0} 筆成功
                  {(h.error_count ?? 0) > 0 && `，${h.error_count} 筆有問題`}
                </span>
                <span className="flex-1" />
                <span>{STATUS_LABEL[h.status] ?? h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="info-secondary mt-4 text-neutral-text">
        會員統計將於 Phase 9（會員系統）建置後顯示；系統警示橫幅（Phase 14D）稍後加入。
      </p>
    </>
  );
}
