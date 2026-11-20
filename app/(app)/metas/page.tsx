import { deleteGoal, toggleGoal } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import GoalButton from '@/components/GoalForm';
import InfoTip from '@/components/InfoTip';
import { IconCheck, IconPiggy, IconTarget, IconTrash, IconUndo } from '@/components/Icons';
import { monthLabel } from '@/lib/dates';
import { goalsPlan, ruleOfThree } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

function Kpi({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <div className="panel tile" style={{ ['--c' as string]: color, ...(highlight ? { background: 'var(--accent-soft)' } : {}) }}>
      <div className="tile-label">{label}</div>
      <div className="tile-value" style={{ marginTop: 6 }}>{brl(value)}</div>
    </div>
  );
}

export default async function Metas() {
  const d = await loadData();
  const plan = goalsPlan(d);
  const rule = ruleOfThree(d);
  const guardarMes = rule.terco;
  const noRitmo = plan.porMesTotal <= guardarMes;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Metas<InfoTip inline align="left" text="Digam quanto precisam e até quando. O app usa a economia guardada (começando pela meta de prazo mais próximo) e calcula quanto ainda falta juntar por mês, comparando com o valor de Guardar da divisão do mês." /></h1>
        </div>
        <GoalButton />
      </div>

      <div className="grid grid-3">
        <Kpi label="Economia guardada" value={plan.economia} color="var(--blue)" />
        <Kpi label="Usado em metas concluídas" value={plan.usado} color="var(--amber)" />
        <Kpi label="Disponível para metas" value={plan.disponivel} color="var(--accent)" highlight />
      </div>

      {plan.ativas.length > 0 && (
        <div className="note" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <IconPiggy />
          <span>
            Para cumprir todas as metas no prazo: <strong>{brl(plan.porMesTotal)}/mês</strong>.
            A regra de 3 deste mês sugere guardar <strong>{brl(guardarMes)}</strong>
            {' '}— {noRitmo ? <strong className="pos">dá conta ✓</strong> : <strong className="neg">faltam {brl(plan.porMesTotal - guardarMes)}/mês</strong>}.
          </span>
        </div>
      )}

      {plan.ativas.length === 0 && plan.concluidas.length === 0 && (
        <div className="panel empty">Nenhuma meta ainda. Crie a primeira, por exemplo: Casa, R$ 34.000 até dezembro.</div>
      )}

      <div className="grid grid-2">
        {plan.ativas.map(({ goal, jaTemos, faltam, meses, porMes, vencida, pct }) => (
          <div key={goal.id} className="panel goal-card">
            <div className="goal-head">
              <span className="goal-ico"><IconTarget /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title" style={{ fontSize: 18 }}>{goal.name}</div>
                <div className="small muted">Objetivo: {brl(goal.target)} · até {monthLabel(goal.deadline, true).toLowerCase()}</div>
              </div>
              {vencida && <span className="chip red">prazo passou</span>}
            </div>
            <div>
              <div className="bar"><div style={{ width: `${pct}%` }} /></div>
              <div className="small muted" style={{ textAlign: 'right', marginTop: 4, fontWeight: 700 }}>{pct}%</div>
            </div>
            <div className="goal-stats">
              <div><small>Já temos</small><b className="pos">{brl(jaTemos)}</b></div>
              <div><small>Faltam</small><b className="neg">{brl(faltam)}</b></div>
              <div><small>Guardar por mês</small><b style={{ color: 'var(--accent)' }}>{faltam > 0 ? brl(porMes) : '—'}</b></div>
              <div><small>Meses para juntar</small><b>{meses}</b></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionButton action={toggleGoal.bind(null, goal.id)} className="btn btn-sm btn-success" confirm={`Concluir a meta "${goal.name}"? O valor de ${brl(goal.target)} passa a contar como usado.`}>
                <IconCheck />Concluir
              </ActionButton>
              <GoalButton goal={goal} />
              <ActionButton action={deleteGoal.bind(null, goal.id)} className="btn btn-sm icon-btn btn-danger" title="Excluir meta" confirm={`Excluir a meta "${goal.name}"?`}>
                <IconTrash />
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      {plan.concluidas.length > 0 && (
        <details className="more">
          <summary>Metas concluídas ({plan.concluidas.length})</summary>
          <div className="panel list">
            {plan.concluidas.map((g) => (
              <div className="row" key={g.id}>
                <span className="goal-ico" style={{ width: 32, height: 32, fontSize: 14 }}>✓</span>
                <div className="row-main"><div className="row-title">{g.name}</div><div className="row-meta">concluída · objetivo {brl(g.target)}</div></div>
                <ActionButton action={toggleGoal.bind(null, g.id)} className="btn btn-sm icon-btn" title="Reabrir meta"><IconUndo /></ActionButton>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
