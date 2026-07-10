'use client';
// components/mobile/InstallSuggestionBanner.tsx — 智慧安裝建議橫幅（Phase 17A，v4.0 B4/B5）
// 觸發：瀏覽超過 60 秒（確認真有興趣）。頻率規則：
//   7 天內只彈一次（formosa_install_prompt_last）；
//   點「不用了」30 天內不再彈（formosa_install_dismissed）；已安裝永不顯示。
// QA：?installtest=1 將等待縮短為 3 秒。
import { useEffect, useState } from 'react';
import {
  clearDeferredPrompt,
  detectInstallPlatform,
  getDeferredPrompt,
  type InstallPlatform,
} from '@/lib/install-prompt';
import { InstallGuideModal } from '@/components/ui/InstallGuideModal';

const LAST_SHOWN_KEY = 'formosa_install_prompt_last';
const DISMISSED_KEY = 'formosa_install_dismissed';
const SEVEN_DAYS = 7 * 86400_000;
const THIRTY_DAYS = 30 * 86400_000;

export function InstallSuggestionBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('desktop');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const p = detectInstallPlatform();
    setPlatform(p);
    if (p === 'installed') return;
    const now = Date.now();
    const last = Number(localStorage.getItem(LAST_SHOWN_KEY) ?? 0);
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (now - last < SEVEN_DAYS || now - dismissed < THIRTY_DAYS) return;

    const testMode = new URLSearchParams(window.location.search).get('installtest') === '1';
    const timer = setTimeout(() => {
      localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      setVisible(true);
    }, testMode ? 3_000 : 60_000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    setVisible(false);
    if (platform === 'ios') {
      setShowGuide(true);
      return;
    }
    const deferred = getDeferredPrompt();
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      clearDeferredPrompt();
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <>
      <div className="absolute inset-x-4 bottom-[70px] z-30 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <p className="info-secondary font-bold">
          📲 Install FormoSA Ride? 把環島通加到手機桌面？
        </p>
        <p className="mt-0.5 text-sm text-neutral-text">
          Faster access &amp; works better offline. 開啟更快，離線也更好用。
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="tap-target flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
          >
            Install 安裝
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="tap-target flex-1 rounded-xl border border-neutral-border py-2.5 text-sm"
          >
            Not now 不用了
          </button>
        </div>
      </div>
      {showGuide && (
        <InstallGuideModal platform={platform} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
}
