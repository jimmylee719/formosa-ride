'use client';
// components/poi/VerifyButton.tsx — 「我剛經過，這裡資訊正確」（Phase 4A，v7.0 E3）
// 未登入者點擊顯示登入提示（登入系統於 Phase 9 開放）。
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type VerifyState = 'idle' | 'sending' | 'done' | 'already' | 'need_login' | 'error';

export function VerifyButton({ poiId }: { poiId: string }) {
  const [state, setState] = useState<VerifyState>('idle');

  const handleClick = async () => {
    setState('sending');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setState('need_login');
      return;
    }
    try {
      const res = await fetch(`/api/pois/${poiId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setState('done');
      else if (res.status === 409) setState('already');
      else if (res.status === 401) setState('need_login');
      else setState('error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className="info-secondary rounded-lg bg-safe-bg px-3 py-2 text-safe-text">
        ✅ 感謝回報！已記錄您的驗證 · Thanks for verifying!
      </p>
    );
  }
  if (state === 'already') {
    return (
      <p className="info-secondary rounded-lg bg-neutral-bg px-3 py-2 text-neutral-text">
        👍 您已驗證過這個地點 · Already verified
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'sending'}
        className="tap-target w-full rounded-xl border border-neutral-border bg-white px-3 py-2 text-left info-secondary disabled:opacity-50"
      >
        👍 我剛經過，這裡資訊正確
        <span className="block text-sm text-neutral-text">
          I was just here — info is correct
        </span>
      </button>
      {state === 'need_login' && (
        <p className="info-secondary mt-1 text-warning-text">
          🔒 請先登入才能驗證 · Please sign in to verify
        </p>
      )}
      {state === 'error' && (
        <p className="info-secondary mt-1 text-danger-text">
          驗證失敗，請稍後再試 · Failed, please try again
        </p>
      )}
    </div>
  );
}
