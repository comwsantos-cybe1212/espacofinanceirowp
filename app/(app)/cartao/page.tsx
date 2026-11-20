import { payInvoice, payNow } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import TxRow from '@/components/TxRow';
import { addMonths, CARD_CLOSE_DAY, CARD_DUE_DAY, dateLabel, monthLabel } from '@/lib/dates';
import { freeOfInstallmentsAfter, installmentPlans, invoices, openInvoiceMonth } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

const STATUS = {
  paga: { label: 'Paga', cls: 'green' },
  vencida: { label: 'Vencida', cls: 'red' },
  fechada: { label: 'Fechada', cls: 'amber' },
  aberta: { label: 'Aberta', cls: 'cyan' },
  futura: { label: 'Prevista', cls: 'violet' },
} as const;

export default async function Cartao() {
  const d = await loadData();
  const openMonth = openInvoiceMonth(d.today);
  // Fatura anterior, as não pagas, a aberta e as futuras (pagas antigas ficam de fora)
  const visible = invoices(d).filter((i) => i.month >= addMonths(openMonth, -1) || i.open > 0);
  const plans = installmentPlans(d);
  const livre = freeOfInstallmentsAfter(d);

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Cartão de crédito</h1>
          <p className="page-sub">Fecha dia {CARD_CLOSE_DAY}, vence dia {CARD_DUE_DAY}. Compras a partir do dia {CARD_CLOSE_DAY + 1} vão para a próxima fatura.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="section-title">Faturas</h2>
          {livre && <span className="muted small">Livre de parcelas em {monthLabel(addMonths(livre, 1))}</span>}
        </div>
        <div className="list">
          {visible.map((inv) => (
            <details key={inv.month} className="row" style={{ display: 'block' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong>{monthLabel(inv.month, true)}</strong>
                <span className={`chip ${STATUS[inv.status].cls}`}>{STATUS[inv.status].label}</span>
                <span className="faint small">vence {dateLabel(inv.due)}</span>
                <span style={{ marginLeft: 'auto' }} className="row-amount">{brl(inv.status === 'paga' ? inv.total : inv.open)}</span>
                {inv.open > 0 && inv.month <= openMonth && (
                  <ActionButton action={payInvoice.bind(null, inv.month)} className="btn btn-sm btn-primary" confirm={`Marcar a fatura de ${monthLabel(inv.month, true)} (${brl(inv.open)}) como paga?`}>
                    Pagar
                  </ActionButton>
                )}
              </summary>
              <div className="list" style={{ marginTop: 8, paddingLeft: 4 }}>
                {inv.items.length ? inv.items.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />) : <div className="empty">Fatura vazia.</div>}
              </div>
            </details>
          ))}
        </div>
        <p className="faint small" style={{ marginBottom: 0 }}>Toque numa fatura para ver as compras.</p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="section-title">Parcelamentos</h2>
          {plans.length > 0 && <span className="muted small">{brl(plans.reduce((a, p) => a + p.restante, 0))} a pagar</span>}
        </div>
        {plans.length === 0 ? <div className="empty">Nenhum parcelamento.</div> : (
          <div className="list">
            {plans.map((p) => (
              <div className="row" key={p.group}>
                <div className="row-main">
                  <div className="row-title">{p.description}</div>
                  <div className="row-meta">{brl(p.parcela)}/mês · <strong style={{ color: 'var(--text)' }}>faltam {p.faltam}</strong> · termina em {monthLabel(p.ultimoMes)}</div>
                  <div className="bar" style={{ marginTop: 6 }}><div style={{ width: `${(p.pagas / p.totalParcelas) * 100}%` }} /></div>
                </div>
                {p.ultimaId && (
                  <ActionButton action={payNow.bind(null, p.ultimaId)} className="btn btn-sm" title="Adiantar a última parcela"
                    confirm={`Adiantar a última parcela de "${p.description}" (${brl(p.parcela)})? Isso encurta o parcelamento em 1 mês.`}>
                    Adiantar
                  </ActionButton>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
