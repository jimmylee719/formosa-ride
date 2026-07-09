'use client';
// components/route/ElevationProfile.tsx — 海拔剖面圖（Phase 6）
// 單一序列面積圖：細線 2px、輔助格線低調、觸控/滑鼠十字提示層、文字用墨色。
import { useEffect, useRef, useState } from 'react';
import type { ProfilePoint, ElevationProfileResult } from '@/lib/elevation';

const W = 360;
const H = 150;
const PAD = { top: 10, right: 8, bottom: 20, left: 36 };

export function ElevationProfile({ routeId }: { routeId: string }) {
  const [data, setData] = useState<ElevationProfileResult | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [hover, setHover] = useState<ProfilePoint | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/elevation?routeId=${routeId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ElevationProfileResult) => {
        if (!alive) return;
        setData(d);
        setState('ok');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [routeId]);

  if (state === 'loading') {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl bg-neutral-bg">
        <p className="info-secondary text-neutral-text">
          ⏳ 海拔剖面計算中… Computing elevation…
        </p>
      </div>
    );
  }
  if (state === 'error' || !data || data.points.length < 2) {
    return (
      <p className="info-secondary rounded-xl bg-neutral-bg p-4 text-neutral-text">
        海拔資料暫時無法取得 · Elevation data unavailable
      </p>
    );
  }

  const pts = data.points;
  const totalKm = pts[pts.length - 1]?.distance_km ?? 0;
  const minE = Math.floor(data.minElevation / 10) * 10;
  const maxE = Math.max(Math.ceil(data.maxElevation / 10) * 10, minE + 10);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (km: number) => PAD.left + (km / totalKm) * plotW;
  const y = (m: number) => PAD.top + (1 - (m - minE) / (maxE - minE)) * plotH;

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.distance_km).toFixed(1)},${y(p.elevation_m).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${x(totalKm).toFixed(1)},${y(minE)} L${x(0).toFixed(1)},${y(minE)} Z`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const km = ((e.clientX - rect.left) / rect.width) * (W - 0) ;
    const kmInPlot = ((km - PAD.left) / plotW) * totalKm;
    if (kmInPlot < 0 || kmInPlot > totalKm) {
      setHover(null);
      return;
    }
    let nearest = pts[0];
    let best = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.distance_km - kmInPlot);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    setHover(nearest ?? null);
  };

  return (
    <figure>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`海拔剖面：全長 ${totalKm} 公里，最低 ${data.minElevation} 公尺，最高 ${data.maxElevation} 公尺，總爬升 ${data.totalAscent} 公尺`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* 低調格線（min / mid / max） */}
        {[minE, (minE + maxE) / 2, maxE].map((m) => (
          <g key={m}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(m)}
              y2={y(m)}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={y(m) + 3}
              textAnchor="end"
              fontSize="9"
              fill="#64748B"
            >
              {Math.round(m)}m
            </text>
          </g>
        ))}
        {/* 面積 + 線 */}
        <path d={areaPath} fill="#16A34A" opacity="0.15" />
        <path d={linePath} fill="none" stroke="#16A34A" strokeWidth="2" />
        {/* X 軸標籤 */}
        <text x={PAD.left} y={H - 6} fontSize="9" fill="#64748B">
          0 km
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="9" fill="#64748B">
          {totalKm.toFixed(1)} km
        </text>
        {/* 十字提示層 */}
        {hover && (
          <g>
            <line
              x1={x(hover.distance_km)}
              x2={x(hover.distance_km)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <circle
              cx={x(hover.distance_km)}
              cy={y(hover.elevation_m)}
              r="4"
              fill="#16A34A"
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={x(hover.distance_km) > W / 2 ? x(hover.distance_km) - 6 : x(hover.distance_km) + 6}
              y={PAD.top + 10}
              textAnchor={x(hover.distance_km) > W / 2 ? 'end' : 'start'}
              fontSize="10"
              fontWeight="bold"
              fill="#334155"
            >
              {hover.distance_km.toFixed(1)} km · {Math.round(hover.elevation_m)} m
            </text>
          </g>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-sm text-neutral-text">
        <span>⬆️ 總爬升 {data.totalAscent} m</span>
        <span>⬇️ 總下降 {data.totalDescent} m</span>
        <span>🏔️ 最高 {data.maxElevation} m</span>
      </figcaption>
    </figure>
  );
}
