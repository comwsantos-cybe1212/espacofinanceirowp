'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ef-theme', next); } catch { /* navegação privada */ }
    setTheme(next);
  };

  const label = theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro';
  return (
    <button type="button" className={withLabel ? 'btn' : 'btn icon-btn'} onClick={toggle} title={label} aria-label={label}>
      <span aria-hidden style={{ fontSize: 17 }}>{theme === 'light' ? '🌙' : '☀️'}</span>
      {withLabel && (theme === 'light' ? 'Modo escuro' : 'Modo claro')}
    </button>
  );
}
