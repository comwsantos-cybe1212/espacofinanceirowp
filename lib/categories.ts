export const EXPENSE_CATEGORIES = [
  { value: 'Moradia', emoji: '🏠' },
  { value: 'Contas da casa', emoji: '💡' },
  { value: 'Mercado', emoji: '🛒' },
  { value: 'Alimentação', emoji: '🍔' },
  { value: 'Transporte', emoji: '🚗' },
  { value: 'Saúde', emoji: '💊' },
  { value: 'Educação', emoji: '📚' },
  { value: 'Diversão', emoji: '🎉' },
  { value: 'Compras', emoji: '🛍️' },
  { value: 'Assinaturas', emoji: '📺' },
  { value: 'Serviços', emoji: '🔧' },
  { value: 'Pets', emoji: '🐾' },
  { value: 'Outros', emoji: '📦' },
] as const;

export const INCOME_SUBTYPES = [
  { value: 'salario', label: 'Salário', emoji: '💼', recurring: true },
  { value: 'beneficio', label: 'Benefício', emoji: '🎁', recurring: true },
  { value: 'freelancer', label: 'Freelancer', emoji: '💻', recurring: false },
  { value: 'outra', label: 'Outros', emoji: '💰', recurring: false },
] as const;

export const METHODS = [
  { value: 'debito', label: 'Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'credito', label: 'Crédito' },
] as const;

export const FUN_CATEGORY = 'Diversão';

export const CATEGORY_COLORS: Record<string, string> = {
  Moradia: '#6366f1', 'Contas da casa': '#0ea5e9', Mercado: '#10b981', Alimentação: '#f59e0b', Transporte: '#64748b',
  Saúde: '#8b5cf6', Educação: '#4f46e5', Diversão: '#f97316', Compras: '#ec4899', Assinaturas: '#14b8a6',
  Serviços: '#22c55e', Pets: '#a16207', Outros: '#94a3b8',
};

export function incomeLabel(subtype: string | null): string {
  return INCOME_SUBTYPES.find((s) => s.value === subtype)?.label ?? 'Receita';
}

export function categoryEmoji(category: string, kind: 'receita' | 'despesa' = 'despesa'): string {
  if (kind === 'receita') return INCOME_SUBTYPES.find((s) => s.label === category)?.emoji ?? '💰';
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.emoji ?? '📦';
}

export function methodLabel(method: string | null, payment: string): string {
  if (payment === 'cartao') return 'Crédito';
  return METHODS.find((m) => m.value === method)?.label ?? 'Débito';
}
