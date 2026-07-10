'use client';
// /phrasebook — 雙語溝通小卡（Phase 13A，v7.0 B 節 + v11.0 H 節）
// 大字中文直接拿給對方看；純靜態內容，離線可用（Phase 17 Serwist 強制預先快取）。
import { useEffect, useState } from 'react';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { PHRASEBOOK, type Phrase } from '@/lib/phrasebook-data';
import { FooterLinks } from '@/components/ui/FooterLinks';
import { canSpeak, speakChinese } from '@/lib/text-to-speech';

export default function PhrasebookPage() {
  const [enlarged, setEnlarged] = useState<Phrase | null>(null);
  const [speechOk, setSpeechOk] = useState(false);

  useEffect(() => {
    setSpeechOk(canSpeak());
  }, []);

  const speak = (e: React.MouseEvent, zh: string) => {
    e.stopPropagation(); // 不觸發卡片放大
    speakChinese(zh);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="alert-warning text-neutral-text">
          💬 Phrasebook 溝通小卡
        </h1>
        <p className="info-secondary mt-1 text-neutral-text">
          Tap a card to enlarge and show it to locals; 🔊 plays Chinese audio.
          <br />
          點卡片放大直接拿給對方看；🔊 可播放中文發音。
        </p>

        {PHRASEBOOK.map((cat) => (
          <section key={cat.id} className="mt-4">
            <h2 className="info-primary font-bold">
              {cat.icon} {cat.title_en} · {cat.title_zh}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {cat.phrases.map((p) => (
                <li
                  key={p.zh}
                  className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setEnlarged(p)}
                    className="tap-target flex-1 text-left"
                  >
                    <span className="block text-[28px] font-bold leading-snug text-neutral-text">
                      {p.zh}
                    </span>
                    <span className="info-secondary block text-neutral-text">
                      {p.en}
                      {p.hint_en && (
                        <span className="text-sm">
                          （{p.hint_zh} · {p.hint_en}）
                        </span>
                      )}
                    </span>
                  </button>
                  {speechOk && (
                    <button
                      type="button"
                      aria-label={`播放發音 Play: ${p.zh}`}
                      onClick={(e) => speak(e, p.zh)}
                      className="tap-target flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info-bg text-xl"
                    >
                      🔊
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="info-secondary mt-6 text-center text-neutral-text">
          Works offline · 本頁離線也能開啟
        </p>
        <FooterLinks />
      </main>
      <BottomNavBar />

      {/* 放大顯示：整頁大字，拿給店家/路人看 */}
      {enlarged && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEnlarged(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6"
        >
          <p className="text-center text-5xl font-bold leading-snug text-neutral-text">
            {enlarged.zh}
          </p>
          <p className="info-primary text-center text-neutral-text">
            {enlarged.en}
          </p>
          {enlarged.hint_zh && (
            <p className="info-secondary text-center text-neutral-text">
              👉 {enlarged.hint_zh} · {enlarged.hint_en}
            </p>
          )}
          {speechOk && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speakChinese(enlarged.zh);
              }}
              className="tap-target rounded-full bg-info-bg px-8 py-4 text-2xl"
            >
              🔊 播放發音 Play
            </button>
          )}
          <p className="info-secondary text-neutral-text">
            （點任意處關閉 · Tap anywhere to close）
          </p>
        </div>
      )}
    </div>
  );
}
