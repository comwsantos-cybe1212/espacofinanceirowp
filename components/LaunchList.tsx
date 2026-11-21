'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { deleteMany } from '@/app/actions';
import { EXPENSE_CATEGORIES, INCOME_SUBTYPES } from '@/lib/categories';
import type { Profile, Tx } from '@/lib/types';
import { IconTrash } from './Icons';
import TxRow from './TxRow';
import { brl } from '@/lib/format';

/** Filtros (pessoa, categoria, status) que atualizam o endereço da página */
export function LaunchFilters({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    router.push(`${path}?${p}`);
  };
  return (
    <div className="filters">
      <select className="input" value={params.get('p') ?? ''} onChange={(e) => set('p', e.target.value)} aria-label="Pessoa">
        <option value="">Pessoa: Todas</option>
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="nos">Nós</option>
      </select>
      <select className="input" value={params.get('c') ?? ''} onChange={(e) => set('c', e.target.value)} aria-label="Categoria">
        <option value="">Categoria: Todas</option>
        {params.get('t') !== 'despesa' && INCOME_SUBTYPES.map((s) => <option key={s.value} value={s.label}>{s.emoji} {s.label}</option>)}
        {params.get('t') !== 'receita' && EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>)}
      </select>
      <select className="input" value={params.get('s') ?? ''} onChange={(e) => set('s', e.target.value)} aria-label="Status">
        <option value="">Pago: Todos</option>
        <option value="pago">Pagos / recebidos</option>
        <option value="aberto">Em aberto / previstos</option>
        <option value="atrasado">Atrasados</option>
      </select>
    </div>
  );
}

export default function LaunchList({ receitas, despesas, profiles, today }: { receitas: Tx[]; despesas: Tx[]; profiles: Profile[]; today: string }) {
  const all = [...receitas, ...despesas];
  const debitos = despesas.filter((t) => t.payment !== 'cartao');
  const cartao = despesas.filter((t) => t.payment === 'cartao');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = all.length > 0 && all.every((t) => sel.has(t.id));
  const chosen = all.filter((t) => sel.has(t.id));

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="panel select-bar">
        <label className="check" style={{ fontWeight: 700 }}>
          <input type="checkbox" className="round-check" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(all.map((t) => t.id)))} />
          Selecionar todos ({all.length})
        </label>
        <button className="btn btn-sm btn-delete" disabled={!chosen.length || pending}
          onClick={() => {
            if (!window.confirm(`Excluir ${chosen.length} lançamento(s) selecionado(s)? Isso não pode ser desfeito.`)) return;
            start(async () => { await deleteMany(chosen.map((t) => t.id)); setSel(new Set()); });
          }}>
          <IconTrash />Excluir selecionados ({chosen.length})
        </button>
      </div>

      {receitas.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 className="list-title pos">Receitas lançadas ({receitas.length})</h2>
          {receitas.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} card selected={sel.has(t.id)} onSelect={toggle} />)}
        </section>
      )}
      {debitos.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 className="list-title neg">Despesas no débito ({debitos.length})</h2>
          {debitos.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} card selected={sel.has(t.id)} onSelect={toggle} />)}
        </section>
      )}
      {cartao.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 className="list-title" style={{ color: 'var(--pink)' }}>
            Cartão de crédito ({cartao.length}) · total {brl(cartao.filter((t) => !t.covered).reduce((a, t) => a + t.amount, 0))}
          </h2>
          {cartao.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} card selected={sel.has(t.id)} onSelect={toggle} />)}
        </section>
      )}
      {all.length === 0 && <div className="panel empty">Nenhum lançamento com esses filtros.</div>}
    </div>
  );
}
