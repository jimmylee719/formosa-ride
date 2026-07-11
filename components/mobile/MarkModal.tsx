'use client';
// components/mobile/MarkModal.tsx — 標記地點彈窗（照片牆，2026-07-11）
// 取代原 window.prompt：備註＋拍照（選填）。照片先在前端壓縮再上傳。
import { useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';

export function MarkModal({
  onSave,
  onClose,
}: {
  onSave: (note: string, photo: Blob | null) => Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const compressed = await compressImage(f);
      setPhoto(compressed);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(compressed));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(note.trim(), photo);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40">
      <div className="rounded-t-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="info-primary font-bold">📌 Mark this spot 標記這個地點</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 關閉"
            className="tap-target text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <label className="info-secondary mt-3 block font-bold">
          Note 備註（optional 可略過）
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="e.g. Best beef noodles! 這家牛肉麵超好吃"
            className="tap-target mt-1 w-full rounded-xl border border-neutral-border p-3"
          />
        </label>

        {/* 照片（v2.0 C4 photo_url）：capture 直接開相機，也可從相簿選 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽 */}
            <img
              src={preview}
              alt="Photo preview 照片預覽"
              className="max-h-48 w-full rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="info-secondary tap-target mt-1 text-neutral-text underline"
            >
              Remove photo 移除照片
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="tap-target mt-3 w-full rounded-xl border-2 border-dashed border-neutral-border py-4 font-bold text-neutral-text disabled:opacity-50"
          >
            📷 Add a photo 加張照片（optional 可略過）
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Saving… 儲存中…' : '📌 Mark 標記'}
        </button>
      </div>
    </div>
  );
}
