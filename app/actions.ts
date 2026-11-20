'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { addMonthsDate, invoiceDue, invoiceMonth, isValidDate, monthOf, todayBR } from '@/lib/dates';
import { parseBRL } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_SUBTYPES } from '@/lib/categories';

export type ActionResult = { ok: boolean; error?: string };

const refresh = () => revalidatePath('/', 'layout');
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

type NewRow = {
  profile_id: number | null; kind: string; subtype: string | null; category: string; description: string;
  amount: number; due_date: string; month: string; recurrence: string; payment: string; group_id: string | null;
  inst_no: number; inst_total: number; purchase_date: string | null; paid: boolean; paid_at: string | null;
};

/** Divide o total em N parcelas; a última absorve os centavos que sobram */
function split(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - base * (n - 1) : base));
}

export async function createTransaction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const today = todayBR();

  const kind = str(f, 'kind') === 'receita' ? 'receita' : 'despesa';
  const description = str(f, 'description').slice(0, 120);
  const amount = parseBRL(str(f, 'amount'));
  const date = str(f, 'date');
  const profileId = Number(str(f, 'profile_id')) || null;
  const paidNow = f.get('paid') === 'on';

  if (!description) return { ok: false, error: 'Dê um nome ao lançamento.' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Informe um valor válido.' };
  if (!isValidDate(date)) return { ok: false, error: 'Informe uma data válida.' };
  if (!profileId) return { ok: false, error: 'Escolha de quem é o lançamento.' };

  let subtype: string | null = null;
  let category: string;
  let recurrence: 'fixa' | 'variavel';
  let payment: 'conta' | 'cartao' = 'conta';
  let installments = 1;

  if (kind === 'receita') {
    const st = INCOME_SUBTYPES.find((s) => s.value === str(f, 'subtype'));
    if (!st) return { ok: false, error: 'Escolha o tipo da receita.' };
    subtype = st.value;
    category = st.label;
    recurrence = st.fixed === null ? (str(f, 'recurrence') === 'fixa' ? 'fixa' : 'variavel') : st.fixed ? 'fixa' : 'variavel';
  } else {
    category = str(f, 'category');
    if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: 'Escolha uma categoria.' };
    recurrence = str(f, 'recurrence') === 'fixa' ? 'fixa' : 'variavel';
    payment = str(f, 'payment') === 'cartao' ? 'cartao' : 'conta';
    if (payment === 'cartao' && recurrence === 'variavel') {
      installments = Math.min(Math.max(Math.floor(Number(str(f, 'installments')) || 1), 1), 48);
    }
  }

  const rows: NewRow[] = [];
  const common = { profile_id: profileId, kind, subtype, category, description, recurrence, payment };

  if (payment === 'cartao' && installments > 1) {
    // Parcelado: o total é dividido; a 1ª parcela segue a regra do dia 17
    const first = invoiceMonth(date);
    split(amount, installments).forEach((value, i) => {
      const month = monthOf(addMonthsDate(`${first}-01`, i));
      rows.push({ ...common, amount: value, month, due_date: invoiceDue(month), group_id: null, inst_no: i + 1,
        inst_total: installments, purchase_date: date, paid: false, paid_at: null });
    });
  } else {
    const count = recurrence === 'fixa' ? 12 : 1; // fixos se repetem por 1 ano
    for (let i = 0; i < count; i++) {
      const d = addMonthsDate(date, i);
      if (payment === 'cartao') {
        const month = invoiceMonth(d);
        rows.push({ ...common, amount, month, due_date: invoiceDue(month), group_id: null, inst_no: 1, inst_total: 1,
          purchase_date: d, paid: false, paid_at: null });
      } else {
        const paid = i === 0 && paidNow;
        rows.push({ ...common, amount, month: monthOf(d), due_date: d, group_id: null, inst_no: 1, inst_total: 1,
          purchase_date: null, paid, paid_at: paid ? (d <= today ? d : today) : null });
      }
    }
  }

  const group = rows.length > 1 ? crypto.randomUUID() : null;
  const sql = await db();
  await sql`insert into transactions ${sql(rows.map((r) => ({ ...r, group_id: group })))}`;
  refresh();
  return { ok: true };
}

export async function togglePaid(id: number) {
  await requireAuth();
  const sql = await db();
  await sql`update transactions set paid = not paid, paid_at = case when paid then null else ${todayBR()} end where id = ${id}`;
  refresh();
}

/** Paga uma conta futura agora (adiantamento) */
export async function payNow(id: number) {
  await requireAuth();
  const sql = await db();
  await sql`update transactions set paid = true, paid_at = ${todayBR()} where id = ${id} and paid = false`;
  refresh();
}

export async function payInvoice(month: string) {
  await requireAuth();
  const sql = await db();
  await sql`update transactions set paid = true, paid_at = ${todayBR()}
            where payment = 'cartao' and kind = 'despesa' and month = ${month} and paid = false`;
  refresh();
}

/** Exclui um lançamento; com `series`, exclui também os próximos da mesma série */
export async function deleteTransaction(id: number, series: boolean) {
  await requireAuth();
  const sql = await db();
  if (series) {
    const [t] = await sql`select group_id, month from transactions where id = ${id}`;
    if (t?.group_id) {
      await sql`delete from transactions where group_id = ${t.group_id} and month >= ${t.month}`;
      refresh();
      return;
    }
  }
  await sql`delete from transactions where id = ${id}`;
  refresh();
}

export async function moveSavings(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const amount = parseBRL(str(f, 'amount'));
  const direction = str(f, 'direction') === 'resgatar' ? -1 : 1;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Informe um valor válido.' };
  const sql = await db();
  await sql`insert into savings (date, amount, note) values (${todayBR()}, ${amount * direction}, ${str(f, 'note').slice(0, 120) || null})`;
  refresh();
  return { ok: true };
}

export async function deleteSaving(id: number) {
  await requireAuth();
  const sql = await db();
  await sql`delete from savings where id = ${id}`;
  refresh();
}

export async function updateProfile(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = Number(str(f, 'id'));
  const name = str(f, 'name').slice(0, 40);
  const color = /^#[0-9a-fA-F]{6}$/.test(str(f, 'color')) ? str(f, 'color') : '#4de3ff';
  const photo = str(f, 'photo');
  if (!name) return { ok: false, error: 'Informe o nome.' };
  if (photo && (!photo.startsWith('data:image/') || photo.length > 600_000)) return { ok: false, error: 'Foto inválida ou muito grande.' };
  const sql = await db();
  if (photo) await sql`update profiles set name = ${name}, color = ${color}, photo = ${photo} where id = ${id}`;
  else await sql`update profiles set name = ${name}, color = ${color} where id = ${id}`;
  refresh();
  return { ok: true };
}

export async function updateOpeningBalance(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const raw = str(f, 'saldo_inicial');
  const negative = raw.startsWith('-');
  const value = parseBRL(raw.replace('-', ''));
  if (!Number.isFinite(value)) return { ok: false, error: 'Valor inválido.' };
  const sql = await db();
  await sql`insert into settings (key, value) values ('saldo_inicial', ${String(negative ? -value : value)})
            on conflict (key) do update set value = excluded.value`;
  refresh();
  return { ok: true };
}
