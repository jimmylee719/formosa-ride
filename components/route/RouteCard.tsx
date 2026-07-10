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
          {/* 英文為主（2026-07-10 指示）；中英同名（如地方車道）只顯示一行 */}
          <h2 className="info-primary truncate font-bold">{route.name_en}</h2>
          {route.name_zh !== route.name_en && (
            <p className="info-secondary truncate text-neutral-text">
              {route.name_zh}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-info-bg px-3 py-0.5 text-sm text-info-text">
          {typeLabel.en} {typeLabel.zh}
        </span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${diff.className}`}>
          {diff.en} {diff.zh}
        </span>
        <span className="info-secondary font-bold">
          📏 {route.distance_km} km
        </span>
        {route.suggested_days != null && (
          <span className="info-secondary">🗓️ ~{route.suggested_days} days</span>
        )}
      </div>
      {route.counties.length > 0 && (
        <p className="info-secondary mt-1 text-neutral-text">
          Via 經過：{route.counties.join('、')}
        </p>
      )}
    </Link>
  );
}
