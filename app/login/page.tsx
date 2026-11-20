'use client';

import { useCallback, useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import Mascot from '@/components/Mascot';

const LENGTH = 6;

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = useCallback(async (value: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: value }) });
      if (res.ok) {
        window.location.href = '/';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Erro no servidor (${res.status}). Abra /api/saude para ver o diagnóstico.`);
    } catch {
      setError('Sem conexão. Tente novamente.');
    }
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setPin('');
    setBusy(false);
  }, []);

  const press = useCallback((d: string) => {
    if (busy) return;
    setPin((p) => {
      if (p.length >= LENGTH) return p;
      const next = p + d;
      if (next.length === LENGTH) submit(next);
      return next;
    });
  }, [busy, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <main className="login">
      <div style={{ position: 'fixed', top: 12, right: 12 }}><ThemeToggle /></div>
      <div className="login-card">
        <Mascot size={96} />
        <h1 className="login-title">Espaço Financeiro</h1>
        <p className="muted small" style={{ marginTop: 6 }}>Digite a senha para entrar em órbita</p>

        <div className={`pin-dots ${shake ? 'shake' : ''}`} aria-label={`${pin.length} de ${LENGTH} dígitos`}>
          {Array.from({ length: LENGTH }, (_, i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <p className="error" style={{ minHeight: 20, margin: '6px 0 0' }} role="alert">{busy ? <span className="muted">Verificando…</span> : error}</p>

        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="key" onClick={() => press(d)} disabled={busy}>{d}</button>
          ))}
          <span />
          <button className="key" onClick={() => press('0')} disabled={busy}>0</button>
          <button className="key" onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy} aria-label="Apagar">⌫</button>
        </div>
      </div>
    </main>
  );
}
