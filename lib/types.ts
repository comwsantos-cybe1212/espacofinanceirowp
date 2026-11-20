export type Profile = { id: number; name: string; color: string; photo: string | null };

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
  group_id: string | null;
  inst_no: number;
  inst_total: number;
  purchase_date: string | null;
  paid: boolean;
  paid_at: string | null;
};

export type SavingMove = { id: number; date: string; amount: number; note: string | null };

export type AppData = {
  profiles: Profile[];
  txs: Tx[];
  savings: SavingMove[];
  openingBalance: number;
  today: string;
};
