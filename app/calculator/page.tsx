'use client';
// /calculator — 卡路里計算器（Phase 6，v1.0 §11）
import { useEffect, useState } from 'react';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import {
  calculateCalories,
  type CalorieResult,
  type FitnessLevel,
  type ElevationSample,
} from '@/lib/calories';
import type { RouteListItem } from '@/types/route';

const FITNESS_OPTIONS: { value: FitnessLevel; zh: string; en: string }[] = [
  { value: 'beginner', zh: '初級（休閒騎）', en: 'Beginner' },
  { value: 'intermediate', zh: '中級（規律騎）', en: 'Intermediate' },
  { value: 'advanced', zh: '進階（訓練有素）', en: 'Advanced' },
];

export default function CalculatorPage() {
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [routeId, setRouteId] = useState('');
  const [weight, setWeight] = useState('70');
  const [fitness, setFitness] = useState<FitnessLevel>('intermediate');
  const [result, setResult] = useState<CalorieResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/routes')
      .then((r) => r.json())
      .then((d: { routes: RouteListItem[] }) => {
        setRoutes(d.routes);
        if (d.routes[0]) setRouteId(d.routes[0].id);
      })
      .catch(() => setError('路線載入失敗 Failed to load routes'));
  }, []);

  const handleCalculate = async () => {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 200) {
      setError('請輸入 30–200 之間的體重 · Weight must be 30–200 kg');
      return;
    }
    if (!routeId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/elevation?routeId=${routeId}`);
      if (!res.ok) throw new Error(String(res.status));
      const profile = (await res.json()) as { points: ElevationSample[] };
      setResult(
        calculateCalories({
          weightKg,
          elevationProfile: profile.points,
          fitnessLevel: fitness,
        })
      );
    } catch {
      setError('計算失敗，請稍後再試 · Calculation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="info-primary mb-3 font-bold">
          🔥 卡路里計算 · Calorie Calculator
        </h1>

        <div className="rounded-2xl bg-white p-4">
          <label className="info-secondary block font-bold" htmlFor="route">
            路線 Route
          </label>
          <select
            id="route"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="tap-target mt-1 w-full rounded-xl border border-neutral-border bg-white px-3 py-2"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_zh}（{r.distance_km} km）
              </option>
            ))}
          </select>

          <label className="info-secondary mt-3 block font-bold" htmlFor="weight">
            體重 Weight（kg）
          </label>
          <input
            id="weight"
            type="number"
            inputMode="decimal"
            min={30}
            max={200}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="tap-target mt-1 w-full rounded-xl border border-neutral-border px-3 py-2"
          />

          <p className="info-secondary mt-3 font-bold">體能等級 Fitness level</p>
          <div className="mt-1 flex flex-col gap-2">
            {FITNESS_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`tap-target flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  fitness === o.value
                    ? 'border-safe-border bg-safe-bg font-bold'
                    : 'border-neutral-border'
                }`}
              >
                <input
                  type="radio"
                  name="fitness"
                  value={o.value}
                  checked={fitness === o.value}
                  onChange={() => setFitness(o.value)}
                />
                {o.zh}（{o.en}）
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={busy || !routeId}
            className="tap-target mt-4 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? '計算中… Calculating…' : '開始計算 Calculate'}
          </button>
          {error && (
            <p className="info-secondary mt-2 text-danger-text">{error}</p>
          )}
        </div>

        {result && (
          <div className="mt-4 rounded-2xl bg-white p-4">
            <h2 className="info-primary font-bold">計算結果 · Result</h2>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-danger-bg p-3 text-center">
                <p className="text-2xl font-bold text-danger-text">
                  {result.totalCalories.toLocaleString()}
                </p>
                <p className="info-secondary text-danger-text">大卡 kcal</p>
              </div>
              <div className="rounded-xl bg-info-bg p-3 text-center">
                <p className="text-2xl font-bold text-info-text">
                  {result.totalTimeHours}
                </p>
                <p className="info-secondary text-info-text">預估小時 hrs</p>
              </div>
              <div className="rounded-xl bg-safe-bg p-3 text-center">
                <p className="text-2xl font-bold text-safe-text">
                  {(result.totalWaterMl / 1000).toFixed(1)}
                </p>
                <p className="info-secondary text-safe-text">補水公升 L</p>
              </div>
              <div className="rounded-xl bg-caution-bg p-3 text-center">
                <p className="text-2xl font-bold text-caution-text">
                  {result.totalCarbsG}
                </p>
                <p className="info-secondary text-caution-text">碳水公克 g</p>
              </div>
            </div>

            {/* 補給建議（v1.0 SupplyGuide） */}
            <div className="mt-3 rounded-xl bg-neutral-bg p-3">
              <h3 className="info-secondary font-bold">🍙 補給建議 · Supply Guide</h3>
              <ul className="info-secondary mt-1 list-inside list-disc text-neutral-text">
                {result.totalTimeHours >= 1.5 && (
                  <li>
                    每 {result.refillEveryMinutes} 分鐘補給一次，每次約{' '}
                    {result.refillCalories} 大卡
                  </li>
                )}
                <li>每小時補充碳水約 {result.carbsPerHour} g（香蕉、飯糰、能量棒）</li>
                <li>天熱時補水量再增加 2–3 成</li>
              </ul>
              <p className="mt-1 text-sm text-neutral-text">
                Refill every {result.refillEveryMinutes} min · ~{result.carbsPerHour}g
                carbs per hour · drink more in hot weather
              </p>
            </div>
          </div>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
