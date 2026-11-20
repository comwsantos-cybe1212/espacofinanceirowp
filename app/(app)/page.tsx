import Link from 'next/link';
import { makeDivision, setRuleFlag } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import Avatar from '@/components/Avatar';
import Fold from '@/components/Fold';
import InfoTip from '@/components/InfoTip';
import ListTile from '@/components/ListTile';
import { IconArrowDown, IconArrowUp, IconCalendar, IconCard, IconPiggy, IconTrendDown, IconWallet } from '@/components/Icons';
import { ProfileChips } from '@/components/ProfileView';
import { AdvancePicker, SaveToBox } from '@/components/RuleControls';
import TxRow from '@/components/TxRow';
import { dateLabel, monthLabel } from '@/lib/dates';
import { currentInvoice, freeOfInstallmentsAfter, goalsPlan, profileSummary, projection, ruleOfThree, summary } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

function Tile({ label, value, hint, color, icon, info }: { label: string; value: number; hint?: React.ReactNode; color: string; icon: React.ReactNode; info: string }) {
  return (
    <div className="panel tile" style={{ ['--c' as string]: color }}>
      <div className="tile-label"><span className="tile-ico">{icon}</span>{label}<InfoTip text={info} /></div>
      <div className="tile-value">{brl(value)}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

function Meter({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : used > 0 ? 100 : 0;
  return <div className={`bar ${used > total ? 'over' : ''}`}><div style={{ width: `${pct}%` }} /></div>;
}

const sum = (l: { amount: number }[]) => l.reduce((a, t) => a + t.amount, 0);

export default async function Inicio() {
  const d = await loadData();
  const s = summary(d);
  const rule = ruleOfThree(d);
  const fatura = currentInvoice(d);
  const livre = freeOfInstallmentsAfter(d);
  const proximos = projection(d, 4).slice(1);
  const metas = goalsPlan(d);
  const recebidoMes = sum(d.txs.filter((t) => t.kind === 'receita' && t.paid && t.month === s.cur));
  const gastoMes = sum(d.txs.filter((t) => t.kind === 'despesa' && t.paid && t.month === s.cur));
  const totalEntra = sum(d.txs.filter((t) => t.kind === 'receita' && t.month === s.cur));
  const totalSai = sum(d.txs.filter((t) => t.kind === 'despesa' && t.month === s.cur));
  const porPessoa = rule.individuais[0]?.cotaMes ?? 0;
  const perfis = d.profiles.map((p) => ({
    s: profileSummary(d, p, s.cur),
    individual: (() => { const f = rule.individuais.find((x) => x.profile.id === p.id); return f ? { ...f, dividido: rule.dividido } : null; })(),
  }));
  const maxGasto = Math.max(1, ...perfis.map((p) => p.s.gastos));
  const partes = rule.partes === 3 ? '÷ 3' : rule.partes === 2 ? '÷ 2' : 'tudo no valor individual';

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Início</h1>
          <p className="page-sub">Sua jornada financeira em órbita · {monthLabel(s.cur, true)}, hoje {dateLabel(d.today)}</p>
        </div>
      </div>

      <ProfileChips items={perfis} />

      {/* O básico: sempre visível */}
      <div className="grid grid-5 tiles">
        <Tile label="Saldo atual" value={s.saldoAtual} color={s.saldoAtual < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconWallet />}
          info="Quanto vocês têm na conta agora: tudo que já foi recebido menos tudo que já foi pago e o que foi para a caixinha." />
        <ListTile label="Falta receber" value={s.aReceber} color="var(--blue)" icon={<IconArrowUp />} hint="este mês"
          info="Receitas deste mês que ainda não entraram na conta (status Prevista). Toque para ver a lista."
          title="Falta receber este mês" items={s.receber} profiles={d.profiles} today={d.today} empty="Nada a receber este mês." />
        <ListTile label="Falta pagar" value={s.aPagar + s.totalDividas} color="var(--red)" icon={<IconArrowDown />}
          hint={s.totalDividas > 0 ? <span className="neg">inclui {brl(s.totalDividas)} atrasado</span> : 'este mês'}
          info="Contas deste mês que ainda não foram pagas, incluindo a fatura do cartão e contas atrasadas de meses anteriores. Toque para ver a lista."
          title="Falta pagar este mês" items={[...s.dividas, ...s.pagar]} profiles={d.profiles} today={d.today} empty="Nada a pagar este mês. 🚀" />
        <Tile label="Economia" value={s.savingsTotal} color="var(--accent)" icon={<IconPiggy />}
          info="Tudo que vocês já guardaram na caixinha. Fica separado e não entra no saldo atual." />
        <Tile label="Fatura do cartão" value={fatura?.open ?? 0} color="var(--pink)" icon={<IconCard />}
          hint={fatura ? <>{monthLabel(fatura.month)} · vence {dateLabel(fatura.due)}{fatura.status === 'vencida' && <span className="neg"> · vencida</span>}</> : 'Sem fatura'}
          info="Valor da fatura atual que ainda falta pagar. Compras até o dia 17 entram nesta fatura; a partir do dia 18, na próxima. Vence dia 23." />
      </div>

      {s.dividas.length > 0 && (
        <details className="alert">
          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
            <strong className="neg">⚠ {s.dividas.length} conta(s) atrasada(s) · {brl(s.totalDividas)}</strong> <span className="link">ver e pagar</span>
          </summary>
          <div className="list" style={{ marginTop: 10 }}>{s.dividas.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
        </details>
      )}

      {/* Detalhes: só ao clicar na setinha */}
      <Fold id="saldos" title="Totais do mês">
        <div className="grid grid-3 tiles">
          <Tile label="Total que entra no mês" value={totalEntra} color="var(--green)" icon={<IconArrowUp />} hint={`${brl(recebidoMes)} já recebido`}
            info="Soma de todas as receitas deste mês: o que já entrou mais o que ainda vai entrar." />
          <Tile label="Total que sai no mês" value={totalSai} color="var(--red)" icon={<IconTrendDown />} hint={`${brl(gastoMes)} já pago`}
            info="Soma de todas as despesas deste mês, pagas ou não, incluindo a fatura do cartão que vence este mês." />
          <Tile label="Sobra depois de pagar tudo" value={s.saldoPrevisto} color={s.saldoPrevisto < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconCalendar />}
            info="Quanto vai sobrar na conta no fim do mês, depois que tudo for recebido e pago." />
        </div>
      </Fold>

      <Fold id="divisao" title="Divisão da sobra" defaultOpen
        right={<span className="muted small" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {rule.base > 0 && <><strong className="pos">{brl(rule.base)}</strong>&nbsp;{partes} =&nbsp;<strong>{brl(rule.terco)}</strong></>}
          <InfoTip inline text={<>
            {rule.dividido ? <>Divisão de {monthLabel(s.cur, true).toLowerCase()}: </> : <>Prévia com o saldo de hoje: </>}
            {rule.reservado > 0 && !rule.dividido && <>saldo atual <strong>{brl(rule.saldoAtual)}</strong> − <strong>{brl(rule.reservado)}</strong> dos valores individuais que sobraram = </>}
            <strong>{brl(rule.base)}</strong> ÷ {rule.partes} = <strong>{brl(rule.terco)}</strong> por parte
            {rule.partes > 1 && <> ({['valor individual', !rule.semAdiantar && 'adiantar contas', !rule.semGuardar && 'guardar'].filter(Boolean).join(', ')})</>}.
            {' '}Valor individual ÷ 2 = <strong>{brl(porPessoa)}</strong> para cada um.
            {s.aPagar + s.totalDividas > 0 && <> Lembrete: ainda faltam pagar <strong>{brl(s.aPagar + s.totalDividas)}</strong> este mês.</>}
          </>} />
        </span>}>
        <div className="stack" style={{ gap: 12 }}>
          {!rule.dividido ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ActionButton action={makeDivision} className="btn btn-primary"
                confirm={`Fazer a divisão de ${monthLabel(s.cur, true).toLowerCase()} com ${brl(rule.base)}? O valor fica fixo até o fim do mês e cada um recebe ${brl(porPessoa)} no valor individual.`}>
                Fazer a divisão deste mês
              </ActionButton>
              <InfoTip inline align="left" text="Faça depois que o salário entrar. O saldo de hoje é dividido e o valor fica fixo até o fim do mês, mesmo que vocês gastem depois." />
            </div>
          ) : (
            <ActionButton action={makeDivision} className="btn btn-sm btn-ghost link-btn"
              confirm={`Refazer a divisão com o saldo de agora (${brl(rule.basePrevia)})?`}>
              Refazer a divisão com o saldo de agora
            </ActionButton>
          )}

          {(
          <div className="grid grid-3">
            <div className="third">
              <div className="third-head"><span>🙋 Valores individuais<InfoTip inline align="left" text={`${brl(rule.terco)} ÷ 2 = ${brl(porPessoa)} para cada um gastar sem consultar o outro. O que não for gasto continua no valor atual no mês seguinte. Gastos lançados na categoria "Valor individual" saem daqui.`} /></span><span className="third-value">{brl(rule.terco)}</span></div>
              {rule.individuais.map((x) => (
                <div key={x.profile.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar profile={x.profile} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700 }}>{x.profile.name}</div>
                    <div className="faint small">{rule.dividido ? `este mês foi adicionado ${brl(x.cotaMes)}` : `vai receber ${brl(x.cotaMes)}`}{x.gastoMes > 0 && ` · gastou ${brl(x.gastoMes)}`}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`num ${x.atual < 0 ? 'neg' : ''}`} style={{ fontWeight: 800 }}>{brl(x.atual)}</div>
                    <div className="faint small">valor atual</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`third ${rule.semAdiantar ? 'off' : ''}`}>
              <div className="third-head"><span>📅 Adiantar contas<InfoTip inline align="left" text="Valor para pagar antes contas dos próximos meses, como parcelas do cartão. Toque na setinha para ver a sugestão do que adiantar." /></span><span className="third-value">{rule.semAdiantar ? '—' : brl(rule.terco)}</span></div>
              {rule.semAdiantar ? (
                <>
                  <span className="small muted">Desligado este mês<InfoTip inline align="left" text="Sem adiantar contas este mês: o saldo fica dividido só entre guardar e os valores individuais." /></span>
                  <ActionButton action={setRuleFlag.bind(null, 'sem_adiantar', false)} className="btn btn-sm">Voltar a adiantar</ActionButton>
                </>
              ) : (
                <>
                  <Meter used={rule.adiantar.usado} total={rule.adiantar.cota} />
                  <span className="small muted">Adiantado {brl(rule.adiantar.usado)} · resta {brl(Math.max(0, rule.adiantar.resta))}</span>
                  <AdvancePicker suggestions={rule.adiantar.sugestoes} all={rule.futuras} />
                  <ActionButton action={setRuleFlag.bind(null, 'sem_adiantar', true)} className="btn btn-sm btn-ghost link-btn"
                    confirm="Não adiantar contas este mês? O saldo passa a ser dividido entre guardar e os valores individuais.">
                    Não adiantar contas este mês
                  </ActionButton>
                </>
              )}
            </div>

            <div className={`third ${rule.semGuardar ? 'off' : ''}`}>
              <div className="third-head"><span>💰 Guardar<InfoTip inline text="Valor para a caixinha (economia). Só sai do saldo atual depois que vocês confirmarem em Guardar na caixinha." /></span><span className="third-value">{rule.semGuardar ? '—' : brl(rule.terco)}</span></div>
              {rule.semGuardar ? (
                <>
                  <span className="small muted">Desligado este mês<InfoTip inline text="Sem economizar este mês: o saldo fica dividido só entre adiantar contas e os valores individuais." /></span>
                  <ActionButton action={setRuleFlag.bind(null, 'sem_guardar', false)} className="btn btn-sm">Voltar a economizar</ActionButton>
                </>
              ) : (
                <>
                  <Meter used={rule.guardar.usado} total={rule.guardar.cota} />
                  <span className="small muted">Na caixinha este mês: {brl(rule.guardar.usado)}</span>
                  {rule.guardar.resta > 0
                    ? <SaveToBox cents={rule.guardar.resta} saldo={s.saldoAtual} />
                    : <span className="small pos" style={{ fontWeight: 700 }}>✓ Valor do mês guardado na caixinha</span>}
                  <ActionButton action={setRuleFlag.bind(null, 'sem_guardar', true)} className="btn btn-sm btn-ghost link-btn"
                    confirm="Não economizar este mês? O saldo passa a ser dividido entre adiantar contas e os valores individuais.">
                    Não economizar este mês
                  </ActionButton>
                </>
              )}
            </div>
          </div>
          )}
          {rule.base <= 0 && <p style={{ margin: 0 }} className="small"><strong className="neg">Sem saldo novo para dividir.</strong><InfoTip inline align="left" text="Os valores individuais que sobraram de meses anteriores continuam disponíveis." /></p>}
        </div>
      </Fold>

      <Fold id="proximos" title="Próximos meses" right={<Link href="/projecao" className="link">Ver previsão</Link>}>
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
        <p className="faint small" style={{ marginBottom: 0 }}>{livre ? `Cartão com parcelas até ${monthLabel(livre)}.` : 'Sem parcelamentos no cartão.'}</p>
      </Fold>

      <Fold id="pessoas" title="Gastos de cada um" right={<span style={{ display: 'inline-flex', alignItems: 'center' }}><Link href="/perfis" className="link">Detalhes</Link><InfoTip inline text={'Inclui 50% de tudo que é de "Nós" para cada um.'} /></span>}>
        <div className="stack" style={{ gap: 12 }}>
          {perfis.map(({ s: p }) => (
            <div key={p.profile.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar profile={p.profile} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }} className="small">
                  <strong>{p.profile.name}</strong><strong className="num">{brl(p.gastos)}</strong>
                </div>
                <div className="bar" style={{ marginTop: 5 }}><div style={{ width: `${(p.gastos / maxGasto) * 100}%`, background: p.profile.color }} /></div>
              </div>
            </div>
          ))}
        </div>
      </Fold>

      <Fold id="metas" title="Metas" right={<Link href="/metas" className="link">{metas.ativas.length ? 'Ver metas' : 'Criar meta'}</Link>}>
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
      </Fold>
    </div>
  );
}
