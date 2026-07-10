// lib/admin-auth.ts — 管理員 session JWT（Phase 14，v5.0 C1/E2）
// 使用 jose 而非 jsonwebtoken：middleware 跑在 Edge Runtime，jsonwebtoken 不支援。
// 與一般會員 token（未來 Supabase Auth）完全獨立。
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_HOURS = 8;

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
}

function secret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) {
    // 缺少強密鑰時一律視為未設定，拒絕簽發/驗證（避免空字串密鑰）
    throw new Error('ADMIN_JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(s);
}

export async function signAdminToken(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.adminId || !payload.email) return null;
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      role: String(payload.role ?? 'admin'),
    };
  } catch {
    return null;
  }
}
