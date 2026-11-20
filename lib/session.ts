import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from './auth';

export async function requireAuth() {
  const ok = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!ok) throw new Error('Não autorizado');
}
