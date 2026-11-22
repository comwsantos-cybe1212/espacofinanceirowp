'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal, useFormState, useFormStatus } from 'react-dom';
import { createTransaction, updateTransaction, type ActionResult } from '@/app/actions';
import { EXPENSE_CATEGORIES, INCOME_SUBTYPES, INVOICE_CATEGORY, METHODS } from '@/lib/categories';
import { addMonths, invoiceMonth, monthLabel, todayBR, CARD_CLOSE_DAY, CARD_DUE_DAY } from '@/lib/dates';
import { brl, parseBRL } from '@/lib/format';
import type { Profile, Tx } from '@/lib/types';
import { IconPencil } from './Icons';
import InfoTip from './InfoTip';

function Submit({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? 'Salvando…' : edit ? 'Salvar alterações' : 'Salvar lançamento'}</button>;
}

const toInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

function Form({ profiles, tx, onDone }: { profiles: Profile[]; tx?: Tx; onDone: () => void }) {
  const edit = !!tx;
  const [state, action] = useFormState<ActionResult | null, FormData>(edit ? updateTransaction : createTransaction, null);
  const [kind, setKind] = useState<'despesa' | 'receita'>(tx?.kind ?? 'despesa');
  const [subtype, setSubtype] = useState(tx?.subtype ?? 'salario');
  const [category, setCategory] = useState(tx?.kind === 'despesa' ? tx.category : 'Outros');
  const [method, setMethod] = useState(tx ? (tx.payment === 'cartao' ? 'credito' : tx.method ?? 'debito') : 'debito');
  const [classification, setClassification] = useState<'comum' | 'recorrente'>(tx?.recurrence === 'fixa' ? 'recorrente' : 'comum');
  const [installments, setInstallments] = useState(1);
  const [amountMode, setAmountMode] = useState<'parcela' | 'total'>('total');
  const [amount, setAmount] = useState(tx ? toInput(tx.amount) : '');
  const [date, setDate] = useState(tx ? (tx.purchase_date ?? tx.due_date) : todayBR());

  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);

  const isCard = kind === 'despesa' && method === 'credito';
  const lockedInstallment = !!tx && tx.payment === 'cartao' && tx.inst_total > 1;
  const [invoiceTotal, setInvoiceTotal] = useState(!!tx?.fatura_total);
  const [gasto, setGasto] = useState<'compartilhado' | 'pessoal'>(tx?.pessoal || tx?.category === 'Valor individual' ? 'pessoal' : 'compartilhado');
  const [who, setWho] = useState(tx ? String(tx.profile_id ?? 0) : '0');
  const asInvoice = isCard && !lockedInstallment && invoiceTotal;
  const parcelado = !edit && isCard && !asInvoice && installments > 1;
  const isSalario = kind === 'receita' && subtype === 'salario';
  const parcelaInfo = (() => {
    const cents = parseBRL(amount);
    if (!parcelado || !Number.isFinite(cents) || cents <= 0) return null;
    const parcela = amountMode === 'parcela' ? cents : Math.floor(cents / installments);
    const ultima = amountMode === 'parcela' ? cents : cents - Math.floor(cents / installments) * (installments - 1);
    const total = amountMode === 'parcela' ? cents * installments : cents;
    const fim = monthLabel(addMonths(invoiceMonth(date || todayBR()), installments - 1));
    return { parcela, ultima, total, fim };
  })();

  const hint = useMemo(() => {
    const cents = parseBRL(amount);
    const ok = Number.isFinite(cents) && cents > 0;
    const parts: string[] = [];
    if (asInvoice && date) {
      parts.push(`Total da fatura de ${monthLabel(date.slice(0, 7))}, vence ${CARD_DUE_DAY}/${date.slice(5, 7)}. Use quando não quiser lançar compra por compra.`);
    } else if (lockedInstallment && isCard && date) {
      parts.push(`Mudar a data da compra reposiciona as parcelas pela regra do cartão (fecha dia ${CARD_CLOSE_DAY}, vence dia ${CARD_DUE_DAY}), conforme a opção escolhida abaixo.`);
    } else if (isCard && date && !lockedInstallment) {
      const first = invoiceMonth(date);
      parts.push(`Compra no dia ${date.slice(8)} → fatura de ${monthLabel(first)} (fecha dia ${CARD_CLOSE_DAY}, vence ${CARD_DUE_DAY}/${first.slice(5)}).`);
      if (parcelado) parts.push('Cada parcela cai em uma fatura, começando por esta.');
    }
    if (!edit && !parcelado && (classification === 'recorrente' || isSalario)) parts.push('Recorrente: repete automaticamente nos próximos 12 meses.');
    return parts;
  }, [amount, date, isCard, parcelado, classification, edit, lockedInstallment, isSalario, asInvoice]);

  return (
    <form action={action} className="form-grid">
      {tx && <input type="hidden" name="id" value={tx.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="field full">
        <span>Tipo</span>
        <div className="type-pick">
          <button type="button" className={kind === 'receita' ? 'on in' : ''} disabled={edit} onClick={() => setKind('receita')}>🚀 Receita</button>
          <button type="button" className={kind === 'despesa' ? 'on out' : ''} disabled={edit} onClick={() => setKind('despesa')}>☄️ Despesa</button>
        </div>
      </div>

      <label className="field">
        <span>{parcelado ? (amountMode === 'parcela' ? 'Valor da parcela (R$)' : 'Valor total (R$)') : lockedInstallment ? 'Valor desta parcela (R$)' : 'Valor (R$)'}</span>
        <input className="input" name="amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <label className="field">
        <span>{asInvoice ? 'Mês da fatura (qualquer dia)' : isCard ? 'Data da compra' : 'Data'}{hint.length > 0 && <InfoTip inline text={<>{hint.map((h) => <span key={h} style={{ display: 'block' }}>{h}</span>)}</>} />}</span>
        <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label className="field full">
        <span>Descrição</span>
        <input className="input" name="description" defaultValue={tx?.description} placeholder="Ex.: Mercado, Salário, Netflix…" maxLength={120} required />
      </label>

      <label className="field">
        <span>Responsável *</span>
        <select className="input" name="profile_id" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="0">Nós</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Categoria</span>
        {kind === 'receita' ? (
          <select className="input" name="subtype" value={subtype} onChange={(e) => {
            setSubtype(e.target.value);
            if (!edit) setClassification(INCOME_SUBTYPES.find((x) => x.value === e.target.value)?.recurring ? 'recorrente' : 'comum');
          }}>
            {INCOME_SUBTYPES.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
          </select>
        ) : (
          <select className="input" name="category" value={category} onChange={(e) => {
            setCategory(e.target.value);
            if (e.target.value === INVOICE_CATEGORY) { setMethod('credito'); setInvoiceTotal(true); }
          }}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>)}
          </select>
        )}
      </label>

      {kind === 'despesa' && (
        <div className="field full">
          <span>Tipo de gasto
            <InfoTip inline align="left" text={'Pessoal: sai do valor individual de quem gastou (se for de "Nós", metade de cada). Compartilhado: conta da casa, não mexe no valor individual.'} />
          </span>
          <input type="hidden" name="gasto" value={gasto} />
          <div className="type-pick two">
            <button type="button" className={gasto === 'compartilhado' ? 'on' : ''} onClick={() => setGasto('compartilhado')}>🏠 Compartilhado</button>
            <button type="button" className={gasto === 'pessoal' ? 'on' : ''} onClick={() => setGasto('pessoal')}>
              🙋 Pessoal{gasto === 'pessoal' && who !== '0' ? ` · ${profiles.find((p) => String(p.id) === who)?.name ?? ''}` : ''}
            </button>
          </div>
          {gasto === 'pessoal' && <span className="faint small">Sai do valor individual de {who === '0' ? 'cada um (metade de cada)' : profiles.find((p) => String(p.id) === who)?.name}.</span>}
        </div>
      )}

      {kind === 'despesa' && (
        <label className="field">
          <span>Forma de pagamento</span>
          <select className="input" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}{lockedInstallment && m.value === 'credito' ? ` (parcela ${tx!.inst_no}/${tx!.inst_total})` : ''}</option>)}
          </select>
        </label>
      )}

      {isCard ? (
        !edit && !asInvoice ? (
          <label className="field">
            <span>Parcelas</span>
            <select className="input" name="installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Status</span>
            <select className="input" name="status" defaultValue={tx?.paid ? 'pago' : 'aberto'}>
              <option value="aberto">Em aberto</option>
              <option value="pago">Pago</option>
            </select>
          </label>
        )
      ) : (
        <label className={`field ${kind === 'receita' ? 'full' : ''}`}>
          <span>Status</span>
          <select className="input" name="status" defaultValue={tx?.paid ? 'pago' : 'aberto'}>
            {kind === 'receita'
              ? <><option value="aberto">Prevista</option><option value="pago">Recebida</option></>
              : <><option value="aberto">Em aberto</option><option value="pago">Pago</option></>}
          </select>
        </label>
      )}

      {isCard && !lockedInstallment && (
        <label className="check full">
          <input type="checkbox" name="invoice_total" checked={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.checked)} />
          É o valor total da fatura (sem detalhar as compras)
          {asInvoice && date && <span className="chip violet">fatura {monthLabel(date.slice(0, 7))} · vence {CARD_DUE_DAY}/{date.slice(5, 7)}</span>}
        </label>
      )}

      {parcelado && (
        <div className="field full">
          <span>O valor informado é</span>
          <div className="segmented">
            <label><input type="radio" name="amount_mode" value="total" checked={amountMode === 'total'} onChange={() => setAmountMode('total')} />Total da compra</label>
            <label><input type="radio" name="amount_mode" value="parcela" checked={amountMode === 'parcela'} onChange={() => setAmountMode('parcela')} />Valor de cada parcela</label>
          </div>
          {parcelaInfo && (
            <div className="parcel-result">
              <strong>{installments}x de {brl(parcelaInfo.parcela)}</strong>
              {parcelaInfo.ultima !== parcelaInfo.parcela && <span> (última {brl(parcelaInfo.ultima)})</span>}
              <span> · total {brl(parcelaInfo.total)} · até {parcelaInfo.fim}</span>
            </div>
          )}
        </div>
      )}

      {!edit && !parcelado && !isSalario && (
        <div className="field full">
          <span>Classificação da conta</span>
          <input type="hidden" name="classification" value={classification} />
          <div className="type-pick two">
            <button type="button" className={classification === 'comum' ? 'on' : ''} onClick={() => setClassification('comum')}>Conta comum</button>
            <button type="button" className={classification === 'recorrente' ? 'on' : ''} onClick={() => setClassification('recorrente')}>Conta recorrente</button>
          </div>
        </div>
      )}

      {!edit && (parcelado || isSalario) && <input type="hidden" name="classification" value={isSalario ? 'recorrente' : 'comum'} />}

      {edit && (tx?.group_id || tx?.recurrence === 'fixa') && (
        <div className="field full">
          <span>Aplicar a alteração em
            <InfoTip inline align="left" text={`Este lançamento se repete${tx.inst_total > 1 ? ` (${tx.inst_total} parcelas)` : ''}. Nome, valor, categoria e responsável podem mudar só aqui ou em todos. Data e status mudam só neste.`} />
          </span>
          <div className="segmented">
            <label><input type="radio" name="apply_scope" value="um" defaultChecked />Só {tx.inst_total > 1 ? 'esta parcela' : 'este mês'}</label>
            <label><input type="radio" name="apply_scope" value="proximos" />Este e os próximos</label>
            <label><input type="radio" name="apply_scope" value="todos" />Todos os meses</label>
          </div>
        </div>
      )}

      {state?.error && <p className="error full" role="alert">{state.error}</p>}

      <div className="full" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <Submit edit={edit} />
      </div>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        <h3>{title}</h3>
        <p className="muted small" style={{ margin: '-10px 0 16px' }}>Preencha as informações do seu lançamento financeiro.</p>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function AddTransaction({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <button className="btn btn-primary add-btn" onClick={() => { setKey((k) => k + 1); setOpen(true); }} aria-label="Novo lançamento" title="Novo lançamento">
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>+</span><span className="add-label">Novo lançamento</span>
      </button>
      {open && <Modal title="🚀 Novo lançamento" onClose={() => setOpen(false)}><Form key={key} profiles={profiles} onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}

export function EditTransaction({ tx, profiles }: { tx: Tx; profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm icon-btn btn-ghost" title="Editar" aria-label="Editar" onClick={(e) => { e.preventDefault(); setOpen(true); }}><IconPencil /></button>
      {open && <Modal title="✏️ Editar lançamento" onClose={() => setOpen(false)}><Form profiles={profiles} tx={tx} onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}
