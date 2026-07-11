// components/plan/PlanReadonlyView.tsx — 行程唯讀呈現（Phase 19B）
// 分享頁與列印頁共用；純呈現無互動，Server/Client 皆可 render。
// 2026-07-11（18 歲揪團情境）：每個停靠點是「休息／會合點」，補上導航連結，
// 落隊的朋友點一下就能導到會合點；路線名可點看完整路徑。
import Link from 'next/link';
import { POI_ICONS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';
import type { TripPlanDetail } from '@/types/plan';

// 會合點導航連結（Google Maps 定位；到頁面後可一鍵開始導航）
function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

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
          {day.route &&
            (day.route_id ? (
              <Link
                href={`/route/${day.route_id}`}
                className="info-secondary text-info-text underline"
              >
                🛤️ {day.route.name_en || day.route.name_zh}（{day.route.distance_km} km）
                <span className="print:hidden"> · see route ↗</span>
              </Link>
            ) : (
              <p className="info-secondary">
                🛤️ {day.route.name_en || day.route.name_zh}（{day.route.distance_km} km）
              </p>
            ))}

          {day.stops.length > 0 && (
            <>
              <p className="info-secondary mt-2 font-bold text-neutral-text">
                📍 Rest / meetup points 休息／會合點
              </p>
              <ol className="mt-1 flex flex-col gap-1.5">
                {day.stops.map((s, i) => {
                  const hasCoords =
                    s.poi != null && s.poi.lat != null && s.poi.lng != null;
                  const navUrl = s.custom_google_url
                    ? s.custom_google_url
                    : hasCoords
                      ? mapsUrl(s.poi!.lat as number, s.poi!.lng as number)
                      : null;
                  return (
                    <li key={i} className="info-secondary">
                      <span className="font-bold">{i + 1}.</span>{' '}
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
                      {navUrl && (
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 whitespace-nowrap text-info-text underline print:hidden"
                        >
                          🧭 Navigate 導航↗
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
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
