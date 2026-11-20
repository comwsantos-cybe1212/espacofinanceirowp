import { deleteSaving } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import { OpeningBalanceForm, SavingsForm } from '@/components/Forms';
import { IconTrash } from '@/components/Icons';
import ThemeToggle from '@/components/ThemeToggle';
import { dateLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

export default async function Ajustes() {
  const d = await loadData();
  const total = d.savings.reduce((a, m) => a + m.amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-sub">Saldo inicial, economia, tema e sessão.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="panel">
          <h2 className="section-title" style={{ marginBottom: 8 }}>Saldo inicial</h2>
          <p className="muted small" style={{ marginTop: 0 }}>O saldo atual = saldo inicial + tudo que foi recebido − tudo que foi pago − o que foi guardado.</p>
          <OpeningBalanceForm current={(d.openingBalance / 100).toFixed(2).replace('.', ',')} />
        </div>

        <div className="panel">
          <div className="panel-head"><h2 className="section-title">Economia</h2><strong className="num">{brl(total)}</strong></div>
          <SavingsForm />
          <div className="list" style={{ marginTop: 12 }}>
            {d.savings.length === 0 && <div className="empty">Nenhuma movimentação ainda.</div>}
            {d.savings.slice(0, 30).map((m) => (
              <div className="row" key={m.id}>
                <div className="row-main">
                  <div className="row-title">{m.amount >= 0 ? 'Guardado' : 'Resgatado'}{m.note ? ` · ${m.note}` : ''}</div>
                  <div className="row-meta">{dateLabel(m.date)}/{m.date.slice(0, 4)}</div>
                </div>
                <div className={`row-amount ${m.amount >= 0 ? 'pos' : 'neg'}`}>{m.amount >= 0 ? '+' : '−'} {brl(Math.abs(m.amount))}</div>
                <ActionButton action={deleteSaving.bind(null, m.id)} className="btn btn-sm icon-btn btn-danger" title="Excluir" confirm="Excluir esta movimentação?"><IconTrash /></ActionButton>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ThemeToggle withLabel />
        <form action="/api/logout" method="post"><button className="btn">Sair do app</button></form>
      </div>
    </>
  );
}
