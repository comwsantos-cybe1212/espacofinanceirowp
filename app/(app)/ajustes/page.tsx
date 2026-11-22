import { deleteSaving } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import InfoTip from '@/components/InfoTip';
import SavingsList from '@/components/SavingsList';
import { ClearDataForm, OpeningBalanceForm, SavingsForm } from '@/components/Forms';
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
        </div>
      </div>

      <div className="grid grid-2">
        <div className="panel">
          <h2 className="section-title" style={{ marginBottom: 8 }}>Saldo inicial<InfoTip inline align="left" text="Quanto havia na conta quando começaram a usar o app. Saldo atual = saldo inicial + tudo que foi recebido − tudo que foi pago − o que foi guardado." /></h2>
          <OpeningBalanceForm current={(d.openingBalance / 100).toFixed(2).replace('.', ',')} />
        </div>

        <div className="panel">
          <div className="panel-head"><h2 className="section-title">Economia</h2><strong className="num">{brl(total)}</strong></div>
          <SavingsForm />
          <div className="list" style={{ marginTop: 12 }}>
            {d.savings.length === 0 && <div className="empty">Nenhuma movimentação ainda.</div>}
            <SavingsList items={d.savings.slice(0, 30)} />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2 className="section-title" style={{ marginBottom: 10 }}>Recomeçar<InfoTip inline align="left" text="Escolha o que apagar. Perfis e fotos são mantidos." /></h2>
        <ClearDataForm />
      </div>

      <div className="panel" style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ThemeToggle withLabel />
        <form action="/api/logout" method="post"><button className="btn">Sair do app</button></form>
      </div>
    </>
  );
}
