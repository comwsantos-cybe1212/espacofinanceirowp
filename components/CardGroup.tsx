'use client';

import { useState } from 'react';
import { dateLabel, invoiceDue, monthLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import type { Profile, Tx } from '@/lib/types';
import { IconChevronDown } from './Icons';
import TxRow from './TxRow';

/** Separa os lançamentos: débitos ficam soltos; compras no cartão viram uma linha por fatura */
export function splitCard(items: Tx[]) {
  const outros = items.filter((t) => t.payment !== 'cartao');
  const porMes = new Map<string, Tx[]>();
  for (const t of items.filter((x) => x.payment === 'cartao')) porMes.set(t.month, [...(porMes.get(t.month) ?? []), t]);
  const faturas = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => ({
    month,
    items: list,
    total: list.filter((t) => !t.covered).reduce((a, t) => a + t.amount, 0),
  }));
  return { outros, faturas };
}

/** Uma linha "Fatura do cartão" com o total; toque para ver as compras */
export default function CardGroup({ month, items, total, profiles, today, card }: { month: string; items: Tx[]; total: number; profiles: Profile[]; today: string; card?: boolean }) {
  const [open, setOpen] = useState(false);
  const due = invoiceDue(month);
  const atrasada = due < today && items.some((t) => !t.paid);
  return (
    <div className={card ? 'tx-card card-group' : 'row card-group'} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <button type="button" className="card-group-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="tx-ico out" aria-hidden style={card ? undefined : { width: 34, height: 34, fontSize: 16 }}>💳</span>
        <span className="row-main" style={{ textAlign: 'left' }}>
          <span className="row-title" style={{ display: 'block' }}>Fatura do cartão · {monthLabel(month)}</span>
          <span className="row-meta">{items.length} compra(s) no crédito · vence {dateLabel(due)}</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span className="row-amount neg" style={{ display: 'block' }}>−{brl(total)}</span>
          <span className={`status ${atrasada ? 'neg' : 'warn'}`}>{atrasada ? 'Atrasada' : 'Em aberto'}</span>
        </span>
        <span className="fold-chev" style={{ transform: open ? 'rotate(180deg)' : undefined }}><IconChevronDown /></span>
      </button>
      {open && (
        <div className="list card-group-body">
          {items.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} />)}
        </div>
      )}
    </div>
  );
}
