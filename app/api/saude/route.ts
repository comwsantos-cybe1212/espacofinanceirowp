import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cleanSecret } from '@/lib/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Diagnóstico da instalação (não mostra senha nem endereço do banco) */
export async function GET() {
  const senha = cleanSecret(process.env.APP_PASSWORD);
  const temBanco = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  let bancoConecta = false;
  let erroBanco: string | null = null;
  if (temBanco) {
    try { const sql = await db(); await sql`select 1`; bancoConecta = true; }
    catch (e) { erroBanco = e instanceof Error ? e.message.slice(0, 160) : 'erro desconhecido'; }
  }
  return NextResponse.json({
    senha_configurada: !!senha,
    senha_tem_6_digitos: /^\d{6}$/.test(senha),
    senha_tinha_espacos_ou_aspas: !!process.env.APP_PASSWORD && process.env.APP_PASSWORD !== senha,
    banco_configurado: temBanco,
    banco_conecta: bancoConecta,
    erro_banco: erroBanco,
  });
}
