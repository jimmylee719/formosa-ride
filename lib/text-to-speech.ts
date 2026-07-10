// lib/text-to-speech.ts — 中文語音播放（Phase 13A，v7.0 B3）
// 瀏覽器原生 Web Speech API，零成本、離線多數裝置可用（用系統內建語音）。

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakChinese(text: string): void {
  if (!canSpeak()) return;
  // 取消前一句，避免連點時排隊
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  utterance.rate = 0.85; // 稍微放慢，方便對方聽懂
  window.speechSynthesis.speak(utterance);
}
