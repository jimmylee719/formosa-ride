// components/mobile/PhrasebookFAB.tsx — 溝通小卡入口（Phase 13A）
// 位置：地圖左下角（v11.0 G 節使用說明：「打開左下角的『溝通小卡』」）。
// bottom-16 避開旅途 HUD 收合列與「開始旅途」按鈕。
import Link from 'next/link';

export function PhrasebookFAB() {
  return (
    <Link
      href="/phrasebook"
      className="tap-target absolute bottom-16 left-3 z-10 flex items-center gap-1 rounded-full bg-white px-4 py-2 font-bold shadow-md"
    >
      💬 Phrasebook 溝通小卡
    </Link>
  );
}
