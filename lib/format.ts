const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Valores são guardados em centavos */
export const brl = (cents: number) => fmt.format(cents / 100);

/** "1.234,56" | "1234.56" | "1234" -> centavos */
export function parseBRL(input: string): number {
  let s = String(input).trim().replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // "34.000" = trinta e quatro mil
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
