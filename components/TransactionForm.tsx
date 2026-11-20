'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal, useFormState, useFormStatus } from 'react-dom';
import { createTransaction, type ActionResult } from '@/app/actions';
import { EXPENSE_CATEGORIES, INCOME_SUBTYPES } from '@/lib/categories';
import { addMonths, invoiceMonth, monthLabel, todayBR, CARD_CLOSE_DAY, CARD_DUE_DAY } from '@/lib/dates';
import { brl, parseBRL } from '@/lib/format';
import type { Profile } from '@/lib/types';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar lançamento'}</button>;
}

function Form({ profiles, onDone }: { profiles: Profile[]; onDone: () => void }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(createTransaction, null);
  const [kind, setKind] = useState<'despesa' | 'receita'>('despesa');
  const [subtype, setSubtype] = useState('salario');
  const [recurrence, setRecurrence] = useState<'variavel' | 'fixa'>('variavel');
  const [payment, setPayment] = useState<'conta' | 'cartao'>('conta');
  const [installments, setInstallments] = useState(1);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayBR());

  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);

  const st = INCOME_SUBTYPES.find((s) => s.value === subtype)!;
  const effectiveRecurrence = kind === 'receita' && st.fixed !== null ? (st.fixed ? 'fixa' : 'variavel') : recurrence;
  const isCard = kind === 'despesa' && payment === 'cartao';
  const parcelado = isCard && effectiveRecurrence === 'variavel' && installments > 1;

  const hint = useMemo(() => {
    const cents = parseBRL(amount);
    const parts: string[] = [];
    if (isCard && date) {
      const first = invoiceMonth(date);
      parts.push(`Compra no dia ${date.slice(8)} → entra na fatura de ${monthLabel(first)} (fecha dia ${CARD_CLOSE_DAY}, vence ${CARD_DUE_DAY}/${first.slice(5)}).`);
      if (parcelado) {
        const last = addMonths(first, installments - 1);
        parts.push(`${installments}x de ${Number.isFinite(cents) && cents > 0 ? brl(Math.floor(cents / installments)) : '—'}, última parcela em ${monthLabel(last)}.`);
      }
    }
    if (effectiveRecurrence === 'fixa') parts.push('Fixo: será repetido automaticamente nos próximos 12 meses.');
    return parts;
  }, [amount, date, isCard, parcelado, installments, effectiveRecurrence]);

  return (
    <form action={action} className="form-grid">
      <div className="segmented full" role="radiogroup" aria-label="Tipo">
        <label className="out"><input type="radio" name="kind" value="despesa" checked={kind === 'despesa'} onChange={() => setKind('despesa')} />− Despesa</label>
        <label className="in"><input type="radio" name="kind" value="receita" checked={kind === 'receita'} onChange={() => setKind('receita')} />+ Receita</label>
      </div>

      {kind === 'receita' ? (
        <label className="field full">
          <span>Tipo de receita</span>
          <select className="input" name="subtype" value={subtype} onChange={(e) => setSubtype(e.target.value)}>
            {INCOME_SUBTYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}{s.fixed === true ? ' (fixo)' : s.fixed === false ? ' (variável)' : ''}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field full">
          <span>Categoria</span>
          <select className="input" name="category" defaultValue="">
            <option value="" disabled>Escolha…</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}

      <label className="field full">
        <span>Descrição</span>
        <input className="input" name="description" placeholder={kind === 'receita' ? 'Ex.: Salário empresa X' : 'Ex.: Aluguel, lanche, tênis…'} maxLength={120} required />
      </label>

      <label className="field">
        <span>{parcelado ? 'Valor total da compra (R$)' : 'Valor (R$)'}</span>
        <input className="input" name="amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>

      <label className="field">
        <span>{isCard ? 'Data da compra' : kind === 'receita' ? 'Data de recebimento' : 'Data / vencimento'}</span>
        <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {(kind === 'despesa' || st.fixed === null) && (
        <div className="field full">
          <span>Recorrência</span>
          <div className="segmented">
            <label><input type="radio" name="recurrence" value="variavel" checked={recurrence === 'variavel'} onChange={() => setRecurrence('variavel')} />Variável (uma vez)</label>
            <label><input type="radio" name="recurrence" value="fixa" checked={recurrence === 'fixa'} onChange={() => setRecurrence('fixa')} />Fixa (todo mês)</label>
          </div>
        </div>
      )}

      {kind === 'despesa' && (
        <div className="field full">
          <span>Forma de pagamento</span>
          <div className="segmented">
            <label><input type="radio" name="payment" value="conta" checked={payment === 'conta'} onChange={() => setPayment('conta')} />Pix / débito / dinheiro</label>
            <label><input type="radio" name="payment" value="cartao" checked={payment === 'cartao'} onChange={() => setPayment('cartao')} />Cartão de crédito</label>
          </div>
        </div>
      )}

      {isCard && recurrence === 'variavel' && (
        <label className="field">
          <span>Parcelas</span>
          <select className="input" name="installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}
          </select>
        </label>
      )}

      <div className="field full">
        <span>De quem é?</span>
        <div className="segmented">
          {profiles.map((p) => (
            <label key={p.id}><input type="radio" name="profile_id" value={p.id} />{p.name}</label>
          ))}
          <label><input type="radio" name="profile_id" value="0" defaultChecked />Nós</label>
        </div>
      </div>

      {!isCard && (
        <label className="check full">
          <input type="checkbox" name="paid" defaultChecked />
          {kind === 'receita' ? 'Já recebi' : 'Já paguei'}{effectiveRecurrence === 'fixa' ? ' (este mês)' : ''}
        </label>
      )}

      {hint.length > 0 && <div className="note full">{hint.map((h) => <div key={h}>{h}</div>)}</div>}
      {state?.error && <p className="error full" role="alert">{state.error}</p>}

      <div className="full" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <Submit />
      </div>
    </form>
  );
}

export default function AddTransaction({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className="btn btn-primary add-btn" onClick={() => { setKey((k) => k + 1); setOpen(true); }} aria-label="Novo lançamento" title="Novo lançamento">
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>+</span><span className="add-label">Novo lançamento</span>
      </button>
      {open && createPortal(
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Novo lançamento">
            <h3>Novo lançamento</h3>
            <Form key={key} profiles={profiles} onDone={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
