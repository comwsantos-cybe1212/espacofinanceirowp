// Funciona tanto no Edge (middleware) quanto no Node (rotas/ações)
export const SESSION_COOKIE = 'ef_session';
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function secret(): string {
  // Usa SESSION_SECRET se existir; senão deriva de segredos que só existem no servidor
  return process.env.SESSION_SECRET || `ef:${process.env.APP_PASSWORD ?? ''}:${process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? ''}`;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !String(process.env.APP_PASSWORD ?? '').trim()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(exp));
}
