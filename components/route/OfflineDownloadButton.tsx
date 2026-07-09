'use client';
// components/route/OfflineDownloadButton.tsx — 離線包下載按鈕（Phase 11B，v7.0 C4）
import { useEffect, useState } from 'react';
import { downloadRouteOfflinePackage } from '@/lib/offline-download';
import { getPackage, staleness } from '@/lib/offline-store';

export function OfflineDownloadButton({ routeId }: { routeId: string }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [poisCount, setPoisCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void getPackage(routeId).then((pkg) => {
      if (!alive || !pkg) return;
      setLastDownload(pkg.downloadedAt);
      setPoisCount(pkg.pois.length);
    });
    return () => {
      alive = false;
    };
  }, [routeId]);

  const handleDownload = async () => {
    setError(false);
    setProgress(0);
    try {
      const result = await downloadRouteOfflinePackage(routeId, setProgress);
      setLastDownload(result.downloadedAt);
      setPoisCount(result.poisCount);
    } catch {
      setError(true);
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="mt-3 rounded-xl bg-white p-4">
      <h2 className="info-primary font-bold">
        📥 離線包 · Offline package
      </h2>
      <p className="info-secondary mt-1 text-neutral-text">
        建議出發前下載：沿線 10 公里地點、海拔、天氣快照，沒訊號也查得到。
      </p>

      {progress != null ? (
        <div className="mt-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-bg">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="info-secondary mt-1 text-center text-neutral-text">
            下載中… {progress}%
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleDownload}
          className="tap-target mt-3 w-full rounded-xl bg-primary py-3 font-bold text-white"
        >
          {lastDownload ? '🔄 重新下載離線包' : '📥 下載離線包 Download'}
        </button>
      )}

      {error && (
        <p className="info-secondary mt-2 text-danger-text">
          下載失敗，請確認網路後再試 · Download failed
        </p>
      )}
      {lastDownload && (
        <p className="mt-2 text-sm text-neutral-text">
          ✅ 已下載 {poisCount} 個地點 · 上次下載：{staleness(lastDownload).zh}
          <br />
          （建議出發前重新下載，確保資料最新）
        </p>
      )}
    </section>
  );
}
