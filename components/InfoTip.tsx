'use client';

import { useEffect, useRef, useState } from 'react';

/** Pequeno "i": ao tocar, explica o que o número significa */
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span className="info" ref={ref}>
      <button type="button" className="info-btn" aria-label="O que é isso?" aria-expanded={open} onClick={() => setOpen((o) => !o)}>i</button>
      <span className="info-pop" role="tooltip" hidden={!open}>{text}</span>
    </span>
  );
}
