'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { brl } from '@/lib/format';
import type { Profile, Tx } from '@/lib/types';
import InfoTip from './InfoTip';
import TxRow from './TxRow';
import CardGroup, { splitCard } from './CardGroup';

type Props = {
  /** false na lista da própria fatura: mostra compra por compra */
  groupCard?: boolean;
  label: string; value: number; color: string; icon: React.ReactNode; info: string; hint?: React.ReactNode;
  title: string; items: Tx[]; profiles: Profile[]; today: string; empty: string;
};

/** Card do topo que, ao tocar, mostra a lista do que compõe o valor */
export default function ListTile({ groupCard = true, label, value, color, icon, info, hint, title, items, profiles, today, empty }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const sorted = [...items].sort((a, b) => a.due_date.localeCompare(b.due_date));
  return (
    <>
      <div className="panel tile clickable" style={{ ['--c' as string]: color }} role="button" tabIndex={0}
        onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}>
        <div className="tile-label"><span className="tile-ico">{icon}</span>{label}<InfoTip text={info} /></div>
        <div className="tile-value">{brl(value)}</div>
        <div className="tile-hint">{hint} <span className="tile-more">ver lista ›</span></div>
      </div>
      {open && createPortal(
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: 620 }}>
            <button type="button" className="modal-x" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
            <h3 style={{ marginBottom: 4 }}>{title}</h3>
            <p className="muted" style={{ margin: '0 0 14px' }}>{groupCard ? (() => { const { outros, faturas } = splitCard(sorted); return outros.length + faturas.length; })() : sorted.length} item(ns) · total <strong style={{ color }}>{brl(value)}</strong></p>
            {sorted.length === 0 ? <div className="empty">{empty}</div> : (
              groupCard ? (() => {
                const { outros, faturas } = splitCard(sorted);
                return (
                  <div className="list">
                    {outros.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} />)}
                    {faturas.map((f) => <CardGroup key={f.month} {...f} profiles={profiles} today={today} />)}
                  </div>
                );
              })() : <div className="list">{sorted.map((t) => <TxRow key={t.id} t={t} profiles={profiles} today={today} />)}</div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
