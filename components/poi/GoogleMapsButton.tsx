// components/poi/GoogleMapsButton.tsx — Google Maps 導航深度連結（v1.0 §8）
// 手機自動開啟 Google Maps App（若已安裝），桌機開瀏覽器。
import type { POIRecord } from '@/types/poi';

function buildGoogleMapsUrl(poi: POIRecord): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}&travelmode=bicycling`;
  return poi.google_place_id
    ? `${base}&destination_place_id=${encodeURIComponent(poi.google_place_id)}`
    : base;
}

export function GoogleMapsButton({ poi }: { poi: POIRecord }) {
  return (
    <a
      href={buildGoogleMapsUrl(poi)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl font-bold text-white"
      style={{ backgroundColor: '#4285F4' }}
    >
      🗺️ Google Maps 導航 · Navigate
    </a>
  );
}
