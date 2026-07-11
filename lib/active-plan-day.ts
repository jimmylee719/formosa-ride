'use client';
// lib/active-plan-day.ts — 「開始這一天」交接（Phase 19C）
// 規劃頁把當日停靠點放進 localStorage → 地圖旅途模式顯示可勾選的清單。
// 純本機狀態（與行程資料庫無關），開始新的一天即覆蓋。

const KEY = 'formosa_active_plan_day';

export interface ActivePlanStop {
  name_zh: string;
  name_en: string | null;
  done: boolean;
}

export interface ActivePlanDay {
  planId: string;
  dayNumber: number;
  /** 顯示用標題，例如「西海岸4天 · Day 2」 */
  label: string;
  stops: ActivePlanStop[];
  savedAt: string;
}

export function getActivePlanDay(): ActivePlanDay | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ActivePlanDay;
    return Array.isArray(d.stops) ? d : null;
  } catch {
    return null;
  }
}

export function setActivePlanDay(day: ActivePlanDay): void {
  window.localStorage.setItem(KEY, JSON.stringify(day));
}

export function toggleActiveStop(index: number): ActivePlanDay | null {
  const d = getActivePlanDay();
  const stop = d?.stops[index];
  if (!d || !stop) return d;
  stop.done = !stop.done;
  setActivePlanDay(d);
  return d;
}

export function clearActivePlanDay(): void {
  window.localStorage.removeItem(KEY);
}
