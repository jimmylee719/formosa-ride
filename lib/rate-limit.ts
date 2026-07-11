// lib/rate-limit.ts — 統一速率限制（Phase 18A）
// Upstash Redis 滑動視窗：Vercel serverless 多實例間共享計數，
// 取代 Phase 13/14 的單機記憶體版（每實例各自計數，部署後幾乎無效）。
// 未設定 UPSTASH_* 時回退記憶體版（本機開發仍可用）；
// Redis 故障時 fail-open（可用性優先，記 log 供 Sentry 收）。
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type LimiterName = 'login' | 'feedback' | 'suggest';

/** 各情境限制：登入 5 次/15 分、回饋 3 次/10 分、建議地點 5 次/10 分（Phase 19A） */
const LIMITS: Record<LimiterName, { tokens: number; window: `${number} m` }> = {
  login: { tokens: 5, window: '15 m' },
  feedback: { tokens: 3, window: '10 m' },
  suggest: { tokens: 5, window: '10 m' },
};

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limiters = new Map<LimiterName, Ratelimit>();

function getLimiter(name: LimiterName): Ratelimit {
  let l = limiters.get(name);
  if (!l) {
    const cfg = LIMITS[name];
    l = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
      prefix: `formosa:rl:${name}`,
    });
    limiters.set(name, l);
  }
  return l;
}

// 記憶體回退（無 Upstash 設定時）
const memHits = new Map<string, number[]>();
function memoryLimit(name: LimiterName, id: string): boolean {
  const cfg = LIMITS[name];
  const windowMs = Number(cfg.window.split(' ')[0]) * 60_000;
  const key = `${name}:${id}`;
  const now = Date.now();
  const list = (memHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= cfg.tokens) {
    memHits.set(key, list);
    return false;
  }
  list.push(now);
  memHits.set(key, list);
  return true;
}

/** 回傳 true = 放行；false = 超過限制（呼叫端回 429） */
export async function checkRateLimit(name: LimiterName, id: string): Promise<boolean> {
  if (!hasUpstash) return memoryLimit(name, id);
  try {
    const { success } = await getLimiter(name).limit(id);
    return success;
  } catch (err) {
    console.error(`[rate-limit] Upstash 失敗（fail-open）: ${(err as Error).message}`);
    return true;
  }
}
