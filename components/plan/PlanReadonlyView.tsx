// components/plan/PlanReadonlyView.tsx — 行程唯讀呈現（Phase 19B）
// 分享頁與列印頁共用；純呈現無互動，Server/Client 皆可 render。
import { POI_ICONS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';
import type { TripPlanDetail } from '@/types/plan';

export function PlanReadonlyView({ plan }: { plan: TripPlanDetail }) {
  return (
    <div>
      <h1 className="info-primary font-bold">🗓️ {plan.name}</h1>
      <p className="info-secondary text-neutral-text">
        {plan.days.length} day{plan.days.length !== 1 ? 's' : ''} {plan.days.length} 天
        {plan.start_date && ` · departs 出發 ${plan.start_date}`}
      </p>
      {plan.notes && <p className="info-secondary mt-1">{plan.notes}</p>}

      {plan.days.map((day) => (
        <section
          key={day.day_number}
          className="mt-3 break-inside-avoid rounded-2xl bg-white p-4 shadow-sm print:border print:border-neutral-border print:shadow-none"
        >
          <h2 className="info-primary font-bold">
            Day {day.day_number} 第 {day.day_number} 天
            {plan.start_date &&
              ` · ${new Date(new Date(plan.start_date).getTime() + (day.day_number - 1) * 86400_000).toISOString().slice(5, 10)}`}
          </h2>
          <p className="info-secondary mt-1">
            {day.depart_time && `🕖 Depart 出發 ${day.depart_time}`}
            {day.depart_time && day.start_name && ' · '}
            {day.start_name && `📍 From ${day.start_name}`}
          </p>
          {day.route && (
            <p className="info-secondary">
              🛤️ {day.route.name_en || day.route.name_zh}（{day.route.distance_km} km）
            </p>
          )}

          {day.stops.length > 0 && (
            <ol className="mt-2 flex flex-col gap-1">
              {day.stops.map((s, i) => (
                <li key={i} className="info-secondary">
                  {i + 1}.{' '}
                  <span aria-hidden>
                    {s.poi ? (POI_ICONS[s.poi.type as POIType] ?? '📍') : '✏️'}
                  </span>{' '}
                  {s.poi ? (
                    <>
                      <span className="font-bold">{s.poi.name_en || s.poi.name_zh}</span>
                      {s.poi.name_en && s.poi.name_en !== s.poi.name_zh && (
                        <span className="text-neutral-text">（{s.poi.name_zh}）</span>
                      )}
                    </>
                  ) : (
                    <span className="font-bold">{s.custom_name}</span>
                  )}
                  {s.note && <span className="text-neutral-text"> — {s.note}</span>}
                  {s.custom_google_url && (
                    <a
                      href={s.custom_google_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-info-text underline print:hidden"
                    >
                      Maps↗
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
          {day.notes && (
            <p className="info-secondary mt-2 rounded-lg bg-neutral-bg p-2 print:bg-white">
              💬 {day.notes}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
