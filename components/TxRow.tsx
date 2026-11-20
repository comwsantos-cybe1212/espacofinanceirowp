import { togglePaid } from '@/app/actions';
import { incomeLabel } from '@/lib/categories';
import { dateLabel, monthLabel } from '@/lib/dates';
import { txStatus } from '@/lib/finance';
import { brl } from '@/lib/format';
import type { Profile, Tx } from '@/lib/types';
import DeleteButton from './DeleteButton';
import ActionButton from './ActionButton';
import Avatar from './Avatar';
import { IconCheck, IconUndo } from './Icons';

export default function TxRow({ t, profiles, today, actions = true }: { t: Tx; profiles: Profile[]; today: string; actions?: boolean }) {
  const profile = profiles.find((p) => p.id === t.profile_id);
  const status = txStatus(t, today);
  const income = t.kind === 'receita';

  return (
    <div className="row">
      <Avatar profile={profile} size={34} />
      <div className="row-main">
        <div className="row-title">
          {t.description}
          {t.inst_total > 1 && <span className="faint"> · {t.inst_no}/{t.inst_total}</span>}
        </div>
        <div className="row-meta">
          <span>{income ? incomeLabel(t.subtype) : t.category}</span>
          <span>· {t.payment === 'cartao' ? `fatura ${monthLabel(t.month)}` : dateLabel(t.due_date)}</span>
          {t.recurrence === 'fixa' && <span className="chip violet">fixo</span>}
          {t.payment === 'cartao' && <span className="chip cyan">cartão</span>}
          {status === 'pago' && <span className="chip green">{income ? 'recebido' : 'pago'}</span>}
          {status === 'pendente' && <span className="chip amber">{income ? 'a receber' : 'a pagar'}</span>}
          {status === 'atrasado' && <span className="chip red">{income ? 'atrasado' : 'dívida'}</span>}
        </div>
      </div>
      <div className={`row-amount ${income ? 'pos' : ''}`}>{income ? '+' : '−'} {brl(t.amount)}</div>
      {actions && (
        <div className="row-actions">
          <ActionButton
            action={togglePaid.bind(null, t.id)}
            className="btn btn-sm icon-btn"
            title={t.paid ? 'Marcar como pendente' : income ? 'Marcar como recebido' : 'Marcar como pago'}
          >
            {t.paid ? <IconUndo /> : <IconCheck />}
          </ActionButton>
          <DeleteButton id={t.id} description={t.description} series={!!t.group_id} parcelado={t.inst_total > 1} />
        </div>
      )}
    </div>
  );
}
