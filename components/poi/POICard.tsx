'use client';
// components/poi/POICard.tsx — POI 資訊卡（底部彈出，v1.0 §四手機互動規則）
import { useMapStore } from '@/store/map-store';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';
import { GoogleMapsButton } from '@/components/poi/GoogleMapsButton';
import { VerifyButton } from '@/components/poi/VerifyButton';
import { isRecentlyVerified } from '@/types/poi';

export function POICard() {
  const poi = useMapStore((s) => s.selectedPoi);
  const setSelectedPoi = useMapStore((s) => s.setSelectedPoi);

  if (!poi) return null;

  const label = POI_LABELS[poi.type];
  const features: string[] = [];
  if (poi.has_shower) features.push('🚿 淋浴 Shower');
  if (poi.allows_camping) features.push('⛺ 可紮營 Camping OK');
  if (poi.has_charging) features.push('🔌 充電 Charging');
  if (poi.water_available) features.push('💧 飲用水 Water');

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="info-secondary text-neutral-text">
            {POI_ICONS[poi.type]} {label.zh} · {label.en}
          </p>
          <h2 className="info-primary font-bold">{poi.name_zh}</h2>
          {poi.name_en && poi.name_en !== poi.name_zh && (
            <p className="info-secondary">{poi.name_en}</p>
          )}
          {isRecentlyVerified(poi) && (
            <span className="mt-1 inline-block rounded-full bg-safe-bg px-3 py-0.5 text-sm font-bold text-safe-text">
              ✅ 近期已驗證 · Recently verified
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedPoi(null)}
          aria-label="關閉 Close"
          className="tap-target shrink-0 rounded-full text-2xl leading-none text-neutral-text"
        >
          ✕
        </button>
      </div>

      <p className="info-secondary mt-1 text-neutral-text">
        📏 距離約 {poi.distance_m >= 1000
          ? `${(poi.distance_m / 1000).toFixed(1)} km`
          : `${Math.round(poi.distance_m)} m`}
      </p>

      {features.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {features.map((f) => (
            <span
              key={f}
              className="rounded-full bg-safe-bg px-3 py-1 text-sm text-safe-text"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {poi.description_zh && (
        <p className="info-secondary mt-2">{poi.description_zh}</p>
      )}
      {poi.description_en && (
        <p className="info-secondary mt-1 text-neutral-text">{poi.description_en}</p>
      )}

      {poi.phone && (
        <a
          href={`tel:${poi.phone}`}
          className="tap-target mt-2 flex items-center gap-2 text-info-border underline"
        >
          📞 {poi.phone}
        </a>
      )}

      <div className="mt-3">
        <VerifyButton poiId={poi.id} />
      </div>

      <div className="mt-3">
        <GoogleMapsButton poi={poi} />
      </div>
    </div>
  );
}
