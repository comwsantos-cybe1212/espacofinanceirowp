import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, safeEqual, SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth';

export const runtime = 'nodejs';
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return NextResponse.json({ error: 'Senha do app não configurada no servidor (APP_PASSWORD).' }, { status: 500 });

  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const sql = await db();

  const [att] = await sql`select fails, last_at from login_attempts where ip = ${ip}`;
  const lockedUntil = att ? new Date(att.last_at).getTime() + LOCK_MINUTES * 60_000 : 0;
  if (att && att.fails >= MAX_FAILS && Date.now() < lockedUntil) {
    const min = Math.ceil((lockedUntil - Date.now()) / 60_000);
    return NextResponse.json({ error: `Muitas tentativas. Tente de novo em ${min} min.` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? '');

  if (!safeEqual(password, expected)) {
    const fails = att && Date.now() < lockedUntil ? att.fails + 1 : 1;
    await sql`insert into login_attempts (ip, fails, last_at) values (${ip}, ${fails}, now())
              on conflict (ip) do update set fails = ${fails}, last_at = now()`;
    await new Promise((r) => setTimeout(r, 600));
    const left = MAX_FAILS - fails;
    return NextResponse.json(
      { error: left > 0 ? `Senha incorreta. ${left} tentativa(s) restante(s).` : `Acesso bloqueado por ${LOCK_MINUTES} min.` },
      { status: 401 },
    );
  }

  await sql`delete from login_attempts where ip = ${ip}`;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
