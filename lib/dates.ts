export const CARD_CLOSE_DAY = 17; // compras até dia 17 entram na fatura do mês
export const CARD_DUE_DAY = 23; // fatura vence dia 23

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo */
export function todayBR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export const monthOf = (d: string) => d.slice(0, 7);

const pad = (n: number) => String(n).padStart(2, '0');

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Soma meses a uma data, ajustando o dia ao fim do mês quando preciso (31/01 + 1 = 28/02) */
export function addMonthsDate(date: string, n: number): string {
  const month = addMonths(monthOf(date), n);
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(month));
  return `${month}-${pad(day)}`;
}

/** Mês da fatura em que uma compra no cartão cai */
export function invoiceMonth(purchaseDate: string): string {
  const day = Number(purchaseDate.slice(8, 10));
  const m = monthOf(purchaseDate);
  return day <= CARD_CLOSE_DAY ? m : addMonths(m, 1);
}

export const invoiceDue = (month: string) => `${month}-${pad(CARD_DUE_DAY)}`;

export function monthLabel(month: string, long = false): string {
  const [y, m] = month.split('-').map(Number);
  return long ? `${MESES[m - 1]} ${y}` : `${MESES_CURTOS[m - 1]}/${String(y).slice(2)}`;
}

export function dateLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function isValidMonth(m: string | undefined): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export function isValidDate(d: string | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}
