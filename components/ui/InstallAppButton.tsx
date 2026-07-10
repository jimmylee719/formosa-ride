'use client';
// components/ui/InstallAppButton.tsx — PWA 安裝按鈕（Phase 17A，v4.0 B2/B5）
// Android/桌面：原生 beforeinstallprompt；iOS：教學彈窗；已安裝（standalone）不顯示。
import { useEffect, useState } from 'react';
import {
  clearDeferredPrompt,
  detectInstallPlatform,
  getDeferredPrompt,
  onInstallPromptChange,
  type InstallPlatform,
} from '@/lib/install-prompt';
import { InstallGuideModal } from '@/components/ui/InstallGuideModal';

export function InstallAppButton() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    setPlatform(detectInstallPlatform());
    const off = onInstallPromptChange(() => {
      force((n) => n + 1);
      if (detectInstallPlatform() === 'installed') setPlatform('installed');
    });
    const onInstalled = () => setPlatform('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      off();
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (platform === null || platform === 'installed') return null;

  const handleClick = async () => {
    if (platform === 'ios') {
      setShowGuide(true);
      return;
    }
    const deferred = getDeferredPrompt();
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setPlatform('installed');
      clearDeferredPrompt();
    } else {
      // 事件未觸發（瀏覽器不支援或條件未滿足）→ 通用指引
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install this app 將本網站安裝為手機桌面 App"
        className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-teal-700 py-3.5 font-bold text-white shadow-lg shadow-primary/30"
      >
        📲 Add to Home Screen 加入手機桌面
      </button>
      {showGuide && (
        <InstallGuideModal platform={platform} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
}
