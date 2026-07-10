'use client';
// components/ui/InstallGuideModal.tsx — 安裝教學彈窗（Phase 17A，v4.0 B3）
// iOS：分享→加入主畫面 3 步驟（文字照規格，不用真實截圖避免 iOS 改版失準）；
// Android/桌面（beforeinstallprompt 未觸發時）：通用瀏覽器選單指引。
import type { InstallPlatform } from '@/lib/install-prompt';

export function InstallGuideModal({
  platform,
  onClose,
}: {
  platform: InstallPlatform;
  onClose: () => void;
}) {
  const isIOS = platform === 'ios';
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="info-primary font-bold">
            {isIOS
              ? '📲 Add to Home Screen in 3 Steps 加入手機桌面只要 3 步驟'
              : '📲 Install this app 安裝本應用'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 關閉"
            className="tap-target shrink-0 rounded-full text-2xl leading-none text-neutral-text"
          >
            ✕
          </button>
        </div>

        {isIOS ? (
          <ol className="mt-3 flex flex-col gap-3">
            <li className="rounded-xl bg-neutral-bg p-3">
              <p className="info-secondary font-bold">
                ① Tap the Share button below 點擊下方的「分享」按鈕
              </p>
              <p className="mt-1 text-sm text-neutral-text">
                The square icon with an arrow{' '}
                <span className="inline-block animate-bounce" aria-hidden>
                  ⬆️
                </span>{' '}
                at the bottom of Safari · 在 Safari 畫面最下面，中間的方框箭頭圖示
              </p>
            </li>
            <li className="rounded-xl bg-neutral-bg p-3">
              <p className="info-secondary font-bold">
                ② Scroll down, find &quot;Add to Home Screen&quot;
                往下滑，找到「加入主畫面」
              </p>
            </li>
            <li className="rounded-xl bg-neutral-bg p-3">
              <p className="info-secondary font-bold">
                ③ Tap &quot;Add&quot; — done! 點擊右上角「新增」就完成了！
              </p>
            </li>
          </ol>
        ) : (
          <p className="info-secondary mt-3 rounded-xl bg-neutral-bg p-3">
            Open your browser menu (⋮) and choose &quot;Install app&quot; or
            &quot;Add to Home screen&quot;.
            <br />
            請開啟瀏覽器選單（⋮），選擇「安裝應用程式」或「加入主畫面」。
          </p>
        )}

        <p className="info-secondary mt-3 rounded-xl bg-safe-bg p-3 text-safe-text">
          ✅ The FormoSA Ride icon will appear on your home screen — tap it next
          time. 完成後，主畫面會出現環島通的圖示，下次直接點它打開。
        </p>

        <button
          type="button"
          onClick={onClose}
          className="tap-target mt-4 w-full rounded-xl bg-primary py-3 font-bold text-white"
        >
          Got it, let me try 我知道了，馬上去操作
        </button>
      </div>
    </div>
  );
}
