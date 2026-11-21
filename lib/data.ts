import 'server-only';
import { db } from './db';
import { monthOf, todayBR } from './dates';
import type { AppData, Goal, Profile, SavingMove, Tx } from './types';
import { ruleOfThree } from './finance';

export async function loadData(): Promise<AppData> {
  const d = await readData();
  // Divisão automática: guarda o valor do mês atual (para os valores individuais acumularem nos meses seguintes)
  const mes = monthOf(d.today);
  const base = ruleOfThree(d).basePrevia;
  if (d.divisoes[mes] !== base) {
    const sql = await db();
    await sql`insert into settings (key, value) values (${`divisao:${mes}`}, ${String(base)})
              on conflict (key) do update set value = excluded.value`;
    d.divisoes[mes] = base;
    d.settings[`divisao:${mes}`] = String(base);
  }
  return d;
}

async function readData(): Promise<AppData> {
  const sql = await db();
  const [profiles, txs, savings, settings, goals] = await Promise.all([
    sql<Profile[]>`select id, name, color, photo from profiles order by id`,
    sql<Tx[]>`select id, profile_id, kind, subtype, category, description, amount, due_date, month, recurrence, payment, method, fatura_total,
               group_id, inst_no, inst_total, purchase_date, paid, paid_at from transactions order by due_date, id`,
    sql<SavingMove[]>`select id, date, amount, note from savings order by date desc, id desc`,
    sql<{ key: string; value: string }[]>`select key, value from settings`,
    sql<Goal[]>`select id, name, target, deadline, done, done_at, photo from goals order by done, deadline, id`,
  ]);
  const opening = Number(settings.find((s) => s.key === 'saldo_inicial')?.value ?? 0);
  const today = todayBR();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const divisoes = Object.fromEntries(settings.filter((s) => s.key.startsWith('divisao:')).map((s) => [s.key.slice(8), Number(s.value) || 0]));
  return {
    profiles: [...profiles],
    goals: [...goals],
    txs: [...txs],
    savings: [...savings],
    openingBalance: Number.isFinite(opening) ? opening : 0,
    settings: map,
    divisoes,
    today,
  };
}
