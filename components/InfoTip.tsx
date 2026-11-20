'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Pequeno "i": a explicação só aparece ao tocar.
 * inline = ao lado de um título/texto; align = para que lado o balão abre.
 */
export default function InfoTip({ text, inline, align = 'right' }: { text: React.ReactNode; inline?: boolean; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span className={`info ${inline ? 'inline' : ''}`} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="info-btn" aria-label="O que é isso?" aria-expanded={open} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}>i</button>
      <span className={`info-pop ${align}`} role="tooltip" hidden={!open}>{text}</span>
    </span>
  );
}
