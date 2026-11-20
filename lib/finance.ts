import { addMonths, invoiceDue, invoiceMonth, monthOf } from './dates';
import { FUN_CATEGORY } from './categories';
import { NOS, type AppData, type Profile, type Tx } from './types';

const sum = (list: Tx[]) => list.reduce((s, t) => s + t.amount, 0);

export type TxStatus = 'pago' | 'pendente' | 'atrasado';
export function txStatus(t: Tx, today: string): TxStatus {
  if (t.paid) return 'pago';
  return t.due_date < today ? 'atrasado' : 'pendente';
}

/* ---------------------------------------------------------------- Resumo */

export function summary(d: AppData) {
  const { txs, today } = d;
  const cur = monthOf(today);
  const savingsTotal = d.savings.reduce((s, m) => s + m.amount, 0);

  const paidIn = sum(txs.filter((t) => t.paid && t.kind === 'receita'));
  const paidOut = sum(txs.filter((t) => t.paid && t.kind === 'despesa'));
  // Dinheiro guardado sai do saldo e vai para o cofre "Economia"
  const saldoAtual = d.openingBalance + paidIn - paidOut - savingsTotal;

  const receber = txs.filter((t) => !t.paid && t.kind === 'receita' && t.month <= cur);
  const dividas = txs.filter((t) => !t.paid && t.kind === 'despesa' && t.due_date < today);
  const pagar = txs.filter((t) => !t.paid && t.kind === 'despesa' && t.month <= cur && t.due_date >= today);

  const aReceber = sum(receber);
  const aPagar = sum(pagar);
  const totalDividas = sum(dividas);
  const saldoPrevisto = saldoAtual + aReceber - aPagar - totalDividas;

  return { cur, saldoAtual, aReceber, aPagar, totalDividas, dividas, saldoPrevisto, savingsTotal, receber, pagar };
}

/* ---------------------------------------------------------------- Cartão */

export type Invoice = {
  month: string;
  due: string;
  items: Tx[];
  total: number;
  open: number; // ainda não pago
  status: 'paga' | 'vencida' | 'fechada' | 'aberta' | 'futura';
};

export function openInvoiceMonth(today: string) {
  return invoiceMonth(today);
}

export function invoices(d: AppData): Invoice[] {
  const card = d.txs.filter((t) => t.kind === 'despesa' && t.payment === 'cartao');
  const openMonth = openInvoiceMonth(d.today);
  const byMonth = new Map<string, Tx[]>();
  for (const t of card) byMonth.set(t.month, [...(byMonth.get(t.month) ?? []), t]);
  if (!byMonth.has(openMonth)) byMonth.set(openMonth, []);

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => {
      const total = sum(items);
      const open = sum(items.filter((t) => !t.paid));
      const due = invoiceDue(month);
      let status: Invoice['status'];
      if (items.length > 0 && open === 0) status = 'paga';
      else if (month < openMonth) status = due < d.today ? 'vencida' : 'fechada';
      else if (month === openMonth) status = 'aberta';
      else status = 'futura';
      return { month, due, items, total, open, status };
    });
}

/** Fatura "atual": a mais antiga ainda não paga até a aberta; senão a aberta */
export function currentInvoice(d: AppData): Invoice | undefined {
  const all = invoices(d);
  const openMonth = openInvoiceMonth(d.today);
  return all.find((i) => i.month <= openMonth && i.open > 0) ?? all.find((i) => i.month === openMonth);
}

export type Installment = {
  group: string;
  description: string;
  category: string;
  profile_id: number | null;
  purchase_date: string | null;
  parcela: number;
  totalParcelas: number;
  pagas: number;
  faltam: number;
  restante: number;
  total: number;
  ultimoMes: string;
  proximaId: number | null;
  ultimaId: number | null;
};

export function installmentPlans(d: AppData): Installment[] {
  const groups = new Map<string, Tx[]>();
  for (const t of d.txs) {
    if (t.payment === 'cartao' && t.inst_total > 1 && t.group_id) {
      groups.set(t.group_id, [...(groups.get(t.group_id) ?? []), t]);
    }
  }
  return [...groups.entries()]
    .map(([group, list]) => {
      list.sort((a, b) => a.inst_no - b.inst_no);
      const pending = list.filter((t) => !t.paid);
      const first = list[0];
      return {
        group,
        description: first.description,
        category: first.category,
        profile_id: first.profile_id,
        purchase_date: first.purchase_date,
        parcela: first.amount,
        totalParcelas: first.inst_total,
        pagas: list.length - pending.length,
        faltam: pending.length,
        restante: sum(pending),
        total: sum(list),
        ultimoMes: list[list.length - 1].month,
        proximaId: pending[0]?.id ?? null,
        ultimaId: pending[pending.length - 1]?.id ?? null,
      };
    })
    .filter((p) => p.faltam > 0)
    .sort((a, b) => a.ultimoMes.localeCompare(b.ultimoMes));
}

/** Último mês que ainda tem alguma parcela em aberto */
export function freeOfInstallmentsAfter(d: AppData): string | null {
  const months = d.txs.filter((t) => t.payment === 'cartao' && t.inst_total > 1 && !t.paid).map((t) => t.month);
  return months.length ? months.sort().at(-1)! : null;
}

/* ---------------------------------------------------------------- Projeção */

export type ProjectionRow = {
  month: string;
  inicio: number;
  receitas: number;
  despesas: number;
  cartao: number;
  fim: number;
  terco: number; // sugestão da regra de 3 (cada parte)
  economia: number; // cofre acumulado ao fim do mês
};

/**
 * Mês atual: começa no saldo real de hoje, soma o que falta receber e tira o que falta pagar (incl. dívidas).
 * Meses seguintes: começam com o que sobrou do anterior + receitas − despesas ainda não pagas daquele mês.
 * Com `seguirRegra`, ao fim de cada mês com sobra: ⅓ é gasto em diversão, ⅓ vai para a economia e
 * ⅓ adianta contas futuras (continua no saldo porque já está contado nas despesas futuras).
 */
export function projection(d: AppData, months = 12, seguirRegra = false): ProjectionRow[] {
  const s = summary(d);
  const rows: ProjectionRow[] = [];
  let inicio = s.saldoAtual;
  let economia = s.savingsTotal;

  for (let i = 0; i < months; i++) {
    const month = addMonths(s.cur, i);
    let receitas: number, despesas: number, cartao: number;
    if (i === 0) {
      receitas = s.aReceber;
      despesas = s.aPagar + s.totalDividas;
      cartao = sum([...s.pagar, ...s.dividas].filter((t) => t.payment === 'cartao'));
    } else {
      const list = d.txs.filter((t) => !t.paid && t.month === month);
      receitas = sum(list.filter((t) => t.kind === 'receita'));
      const out = list.filter((t) => t.kind === 'despesa');
      despesas = sum(out);
      cartao = sum(out.filter((t) => t.payment === 'cartao'));
    }
    const fim = inicio + receitas - despesas;
    const terco = fim > 0 ? Math.floor(fim / 3) : 0;
    let proximoInicio = fim;
    if (seguirRegra && terco > 0) {
      economia += terco;
      proximoInicio = fim - 2 * terco;
    }
    rows.push({ month, inicio, receitas, despesas, cartao, fim, terco, economia });
    inicio = proximoInicio;
  }
  return rows;
}

/* ---------------------------------------------------------------- Regra de 3 */

export type RuleOfThree = {
  base: number;
  terco: number; // valor de cada parte ativa
  partes: number; // 3, ou 2 quando "não guardar"/"não adiantar" neste mês
  semGuardar: boolean;
  semAdiantar: boolean;
  futuras: Tx[]; // todas as contas futuras que podem ser adiantadas
  diversao: { profile: Profile; cota: number; usado: number; resta: number }[];
  adiantar: { cota: number; usado: number; resta: number; sugestoes: Tx[] };
  guardar: { cota: number; usado: number; resta: number };
  cortes: Tx[]; // quando falta dinheiro: maiores gastos variáveis do mês
};

/**
 * Base = tudo que sobra no mês (saldo previsto) antes das ações da própria regra,
 * por isso somamos de volta o que já foi gasto em diversão, adiantado ou guardado neste mês.
 * Assim a cota fica estável durante o mês, e o que não for usado passa para o mês seguinte.
 */
export function ruleOfThree(d: AppData): RuleOfThree {
  const s = summary(d);
  const cur = s.cur;

  const diversaoMes = d.txs.filter((t) => t.kind === 'despesa' && t.category === FUN_CATEGORY && t.month === cur);
  const adiantadoMes = d.txs.filter((t) => t.kind === 'despesa' && t.paid && t.paid_at && monthOf(t.paid_at) === cur && t.month > cur);
  const guardadoMes = d.savings.filter((m) => monthOf(m.date) === cur).reduce((a, m) => a + m.amount, 0);

  const base = s.saldoPrevisto + sum(diversaoMes) + sum(adiantadoMes) + guardadoMes;
  // Partes ativas: valor individual sempre; guardar e adiantar podem ser desligados no mês
  const partes = 1 + (d.semGuardar ? 0 : 1) + (d.semAdiantar ? 0 : 1);
  const terco = base > 0 ? Math.floor(base / partes) : 0;
  const cotaAdiantar = d.semAdiantar ? 0 : terco;
  const cotaGuardar = d.semGuardar ? 0 : terco;

  // Valor individual: metade da parte de diversão para cada um; diversão de "nós" desconta metade de cada
  const n = Math.max(d.profiles.length, 1);
  const nosDiversao = sum(diversaoMes.filter((t) => !t.profile_id));
  const diversao = d.profiles.map((p) => {
    const cota = Math.floor(terco / n);
    const usado = sum(diversaoMes.filter((t) => t.profile_id === p.id)) + Math.round(nosDiversao / n);
    return { profile: p, cota, usado, resta: cota - usado };
  });

  const usadoAdiantar = sum(adiantadoMes);
  const restaAdiantar = cotaAdiantar - usadoAdiantar;

  // Prioridade: últimas parcelas do cartão (encurta o parcelamento) e depois contas fixas mais próximas
  const futuras = d.txs.filter((t) => t.kind === 'despesa' && !t.paid && t.month > cur);
  const parcelas = futuras.filter((t) => t.payment === 'cartao' && t.inst_total > 1).sort((a, b) => b.month.localeCompare(a.month));
  const outras = futuras.filter((t) => !(t.payment === 'cartao' && t.inst_total > 1)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const sugestoes: Tx[] = [];
  let budget = restaAdiantar;
  for (const t of [...parcelas, ...outras]) {
    if (sugestoes.length >= 5) break;
    if (t.amount <= budget) {
      sugestoes.push(t);
      budget -= t.amount;
    }
  }

  const cortes = base > 0 ? [] : d.txs
    .filter((t) => t.kind === 'despesa' && t.recurrence === 'variavel' && t.month === cur)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    base,
    terco,
    partes,
    semGuardar: d.semGuardar,
    semAdiantar: d.semAdiantar,
    futuras: [...futuras].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.description.localeCompare(b.description)),
    diversao,
    adiantar: { cota: cotaAdiantar, usado: usadoAdiantar, resta: restaAdiantar, sugestoes },
    guardar: { cota: cotaGuardar, usado: guardadoMes, resta: cotaGuardar - guardadoMes },
    cortes,
  };
}

/* ---------------------------------------------------------------- Perfis */

export function spendingByProfile(d: AppData, month: string) {
  const out = d.txs.filter((t) => t.kind === 'despesa' && t.month === month);
  const cats = [...new Set(out.map((t) => t.category))];
  const byCategory = cats
    .map((category) => {
      const row: Record<string, string | number> = { category };
      for (const p of d.profiles) row[`p${p.id}`] = sum(out.filter((t) => t.category === category && t.profile_id === p.id)) / 100;
      row.total = sum(out.filter((t) => t.category === category)) / 100;
      return row;
    })
    .sort((a, b) => Number(b.total) - Number(a.total));

  const totals = [...d.profiles, NOS].map((p) => ({
    profile: p,
    despesas: sum(out.filter((t) => (t.profile_id ?? 0) === p.id)),
    receitas: sum(d.txs.filter((t) => t.kind === 'receita' && t.month === month && (t.profile_id ?? 0) === p.id)),
    topCategoria: (() => {
      const mine = out.filter((t) => (t.profile_id ?? 0) === p.id);
      const m = new Map<string, number>();
      for (const t of mine) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
      return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })(),
  }));
  return { byCategory, totals };
}

export function monthlyTrend(d: AppData, endMonth: string, count = 6) {
  return Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1)).map((month) => {
    const row: Record<string, string | number> = { month };
    for (const p of d.profiles) {
      row[`p${p.id}`] = sum(d.txs.filter((t) => t.kind === 'despesa' && t.month === month && t.profile_id === p.id)) / 100;
    }
    return row;
  });
}

/** Total de receitas e despesas de um mês (competência) */
export function monthTotals(d: AppData, month: string) {
  const list = d.txs.filter((t) => t.month === month);
  return {
    receitas: sum(list.filter((t) => t.kind === 'receita')),
    despesas: sum(list.filter((t) => t.kind === 'despesa')),
  };
}

/** Gastos individuais de uma pessoa no mês: fixos, variáveis e por categoria */
export function personalSpending(d: AppData, profileId: number, month: string) {
  const mine = d.txs.filter((t) => t.kind === 'despesa' && t.month === month && t.profile_id === profileId);
  const fixos = mine.filter((t) => t.recurrence === 'fixa');
  const variaveis = mine.filter((t) => t.recurrence === 'variavel');
  const cats = new Map<string, number>();
  for (const t of mine) cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
  return {
    total: sum(mine),
    fixos,
    totalFixos: sum(fixos),
    variaveis,
    totalVariaveis: sum(variaveis),
    categorias: [...cats.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
}

/* ---------------------------------------------------------------- Metas */

function monthsBetween(from: string, to: string) {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * A economia guardada abastece as metas ativas por ordem de prazo.
 * Para cada meta: já temos, faltam, meses para juntar (incluindo o atual) e quanto guardar por mês.
 * Metas concluídas "usam" o valor delas: disponível = economia − metas concluídas.
 */
export function goalsPlan(d: AppData) {
  const cur = monthOf(d.today);
  const economia = d.savings.reduce((a, m) => a + m.amount, 0);
  const usado = d.goals.filter((g) => g.done).reduce((a, g) => a + g.target, 0);
  const disponivel = Math.max(0, economia - usado);
  let pool = disponivel;
  const ativas = d.goals.filter((g) => !g.done).map((g) => {
    const jaTemos = Math.min(pool, g.target);
    pool -= jaTemos;
    const faltam = g.target - jaTemos;
    const meses = Math.max(0, monthsBetween(cur, g.deadline) + 1);
    const porMes = faltam > 0 ? Math.ceil(faltam / Math.max(meses, 1)) : 0;
    return { goal: g, jaTemos, faltam, meses, porMes, vencida: meses === 0 && faltam > 0, pct: g.target ? Math.round((jaTemos / g.target) * 100) : 0 };
  });
  const concluidas = d.goals.filter((g) => g.done);
  const porMesTotal = ativas.reduce((a, g) => a + g.porMes, 0);
  return { economia, usado, disponivel, ativas, concluidas, porMesTotal };
}

/* ---------------------------------------------------------------- Perfil individual */

export type ProfileItem = { id: number; description: string; amount: number; shared: boolean; date: string; recurrence: string };
export type ProfileSummary = {
  profile: Profile;
  month: string;
  ganhos: number;
  gastos: number;
  fixos: number;
  variaveis: number;
  categorias: { category: string; amount: number; items: ProfileItem[] }[];
};

/**
 * Resultado de uma pessoa no mês: o que é dela + metade de tudo que é de "Nós" (casa 50/50).
 */
export function profileSummary(d: AppData, profile: Profile, month: string): ProfileSummary {
  const n = Math.max(d.profiles.length, 1);
  const share = (t: Tx) => (t.profile_id === profile.id ? t.amount : !t.profile_id ? Math.round(t.amount / n) : 0);
  const doMes = d.txs.filter((t) => t.month === month && (t.profile_id === profile.id || !t.profile_id));
  const despesas = doMes.filter((t) => t.kind === 'despesa');
  const cats = new Map<string, ProfileItem[]>();
  for (const t of despesas) {
    const item = { id: t.id, description: t.description, amount: share(t), shared: !t.profile_id, date: t.due_date, recurrence: t.recurrence };
    cats.set(t.category, [...(cats.get(t.category) ?? []), item]);
  }
  return {
    profile,
    month,
    ganhos: doMes.filter((t) => t.kind === 'receita').reduce((a, t) => a + share(t), 0),
    gastos: despesas.reduce((a, t) => a + share(t), 0),
    fixos: despesas.filter((t) => t.recurrence === 'fixa').reduce((a, t) => a + share(t), 0),
    variaveis: despesas.filter((t) => t.recurrence === 'variavel').reduce((a, t) => a + share(t), 0),
    categorias: [...cats.entries()]
      .map(([category, items]) => ({ category, amount: items.reduce((a, i) => a + i.amount, 0), items: items.sort((a, b) => b.amount - a.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
