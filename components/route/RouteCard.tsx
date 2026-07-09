// components/route/RouteCard.tsx — 路線列表卡片（Phase 5）
import Link from 'next/link';
import type { RouteListItem } from '@/types/route';
import { DIFFICULTY_LABELS, ROUTE_TYPE_LABELS } from '@/types/route';

export function RouteCard({ route }: { route: RouteListItem }) {
  const typeLabel = ROUTE_TYPE_LABELS[route.type];
  const diff = DIFFICULTY_LABELS[route.difficulty];

  return (
    <Link
      href={`/route/${route.id}`}
      className="block rounded-2xl border border-neutral-border bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {typeLabel.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="info-primary truncate font-bold">{route.name_zh}</h2>
          <p className="info-secondary truncate text-neutral-text">
            {route.name_en}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-info-bg px-3 py-0.5 text-sm text-info-text">
          {typeLabel.zh}
        </span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${diff.className}`}>
          {diff.zh} {diff.en}
        </span>
        <span className="info-secondary font-bold">
          📏 {route.distance_km} km
        </span>
        {route.suggested_days != null && (
          <span className="info-secondary">🗓️ 約 {route.suggested_days} 天</span>
        )}
      </div>
      {route.counties.length > 0 && (
        <p className="info-secondary mt-1 text-neutral-text">
          經過：{route.counties.join('、')}
        </p>
      )}
    </Link>
  );
}
