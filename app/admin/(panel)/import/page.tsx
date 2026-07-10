'use client';
// /admin/import — 批次資料上傳（Phase 14A，v4.0 C5）
// 流程：選類型 → 下載範本 → 上傳 Excel（路線加 GPX）→ 驗證預覽 → 確認匯入。
import { useRef, useState } from 'react';

type UploadType = 'poi' | 'route' | 'correction';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  suggestion?: string;
}

interface ValidateResponse {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: ValidationError[];
  records: unknown[];
  fileName: string;
}

interface CorrectionResult {
  id: string;
  name: string;
  ok: boolean;
  message: string;
}

const TYPE_OPTIONS: Array<{ value: UploadType; label: string }> = [
  { value: 'poi', label: '📍 新增休息站/景點（POI）' },
  { value: 'route', label: '🛤️ 新增路線（Excel + GPX）' },
  { value: 'correction', label: '✏️ 修正既有資料' },
];

export default function AdminImportPage() {
  const [type, setType] = useState<UploadType>('poi');
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [phase, setPhase] = useState<'idle' | 'validating' | 'ready' | 'importing' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<CorrectionResult[] | null>(null);
  const [imported, setImported] = useState(0);
  const excelRef = useRef<HTMLInputElement>(null);
  const gpxRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setPhase('idle');
    setMessage(null);
    setCorrections(null);
    if (excelRef.current) excelRef.current.value = '';
    if (gpxRef.current) gpxRef.current.value = '';
  };

  const handleValidate = async () => {
    const file = excelRef.current?.files?.[0];
    if (!file) {
      setMessage('請先選擇 Excel 檔案');
      return;
    }
    setPhase('validating');
    setMessage(null);
    setCorrections(null);
    const form = new FormData();
    form.set('type', type);
    form.set('file', file);
    for (const g of gpxRef.current?.files ?? []) form.append('gpx', g);
    try {
      const res = await fetch('/api/admin/import-excel', { method: 'POST', body: form });
      const d = (await res.json()) as ValidateResponse & { error?: string };
      if (!res.ok) {
        setMessage(`⚠️ ${d.error ?? '驗證失敗'}`);
        setPhase('idle');
        return;
      }
      setResult(d);
      setPhase('ready');
    } catch {
      setMessage('⚠️ 網路錯誤，請稍後再試');
      setPhase('idle');
    }
  };

  const handleImport = async () => {
    if (!result || result.validCount === 0) return;
    setPhase('importing');
    try {
      const res = await fetch('/api/admin/confirm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          records: result.records,
          fileName: result.fileName,
          errorCount: result.errorCount,
        }),
      });
      const d = (await res.json()) as {
        error?: string;
        imported?: number;
        correctionResults?: CorrectionResult[];
      };
      if (!res.ok) {
        setMessage(`⚠️ ${d.error ?? '匯入失敗'}`);
        setPhase('ready');
        return;
      }
      setImported(d.imported ?? 0);
      setCorrections(d.correctionResults ?? null);
      setPhase('done');
    } catch {
      setMessage('⚠️ 網路錯誤，請稍後再試');
      setPhase('ready');
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold">📊 批次資料上傳</h1>

      {/* 步驟 1：類型 + 範本 */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">① 選擇上傳類型</h2>
        <div className="mt-2 flex flex-col gap-2">
          {TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="upload-type"
                checked={type === o.value}
                onChange={() => {
                  setType(o.value);
                  reset();
                }}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
        <a
          href={`/api/admin/template/${type}`}
          download
          className="mt-3 inline-block rounded-lg border border-neutral-border px-4 py-2 text-sm font-bold"
        >
          📥 下載範本 Excel
        </a>
      </section>

      {/* 步驟 2：檔案 */}
      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">② 上傳檔案</h2>
        <label className="mt-2 block text-sm">
          Excel 檔（.xlsx）
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx"
            onChange={() => {
              setResult(null);
              setPhase('idle');
            }}
            className="mt-1 block w-full text-sm"
          />
        </label>
        {type === 'route' && (
          <label className="mt-3 block text-sm">
            GPX 檔（可多選，檔名需與 Excel「GPX檔案名稱」欄相符）
            <input ref={gpxRef} type="file" accept=".gpx" multiple className="mt-1 block w-full text-sm" />
          </label>
        )}
        <button
          type="button"
          onClick={handleValidate}
          disabled={phase === 'validating' || phase === 'importing'}
          className="mt-3 rounded-xl bg-primary px-5 py-2 font-bold text-white disabled:opacity-50"
        >
          {phase === 'validating' ? '驗證中…' : '開始驗證'}
        </button>
        {message && (
          <p role="alert" className="mt-2 rounded-lg bg-danger-bg p-2 text-sm text-danger-text">
            {message}
          </p>
        )}
      </section>

      {/* 步驟 3：驗證結果 */}
      {result && phase !== 'done' && (
        <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">
            {result.errorCount === 0 ? '✅' : '⚠️'} 驗證結果：{result.validCount} 筆資料正確
            {result.errorCount > 0 && `，${result.errorCount} 筆有問題`}
          </h2>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg bg-caution-bg p-3 text-sm">
              {result.errors.map((e, i) => (
                <li key={i} className="py-0.5">
                  第 {e.row} 列：「{e.field}」{e.message}
                  {e.suggestion && <strong> → {e.suggestion}</strong>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={result.validCount === 0 || phase === 'importing'}
              className="rounded-xl bg-primary px-5 py-2 font-bold text-white disabled:opacity-50"
            >
              {phase === 'importing'
                ? '匯入中…'
                : `僅匯入正確的 ${result.validCount} 筆`}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-neutral-border px-5 py-2 font-bold"
            >
              取消，先修正 Excel
            </button>
          </div>
        </section>
      )}

      {/* 完成 */}
      {phase === 'done' && (
        <section className="mt-3 rounded-2xl bg-safe-bg p-4">
          <h2 className="font-bold text-safe-text">✅ 匯入完成：{imported} 筆</h2>
          {type === 'route' && imported > 0 && (
            <p className="mt-1 text-sm text-safe-text">
              ⏳ 海拔剖面背景計算中…（完成後使用者開啟頁面即可直接看到，不需等待）
            </p>
          )}
          {corrections && (
            <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg bg-white p-3 text-sm">
              {corrections.map((c, i) => (
                <li key={i} className={c.ok ? '' : 'text-danger-text'}>
                  {c.ok ? '✅' : '❌'} {c.name}：{c.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-xl border border-neutral-border bg-white px-5 py-2 font-bold"
          >
            繼續上傳其他檔案
          </button>
        </section>
      )}
    </>
  );
}
