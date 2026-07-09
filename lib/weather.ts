// lib/weather.ts — 中央氣象署資料串接與解析（Phase 7，Server 專用）
// 資料集（2026-07-09 實測結構）：
//   F-C0032-001 36小時預報（elementName: Wx/PoP/MinT/MaxT/CI）
//   F-D0047-091 一週縣市預報（中文 ElementName，ElementValue 鍵名依元素而異）
//   W-C0033-001 縣市天氣特報（hazardConditions.hazards[].info.phenomena）
import 'server-only';

const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

export interface CurrentPeriod {
  startTime: string;
  endTime: string;
  wx: string;
  pop: number;
  minT: number;
  maxT: number;
  comfort: string;
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  wx: string;
  pop: number;
  minT: number | null;
  maxT: number | null;
  windDirection: string;
  windSpeed: number | null; // m/s
  uvi: number | null;
}

export interface HazardAlert {
  phenomena: string;
  significance: string;
  startTime: string;
  endTime: string;
}

export interface WeatherBundle {
  county: string;
  next36h: CurrentPeriod[];
  weekly: DailyForecast[];
  hazards: HazardAlert[];
  typhoonAlert: boolean;
  fetchedAt: string;
}

function apiKey(): string {
  return process.env.CWA_API_KEY ?? '';
}

async function cwaFetch(path: string): Promise<unknown> {
  const res = await fetch(`${CWA_BASE}/${path}&Authorization=${apiKey()}`, {
    // CWA 偶有慢回應
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`CWA ${res.status}`);
  const json = (await res.json()) as { success?: string };
  if (json.success !== 'true') throw new Error('CWA success!=true');
  return json;
}

/* ── 36 小時預報 ─────────────────────────────────────── */
interface F32Element {
  elementName: string;
  time: { startTime: string; endTime: string; parameter: { parameterName: string } }[];
}

async function fetch36h(county: string): Promise<CurrentPeriod[]> {
  const json = (await cwaFetch(
    `F-C0032-001?locationName=${encodeURIComponent(county)}`
  )) as { records: { location: { weatherElement: F32Element[] }[] } };
  const els = json.records.location[0]?.weatherElement ?? [];
  const get = (name: string) => els.find((e) => e.elementName === name)?.time ?? [];
  const wx = get('Wx');
  const pop = get('PoP');
  const minT = get('MinT');
  const maxT = get('MaxT');
  const ci = get('CI');

  return wx.map((t, i) => ({
    startTime: t.startTime,
    endTime: t.endTime,
    wx: t.parameter.parameterName,
    pop: Number(pop[i]?.parameter.parameterName ?? 0),
    minT: Number(minT[i]?.parameter.parameterName ?? 0),
    maxT: Number(maxT[i]?.parameter.parameterName ?? 0),
    comfort: ci[i]?.parameter.parameterName ?? '',
  }));
}

/* ── 一週預報 ────────────────────────────────────────── */
interface WeeklyTime {
  StartTime: string;
  EndTime: string;
  ElementValue: Record<string, string>[];
}
interface WeeklyElement {
  ElementName: string;
  Time: WeeklyTime[];
}

async function fetchWeekly(county: string): Promise<DailyForecast[]> {
  const wanted = ['最高溫度', '最低溫度', '天氣現象', '12小時降雨機率', '風向', '風速', '紫外線指數'];
  const json = (await cwaFetch(
    `F-D0047-091?LocationName=${encodeURIComponent(county)}&ElementName=${encodeURIComponent(wanted.join(','))}`
  )) as {
    records: { Locations: { Location: { WeatherElement: WeeklyElement[] }[] }[] };
  };
  const els = json.records.Locations[0]?.Location[0]?.WeatherElement ?? [];
  const get = (name: string) => els.find((e) => e.ElementName === name)?.Time ?? [];

  const days = new Map<string, DailyForecast>();
  const dayOf = (t: WeeklyTime) => (t.StartTime ?? '').slice(0, 10);
  const isDaytime = (t: WeeklyTime) => {
    const h = Number((t.StartTime ?? '').slice(11, 13));
    return h >= 6 && h < 18;
  };
  const ensure = (date: string): DailyForecast => {
    let d = days.get(date);
    if (!d) {
      d = {
        date,
        wx: '',
        pop: 0,
        minT: null,
        maxT: null,
        windDirection: '',
        windSpeed: null,
        uvi: null,
      };
      days.set(date, d);
    }
    return d;
  };

  for (const t of get('最高溫度')) {
    const v = Number(t.ElementValue[0]?.MaxTemperature ?? NaN);
    if (Number.isFinite(v)) {
      const d = ensure(dayOf(t));
      d.maxT = d.maxT == null ? v : Math.max(d.maxT, v);
    }
  }
  for (const t of get('最低溫度')) {
    const v = Number(t.ElementValue[0]?.MinTemperature ?? NaN);
    if (Number.isFinite(v)) {
      const d = ensure(dayOf(t));
      d.minT = d.minT == null ? v : Math.min(d.minT, v);
    }
  }
  for (const t of get('天氣現象')) {
    const d = ensure(dayOf(t));
    const wx = t.ElementValue[0]?.Weather ?? '';
    if (!d.wx || isDaytime(t)) d.wx = wx;
  }
  for (const t of get('12小時降雨機率')) {
    const v = Number(t.ElementValue[0]?.ProbabilityOfPrecipitation ?? NaN);
    if (Number.isFinite(v)) {
      const d = ensure(dayOf(t));
      d.pop = Math.max(d.pop, v);
    }
  }
  for (const t of get('風向')) {
    const d = ensure(dayOf(t));
    const dir = t.ElementValue[0]?.WindDirection ?? '';
    if (!d.windDirection || isDaytime(t)) d.windDirection = dir;
  }
  for (const t of get('風速')) {
    const v = Number(t.ElementValue[0]?.WindSpeed ?? NaN);
    if (Number.isFinite(v)) {
      const d = ensure(dayOf(t));
      d.windSpeed = d.windSpeed == null ? v : Math.max(d.windSpeed, v);
    }
  }
  for (const t of get('紫外線指數')) {
    const v = Number(t.ElementValue[0]?.UVIndex ?? NaN);
    if (Number.isFinite(v)) {
      const d = ensure(dayOf(t));
      d.uvi = d.uvi == null ? v : Math.max(d.uvi, v);
    }
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
}

/* ── 縣市特報（含颱風） ───────────────────────────────── */
interface HazardRecord {
  info: { phenomena: string; significance: string };
  validTime: { startTime: string; endTime: string };
}

async function fetchHazards(county: string): Promise<HazardAlert[]> {
  const json = (await cwaFetch(
    `W-C0033-001?locationName=${encodeURIComponent(county)}`
  )) as {
    records: {
      location: { hazardConditions: { hazards: HazardRecord[] | null } }[];
    };
  };
  const hazards = json.records.location[0]?.hazardConditions?.hazards ?? [];
  return (hazards ?? []).map((h) => ({
    phenomena: h.info.phenomena,
    significance: h.info.significance,
    startTime: h.validTime.startTime,
    endTime: h.validTime.endTime,
  }));
}

/** 取得縣市完整天氣包（三個資料集平行抓取） */
export async function fetchWeatherBundle(county: string): Promise<WeatherBundle> {
  const [next36h, weekly, hazards] = await Promise.all([
    fetch36h(county),
    fetchWeekly(county),
    fetchHazards(county),
  ]);
  return {
    county,
    next36h,
    weekly,
    hazards,
    typhoonAlert: hazards.some((h) => h.phenomena.includes('颱風')),
    fetchedAt: new Date().toISOString(),
  };
}
