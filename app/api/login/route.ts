import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, safeEqual, SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth';
import { cleanSecret } from '@/lib/password';

export const runtime = 'nodejs';
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

// Reserva quando o banco ainda não está conectado (vale por instância do servidor)
const memory = new Map<string, { fails: number; last: number }>();

export async function POST(req: Request) {
  const expected = cleanSecret(process.env.APP_PASSWORD);
  if (!expected) {
    return NextResponse.json({ error: 'A senha ainda não foi configurada na Vercel (variável APP_PASSWORD). Crie a variável e faça Redeploy.' }, { status: 500 });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const body = await req.json().catch(() => ({}));
  const password = cleanSecret(body?.password);

  // Tentativas erradas: no banco quando disponível; senão, na memória do servidor
  let sql: Awaited<ReturnType<typeof db>> | null = null;
  try { sql = await db(); } catch { sql = null; }
  let att: { fails: number; last: number } | undefined;
  if (sql) {
    const [row] = await sql`select fails, last_at from login_attempts where ip = ${ip}`;
    if (row) att = { fails: row.fails, last: new Date(row.last_at).getTime() };
  } else {
    att = memory.get(ip);
  }
  const lockedUntil = att ? att.last + LOCK_MINUTES * 60_000 : 0;
  if (att && att.fails >= MAX_FAILS && Date.now() < lockedUntil) {
    const min = Math.ceil((lockedUntil - Date.now()) / 60_000);
    return NextResponse.json({ error: `Muitas tentativas erradas. Tente de novo em ${min} min.` }, { status: 429 });
  }

  if (!safeEqual(password, expected)) {
    const fails = att && Date.now() < lockedUntil ? att.fails + 1 : 1;
    if (sql) {
      await sql`insert into login_attempts (ip, fails, last_at) values (${ip}, ${fails}, now())
                on conflict (ip) do update set fails = ${fails}, last_at = now()`;
    } else {
      memory.set(ip, { fails, last: Date.now() });
    }
    await new Promise((r) => setTimeout(r, 600));
    const left = MAX_FAILS - fails;
    return NextResponse.json(
      { error: left > 0 ? `Senha incorreta. ${left} tentativa(s) restante(s).` : `Acesso bloqueado por ${LOCK_MINUTES} min.` },
      { status: 401 },
    );
  }

  if (sql) await sql`delete from login_attempts where ip = ${ip}`;
  else memory.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
