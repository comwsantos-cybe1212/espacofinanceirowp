'use client';

import { useState, useTransition } from 'react';
import { addPrepayment, deletePrepayment, updatePrepayment } from '@/app/actions';
import { dateLabel, monthLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import type { Prepayment } from '@/lib/types';
import { IconPencil, IconTrash } from './Icons';

/** Lista de antecipações de fatura, com corrigir valor e desfazer */
export function PrepayList({ items, showMonth }: { items: Prepayment[]; showMonth?: boolean }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  if (!items.length) return null;
  return (
    <div className="list">
      {items.map((p) => (
        <div className="row" key={p.id} style={{ padding: '6px 0' }}>
          {editing === p.id ? (
            <>
              <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoFocus aria-label="Novo valor" style={{ padding: '6px 10px', flex: 1 }} />
              <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
                const r = await updatePrepayment(p.id, value); if (r.ok) { setEditing(null); setErr(''); } else setErr(r.error ?? 'Erro');
              })}>Salvar</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <div className="row-main">
                <div className="row-title small">💳 Antecipação{showMonth ? ` da fatura de ${monthLabel(p.month)}` : ''}</div>
                <div className="row-meta">paga em {dateLabel(p.date)}/{p.date.slice(0, 4)}</div>
              </div>
              <div className="row-amount small">{brl(p.amount)}</div>
              <div className="row-actions">
                <button className="btn btn-sm icon-btn btn-ghost" title="Corrigir valor" aria-label="Corrigir valor"
                  onClick={() => { setEditing(p.id); setValue((p.amount / 100).toFixed(2).replace('.', ',')); }}><IconPencil /></button>
                <button className="btn btn-sm icon-btn btn-ghost btn-danger" title="Desfazer antecipação" aria-label="Desfazer antecipação" disabled={pending}
                  onClick={() => { if (window.confirm(`Desfazer a antecipação de ${brl(p.amount)}? O valor volta para a fatura de ${monthLabel(p.month)}.`)) start(() => deletePrepayment(p.id)); }}><IconTrash /></button>
              </div>
            </>
          )}
        </div>
      ))}
      {err && <span className="error">{err}</span>}
    </div>
  );
}

/** Campo para antecipar um valor da fatura */
export function PrepayForm({ month, max }: { month: string; max: number }) {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={`Até ${brl(max)}`}
          aria-label={`Valor para antecipar da fatura de ${monthLabel(month)}`} style={{ padding: '7px 10px', flex: 1, minWidth: 140 }} />
        <button type="button" className="btn btn-sm btn-primary" disabled={pending || !value}
          onClick={() => {
            if (!window.confirm(`Antecipar ${value} da fatura de ${monthLabel(month)}? O valor é pago hoje e sai do saldo atual.`)) return;
            start(async () => { const r = await addPrepayment(month, value); setMsg(r.ok ? 'Antecipado ✓' : r.error ?? 'Erro'); if (r.ok) setValue(''); });
          }}>Antecipar valor</button>
      </div>
      {msg && <span className={msg.endsWith('✓') ? 'pos small' : 'error'}>{msg}</span>}
    </div>
  );
}
