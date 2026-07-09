// lib/export-gpx.ts — 行程 → GPX 1.1 格式轉換（Phase 11D，v9.0 A2）
// 純格式轉換函數，無副作用；前後端皆可使用。

export interface GpxPoint {
  lat: number;
  lng: number;
  elevation_m?: number | null;
  recorded_at: string;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportTripToGPX(points: GpxPoint[], routeName: string): string {
  const trackPoints = points
    .map((p) => {
      const ele =
        p.elevation_m != null ? `\n        <ele>${p.elevation_m}</ele>` : '';
      return `      <trkpt lat="${p.lat}" lon="${p.lng}">${ele}
        <time>${p.recorded_at}</time>
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FormoSA Ride" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}
