// /feedback — 回饋意見頁（Phase 13，v1.0 §十六）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';

export const metadata = {
  title: '回饋意見 Feedback | FormoSA Ride 環島通',
};

export default function FeedbackPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="alert-warning text-neutral-text">📨 Feedback 回饋意見</h1>
        <p className="info-secondary mt-1 text-neutral-text">
          Found a bug or have a suggestion? Let us know!
          <br />
          發現問題或有建議嗎？告訴我們，讓環島通更好用。
        </p>
        <div className="mt-4 rounded-2xl bg-white p-4">
          <FeedbackForm />
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
