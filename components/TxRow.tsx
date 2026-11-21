'use client';

import { togglePaid } from '@/app/actions';
import { categoryEmoji, methodLabel } from '@/lib/categories';
import { monthLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import { NOS, type Profile, type Tx } from '@/lib/types';
import ActionButton from './ActionButton';
import Avatar from './Avatar';
import DeleteButton from './DeleteButton';
import { IconCard, IconCheck, IconRepeat, IconUndo } from './Icons';
import { EditTransaction } from './TransactionForm';

const fmtDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function statusOf(t: Tx, today: string) {
  const income = t.kind === 'receita';
  if (t.paid) return { label: income ? 'Recebida' : 'Paga', cls: 'pos' };
  if (t.due_date < today) return { label: 'Atrasada', cls: 'neg' };
  return { label: income ? 'Prevista' : 'Em aberto', cls: 'warn' };
}

type Props = {
  t: Tx; profiles: Profile[]; today: string; actions?: boolean;
  card?: boolean; selected?: boolean; onSelect?: (id: number) => void;
};

export default function TxRow({ t, profiles, today, actions = true, card, selected, onSelect }: Props) {
  const profile = profiles.find((p) => p.id === t.profile_id) ?? NOS;
  const income = t.kind === 'receita';
  const st = statusOf(t, today);

  return (
    <div className={card ? `tx-card ${selected ? 'selected' : ''}` : 'row'}>
      {onSelect && (
        <input type="checkbox" className="round-check" checked={!!selected} onChange={() => onSelect(t.id)} aria-label={`Selecionar ${t.description}`} />
      )}
      {card
        ? <span className={`tx-ico ${income ? 'in' : 'out'}`} aria-hidden>{income ? '↑' : '↓'}</span>
        : <Avatar profile={profile} size={34} />}
      <div className="row-main">
        <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</span>
          {t.inst_total > 1 && <span className="chip">{t.inst_no}/{t.inst_total}</span>}
          {t.recurrence === 'fixa' && <span className="mini-ico" title="Recorrente"><IconRepeat /></span>}
          {t.covered && <span className="chip" title="Faz parte do total da fatura lançado neste mês">no total da fatura</span>}
          {t.payment === 'cartao' && <span className="mini-ico" title="Cartão"><IconCard /></span>}
        </div>
        <div className="row-meta">
          {card && <Avatar profile={profile} size={18} />}
          <span>{categoryEmoji(t.category, t.kind)} {t.category}</span>
          <span>· {profile.name}</span>
          <span>· {fmtDate(t.purchase_date ?? t.due_date)}</span>
          {!income && <span>· {methodLabel(t.method, t.payment)}{t.payment === 'cartao' && ` · ${t.fatura_total ? 'total da fatura' : 'fatura'} ${monthLabel(t.month)}`}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`row-amount ${income ? 'pos' : 'neg'}`}>{income ? '+' : '−'}{brl(t.amount)}</div>
        <div className={`status ${st.cls}`}>{st.label}</div>
      </div>
      {actions && (
        <div className="row-actions">
          <ActionButton action={togglePaid.bind(null, t.id)} className="btn btn-sm icon-btn btn-ghost"
            title={t.paid ? 'Marcar como pendente' : income ? 'Marcar como recebida' : 'Marcar como paga'}>
            {t.paid ? <IconUndo /> : <IconCheck />}
          </ActionButton>
          <EditTransaction tx={t} profiles={profiles} />
          <DeleteButton id={t.id} description={t.description} series={!!t.group_id} parcelado={t.inst_total > 1} />
        </div>
      )}
    </div>
  );
}
