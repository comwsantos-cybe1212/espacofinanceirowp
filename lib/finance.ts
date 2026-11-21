import { addMonths, invoiceDue, invoiceMonth, monthOf } from './dates';
import { INDIVIDUAL_CATEGORY } from './categories';
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

  const openMonth = invoiceMonth(today); // fatura do cartão que está recebendo compras agora
  const receber = txs.filter((t) => !t.paid && t.kind === 'receita' && t.month <= cur);
  const dividas = txs.filter((t) => !t.paid && t.kind === 'despesa' && t.due_date < today);
  // A pagar: contas do mês, incluindo a fatura do cartão que VENCE neste mês (dia 23).
  // A fatura aberta (compras depois do dia 17) só entra no mês em que vence.
  const pagar = txs.filter((t) => !t.paid && t.kind === 'despesa' && t.due_date >= today && t.month <= cur);
  const faturaNoPagar = sum(pagar.filter((t) => t.payment === 'cartao')) + sum(dividas.filter((t) => t.payment === 'cartao'));

  const aReceber = sum(receber);
  const aPagar = sum(pagar);
  const totalDividas = sum(dividas);
  const saldoPrevisto = saldoAtual + aReceber - aPagar - totalDividas;

  return { cur, openMonth, saldoAtual, aReceber, aPagar, totalDividas, dividas, saldoPrevisto, savingsTotal, receber, pagar, faturaNoPagar };
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
 * Com `seguirRegra`, ao fim de cada mês com sobra: ⅓ vai para os valores individuais, ⅓ para a economia e
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

export type Individual = {
  profile: Profile;
  anterior: number; // valor individual que sobrou dos meses anteriores
  cotaMes: number; // adicionado neste mês pela divisão
  gastoMes: number; // gasto neste mês na categoria "Valor individual"
  atual: number; // valor individual atual = anterior + adicionado − gasto
};

export type RuleOfThree = {
  dividido: boolean; // a divisão deste mês já foi feita?
  saldoAtual: number;
  reservado: number; // valores individuais de meses anteriores (já estão no saldo e não entram de novo)
  basePrevia: number; // saldo previsto do mês − reservado: o que seria dividido agora
  saldoPrevisto: number;
  base: number; // saldo dividido neste mês (fixo depois de feita a divisão)
  terco: number; // valor de cada parte ativa
  partes: number; // 3, ou 2 quando "não guardar"/"não adiantar" neste mês
  semGuardar: boolean;
  semAdiantar: boolean;
  futuras: Tx[]; // todas as contas futuras que podem ser adiantadas
  individuais: Individual[];
  adiantar: { cota: number; usado: number; resta: number; sugestoes: Tx[] };
  guardar: { cota: number; usado: number; resta: number };
};

const flagOn = (d: AppData, flag: string, month: string) => d.settings[`${flag}:${month}`] === '1';
const partesDoMes = (d: AppData, m: string) => 1 + (flagOn(d, 'sem_guardar', m) ? 0 : 1) + (flagOn(d, 'sem_adiantar', m) ? 0 : 1);

/** Valor que cada pessoa recebeu da divisão de um mês */
function cotaIndividual(d: AppData, month: string) {
  const base = d.divisoes[month];
  if (base === undefined || base <= 0) return 0;
  return Math.floor(Math.floor(base / partesDoMes(d, month)) / Math.max(d.profiles.length, 1));
}

/** Gasto de uma pessoa na categoria "Valor individual" em um mês (o que é de "Nós" conta metade para cada) */
function effMonth(t: Tx) {
  return t.payment === 'cartao' && t.purchase_date && t.inst_no === 1 ? monthOf(t.purchase_date) : t.month;
}

function gastoIndividual(d: AppData, profileId: number, month: string) {
  const n = Math.max(d.profiles.length, 1);
  return d.txs
    .filter((t) => t.kind === 'despesa' && t.category === INDIVIDUAL_CATEGORY && effMonth(t) === month)
    .reduce((a, t) => a + (t.profile_id === profileId ? t.amount : !t.profile_id ? Math.round(t.amount / n) : 0), 0);
}

/** Valor individual acumulado até um mês (inclusive): soma das divisões − gastos individuais desde a primeira divisão */
export function individualBalance(d: AppData, profileId: number, upTo: string) {
  const meses = Object.keys(d.divisoes).sort();
  if (!meses.length || meses[0] > upTo) return 0;
  let total = 0;
  for (const m of meses) if (m <= upTo) total += cotaIndividual(d, m);
  const gastos = [...new Set(d.txs.map(effMonth))].filter((m) => m >= meses[0] && m <= upTo)
    .reduce((a, m) => a + gastoIndividual(d, profileId, m), 0);
  return total - gastos;
}

/**
 * Divisão do mês: o SALDO PREVISTO do mês (saldo atual + o que falta receber − o que falta pagar),
 * menos os valores individuais que sobraram de meses anteriores, é dividido em partes iguais —
 * valor individual (÷2, um para cada), adiantar contas e guardar. Atualiza sozinha a cada lançamento;
 * o valor de cada mês fica salvo para os valores individuais acumularem.
 * Gastos da própria divisão (valor individual, contas adiantadas, caixinha) não diminuem a base.
 */
export function ruleOfThree(d: AppData): RuleOfThree {
  const s = summary(d);
  const cur = s.cur;
  const prev = addMonths(cur, -1);

  const anteriores = d.profiles.map((p) => ({ p, anterior: individualBalance(d, p.id, prev) }));
  const reservado = anteriores.reduce((a, x) => a + Math.max(0, x.anterior), 0);
  // O que a própria divisão já usou neste mês volta para a base (senão seria descontado duas vezes)
  const adiantadoMes = d.txs.filter((t) => t.kind === 'despesa' && t.paid && t.paid_at && monthOf(t.paid_at) === cur && t.month > cur);
  const guardadoMes = d.savings.filter((m) => monthOf(m.date) === cur).reduce((a, m) => a + m.amount, 0);
  // gastos individuais descontados da pessoa NESTE mês e que também pesam nas contas deste mês
  // (compras individuais no cartão feitas depois do dia 17 só pesam no mês da fatura, e aí já saíram da sobra individual)
  const individualMes = sum(d.txs.filter((t) => t.kind === 'despesa' && t.category === INDIVIDUAL_CATEGORY
    && t.month === cur && effMonth(t) === cur));
  const basePrevia = Math.max(0, s.saldoPrevisto + individualMes + sum(adiantadoMes) + guardadoMes - reservado);
  // Automática: a divisão do mês sempre acompanha a previsão atual
  const dividido = true;
  const base = basePrevia;

  const semGuardar = flagOn(d, 'sem_guardar', cur);
  const semAdiantar = flagOn(d, 'sem_adiantar', cur);
  const partes = partesDoMes(d, cur);
  const terco = base > 0 ? Math.floor(base / partes) : 0;
  const cotaAdiantar = semAdiantar ? 0 : terco;
  const cotaGuardar = semGuardar ? 0 : terco;
  const n = Math.max(d.profiles.length, 1);

  const individuais = anteriores.map(({ p, anterior }) => {
    const cotaMes = Math.floor(terco / n);
    const gastoMes = gastoIndividual(d, p.id, cur);
    return { profile: p, anterior, cotaMes, gastoMes, atual: anterior + (dividido ? cotaMes : 0) - gastoMes };
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
    if (t.amount <= budget) { sugestoes.push(t); budget -= t.amount; }
  }

  return {
    dividido, saldoAtual: s.saldoAtual, saldoPrevisto: s.saldoPrevisto, reservado, basePrevia, base, terco, partes, semGuardar, semAdiantar,
    futuras: [...futuras].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.description.localeCompare(b.description)),
    individuais,
    adiantar: { cota: cotaAdiantar, usado: usadoAdiantar, resta: restaAdiantar, sugestoes },
    guardar: { cota: cotaGuardar, usado: guardadoMes, resta: cotaGuardar - guardadoMes },
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
