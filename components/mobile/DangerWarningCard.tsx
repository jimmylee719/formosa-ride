'use client';
// components/mobile/DangerWarningCard.tsx — 危險/禁行路段警示卡（Phase 8，v3.0 A4–A5）
import { useMapStore } from '@/store/map-store';
import { DANGER_MESSAGES } from '@/lib/danger-messages';

const CARD_STYLE: Record<string, string> = {
  high: 'border-danger-border bg-danger-bg text-danger-text',
  medium: 'border-warning-border bg-warning-bg text-warning-text',
  low: 'border-caution-border bg-caution-bg text-caution-text',
  restricted: 'border-restricted bg-neutral-bg text-neutral-text',
};

export function DangerWarningCard() {
  const danger = useMapStore((s) => s.selectedDanger);
  const setSelectedDanger = useMapStore((s) => s.setSelectedDanger);

  if (!danger) return null;

  const msg = DANGER_MESSAGES[danger.level];

  return (
    <div
      role="alertdialog"
      aria-label={msg.zh.title}
      className={`absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto rounded-t-2xl border-t-4 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] ${CARD_STYLE[danger.level]}`}
    >
      <p className="alert-critical">{msg.zh.title}</p>
      <p className="info-secondary">{msg.en.title}</p>

      <p className="info-primary mt-2 font-bold">
        {danger.name_zh}
        {danger.road_number && `（${danger.road_number}）`}
      </p>
      {danger.name_en && <p className="info-secondary">{danger.name_en}</p>}

      <p className="info-primary mt-2">{msg.zh.subtitle}</p>
      <p className="info-secondary">{msg.en.subtitle}</p>

      {danger.reason_zh && (
        <p className="info-secondary mt-1">📌 {danger.reason_zh}</p>
      )}
      {danger.reason_en && (
        <p className="info-secondary text-neutral-text">{danger.reason_en}</p>
      )}
      {danger.law_basis && (
        <p className="info-secondary mt-1">⚖️ {danger.law_basis}</p>
      )}

      <p className="info-primary mt-2 rounded-lg bg-white/70 p-2">
        💡 {msg.zh.action}
        <span className="info-secondary block">{msg.en.action}</span>
      </p>

      {(danger.accident_count != null || danger.accident_source) && (
        <p className="mt-2 text-sm text-neutral-text">
          {danger.accident_count != null &&
            `近3年事故次數：${danger.accident_count} 次　`}
          {danger.accident_source && `資料來源：${danger.accident_source}`}
          {danger.data_year != null && `（${danger.data_year} 年）`}
        </p>
      )}

      <button
        type="button"
        onClick={() => setSelectedDanger(null)}
        className="tap-target mt-3 w-full rounded-xl bg-navy py-3 font-bold text-white"
      >
        {msg.zh.button} · {msg.en.button}
      </button>
    </div>
  );
}
