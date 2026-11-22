'use client';

import { useState, useTransition } from 'react';
import { deleteSaving, updateSaving } from '@/app/actions';
import { dateLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import type { SavingMove } from '@/lib/types';
import { IconPencil, IconTrash } from './Icons';

/** Lista do que foi guardado/resgatado, com editar valor e desistir (excluir) */
export default function SavingsList({ items, compact }: { items: SavingMove[]; compact?: boolean }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  if (!items.length) return null;
  return (
    <div className="list" style={compact ? { marginTop: 2 } : undefined}>
      {items.map((m) => (
        <div className="row" key={m.id} style={compact ? { padding: '6px 0' } : undefined}>
          {editing === m.id ? (
            <>
              <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoFocus
                aria-label="Novo valor" style={{ padding: '6px 10px', flex: 1 }} />
              <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
                const r = await updateSaving(m.id, value);
                if (r.ok) { setEditing(null); setErr(''); } else setErr(r.error ?? 'Erro');
              })}>Salvar</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(null); setErr(''); }}>Cancelar</button>
            </>
          ) : (
            <>
              <div className="row-main">
                <div className={compact ? 'small' : 'row-title'} style={{ fontWeight: 700 }}>{m.amount >= 0 ? 'Guardado' : 'Resgatado'}{m.note ? ` · ${m.note}` : ''}</div>
                <div className="row-meta">{dateLabel(m.date)}/{m.date.slice(0, 4)}</div>
              </div>
              <div className={`row-amount ${m.amount >= 0 ? 'pos' : 'neg'} ${compact ? 'small' : ''}`}>{m.amount >= 0 ? '+' : '−'} {brl(Math.abs(m.amount))}</div>
              <div className="row-actions">
                <button className="btn btn-sm icon-btn btn-ghost" title="Editar valor" aria-label="Editar valor"
                  onClick={() => { setEditing(m.id); setValue((Math.abs(m.amount) / 100).toFixed(2).replace('.', ',')); }}><IconPencil /></button>
                <button className="btn btn-sm icon-btn btn-ghost btn-danger" title="Desistir (excluir)" aria-label="Desistir (excluir)" disabled={pending}
                  onClick={() => { if (window.confirm(`Desistir de ${m.amount >= 0 ? 'guardar' : 'resgatar'} ${brl(Math.abs(m.amount))}? O valor volta para o saldo atual.`)) start(() => deleteSaving(m.id)); }}><IconTrash /></button>
              </div>
            </>
          )}
        </div>
      ))}
      {err && <span className="error">{err}</span>}
    </div>
  );
}
