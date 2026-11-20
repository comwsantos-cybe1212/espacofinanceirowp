import Link from 'next/link';
import { payNow } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import Avatar from '@/components/Avatar';
import { QuickSave } from '@/components/Forms';
import { IconAlert, IconArrowDown, IconArrowUp, IconCalendar, IconPiggy, IconTrendDown, IconWallet } from '@/components/Icons';
import TxRow from '@/components/TxRow';
import { addMonths, dateLabel, monthLabel } from '@/lib/dates';
import { currentInvoice, freeOfInstallmentsAfter, goalsPlan, monthTotals, projection, ruleOfThree, spendingByProfile, summary } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';
import { NOS } from '@/lib/types';

function Tile({ label, value, hint, color, icon }: { label: string; value: number; hint?: React.ReactNode; color: string; icon: React.ReactNode }) {
  return (
    <div className="panel tile" style={{ ['--c' as string]: color }}>
      <div className="tile-label"><span className="tile-ico">{icon}</span>{label}</div>
      <div className="tile-value">{brl(value)}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

function Meter({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : used > 0 ? 100 : 0;
  return <div className={`bar ${used > total ? 'over' : ''}`}><div style={{ width: `${pct}%` }} /></div>;
}

export default async function Inicio() {
  const d = await loadData();
  const s = summary(d);
  const rule = ruleOfThree(d);
  const fatura = currentInvoice(d);
  const livre = freeOfInstallmentsAfter(d);
  const proximos = projection(d, 4).slice(1);
  const este = monthTotals(d, s.cur);
  const anterior = monthTotals(d, addMonths(s.cur, -1));
  const diff = anterior.despesas > 0 ? Math.round(((este.despesas - anterior.despesas) / anterior.despesas) * 100) : null;
  const { totals } = spendingByProfile(d, s.cur);
  const maxGasto = Math.max(1, ...totals.map((t) => t.despesas));
  const metas = goalsPlan(d);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Início</h1>
          <p className="page-sub">Sua jornada financeira em órbita · {monthLabel(s.cur, true)}, hoje {dateLabel(d.today)}</p>
        </div>
      </div>

      <div className="chips">
        {d.profiles.map((p) => (
          <Link key={p.id} href="/perfis" className="profile-chip">
            <Avatar profile={p} size={42} />
            <div><strong>{p.name}</strong><span>ver gastos do mês</span></div>
          </Link>
        ))}
      </div>

      <div className="section-label"><span className="ico"><IconWallet /></span>Atual</div>
      <div className="grid grid-3 tiles">
        <Tile label="Saldo atual" value={s.saldoAtual} color={s.saldoAtual < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconWallet />} hint="Dinheiro na conta hoje" />
        <Tile label="Gastos do mês" value={este.despesas} color="var(--red)" icon={<IconTrendDown />}
          hint={diff === null ? 'Tudo que saiu ou vai sair este mês' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}% em relação a ${monthLabel(addMonths(s.cur, -1))}`} />
        <Tile label="Economia" value={s.savingsTotal} color="var(--blue)" icon={<IconPiggy />} hint="Guardado, separado do saldo" />
      </div>

      <div className="section-label"><span className="ico" style={{ background: 'color-mix(in srgb, var(--pink) 14%, var(--surface))', color: 'var(--pink)' }}><IconCalendar /></span>Previsto</div>
      <div className="grid grid-auto tiles">
        <Tile label="Saldo no fim do mês" value={s.saldoPrevisto} color={s.saldoPrevisto < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconWallet />} hint="Atual + a receber − a pagar" />
        <Tile label="A receber" value={s.aReceber} color="var(--text)" icon={<IconArrowUp />} hint="Até o fim do mês" />
        <Tile label="A pagar" value={s.aPagar} color="var(--red)" icon={<IconArrowDown />} hint="Até o fim do mês" />
        {s.totalDividas > 0 && <Tile label="Contas atrasadas" value={s.totalDividas} color="var(--red)" icon={<IconAlert />} hint={`${s.dividas.length} conta(s) de meses anteriores`} />}
      </div>

      {s.dividas.length > 0 && (
        <details className="alert">
          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
            <strong className="neg">⚠ {s.dividas.length} conta(s) atrasada(s) · {brl(s.totalDividas)}</strong> <span className="link">ver e pagar</span>
          </summary>
          <div className="list" style={{ marginTop: 10 }}>{s.dividas.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
        </details>
      )}

      {/* Divisão em 3 */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="section-title">Divisão da sobra</h2>
          {rule.base > 0 && <span className="muted small">Sobra do mês: <strong className="pos">{brl(rule.base)}</strong> · ⅓ para cada</span>}
        </div>

        {rule.base > 0 ? (
          <div className="grid grid-3">
            <div className="third">
              <div className="third-head"><span>🎉 Valor individual</span><span className="third-value">{brl(rule.terco)}</span></div>
              <span className="faint small" style={{ marginTop: -6 }}>diversão, cada um gasta sem consultar o outro</span>
              {rule.diversao.map(({ profile, cota, usado, resta }) => (
                <div key={profile.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar profile={profile} size={22} />
                    <span className="small" style={{ flex: 1, fontWeight: 700 }}>{profile.name}</span>
                    <span className={`small num ${resta < 0 ? 'neg' : 'muted'}`}>{resta < 0 ? `passou ${brl(-resta)}` : `resta ${brl(resta)}`}</span>
                  </div>
                  <Meter used={usado} total={cota} />
                </div>
              ))}
            </div>

            <div className="third">
              <div className="third-head"><span>📅 Adiantar contas</span><span className="third-value">{brl(rule.terco)}</span></div>
              <Meter used={rule.adiantar.usado} total={rule.adiantar.cota} />
              <span className="small muted">Resta {brl(Math.max(0, rule.adiantar.resta))}</span>
              {rule.adiantar.sugestoes.length > 0 && (
                <details className="more">
                  <summary>O que adiantar</summary>
                  <div className="list">
                    {rule.adiantar.sugestoes.map((t) => (
                      <div className="row" key={t.id}>
                        <div className="row-main">
                          <div className="row-title small">{t.description}{t.inst_total > 1 && <span className="faint"> {t.inst_no}/{t.inst_total}</span>}</div>
                          <div className="row-meta">{monthLabel(t.month)} · {brl(t.amount)}</div>
                        </div>
                        <ActionButton action={payNow.bind(null, t.id)} confirm={`Pagar agora "${t.description}" (${brl(t.amount)})?`}>Pagar</ActionButton>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            <div className="third">
              <div className="third-head"><span>💰 Guardar</span><span className="third-value">{brl(rule.terco)}</span></div>
              <Meter used={rule.guardar.usado} total={rule.guardar.cota} />
              {rule.guardar.resta > 0
                ? <><span className="small muted">Guardado: {brl(rule.guardar.usado)}</span><QuickSave cents={rule.guardar.resta} /></>
                : <span className="small pos">Meta do mês guardada ✓</span>}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0 }}>
            <strong className="neg">Sem sobra este mês.</strong> As despesas passam as receitas em <strong className="neg">{brl(-rule.base)}</strong>.
            {rule.cortes.length > 0 && <> Maior gasto variável: <strong>{rule.cortes[0].description}</strong> ({brl(rule.cortes[0].amount)}).</>}
          </p>
        )}
      </div>

      <div className="grid grid-2">
        <div className="stack">
          {/* Próximos meses */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="section-title">Próximos meses</h2>
              <Link href="/projecao" className="link">Ver previsão</Link>
            </div>
            <div className="list">
              {proximos.map((r) => (
                <div className="row" key={r.month}>
                  <div className="row-main">
                    <div className="row-title">{monthLabel(r.month, true)}</div>
                    <div className="row-meta">entra {brl(r.receitas)} · sai {brl(r.despesas)}</div>
                  </div>
                  <div className={`row-amount ${r.fim < 0 ? 'neg' : 'pos'}`}>{brl(r.fim)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metas */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="section-title">Metas</h2>
              <Link href="/metas" className="link">{metas.ativas.length ? 'Ver metas' : 'Criar meta'}</Link>
            </div>
            {metas.ativas.length === 0 ? <div className="empty" style={{ padding: 6 }}>Nenhuma meta ativa.</div> : (
              <div className="stack" style={{ gap: 12 }}>
                {metas.ativas.slice(0, 3).map((g) => (
                  <div key={g.goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }} className="small">
                      <strong>{g.goal.name}</strong>
                      <span className="muted">{g.faltam > 0 ? <>guardar <strong style={{ color: 'var(--accent)' }}>{brl(g.porMes)}</strong>/mês</> : <span className="pos">alcançada ✓</span>}</span>
                    </div>
                    <div className="bar" style={{ marginTop: 6 }}><div style={{ width: `${g.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          {/* Cartão */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="section-title">Cartão</h2>
              <Link href="/cartao" className="link">Ver faturas</Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span className="muted small">
                Fatura {fatura ? monthLabel(fatura.month) : ''} · vence {fatura ? dateLabel(fatura.due) : '—'}
                {fatura?.status === 'vencida' && <span className="chip red" style={{ marginLeft: 6 }}>vencida</span>}
              </span>
              <span className="row-amount" style={{ fontSize: 22 }}>{brl(fatura?.open ?? 0)}</span>
            </div>
            <div className="faint small" style={{ marginTop: 4 }}>{livre ? `Parcelas até ${monthLabel(livre)}` : 'Sem parcelamentos'}</div>
          </div>

          {/* Gastos por pessoa */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="section-title">Gastos de cada um</h2>
              <Link href="/perfis" className="link">Detalhes</Link>
            </div>
            <div className="stack" style={{ gap: 12 }}>
              {totals.map(({ profile, despesas }) => (
                <div key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar profile={profile} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }} className="small">
                      <strong>{profile.name}</strong><strong className="num">{brl(despesas)}</strong>
                    </div>
                    <div className="bar" style={{ marginTop: 5 }}><div style={{ width: `${(despesas / maxGasto) * 100}%`, background: profile.id === NOS.id ? NOS.color : profile.color }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
