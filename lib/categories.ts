export const EXPENSE_CATEGORIES = [
  'Moradia', 'Contas da casa', 'Mercado', 'Alimentação fora', 'Transporte', 'Saúde',
  'Diversão', 'Compras', 'Educação', 'Assinaturas', 'Pets', 'Outros',
] as const;

export const INCOME_SUBTYPES = [
  { value: 'salario', label: 'Salário', fixed: true },
  { value: 'beneficio', label: 'Benefício', fixed: true },
  { value: 'freelancer', label: 'Freelancer', fixed: false },
  { value: 'outra', label: 'Outra receita', fixed: null },
] as const;

export const FUN_CATEGORY = 'Diversão';

export function incomeLabel(subtype: string | null): string {
  return INCOME_SUBTYPES.find((s) => s.value === subtype)?.label ?? 'Receita';
}
