'use client';

import { useState, useTransition } from 'react';
import { moveSavings, payNow } from '@/app/actions';
import { monthLabel } from '@/lib/dates';
import { brl, parseBRL } from '@/lib/format';
import type { Tx } from '@/lib/types';

/** "Guardar na caixinha": só sai do saldo depois da confirmação */
export function SaveToBox({ cents, saldo }: { cents: number; saldo: number }) {
  const [value, setValue] = useState((cents / 100).toFixed(2).replace('.', ','));
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const go = () => {
    const v = parseBRL(value);
    if (!Number.isFinite(v) || v <= 0) return setErr('Informe um valor válido.');
    const aviso = v > saldo ? `\n\nAtenção: é mais do que o saldo atual (${brl(saldo)}). Guarde quando o dinheiro entrar.` : '';
    if (!window.confirm(`Confirma que ${brl(v)} foi guardado na caixinha?\nO valor sai do saldo atual e vai para a economia.${aviso}`)) return;
    start(async () => {
      const f = new FormData();
      f.set('amount', value); f.set('direction', 'guardar'); f.set('note', 'Caixinha');
      const r = await moveSavings(null, f);
      if (r.ok) { setDone(brl(v)); setErr(''); } else setErr(r.error ?? 'Erro ao guardar.');
    });
  };
  if (done) return <span className="small pos" style={{ fontWeight: 700 }}>✓ {done} guardado na caixinha e enviado para a economia.</span>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" aria-label="Valor a guardar" style={{ padding: '7px 10px' }} />
        <button className="btn btn-primary btn-sm" onClick={go} disabled={pending}>{pending ? '…' : 'Guardar na caixinha'}</button>
      </div>
      {err && <span className="error">{err}</span>}
    </div>
  );
}

/** Lista do que adiantar (sempre visível) + escolher qualquer outra conta futura */
export function AdvancePicker({ suggestions, all }: { suggestions: Tx[]; all: Tx[] }) {
  const [other, setOther] = useState('');
  const [pending, start] = useTransition();
  const pay = (t: Tx) => {
    if (!window.confirm(`Adiantar "${t.description}"${t.inst_total > 1 ? ` (parcela ${t.inst_no}/${t.inst_total})` : ''} de ${monthLabel(t.month)} — ${brl(t.amount)}?`)) return;
    start(() => payNow(t.id));
  };
  const label = (t: Tx) => `${t.description}${t.inst_total > 1 ? ` ${t.inst_no}/${t.inst_total}` : ''} · ${monthLabel(t.month)} · ${brl(t.amount)}`;
  return (
    <details className="more advance">
      <summary>Sugestão do que adiantar{suggestions.length > 0 ? ` (${suggestions.length})` : ''}</summary>
      <div className="stack" style={{ gap: 8 }}>
      {suggestions.length > 0 ? (
        <>
          <div className="list">
            {suggestions.map((t) => (
              <div className="row" key={t.id} style={{ padding: '7px 0' }}>
                <div className="row-main">
                  <div className="row-title small">{t.description}{t.inst_total > 1 && <span className="faint"> {t.inst_no}/{t.inst_total}</span>}</div>
                  <div className="row-meta">{monthLabel(t.month)} · {brl(t.amount)}</div>
                </div>
                <button className="btn btn-sm" disabled={pending} onClick={() => pay(t)}>Adiantar</button>
              </div>
            ))}
          </div>
        </>
      ) : <span className="faint small">Nenhuma conta futura cabe no valor restante.</span>}
      {all.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="input" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Escolher outra conta para adiantar" style={{ padding: '7px 10px', fontSize: 13 }}>
            <option value="">Escolher outra conta…</option>
            {all.map((t) => <option key={t.id} value={t.id}>{label(t)}</option>)}
          </select>
          <button className="btn btn-sm" disabled={!other || pending} onClick={() => { const t = all.find((x) => String(x.id) === other); if (t) pay(t); setOther(''); }}>Adiantar</button>
        </div>
      )}
      </div>
    </details>
  );
}
