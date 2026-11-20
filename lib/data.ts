import 'server-only';
import { db } from './db';
import { todayBR } from './dates';
import type { AppData, Profile, SavingMove, Tx } from './types';

export async function loadData(): Promise<AppData> {
  const sql = await db();
  const [profiles, txs, savings, settings] = await Promise.all([
    sql<Profile[]>`select id, name, color, photo from profiles order by id`,
    sql<Tx[]>`select id, profile_id, kind, subtype, category, description, amount, due_date, month, recurrence, payment,
               group_id, inst_no, inst_total, purchase_date, paid, paid_at from transactions order by due_date, id`,
    sql<SavingMove[]>`select id, date, amount, note from savings order by date desc, id desc`,
    sql<{ key: string; value: string }[]>`select key, value from settings`,
  ]);
  const opening = Number(settings.find((s) => s.key === 'saldo_inicial')?.value ?? 0);
  return {
    profiles: [...profiles],
    txs: [...txs],
    savings: [...savings],
    openingBalance: Number.isFinite(opening) ? opening : 0,
    today: todayBR(),
  };
}
