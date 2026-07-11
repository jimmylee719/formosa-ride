'use client';
// components/mobile/JourneyHUD.tsx — 旅途模式 HUD（Phase 11，v2.0 C3/C6）
// 「嚮導，不是司令」：只記錄與提示，不指揮路線（v2.0 C1 設計哲學）。
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/map-store';
import {
  journeyTracker,
  type JourneyStats,
  type TrackedPoint,
} from '@/lib/journey-tracker';
import { getDeviceId } from '@/lib/device-id';
import { getAheadPOIs } from '@/lib/ahead-pois';
import { checkProximityAlerts } from '@/lib/proximity-alerts';
import {
  getActivePlanDay,
  toggleActiveStop,
  clearActivePlanDay,
  type ActivePlanDay,
} from '@/lib/active-plan-day';
import { crossedMilestone, countyChangeMessage } from '@/lib/milestones';
import { nearestCounty } from '@/lib/taiwan-counties';
import { POI_ICONS } from '@/lib/poi-icons';
import { ShareModal } from '@/components/mobile/ShareModal';
import { MarkModal } from '@/components/mobile/MarkModal';
import type { POIRecord } from '@/types/poi';

const TRAIL_SOURCE = 'journey-trail';
const TRAIL_LAYER = 'journey-trail-line';

export function JourneyHUD() {
  const map = useMapStore((s) => s.map);
  const setSelectedDanger = useMapStore((s) => s.setSelectedDanger);
  const router = useRouter();
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [aheadPois, setAheadPois] = useState<POIRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [planDay, setPlanDay] = useState<ActivePlanDay | null>(null);
  const trailRef = useRef<[number, number][]>([]);
  const drawTrailRef = useRef<(() => void) | null>(null);
  const prevKmRef = useRef(0);
  const prevCountyRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProxCheckRef = useRef(0);
  const alertCooldownRef = useRef(new Map<string, number>());

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // 麵包屑軌跡（淡藍線，v2.0 C3）
  const drawTrail = useCallback(() => {
    if (!map) return;
    const data = {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: trailRef.current },
      properties: {},
    };
    const src = map.getSource(TRAIL_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
      return;
    }
    if (!map.isStyleLoaded()) {
      map.once('idle', () => drawTrailRef.current?.());
      return;
    }
    map.addSource(TRAIL_SOURCE, { type: 'geojson', data });
    map.addLayer({
      id: TRAIL_LAYER,
      type: 'line',
      source: TRAIL_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#60A5FA', 'line-width': 4, 'line-opacity': 0.7 },
    });
  }, [map]);
  drawTrailRef.current = drawTrail;

  // 掛載：恢復進行中的旅途（v2.0 離線/重載恢復）
  useEffect(() => {
    let alive = true;
    void journeyTracker.init().then(async (trip) => {
      if (!alive || !trip) return;
      const pts = await journeyTracker.getTripPoints(trip.tripId);
      trailRef.current = pts.map((p) => [p.lng, p.lat]);
      prevKmRef.current = trip.totalDistanceKm;
      if (trip.status === 'active') await journeyTracker.resume();
      setStats(journeyTracker.getStats());
      drawTrail();
    });
    return () => {
      alive = false;
    };
  }, [drawTrail]);

  // 鄰近警示（v3.0 A6，2026-07-11 接線）：騎行中接近危險路段/事故熱點/禁行路段時
  // 自動彈出 DangerWarningCard。60 秒節流；同一地點 30 分鐘冷卻，避免警示疲乏。
  const checkProximity = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastProxCheckRef.current < 60_000) return;
      lastProxCheckRef.current = now;
      const alerts = await checkProximityAlerts(lat, lng, useMapStore.getState().isNightMode);
      const alert = alerts.find(
        (a) => now - (alertCooldownRef.current.get(a.name) ?? 0) > 30 * 60_000
      );
      if (!alert) return;
      alertCooldownRef.current.set(alert.name, now);
      if (useMapStore.getState().selectedDanger) return; // 已有警示卡開啟，不覆蓋
      // 震動提醒（支援的裝置）：騎行中眼睛在路上，觸覺比視覺先到
      navigator.vibrate?.(alert.level === 'high' || alert.level === 'restricted' ? [200, 100, 200] : 200);
      setSelectedDanger({
        kind: alert.type === 'restricted' ? 'restricted' : 'danger',
        level: alert.level,
        name_zh: alert.name,
        name_en: alert.name_en,
        reason_zh: alert.reason_zh,
        reason_en: alert.reason_en,
        accident_count: alert.accident_count,
        accident_source: alert.accident_source,
        data_year: alert.data_year,
        road_number: alert.road_number,
        law_basis: alert.law_basis,
      });
    },
    [setSelectedDanger]
  );

  // 訂閱統計與點位
  useEffect(() => {
    const offStats = journeyTracker.onStats((s) => {
      setStats(s.tripId ? s : null);
      // 距離里程碑（v2.0 C8）
      const m = crossedMilestone(prevKmRef.current, s.totalDistanceKm);
      if (m) showToast(`${m.message_zh} ${m.message_en}`);
      prevKmRef.current = s.totalDistanceKm;
    });
    const offPoint = journeyTracker.onPoint((p: TrackedPoint) => {
      trailRef.current = [...trailRef.current, [p.lng, p.lat]];
      drawTrail();
      // 縣市里程碑（近似）
      const county = nearestCounty(p.lat, p.lng).name;
      if (prevCountyRef.current && county !== prevCountyRef.current) {
        const msg = countyChangeMessage(county);
        showToast(`${msg.zh} ${msg.en}`);
      }
      prevCountyRef.current = county;
      void checkProximity(p.lat, p.lng);
    });
    return () => {
      offStats();
      offPoint();
    };
  }, [drawTrail, showToast, checkProximity]);

  // 「開始這一天」清單（Phase 19C）：規劃頁交接的當日停靠點
  useEffect(() => {
    setPlanDay(getActivePlanDay());
  }, []);

  // 換底圖（夜間模式）後重繪軌跡
  useEffect(() => {
    if (!map) return;
    const redraw = () => drawTrail();
    map.on('style.load', redraw);
    return () => {
      map.off('style.load', redraw);
    };
  }, [map, drawTrail]);

  // 前方 POI（展開時每 60 秒更新，v2.0 C7）
  useEffect(() => {
    if (!expanded || !stats) return;
    let alive = true;
    const load = async () => {
      const last = trailRef.current[trailRef.current.length - 1];
      if (!last) return;
      const pois = await getAheadPOIs(last[1], last[0], stats.headingDeg);
      if (alive) setAheadPois(pois);
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [expanded, stats?.tripId, stats?.headingDeg, stats]);

  const handleStart = async () => {
    setBusy(true);
    trailRef.current = [];
    prevKmRef.current = 0;
    prevCountyRef.current = null;
    // 多日銜接（Phase 11C）：昨天結束過一天的旅程，可續接同一趟
    let resumeTripId: string | undefined;
    const lastTrip = localStorage.getItem('formosa_last_trip');
    if (lastTrip) {
      const cont = window.confirm(
        '要繼續上次的旅程嗎？\n「確定」= 繼續同一趟旅程（第 N+1 天）\n「取消」= 開始全新的旅程'
      );
      if (cont) resumeTripId = lastTrip;
      else localStorage.removeItem('formosa_last_trip');
    }
    await journeyTracker.start(resumeTripId);
    setStats(journeyTracker.getStats());
    setBusy(false);
  };

  const handleMarkPoint = () => {
    if (!stats) return;
    if (!trailRef.current[trailRef.current.length - 1]) {
      showToast('尚未取得位置 · No position yet');
      return;
    }
    setMarkOpen(true);
  };

  // 照片牆（v2.0 C4）：備註＋照片以 multipart 送出
  const saveMark = async (note: string, photo: Blob | null) => {
    if (!stats) return;
    const last = trailRef.current[trailRef.current.length - 1];
    if (!last) return;
    try {
      const fd = new FormData();
      fd.set('deviceId', getDeviceId());
      fd.set('tripId', stats.tripId);
      fd.set('lat', String(last[1]));
      fd.set('lng', String(last[0]));
      fd.set('note', note);
      if (photo) fd.set('photo', photo, 'photo.jpg');
      const res = await fetch('/api/trips/checkpoint', { method: 'POST', body: fd });
      showToast(res.ok ? '📌 已標記！Marked!' : '⚠️ 標記失敗，稍後再試');
    } catch {
      showToast('⚠️ 離線中，標記失敗');
    }
  };

  const handleEndDay = async () => {
    if (!stats) return;
    if (!window.confirm('結束今天的旅途？將產生今日摘要。\nEnd today and create a daily summary?')) {
      return;
    }
    setBusy(true);
    const { tripId, ok, dayNumber } = await journeyTracker.endDay();
    // 清掉地圖軌跡
    trailRef.current = [];
    if (map?.getLayer(TRAIL_LAYER)) map.removeLayer(TRAIL_LAYER);
    if (map?.getSource(TRAIL_SOURCE)) map.removeSource(TRAIL_SOURCE);
    setStats(null);
    setBusy(false);
    if (ok && dayNumber != null) {
      router.push(`/journey/summary/${tripId}/day/${dayNumber}`);
    } else {
      showToast('⚠️ 摘要上傳失敗（可能離線），資料已保留在手機');
    }
  };

  // ── 未在旅途中：開始按鈕 ──
  if (!stats) {
    return (
      <button
        type="button"
        onClick={handleStart}
        disabled={busy}
        className="tap-target absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg disabled:opacity-50"
      >
        🚴 Start Journey · 開始今天的旅途
      </button>
    );
  }

  // ── 旅途中：HUD ──
  return (
    <>
      {toast && (
        <p
          role="status"
          className="absolute left-1/2 top-16 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-5 py-2 font-bold text-white shadow-lg"
        >
          {toast}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        {/* 收合列：狀態 + 速度 + 距離（v2.0：預設收合不擋地圖） */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="tap-target flex w-full items-center justify-between px-4 py-2"
        >
          <span className="info-secondary font-bold">
            {stats.isResting ? '😴 Resting 休息中' : '🟢 Riding 旅途中'}
          </span>
          <span className="info-primary font-bold">
            🚴 {stats.currentSpeedKmh} km/h · 📏 {stats.totalDistanceKm} km
          </span>
          <span aria-hidden>{expanded ? '▼' : '▲'}</span>
        </button>

        {expanded && (
          <div className="border-t border-neutral-border px-4 pb-4 pt-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-primary">
                  {Math.floor(stats.ridingMinutes / 60)}:{String(stats.ridingMinutes % 60).padStart(2, '0')}
                </p>
                <p className="text-sm text-neutral-text">riding 騎乘</p>
              </div>
              <div>
                <p className="text-xl font-bold text-accent">{stats.calories}</p>
                <p className="text-sm text-neutral-text">🔥 kcal</p>
              </div>
              <div>
                <p className="text-xl font-bold text-info-border">{stats.restMinutes}</p>
                <p className="text-sm text-neutral-text">rest 休息 min</p>
              </div>
            </div>

            {/* 當日規劃停靠點清單（Phase 19C「開始這一天」） */}
            {planDay && planDay.stops.length > 0 && (
              <div className="mt-3">
                <p className="info-secondary flex items-center justify-between font-bold">
                  <span>📋 {planDay.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearActivePlanDay();
                      setPlanDay(null);
                    }}
                    className="text-sm font-normal text-neutral-text underline"
                  >
                    clear 清除
                  </button>
                </p>
                <ul className="mt-1">
                  {planDay.stops.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setPlanDay(toggleActiveStop(i))}
                        className="tap-target flex w-full items-center gap-2 py-1 text-left"
                      >
                        <span aria-hidden>{s.done ? '✅' : '⬜'}</span>
                        <span
                          className={`info-secondary flex-1 truncate ${s.done ? 'text-neutral-text line-through' : ''}`}
                        >
                          {s.name_en || s.name_zh}
                          {s.name_en && s.name_en !== s.name_zh && (
                            <span className="text-neutral-text">（{s.name_zh}）</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aheadPois.length > 0 && (
              <div className="mt-3">
                <p className="info-secondary font-bold">── Ahead 前方資訊 ──</p>
                <ul className="mt-1">
                  {aheadPois.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 py-1">
                      <span aria-hidden>{POI_ICONS[p.type]}</span>
                      <span className="info-secondary flex-1 truncate">{p.name_zh}</span>
                      <span className="text-sm text-neutral-text">
                        {p.distance_m >= 1000
                          ? `${(p.distance_m / 1000).toFixed(1)}km`
                          : `${Math.round(p.distance_m)}m`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                disabled={busy}
                className="tap-target flex-1 rounded-xl border border-neutral-border py-3 font-bold disabled:opacity-50"
              >
                📍 Share 分享
              </button>
              <button
                type="button"
                onClick={handleMarkPoint}
                disabled={busy}
                className="tap-target flex-1 rounded-xl border border-neutral-border py-3 font-bold disabled:opacity-50"
              >
                📌 Mark 標記
              </button>
              <button
                type="button"
                onClick={handleEndDay}
                disabled={busy}
                className="tap-target flex-1 rounded-xl bg-danger-border py-3 font-bold text-white disabled:opacity-50"
              >
                🏁 End Day 結束
              </button>
            </div>
            {shareOpen && (
              <ShareModal tripId={stats.tripId} onClose={() => setShareOpen(false)} />
            )}
            {markOpen && (
              <MarkModal onSave={saveMark} onClose={() => setMarkOpen(false)} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
