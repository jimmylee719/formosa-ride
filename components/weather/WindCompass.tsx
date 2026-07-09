// components/weather/WindCompass.tsx — 風向顯示（Phase 7）
// CWA 風向為中文方位文字（如「東北風」）；箭頭指向風的去向（來向 +180°）。

const DIR_DEGREES: Record<string, number> = {
  北: 0,
  東北: 45,
  東: 90,
  東南: 135,
  南: 180,
  西南: 225,
  西: 270,
  西北: 315,
};

export function windDirectionToDegrees(dirText: string): number | null {
  const base = dirText.replace(/^偏/, '').replace(/風$/, '');
  return DIR_DEGREES[base] ?? null;
}

export function WindCompass({
  direction,
  speed,
}: {
  direction: string;
  speed: number | null;
}) {
  const deg = windDirectionToDegrees(direction);
  return (
    <span className="inline-flex items-center gap-1 text-sm text-neutral-text">
      {deg != null && (
        <span
          aria-hidden
          className="inline-block"
          style={{ transform: `rotate(${deg + 180}deg)` }}
        >
          ↑
        </span>
      )}
      {direction || '—'}
      {speed != null && ` ${speed}m/s`}
    </span>
  );
}
