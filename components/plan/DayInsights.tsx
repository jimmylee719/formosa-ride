'use client';
// components/plan/DayInsights.tsx — 行程日智慧提醒（Phase 19C）
// 三項檢查（皆重用既有引擎，資料不足時安靜不顯示，不硬湊）：
//   🌇 日落安全：預計騎乘時間 vs 當日日落（SunriseSunset.io 支援未來日期）
//   🌦️ 天氣：出發日在 36 小時內才顯示（氣象署預報範圍，不假裝能預測更遠）
//   🛒 補給空窗：沿線 >30km 無便利商店/超市（>150km 路線不分析）
import { useEffect, useState } from 'react';
import { TAIWAN_COUNTIES } from '@/lib/taiwan-counties';

/** 旅行均速（km/h）：含短暫停留的環島常見配速，估算用 */
const TOURING_SPEED_KMH = 15;
const SUNSET_BUFFER_MIN = 30;

interface Props {
  routeId: string;
  routeDistanceKm: number;
  /** 路線第一個縣市（原始寫法，內部會正規化） */
  county: string | null;
  /** 這一天的日期（依 start_date + day_number 推算）；未設出發日則為 null */
  dateISO: string | null;
  departTime: string | null; // 'HH:MM'
}

interface Insight {
  tone: 'ok' | 'warn' | 'danger' | 'info';
  text: string;
}

const TONE_CLASS: Record<Insight['tone'], string> = {
  ok: 'bg-safe-bg text-safe-text',
  warn: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  info: 'bg-info-bg text-info-text',
};

/** '5:07:25 PM' → 當日分鐘數 */
function parseClockToMinutes(s: string): number | null {
  const m = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3] ?? '')) h += 12;
  return h * 60 + Number(m[2]);
}

const toCwa = (county: string) => county.replace(/^台/, '臺');

export function DayInsights({ routeId, routeDistanceKm, county, dateISO, departTime }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    let alive = true;
    const out: Insight[] = [];
    const push = (i: Insight) => {
      if (!alive) return;
      out.push(i);
      setInsights([...out]);
    };

    const centroid = county
      ? TAIWAN_COUNTIES.find((c) => c.name === toCwa(county))
      : null;

    void (async () => {
      // 🌇 日落安全檢查（需日期＋縣市座標）
      if (dateISO && centroid) {
        try {
          const res = await fetch(
            `/api/solar?lat=${centroid.lat}&lng=${centroid.lng}&date=${dateISO}`
          );
          if (res.ok) {
            const { sunset } = (await res.json()) as { sunset: string };
            const sunsetMin = parseClockToMinutes(sunset);
            if (sunsetMin != null) {
              const depart = departTime ?? '07:00';
              const dm = /(\d{2}):(\d{2})/.exec(depart);
              const departMin = dm ? Number(dm[1]) * 60 + Number(dm[2]) : 420;
              const rideMin = (routeDistanceKm / TOURING_SPEED_KMH) * 60;
              const arrivalMin = departMin + rideMin;
              const hh = String(Math.floor((arrivalMin / 60) % 24)).padStart(2, '0');
              const mm = String(Math.round(arrivalMin % 60)).padStart(2, '0');
              const sunsetHH = `${Math.floor(sunsetMin / 60)}:${String(sunsetMin % 60).padStart(2, '0')}`;
              if (arrivalMin > sunsetMin) {
                push({
                  tone: 'danger',
                  text: `🌇 ${routeDistanceKm} km ≈ ${(rideMin / 60).toFixed(1)}h at ${TOURING_SPEED_KMH} km/h → arrive ~${hh}:${mm}, AFTER sunset ${sunsetHH}. Split this day or depart earlier. 預計 ${hh}:${mm} 抵達，已超過日落 ${sunsetHH}——建議拆天或提早出發`,
                });
              } else if (arrivalMin > sunsetMin - SUNSET_BUFFER_MIN) {
                push({
                  tone: 'warn',
                  text: `🌇 Arrive ~${hh}:${mm}, sunset ${sunsetHH} — cutting it close. 預計 ${hh}:${mm} 抵達，貼近日落 ${sunsetHH}，餘裕不足`,
                });
              } else {
                push({
                  tone: 'ok',
                  text: `🌇 Arrive ~${hh}:${mm}, sunset ${sunsetHH} — comfortable daylight margin. 預計 ${hh}:${mm} 抵達，日落前餘裕充足`,
                });
              }
            }
          }
        } catch {
          /* 離線靜默 */
        }
      }

      // 🌦️ 天氣（出發日在 36 小時內才有預報）
      if (dateISO && centroid) {
        const hoursAway = (new Date(`${dateISO}T00:00:00+08:00`).getTime() - Date.now()) / 3600_000;
        if (hoursAway > -24 && hoursAway < 36) {
          try {
            const res = await fetch(`/api/weather?county=${encodeURIComponent(toCwa(county as string))}`);
            if (res.ok) {
              const { next36h } = (await res.json()) as {
                next36h: Array<{
                  wx: string;
                  wx_en: string | null;
                  pop: number;
                  minT: number;
                  maxT: number;
                }>;
              };
              const f = next36h?.[0];
              if (f) {
                push({
                  tone: f.pop >= 60 ? 'warn' : 'info',
                  text: `🌦️ ${toCwa(county as string)}：${f.wx_en ? `${f.wx_en} ` : ''}${f.wx}，rain 降雨 ${f.pop}%，${f.minT}–${f.maxT}°C${f.pop >= 60 ? ' — bring rain gear 記得帶雨具' : ''}`,
                });
              }
            }
          } catch {
            /* 靜默 */
          }
        }
      }

      // 🛒 補給空窗
      try {
        const res = await fetch(`/api/routes/${routeId}/supply-gaps`);
        if (res.ok) {
          const json = (await res.json()) as {
            too_long?: boolean;
            gaps?: Array<{ from_km: number; to_km: number; length_km: number }>;
          };
          if (!json.too_long && json.gaps) {
            for (const g of json.gaps) {
              push({
                tone: 'warn',
                text: `🛒 No convenience store for ${g.length_km} km（km ${g.from_km} → ${g.to_km}）— carry extra water & snacks. 這段 ${g.length_km} 公里無便利商店，請帶足水與補給`,
              });
            }
          }
        }
      } catch {
        /* 靜默 */
      }
    })();

    return () => {
      alive = false;
    };
  }, [routeId, routeDistanceKm, county, dateISO, departTime]);

  if (insights.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {insights.map((i, idx) => (
        <p key={idx} className={`rounded-lg p-2 text-sm ${TONE_CLASS[i.tone]}`}>
          {i.text}
        </p>
      ))}
    </div>
  );
}
