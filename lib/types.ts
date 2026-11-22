export type Profile = { id: number; name: string; color: string; photo: string | null };

/** Gastos/receitas do casal (sem perfil individual) */
export const NOS: Profile = { id: 0, name: 'Nós', color: '#a77bff', photo: '/fotos/nos.jpg' };

export type Tx = {
  id: number;
  profile_id: number | null;
  kind: 'receita' | 'despesa';
  subtype: string | null;
  category: string;
  description: string;
  amount: number;
  due_date: string;
  month: string;
  recurrence: 'fixa' | 'variavel';
  payment: 'conta' | 'cartao';
  method: string | null;
  /** Lançado como o valor total de uma fatura (entra na fatura do mês da data, sem a regra do dia 17) */
  fatura_total: boolean;
  /** Gasto pessoal: sai do valor individual de quem gastou (de "Nós", metade de cada) */
  pessoal: boolean;
  /** Compra no cartão que já está dentro de um "total da fatura" lançado no mesmo mês (aparece, mas não soma) */
  covered?: boolean;
  group_id: string | null;
  inst_no: number;
  inst_total: number;
  purchase_date: string | null;
  paid: boolean;
  paid_at: string | null;
};

export type SavingMove = { id: number; date: string; amount: number; note: string | null };

export type Goal = { id: number; name: string; target: number; deadline: string; done: boolean; done_at: string | null; photo: string | null };

export type AppData = {
  profiles: Profile[];
  goals: Goal[];
  /** Todos os lançamentos, inclusive os já incluídos num total de fatura (para listas) */
  allTxs: Tx[];
  txs: Tx[];
  savings: SavingMove[];
  openingBalance: number;
  /** Configurações salvas (saldo inicial, divisões do mês, opções da divisão) */
  settings: Record<string, string>;
  /** Divisões feitas: mês (YYYY-MM) → saldo que foi dividido, em centavos */
  divisoes: Record<string, number>;
  today: string;
};
