import { payInvoice } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import Avatar from '@/components/Avatar';
import InfoTip from '@/components/InfoTip';
import { IconCard, IconChevronDown, IconRepeat } from '@/components/Icons';
import TxRow from '@/components/TxRow';
import { PrepayForm, PrepayList } from '@/components/Prepay';
import { addMonths, CARD_CLOSE_DAY, CARD_DUE_DAY, dateLabel, monthLabel } from '@/lib/dates';
import { freeOfInstallmentsAfter, installmentPlans, invoices, openInvoiceMonth } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';
import { NOS, type Tx } from '@/lib/types';

const STATUS = {
  paga: { label: 'Paga', cls: 'green' },
  vencida: { label: 'Vencida', cls: 'red' },
  fechada: { label: 'Fechada · pagar', cls: '' },
  aberta: { label: 'Em aberto', cls: '' },
  futura: { label: 'Prevista', cls: '' },
} as const;

export default async function Cartao() {
  const d = await loadData();
  const openMonth = openInvoiceMonth(d.today);
  // Fatura anterior, as não pagas, a aberta e as futuras (pagas antigas ficam de fora)
  const visible = invoices(d).filter((i) => i.month >= addMonths(openMonth, -1) || i.open > 0);
  const plans = installmentPlans(d);
  const livre = freeOfInstallmentsAfter(d);
  const name = (id: number | null) => d.profiles.find((p) => p.id === id)?.name ?? NOS.name;

  // Despesas fixas no cartão (uma por série, valor do próximo mês em aberto)
  const fixedMap = new Map<string, Tx>();
  for (const t of d.txs) {
    if (t.payment === 'cartao' && t.recurrence === 'fixa' && !t.paid && t.month >= openMonth) {
      const key = t.group_id ?? String(t.id);
      if (!fixedMap.has(key)) fixedMap.set(key, t);
    }
  }
  const fixed = [...fixedMap.values()];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Cartão<InfoTip inline align="left" text={`Fecha dia ${CARD_CLOSE_DAY} e vence dia ${CARD_DUE_DAY}. Compras a partir do dia ${CARD_CLOSE_DAY + 1} vão para a próxima fatura. Toque numa fatura para ver as compras.`} /></h1>
        </div>
      </div>

      <div className="section-label"><span className="ico"><IconCard /></span>Faturas{livre && <span className="faint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}> · livre de parcelas em {monthLabel(addMonths(livre, 1))}</span>}</div>
      <div className="stack" style={{ gap: 12 }}>
        {visible.map((inv) => {
          const pago = inv.total - inv.open;
          const st = STATUS[inv.status];
          return (
            <details key={inv.month} className="invoice" open={inv.status === 'vencida'}>
              <summary>
                <div>
                  <div className="invoice-title">{monthLabel(inv.month, true)}</div>
                  <div className="invoice-sub">{inv.items.length} compra(s) · vence {dateLabel(inv.due)}</div>
                </div>
                <div className="invoice-nums">
                  <div><small>Total</small><b>{brl(inv.total)}</b></div>
                  <div><small>Pago{inv.antecipado > 0 ? ' (c/ antecipado)' : ''}</small><b>{brl(pago)}</b></div>
                  <div><small>Restante</small><b>{brl(inv.open)}</b></div>
                  <span className={`invoice-pill ${st.cls}`}>{st.label}</span>
                  {inv.open > 0 && inv.month <= openMonth && (
                    <ActionButton action={payInvoice.bind(null, inv.month)} className="btn btn-sm btn-pay" confirm={`Marcar a fatura de ${monthLabel(inv.month, true)} (${brl(inv.open)}) como paga?`}>
                      Pagar
                    </ActionButton>
                  )}
                  <span className="chev"><IconChevronDown /></span>
                </div>
              </summary>
              <div className="invoice-body">
                {inv.open > 0 && (
                  <div className="stack" style={{ gap: 6, padding: '8px 0 10px', borderBottom: '1px solid var(--border)' }}>
                    <span className="small" style={{ fontWeight: 700 }}>Antecipar parte desta fatura</span>
                    <PrepayForm month={inv.month} max={inv.open} />
                  </div>
                )}
                <PrepayList items={d.prepayments.filter((p) => p.month === inv.month)} />
                <div className="list">
                  {inv.items.length ? inv.items.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />) : <div className="empty">Fatura vazia.</div>}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <div className="section-label"><span className="ico"><IconCard /></span>Compras parceladas</div>
      {plans.length === 0 ? <div className="panel empty">Nenhum parcelamento em andamento.</div> : (
        <div className="grid grid-2">
          {plans.map((p) => (
            <div className="panel plan-card" key={p.group}>
              <div className="plan-top">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <Avatar profile={d.profiles.find((x) => x.id === p.profile_id)} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title" style={{ fontSize: 16 }}>{p.description}</div>
                    <div className="small muted">{brl(p.total)} · {p.totalParcelas}x de {brl(p.parcela)} · {name(p.profile_id)}</div>
                  </div>
                </div>
                <span className="chip violet">Parcela {Math.min(p.pagas + 1, p.totalParcelas)} de {p.totalParcelas}</span>
              </div>
              <div className="bar"><div style={{ width: `${(p.pagas / p.totalParcelas) * 100}%` }} /></div>
              <div className="plan-foot"><span>{p.pagas} paga(s)</span><strong style={{ color: 'var(--text)' }}>faltam {p.faltam} · {brl(p.restante)}</strong></div>
              <div className="plan-foot">
                <span>Compra: {p.purchase_date ? `${dateLabel(p.purchase_date)}/${p.purchase_date.slice(0, 4)}` : '—'}</span>
                <span>Última: {monthLabel(p.ultimoMes)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-label"><span className="ico"><IconRepeat /></span>Despesas fixas no cartão</div>
      {fixed.length === 0 ? <div className="panel empty">Nenhuma despesa fixa no cartão.</div> : (
        <div className="grid grid-3">
          {fixed.map((t) => (
            <div className="panel fixed-card" key={t.id}>
              <div style={{ minWidth: 0 }}>
                <div className="row-title">{t.description}</div>
                <div className="small muted">{name(t.profile_id)} · todo mês</div>
              </div>
              <div className="row-amount" style={{ fontSize: 17 }}>{brl(t.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
