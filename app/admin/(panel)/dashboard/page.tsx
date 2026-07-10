// /admin/dashboard — 後台儀表板（Phase 14）
// 系統核心數據總覽；匯入紀錄區塊於 Phase 14C、警示橫幅於 Phase 14D 加入。
import { createServiceClient } from '@/lib/supabase-server';

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

export default async function AdminDashboardPage() {
  const [pois, routes, trips, feedbackNew, dangerZones] = await Promise.all([
    count('pois'),
    count('routes'),
    count('trips'),
    count('feedback', { col: 'status', val: 'new' }),
    count('danger_zones'),
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
      <p className="info-secondary mt-6 text-neutral-text">
        會員統計將於 Phase 9（會員系統）建置後顯示；匯入紀錄（Phase 14C）、
        系統警示橫幅（Phase 14D）陸續加入。
      </p>
    </>
  );
}
