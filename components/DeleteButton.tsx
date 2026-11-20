'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { deleteTransaction } from '@/app/actions';
import { IconTrash } from './Icons';

type Scope = 'um' | 'proximos' | 'todos';

/** Excluir: lançamentos de uma série (fixos/parcelados) perguntam o alcance */
export default function DeleteButton({ id, description, series, parcelado }: { id: number; description: string; series: boolean; parcelado: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const run = (scope: Scope) => start(async () => { await deleteTransaction(id, scope); setOpen(false); });
  const unit = parcelado ? 'parcela' : 'mês';

  return (
    <>
      <button type="button" className="btn btn-sm icon-btn btn-ghost btn-danger" title="Excluir" aria-label="Excluir"
        onClick={(e) => { e.preventDefault(); setOpen(true); }}>
        <IconTrash />
      </button>
      {open && createPortal(
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 400 }}>
            <h3>Excluir “{description}”?</h3>
            {series ? (
              <>
                <p className="muted small" style={{ marginTop: -6 }}>Este lançamento se repete. O que deseja apagar?</p>
                <div className="stack" style={{ gap: 8 }}>
                  <button className="btn" disabled={pending} onClick={() => run('um')}>Só {parcelado ? 'esta parcela' : 'este mês'}</button>
                  <button className="btn" disabled={pending} onClick={() => run('proximos')}>Est{parcelado ? 'a' : 'e'} {unit} e os próximos</button>
                  <button className="btn btn-danger" disabled={pending} onClick={() => run('todos')}>Todos os meses</button>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="btn btn-danger" disabled={pending} onClick={() => run('um')}>Excluir</button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
