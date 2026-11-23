'use client';

import { useState, useTransition } from 'react';
import { markSaved, moveSavings, payNow, setAdvancePlan, setRuleFlag, setSavingPlan, togglePaid } from '@/app/actions';
import { EditTransaction } from './TransactionForm';
import { monthLabel } from '@/lib/dates';
import { brl, parseBRL } from '@/lib/format';
import type { Profile, Tx } from '@/lib/types';

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

/** Caixinha ✓ para incluir ou não uma parte (economizar / adiantar) na divisão do mês */
export function RuleToggle({ flag, label, on, month }: { flag: 'sem_guardar' | 'sem_adiantar'; label: string; on: boolean; month?: string }) {
  const [checked, setChecked] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className="check rule-toggle">
      <input type="checkbox" checked={checked} disabled={pending}
        onChange={(e) => { const v = e.target.checked; setChecked(v); start(() => setRuleFlag(flag, !v, month)); }} />
      {label}
    </label>
  );
}

/** Economia do mês: estipular o valor e marcar ☑ se foi economizado */
export function SavingPlan({ month, cota, plano, guardado, futuro }: { month: string; cota: number; plano: number | null; guardado: number; futuro: boolean }) {
  const [value, setValue] = useState(((plano ?? cota) / 100).toFixed(2).replace('.', ','));
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const economizado = guardado > 0;
  const [checked, setChecked] = useState(economizado);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="field" style={{ gap: 4 }}>
        <span>Valor para economizar {plano === null && <span className="faint">(automático: ⅓)</span>}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={{ padding: '7px 10px' }} aria-label="Valor para economizar" />
          <button type="button" className="btn btn-sm" disabled={pending}
            onClick={() => start(async () => { const r = await setSavingPlan(month, value); setMsg(r.ok ? 'Valor definido ✓' : r.error ?? 'Erro'); })}>Definir</button>
        </div>
      </label>
      <label className="check rule-toggle" title={futuro ? 'Marque quando o mês chegar' : undefined}>
        <input type="checkbox" checked={checked} disabled={pending || (futuro && !economizado)}
          onChange={(e) => {
            const v = e.target.checked;
            const cents = parseBRL(value);
            const txt = v
              ? `Confirmar que ${Number.isFinite(cents) ? brl(cents) : value} foi economizado?\nO valor sai do saldo atual e vai para a economia.`
              : `Desmarcar? O que foi guardado neste mês (${brl(guardado)}) volta para o saldo atual.`;
            if (!window.confirm(txt)) return;
            setChecked(v);
            start(async () => { const r = await markSaved(month, v, value); if (!r.ok) { setChecked(!v); setMsg(r.error ?? 'Erro'); } else setMsg(''); });
          }} />
        Economizado {economizado && <span className="pos">· {brl(guardado)} na caixinha</span>}
      </label>
      {futuro && !economizado && <span className="faint small">Dá para marcar quando o mês chegar.</span>}
      {msg && <span className={msg.endsWith('✓') ? 'pos small' : 'error'}>{msg}</span>}
    </div>
  );
}

/** Contas adiantadas no mês: ver quais foram, desfazer ou editar (para simular a organização) */
export function AdvancedList({ items, profiles }: { items: Tx[]; profiles: Profile[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return null;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ fontWeight: 700 }}>Adiantadas ({items.length}) · {brl(items.reduce((a, t) => a + t.amount, 0))}</span>
      <div className="list">
        {items.map((t) => (
          <div className="row" key={t.id} style={{ padding: '6px 0' }}>
            <div className="row-main">
              <div className="row-title small">{t.description}{t.inst_total > 1 && <span className="faint"> {t.inst_no}/{t.inst_total}</span>}</div>
              <div className="row-meta">era de {monthLabel(t.month)} · {brl(t.amount)}</div>
            </div>
            <EditTransaction tx={t} profiles={profiles} />
            <button type="button" className="btn btn-sm" disabled={pending} title="Desfazer o adiantamento"
              onClick={() => { if (window.confirm(`Desfazer o adiantamento de "${t.description}"? Ela volta a ficar em aberto em ${monthLabel(t.month)}.`)) start(() => togglePaid(t.id)); }}>
              ↩ Desfazer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Valor usado para adiantar contas no mês (definido por vocês; vazio = ⅓ automático) */
export function AdvancePlan({ month, cota, plano }: { month: string; cota: number; plano: number | null }) {
  const [value, setValue] = useState(((plano ?? cota) / 100).toFixed(2).replace('.', ','));
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <label className="field" style={{ gap: 4 }}>
      <span>Valor para adiantar contas {plano === null && <span className="faint">(automático: ⅓)</span>}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={{ padding: '7px 10px' }} aria-label="Valor para adiantar contas" />
        <button type="button" className="btn btn-sm" disabled={pending}
          onClick={() => start(async () => { const r = await setAdvancePlan(month, value); setMsg(r.ok ? 'Valor definido ✓' : r.error ?? 'Erro'); })}>Definir</button>
      </div>
      {plano !== null && (
        <button type="button" className="btn btn-sm btn-ghost link-btn" disabled={pending}
          onClick={() => start(async () => { await setAdvancePlan(month, ''); setMsg(''); })}>Voltar ao automático (⅓)</button>
      )}
      {msg && <span className={msg.endsWith('✓') ? 'pos small' : 'error'}>{msg}</span>}
    </label>
  );
}
