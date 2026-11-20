'use client';

import { useEffect, useState } from 'react';
import { IconChevronDown } from './Icons';

/** Seção recolhível (setinha). Lembra se estava aberta neste aparelho. */
export default function Fold({ id, title, right, defaultOpen = false, children }: {
  id: string; title: React.ReactNode; right?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try { const v = localStorage.getItem(`ef-fold-${id}`); if (v !== null) setOpen(v === '1'); } catch { /* sem armazenamento */ }
  }, [id]);
  const toggle = () => {
    setOpen((o) => { try { localStorage.setItem(`ef-fold-${id}`, o ? '0' : '1'); } catch { /* */ } return !o; });
  };
  return (
    <section className={`panel fold ${open ? 'open' : ''}`}>
      <div className="fold-head">
        <button type="button" className="fold-toggle" onClick={toggle} aria-expanded={open}>
          <span className="section-title">{title}</span>
        </button>
        {right && <span className="fold-right">{right}</span>}
        <button type="button" className="fold-chev" onClick={toggle} aria-label={open ? 'Recolher' : 'Mostrar'}><IconChevronDown /></button>
      </div>
      {open && <div className="fold-body">{children}</div>}
    </section>
  );
}
