'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { addMonthsDate, invoiceDue, invoiceMonth, isValidDate, monthOf, todayBR } from '@/lib/dates';
import { parseBRL } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_SUBTYPES, INVOICE_CATEGORY } from '@/lib/categories';

export type ActionResult = { ok: boolean; error?: string };

const refresh = () => revalidatePath('/', 'layout');
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

type NewRow = {
  profile_id: number | null; kind: string; subtype: string | null; category: string; description: string;
  amount: number; due_date: string; month: string; recurrence: string; payment: string; method: string | null; fatura_total: boolean; group_id: string | null;
  inst_no: number; inst_total: number; purchase_date: string | null; paid: boolean; paid_at: string | null;
};

/** Divide o total em N parcelas; a última absorve os centavos que sobram */
function split(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - base * (n - 1) : base));
}

type Parsed = {
  kind: 'receita' | 'despesa'; description: string; amount: number; date: string; profileId: number | null;
  subtype: string | null; category: string; method: string; paid: boolean;
};

/** Lê e valida os campos comuns do formulário de lançamento */
function parseForm(f: FormData): Parsed | string {
  const kind = str(f, 'kind') === 'receita' ? 'receita' : 'despesa';
  const description = str(f, 'description').slice(0, 120);
  const amount = parseBRL(str(f, 'amount'));
  const date = str(f, 'date');
  if (!description) return 'Dê um nome ao lançamento.';
  if (!Number.isFinite(amount) || amount <= 0) return 'Informe um valor válido.';
  if (!isValidDate(date)) return 'Informe uma data válida.';
  let subtype: string | null = null;
  let category: string;
  if (kind === 'receita') {
    const st = INCOME_SUBTYPES.find((x) => x.value === str(f, 'subtype'));
    if (!st) return 'Escolha a categoria da receita.';
    subtype = st.value;
    category = st.label;
  } else {
    category = str(f, 'category');
    if (!EXPENSE_CATEGORIES.some((c) => c.value === category)) return 'Escolha uma categoria.';
  }
  const method = kind === 'despesa' && (str(f, 'method') === 'credito' || category === INVOICE_CATEGORY) ? 'credito' : 'debito';
  return { kind, description, amount, date, profileId: Number(str(f, 'profile_id')) || null, subtype, category, method, paid: str(f, 'status') === 'pago' };
}

export async function createTransaction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const today = todayBR();
  const p = parseForm(f);
  if (typeof p === 'string') return { ok: false, error: p };

  const payment: 'conta' | 'cartao' = p.kind === 'despesa' && p.method === 'credito' ? 'cartao' : 'conta';
  const faturaTotal = payment === 'cartao' && (f.get('invoice_total') === 'on' || p.category === INVOICE_CATEGORY);
  const installments = payment === 'cartao' && !faturaTotal ? Math.min(Math.max(Math.floor(Number(str(f, 'installments')) || 1), 1), 48) : 1;
  // Salário é sempre recorrente; parcelado nunca é recorrente (acaba na última parcela)
  const recurrence: 'fixa' | 'variavel' = p.subtype === 'salario' ? 'fixa'
    : installments > 1 ? 'variavel'
    : str(f, 'classification') === 'recorrente' ? 'fixa' : 'variavel';
  // Parcelado: o valor pode ser informado como total ou como valor de cada parcela
  const total = installments > 1 && str(f, 'amount_mode') === 'parcela' ? p.amount * installments : p.amount;

  const rows: NewRow[] = [];
  const common = { profile_id: p.profileId, kind: p.kind, subtype: p.subtype, category: p.category, description: p.description, recurrence, payment, method: p.kind === 'despesa' ? p.method : null, fatura_total: faturaTotal };

  if (payment === 'cartao' && installments > 1) {
    // A 1ª parcela segue a regra do dia 17; as demais caem uma por fatura
    const first = invoiceMonth(p.date);
    split(total, installments).forEach((value, i) => {
      const month = monthOf(addMonthsDate(`${first}-01`, i));
      rows.push({ ...common, amount: value, month, due_date: invoiceDue(month), group_id: null, inst_no: i + 1,
        inst_total: installments, purchase_date: p.date, paid: false, paid_at: null });
    });
  } else {
    const count = recurrence === 'fixa' ? 12 : 1; // recorrentes se repetem por 1 ano
    for (let i = 0; i < count; i++) {
      const d = addMonthsDate(p.date, i);
      if (faturaTotal) {
        // Total da fatura: entra na fatura do mês da data informada (vence dia 23 desse mês)
        const month = monthOf(d);
        rows.push({ ...common, amount: p.amount, month, due_date: invoiceDue(month), group_id: null, inst_no: 1, inst_total: 1,
          purchase_date: null, paid: false, paid_at: null });
      } else if (payment === 'cartao') {
        const month = invoiceMonth(d);
        rows.push({ ...common, amount: p.amount, month, due_date: invoiceDue(month), group_id: null, inst_no: 1, inst_total: 1,
          purchase_date: d, paid: false, paid_at: null });
      } else {
        const paid = i === 0 && p.paid; // status vale para o primeiro mês
        rows.push({ ...common, amount: p.amount, month: monthOf(d), due_date: d, group_id: null, inst_no: 1, inst_total: 1,
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

/** Edita um lançamento; com "aplicar aos próximos", nome/valor/categoria/responsável valem para o resto da série */
export async function updateTransaction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = Number(str(f, 'id'));
  const p = parseForm(f);
  if (typeof p === 'string') return { ok: false, error: p };
  const sql = await db();
  const [t] = await sql`select * from transactions where id = ${id}`;
  if (!t) return { ok: false, error: 'Lançamento não encontrado.' };
  const today = todayBR();

  let due = t.due_date as string, month = t.month as string, purchase = t.purchase_date as string | null;
  let payment = t.payment as string, method = p.kind === 'despesa' ? p.method : null;
  if (t.payment === 'cartao' && t.inst_total > 1) {
    method = 'credito'; // parcelas continuam nas faturas já calculadas
  } else if (p.method === 'credito' && p.kind === 'despesa' && (f.get('invoice_total') === 'on' || p.category === INVOICE_CATEGORY)) {
    payment = 'cartao'; purchase = null; month = monthOf(p.date); due = invoiceDue(month);
  } else if (p.method === 'credito' && p.kind === 'despesa') {
    payment = 'cartao'; purchase = p.date; month = invoiceMonth(p.date); due = invoiceDue(month);
  } else {
    payment = 'conta'; purchase = null; due = p.date; month = monthOf(p.date);
  }
  const paid = payment === 'cartao' ? t.paid : p.paid;
  const paidAt = paid ? (t.paid_at ?? (due <= today ? due : today)) : null;

  await sql`update transactions set description = ${p.description}, amount = ${p.amount}, category = ${p.category}, subtype = ${p.subtype},
    profile_id = ${p.profileId}, method = ${method}, payment = ${payment}, due_date = ${due}, month = ${month}, purchase_date = ${purchase},
    paid = ${paid}, paid_at = ${paidAt}, fatura_total = ${payment === 'cartao' && t.inst_total <= 1 && (f.get('invoice_total') === 'on' || p.category === INVOICE_CATEGORY)} where id = ${id}`;
  // Lançamentos que se repetem: aplicar nome, valor, categoria e responsável a outros meses da série
  const scope = str(f, 'apply_scope') || (f.get('apply_next') === 'on' ? 'proximos' : 'um');
  // Mesma série = mesmo grupo OU outra repetição com o mesmo nome, pessoa e tipo (lançada separada)
  if ((t.group_id || t.recurrence === 'fixa') && (scope === 'proximos' || scope === 'todos')) {
    const desde = scope === 'proximos' ? t.month : '0000-00';
    await sql`update transactions set description = ${p.description}, amount = ${p.amount}, category = ${p.category}, subtype = ${p.subtype},
      profile_id = ${p.profileId}
      where id <> ${id} and inst_total = ${t.inst_total} and month > ${scope === 'proximos' ? desde : '0000-00'}
        and (${t.group_id ? sql`group_id = ${t.group_id}` : sql`false`}
          or (${t.recurrence === 'fixa'} and recurrence = 'fixa' and kind = ${t.kind}
              and lower(trim(description)) = lower(trim(${t.description}))
              and coalesce(profile_id, 0) = ${t.profile_id ?? 0}))`;
  }
  refresh();
  return { ok: true };
}

/** Exclui vários lançamentos selecionados (só os marcados, não a série inteira) */
export async function deleteMany(ids: number[]) {
  await requireAuth();
  const list = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 2000);
  if (!list.length) return;
  const sql = await db();
  await sql`delete from transactions where id in ${sql(list)}`;
  refresh();
}

/** Liga/desliga "não economizar" ou "não adiantar contas" no mês atual */
export async function setRuleFlag(flag: 'sem_guardar' | 'sem_adiantar', on: boolean) {
  await requireAuth();
  const key = `${flag}:${monthOf(todayBR())}`;
  const sql = await db();
  if (on) await sql`insert into settings (key, value) values (${key}, '1') on conflict (key) do update set value = '1'`;
  else await sql`delete from settings where key = ${key}`;
  refresh();
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

/** Exclui um lançamento: só ele, ele e os próximos da série, ou a série inteira */
export async function deleteTransaction(id: number, scope: 'um' | 'proximos' | 'todos') {
  await requireAuth();
  const sql = await db();
  const [t] = await sql`select group_id, month from transactions where id = ${id}`;
  if (t?.group_id && scope === 'todos') await sql`delete from transactions where group_id = ${t.group_id}`;
  else if (t?.group_id && scope === 'proximos') await sql`delete from transactions where group_id = ${t.group_id} and month >= ${t.month}`;
  else await sql`delete from transactions where id = ${id}`;
  refresh();
}

/** Recomeçar: apaga os tipos de dados escolhidos */
export async function clearData(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const what = { despesas: f.get('despesas') === 'on', receitas: f.get('receitas') === 'on', economia: f.get('economia') === 'on', saldo: f.get('saldo') === 'on', metas: f.get('metas') === 'on' };
  if (!Object.values(what).some(Boolean)) return { ok: false, error: 'Marque o que deseja apagar.' };
  const sql = await db();
  if (what.despesas) await sql`delete from transactions where kind = 'despesa'`;
  if (what.receitas) await sql`delete from transactions where kind = 'receita'`;
  if (what.economia) await sql`delete from savings`;
  if (what.saldo) await sql`delete from settings where key = 'saldo_inicial'`;
  if (f.get('metas') === 'on') await sql`delete from goals`;
  refresh();
  return { ok: true };
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
  if (id < 1) return { ok: false, error: 'Perfil inválido.' };
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

/* ----------------------------------------------------------- Metas */

export async function saveGoal(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = Number(str(f, 'id')) || null;
  const name = str(f, 'name').slice(0, 60);
  const target = parseBRL(str(f, 'target'));
  const deadline = str(f, 'deadline');
  const photo = str(f, 'photo');
  if (photo && (!photo.startsWith('data:image/') || photo.length > 900_000)) return { ok: false, error: 'Foto inválida ou muito grande.' };
  if (!name) return { ok: false, error: 'Dê um nome à meta.' };
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: 'Informe o valor da meta.' };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(deadline)) return { ok: false, error: 'Informe até quando (mês/ano).' };
  const sql = await db();
  if (id) {
    await sql`update goals set name = ${name}, target = ${target}, deadline = ${deadline} where id = ${id}`;
    if (photo) await sql`update goals set photo = ${photo} where id = ${id}`;
    if (f.get('remove_photo') === 'on') await sql`update goals set photo = null where id = ${id}`;
  } else {
    await sql`insert into goals (name, target, deadline, photo) values (${name}, ${target}, ${deadline}, ${photo || null})`;
  }
  refresh();
  return { ok: true };
}

export async function toggleGoal(id: number) {
  await requireAuth();
  const sql = await db();
  await sql`update goals set done = not done, done_at = case when done then null else ${todayBR()} end where id = ${id}`;
  refresh();
}

export async function deleteGoal(id: number) {
  await requireAuth();
  const sql = await db();
  await sql`delete from goals where id = ${id}`;
  refresh();
}
