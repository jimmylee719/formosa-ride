'use client';
// components/profile/WeightSetting.tsx — 體重設定（Phase 19A）
// 卡路里 = MET × 體重 × 時間，體重是估算準確度影響最大的變數。
import { useEffect, useState } from 'react';
import { getRiderWeightKg, setRiderWeightKg, DEFAULT_WEIGHT_KG } from '@/lib/rider-weight';

export function WeightSetting() {
  const [weight, setWeight] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWeight(getRiderWeightKg());
  }, []);

  if (weight === null) return null;

  const apply = (v: number) => {
    const actual = setRiderWeightKg(v);
    setWeight(actual);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-white p-4">
      <p className="info-primary font-bold">⚖️ Your weight 體重</p>
      <p className="info-secondary mt-1 text-neutral-text">
        Used for calorie estimates while riding (default {DEFAULT_WEIGHT_KG} kg).
        騎行卡路里估算用（預設 {DEFAULT_WEIGHT_KG} 公斤）。
      </p>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={30}
          max={200}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          onBlur={() => apply(weight)}
          className="tap-target w-28 rounded-xl border border-neutral-border p-3 text-center font-bold"
          aria-label="Weight in kg 體重（公斤）"
        />
        <span className="info-primary">kg 公斤</span>
        {saved && <span className="info-secondary text-safe-text">✅ Saved 已儲存</span>}
      </div>
    </div>
  );
}
