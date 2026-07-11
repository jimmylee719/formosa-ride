'use client';
// lib/journey-tracker.ts — 行程記錄引擎（Phase 11，v2.0 C5）
// IndexedDB 本地優先：斷網照記，上線自動同步（山區斷訊為常態情境）。
// 開發模擬：dev 環境下 window.__journeySimulate(lat, lng, speedKmh) 可注入位置。
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { getDeviceId } from '@/lib/device-id';
import { metForRide } from '@/lib/calories';
import { getRiderWeightKg } from '@/lib/rider-weight';

export interface TrackedPoint {
  id?: number;
  tripId: string;
  lat: number;
  lng: number;
  elevation: number | null;
  speedKmh: number | null;
  accuracyM: number | null;
  isRest: boolean;
  recordedAt: string;
  synced: number; // idb index 不支援 boolean：0=未同步 1=已同步
}

export interface ActiveTrip {
  tripId: string;
  startedAt: string;
  status: 'active' | 'paused';
  totalDistanceKm: number;
  ridingMs: number;
  restMs: number;
  calories: number;
  lastLat: number | null;
  lastLng: number | null;
}

export interface JourneyStats {
  tripId: string;
  totalDistanceKm: number;
  ridingMinutes: number;
  restMinutes: number;
  calories: number;
  currentSpeedKmh: number;
  isResting: boolean;
  headingDeg: number | null;
}

interface JourneyDB extends DBSchema {
  trip_points: {
    key: number;
    value: TrackedPoint;
    indexes: { 'by-trip': string; 'by-synced': number };
  };
  active_trip: { key: string; value: ActiveTrip };
}

const MOVING_INTERVAL_MS = 30_000; // 移動中 30 秒記一點（v2.0）
const STATIC_INTERVAL_MS = 120_000; // 靜止時 2 分鐘記一點
const MIN_SPEED_KMH = 2; // 低於 2km/h 視為靜止
const SYNC_BATCH = 200;
const GRADE_WINDOW_KM = 0.1; // 坡度計算距離窗（GPS 海拔噪音需要 ≥100m 平滑）

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const φ1 = (aLat * Math.PI) / 180;
  const φ2 = (bLat * Math.PI) / 180;
  const Δλ = ((bLng - aLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

type Listener = (stats: JourneyStats) => void;
type PointListener = (p: TrackedPoint) => void;

class JourneyTracker {
  private db: IDBPDatabase<JourneyDB> | null = null;
  private watchId: number | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private restTimer: ReturnType<typeof setTimeout> | null = null;
  private trip: ActiveTrip | null = null;
  private isResting = false;
  private lastRecordAt = 0;
  private lastMoveAt = 0;
  private currentSpeedKmh = 0;
  private headingDeg: number | null = null;
  // 即時坡度（Phase 19A）：GPS 海拔以 ≥100m 距離窗計算，供雙因子 MET 卡路里
  private gradeAnchor: { distKm: number; ele: number } | null = null;
  private currentGradePct: number | null = null;
  private restDetectMs = 5 * 60_000; // 靜止 5 分鐘 → 休息（?fastrest=1 時縮短，QA 用）
  private syncing = false; // 互斥鎖：防止並發同步重複上傳同一批點
  private listeners = new Set<Listener>();
  private pointListeners = new Set<PointListener>();

  async init(): Promise<ActiveTrip | null> {
    if (!this.db) {
      this.db = await openDB<JourneyDB>('formosa-ride-journey', 1, {
        upgrade(db) {
          const store = db.createObjectStore('trip_points', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-trip', 'tripId');
          store.createIndex('by-synced', 'synced');
          db.createObjectStore('active_trip', { keyPath: 'tripId' });
        },
      });
    }
    if (new URLSearchParams(window.location.search).get('fastrest') === '1') {
      this.restDetectMs = 5_000;
    }
    // 頁面重載後恢復進行中的旅途（v2.0 離線模式）
    const all = await this.db.getAll('active_trip');
    this.trip = all[0] ?? null;
    // 開發模擬鉤子（init 註冊：新開始與恢復路徑皆可用）
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__journeySimulate = (
        lat: number,
        lng: number,
        speedKmh: number
      ) => this.ingest(lat, lng, speedKmh, null, null, true);
    }
    return this.trip;
  }

  getStats(): JourneyStats | null {
    if (!this.trip) return null;
    return {
      tripId: this.trip.tripId,
      totalDistanceKm: Math.round(this.trip.totalDistanceKm * 100) / 100,
      ridingMinutes: Math.round(this.trip.ridingMs / 60_000),
      restMinutes: Math.round(this.trip.restMs / 60_000),
      calories: Math.round(this.trip.calories),
      currentSpeedKmh: Math.round(this.currentSpeedKmh * 10) / 10,
      isResting: this.isResting,
      headingDeg: this.headingDeg,
    };
  }

  onStats(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  onPoint(fn: PointListener): () => void {
    this.pointListeners.add(fn);
    return () => this.pointListeners.delete(fn);
  }
  private emit() {
    const s = this.getStats();
    if (s) this.listeners.forEach((fn) => fn(s));
  }

  /** 開始旅途；傳入 resumeTripId 可續接多日旅程（同一 tripId，日摘要遞增） */
  async start(resumeTripId?: string): Promise<string> {
    await this.init();
    if (this.trip && this.trip.status === 'active') return this.trip.tripId;
    this.gradeAnchor = null;
    this.currentGradePct = null;
    if (!this.trip) {
      this.trip = {
        tripId: resumeTripId ?? crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        status: 'active',
        totalDistanceKm: 0,
        ridingMs: 0,
        restMs: 0,
        calories: 0,
        lastLat: null,
        lastLng: null,
      };
    } else {
      this.trip.status = 'active';
    }
    await this.db!.put('active_trip', this.trip);
    this.beginWatch();
    this.beginSyncLoop();
    this.emit();
    return this.trip.tripId;
  }

  private beginWatch() {
    if (this.watchId != null || !('geolocation' in navigator)) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) =>
        this.ingest(
          pos.coords.latitude,
          pos.coords.longitude,
          (pos.coords.speed ?? 0) * 3.6,
          pos.coords.altitude,
          pos.coords.accuracy,
          false
        ),
      () => undefined, // 無 GPS 時不中斷（可用模擬或稍後恢復）
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );
  }

  private beginSyncLoop() {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => void this.syncUnsynced(), 60_000);
    window.addEventListener('online', this.handleOnline);
  }
  private handleOnline = () => void this.syncUnsynced();

  /** 位置進入點（真實 GPS 與模擬共用）。force=true 略過節流（模擬用）。 */
  private async ingest(
    lat: number,
    lng: number,
    speedKmh: number,
    elevation: number | null,
    accuracyM: number | null,
    force: boolean
  ) {
    if (!this.trip || this.trip.status !== 'active' || !this.db) return;
    const now = Date.now();
    this.currentSpeedKmh = speedKmh;
    const isMoving = speedKmh >= MIN_SPEED_KMH;

    // 休息偵測（v2.0：靜止 5 分鐘 → 休息中）
    if (isMoving) {
      if (this.restTimer) {
        clearTimeout(this.restTimer);
        this.restTimer = null;
      }
      if (this.isResting) {
        this.isResting = false;
      }
      // 時間統計：以兩次取樣間隔累計
      if (this.lastMoveAt > 0) {
        const dt = Math.min(now - this.lastMoveAt, 5 * 60_000);
        this.trip.ridingMs += dt;
        // 雙因子 MET（速度＋坡度，Phase 19A）×用戶設定體重（預設 70kg）
        this.trip.calories +=
          (metForRide(speedKmh, this.currentGradePct) * getRiderWeightKg() * dt) / 3600_000;
      }
      this.lastMoveAt = now;
    } else {
      if (this.isResting && this.lastMoveAt > 0) {
        this.trip.restMs += Math.min(now - this.lastMoveAt, 10 * 60_000);
        this.lastMoveAt = now;
      }
      if (!this.restTimer && !this.isResting) {
        this.restTimer = setTimeout(() => {
          this.isResting = true;
          this.restTimer = null;
          this.lastMoveAt = Date.now();
          this.emit();
        }, this.restDetectMs);
      }
    }

    // 節流：移動 30s / 靜止 120s（模擬 force 直接記）
    const interval = isMoving ? MOVING_INTERVAL_MS : STATIC_INTERVAL_MS;
    if (!force && now - this.lastRecordAt < interval) {
      this.emit();
      return;
    }
    this.lastRecordAt = now;

    // 距離與方位
    if (this.trip.lastLat != null && this.trip.lastLng != null && isMoving) {
      const dKm = haversineKm(this.trip.lastLat, this.trip.lastLng, lat, lng);
      if (dKm < 5) {
        // >5km 的跳點視為 GPS 漂移，不累計
        this.trip.totalDistanceKm += dKm;
        this.headingDeg = bearingDeg(this.trip.lastLat, this.trip.lastLng, lat, lng);
      }
    }
    this.trip.lastLat = lat;
    this.trip.lastLng = lng;

    // 坡度更新（Phase 19A）：每累積 ≥100m 距離以海拔差重算，夾限 ±20% 防噪音
    if (elevation != null) {
      if (!this.gradeAnchor) {
        this.gradeAnchor = { distKm: this.trip.totalDistanceKm, ele: elevation };
      } else {
        const dKm = this.trip.totalDistanceKm - this.gradeAnchor.distKm;
        if (dKm >= GRADE_WINDOW_KM) {
          const raw = ((elevation - this.gradeAnchor.ele) / (dKm * 1000)) * 100;
          this.currentGradePct = Math.max(-20, Math.min(20, raw));
          this.gradeAnchor = { distKm: this.trip.totalDistanceKm, ele: elevation };
        }
      }
    }

    const point: TrackedPoint = {
      tripId: this.trip.tripId,
      lat,
      lng,
      elevation,
      speedKmh,
      accuracyM,
      isRest: this.isResting,
      recordedAt: new Date().toISOString(),
      synced: 0,
    };
    await this.db.add('trip_points', point);
    await this.db.put('active_trip', this.trip);
    this.pointListeners.forEach((fn) => fn(point));
    this.emit();

    if (navigator.onLine) void this.syncUnsynced();
  }

  async syncUnsynced(): Promise<number> {
    if (!this.db || !this.trip || this.syncing) return 0;
    this.syncing = true;
    try {
      // 排空迴圈：同步期間新到的點在下一輪立即補送（單一批次失敗即停，避免空轉）
      let total = 0;
      for (let i = 0; i < 10; i++) {
        const n = await this.doSync();
        total += n;
        if (n === 0) break;
      }
      return total;
    } finally {
      this.syncing = false;
    }
  }

  private async doSync(): Promise<number> {
    if (!this.db || !this.trip) return 0;
    const unsynced = (
      await this.db.getAllFromIndex('trip_points', 'by-synced', 0)
    ).slice(0, SYNC_BATCH);
    if (unsynced.length === 0) return 0;
    try {
      const res = await fetch('/api/trips/sync-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          tripId: this.trip.tripId,
          startedAt: this.trip.startedAt,
          points: unsynced.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            elevation: p.elevation,
            speedKmh: p.speedKmh,
            accuracyM: p.accuracyM,
            isRest: p.isRest,
            recordedAt: p.recordedAt,
          })),
        }),
      });
      if (!res.ok) return 0;
      const tx = this.db.transaction('trip_points', 'readwrite');
      for (const p of unsynced) {
        await tx.store.put({ ...p, synced: 1 });
      }
      await tx.done;
      return unsynced.length;
    } catch {
      return 0; // 離線：下次再同步
    }
  }

  async pause() {
    if (!this.trip || !this.db) return;
    this.trip.status = 'paused';
    await this.db.put('active_trip', this.trip);
    this.emit();
  }
  async resume() {
    if (!this.trip || !this.db) return;
    this.trip.status = 'active';
    this.lastMoveAt = 0;
    await this.db.put('active_trip', this.trip);
    this.beginWatch();
    this.beginSyncLoop(); // 恢復路徑也要重啟同步迴圈
    this.emit();
  }

  /** 結束今天：同步剩餘點 → 呼叫 end-day API 產生日摘要 → 清空本地（trip 保留於雲端） */
  async endDay(): Promise<{ tripId: string; ok: boolean; dayNumber: number | null }> {
    if (!this.trip || !this.db) throw new Error('no active trip');
    const trip = this.trip;
    await this.syncUnsynced();
    let ok = false;
    let dayNumber: number | null = null;
    try {
      const res = await fetch('/api/trips/end-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          tripId: trip.tripId,
          distanceKm: Math.round(trip.totalDistanceKm * 100) / 100,
          ridingMinutes: Math.round(trip.ridingMs / 60_000),
          restMinutes: Math.round(trip.restMs / 60_000),
          calories: Math.round(trip.calories),
        }),
      });
      ok = res.ok;
      if (res.ok) {
        const json = (await res.json()) as { dayNumber?: number };
        dayNumber = json.dayNumber ?? null;
      }
    } catch {
      ok = false;
    }
    // 記住這趟旅程，明天可續接（Phase 11C 多日銜接）
    try {
      localStorage.setItem('formosa_last_trip', trip.tripId);
    } catch {
      /* storage 不可用時忽略 */
    }
    await this.teardownLocal();
    return { tripId: trip.tripId, ok, dayNumber };
  }

  private async teardownLocal() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    window.removeEventListener('online', this.handleOnline);
    if (this.db && this.trip) {
      await this.db.delete('active_trip', this.trip.tripId);
      // 已同步的點清掉，未同步的保留（下次開啟時仍可補送）
      const tx = this.db.transaction('trip_points', 'readwrite');
      let cur = await tx.store.index('by-trip').openCursor(this.trip.tripId);
      while (cur) {
        if (cur.value.synced === 1) await cur.delete();
        cur = await cur.continue();
      }
      await tx.done;
    }
    this.trip = null;
    this.isResting = false;
    this.currentSpeedKmh = 0;
    this.headingDeg = null;
    this.lastRecordAt = 0;
    this.lastMoveAt = 0;
    this.emit();
    this.listeners.forEach((fn) =>
      fn({
        tripId: '',
        totalDistanceKm: 0,
        ridingMinutes: 0,
        restMinutes: 0,
        calories: 0,
        currentSpeedKmh: 0,
        isResting: false,
        headingDeg: null,
      })
    );
  }

  /** 取得本次旅途今天的軌跡點（畫麵包屑用） */
  async getTripPoints(tripId: string): Promise<TrackedPoint[]> {
    if (!this.db) return [];
    return this.db.getAllFromIndex('trip_points', 'by-trip', tripId);
  }
}

export const journeyTracker = new JourneyTracker();
