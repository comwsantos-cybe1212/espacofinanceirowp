import 'server-only';
import { db } from './db';
import { monthOf, todayBR } from './dates';
import type { AppData, Goal, Profile, SavingMove, Tx } from './types';

export async function loadData(): Promise<AppData> {
  const sql = await db();
  const [profiles, txs, savings, settings, goals] = await Promise.all([
    sql<Profile[]>`select id, name, color, photo from profiles order by id`,
    sql<Tx[]>`select id, profile_id, kind, subtype, category, description, amount, due_date, month, recurrence, payment, method,
               group_id, inst_no, inst_total, purchase_date, paid, paid_at from transactions order by due_date, id`,
    sql<SavingMove[]>`select id, date, amount, note from savings order by date desc, id desc`,
    sql<{ key: string; value: string }[]>`select key, value from settings`,
    sql<Goal[]>`select id, name, target, deadline, done, done_at from goals order by done, deadline, id`,
  ]);
  const opening = Number(settings.find((s) => s.key === 'saldo_inicial')?.value ?? 0);
  const today = todayBR();
  const flag = (k: string) => settings.some((s) => s.key === `${k}:${monthOf(today)}` && s.value === '1');
  return {
    profiles: [...profiles],
    goals: [...goals],
    txs: [...txs],
    savings: [...savings],
    openingBalance: Number.isFinite(opening) ? opening : 0,
    semGuardar: flag('sem_guardar'),
    semAdiantar: flag('sem_adiantar'),
    today,
  };
}
