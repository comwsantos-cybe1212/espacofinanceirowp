import Link from 'next/link';
import { setRuleFlag } from '@/app/actions';
import ActionButton from '@/components/ActionButton';
import Avatar from '@/components/Avatar';
import Fold from '@/components/Fold';
import InfoTip from '@/components/InfoTip';
import ListTile from '@/components/ListTile';
import { IconArrowDown, IconArrowUp, IconCalendar, IconCard, IconPiggy, IconTrendDown, IconWallet } from '@/components/Icons';
import { ProfileChips } from '@/components/ProfileView';
import { AdvancePicker, SaveToBox } from '@/components/RuleControls';
import TxRow from '@/components/TxRow';
import { addMonths, dateLabel, isValidMonth, monthLabel } from '@/lib/dates';
import MonthPicker from '@/components/MonthPicker';
import { freeOfInstallmentsAfter, invoices, monthResult, goalsPlan, overdueBefore, profileSummary, ruleOfThree, summary } from '@/lib/finance';
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

export default async function Inicio({ searchParams }: { searchParams: { m?: string } }) {
  const d = await loadData();
  const s = summary(d);
  const viewMonth = isValidMonth(searchParams.m) ? searchParams.m : s.cur;
  const isCur = viewMonth === s.cur;
  const futuro = viewMonth > s.cur;
  const vm = viewMonth;
  const rule = ruleOfThree(d, vm);
  const todas = invoices(d);
  const res = monthResult(d, vm);

  // Cards do topo: no mês atual, a situação de hoje; nos outros meses, o que é daquele mês
  const receber = isCur ? s.receber : d.txs.filter((t) => t.kind === 'receita' && !t.paid && t.month === vm);
  const atrasadasAntes = isCur ? s.dividas : overdueBefore(d, vm);
  const pagarMes = isCur ? s.pagar : d.txs.filter((t) => t.kind === 'despesa' && !t.paid && t.month === vm);
  const faltaPagar = [...atrasadasAntes, ...pagarMes];
  const totalAtrasado = sum(atrasadasAntes);
  const faturasAbertas = isCur ? todas.filter((f) => f.month <= s.cur && f.open > 0) : todas.filter((f) => f.month === vm && f.open > 0);
  const valorFatura = isCur ? s.faturaNoPagar : sum(faturasAbertas.map((f) => ({ amount: f.open })));
  const proximaFatura = todas.find((f) => f.month > vm && f.open > 0);
  const livre = freeOfInstallmentsAfter(d);
  const proximos = [1, 2, 3].map((i) => monthResult(d, addMonths(vm, i)));
  const metas = goalsPlan(d);
  const recebidoMes = sum(d.txs.filter((t) => t.kind === 'receita' && t.paid && t.month === vm));
  const gastoMes = sum(d.txs.filter((t) => t.kind === 'despesa' && t.paid && t.month === vm));
  const totalEntra = res.receitas;
  const totalSai = res.despesas; // inclui contas atrasadas de meses anteriores
  const porPessoa = rule.individuais[0]?.cotaMes ?? 0;
  const perfis = d.profiles.map((p) => ({
    s: profileSummary(d, p, vm),
    individual: (() => { const f = rule.individuais.find((x) => x.profile.id === p.id); return f ? { ...f, dividido: rule.dividido } : null; })(),
  }));
  const lancMes = d.allTxs.filter((t) => t.month === vm);
  const maxGasto = Math.max(1, ...perfis.map((p) => p.s.gastos));
  const partes = rule.partes === 3 ? '÷ 3' : rule.partes === 2 ? '÷ 2' : 'tudo no valor individual';
  const doMes = isCur ? 'este mês' : `em ${monthLabel(vm)}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">{isCur ? 'Início' : futuro ? 'Previsão' : 'Resultado'}</h1>
          <p className="page-sub">{isCur ? <>Sua jornada financeira em órbita · hoje {dateLabel(d.today)}</> : <>{monthLabel(vm, true)} · valores deste mês para consulta</>}</p>
        </div>
        <MonthPicker month={vm} path="/" />
      </div>

      <ProfileChips items={perfis} />

      {/* O básico: sempre visível */}
      <div className="grid grid-5 tiles">
        {isCur ? (
          <Tile label="Saldo atual" value={s.saldoAtual} color={s.saldoAtual < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconWallet />}
            info="Quanto vocês têm na conta agora: tudo que já foi recebido menos tudo que já foi pago e o que foi para a caixinha." />
        ) : (
          <Tile label="Resultado do mês" value={res.resultado} color={res.resultado < 0 ? 'var(--red)' : 'var(--blue)'} icon={<IconWallet />}
            info="Tudo que entra no mês − tudo que sai no mês. Sobras de meses anteriores não entram." />
        )}
        <ListTile label="Falta receber" value={sum(receber)} color="var(--blue)" icon={<IconArrowUp />} hint={doMes}
          info="Receitas do mês que ainda não entraram na conta (status Prevista). Toque para ver a lista."
          title={`Falta receber ${doMes}`} items={receber} profiles={d.profiles} today={d.today} empty="Nada a receber." />
        <ListTile label="Falta pagar" value={sum(faltaPagar)} color="var(--red)" icon={<IconArrowDown />}
          hint={<>{valorFatura > 0 ? `inclui ${brl(valorFatura)} do cartão` : doMes}{totalAtrasado > 0 && <span className="neg"> · {brl(totalAtrasado)} atrasado</span>}</>}
          info="Contas do mês que ainda não foram pagas, incluindo a fatura do cartão que vence no mês e contas atrasadas. Toque para ver a lista."
          title={`Falta pagar ${doMes}`} items={faltaPagar} profiles={d.profiles} today={d.today} empty="Nada a pagar. 🚀" />
        <Tile label="Economia" value={s.savingsTotal} color="var(--accent)" icon={<IconPiggy />}
          info="Tudo que vocês já guardaram na caixinha. Fica separado e não entra no saldo atual." />
        <ListTile groupCard={false} title={`Fatura do cartão ${doMes}`} items={faturasAbertas.flatMap((f) => f.items.filter((t) => !t.paid))} profiles={d.profiles} today={d.today} empty="Nada a pagar no cartão."
          label="Fatura do cartão" value={valorFatura} color="var(--pink)" icon={<IconCard />}
          hint={<>
            {faturasAbertas.length ? faturasAbertas.map((f) => `${monthLabel(f.month)} vence ${dateLabel(f.due)}${f.status === 'vencida' ? ' (vencida)' : ''}`).join(' · ') : `Nada a pagar ${doMes}`}
            {proximaFatura && <span className="faint" style={{ display: 'block' }}>próxima: {monthLabel(proximaFatura.month)} {brl(proximaFatura.open)}</span>}
          </>}
          info="Fatura do cartão que vence neste mês (dia 23) e ainda não foi paga. Ela já está somada em Falta pagar; aqui aparece separada só para acompanhar o cartão. Compras até o dia 17 entram na fatura do mês; a partir do dia 18, na do mês seguinte, e só contam quando ela vencer." />
      </div>

      {isCur && s.dividas.length > 0 && (
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
          <Tile label="Resultado do mês" value={totalEntra - totalSai} color={totalEntra - totalSai < 0 ? 'var(--red)' : 'var(--blue)'} icon={<IconCalendar />}
            info="Tudo que entra no mês menos tudo que sai no mês. Não soma sobras de meses anteriores." />
        </div>
      </Fold>

      <Fold id="divisao" title="Divisão da sobra" defaultOpen
        right={<span className="muted small" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {rule.base > 0 && <><strong className="pos">{brl(rule.base)}</strong>&nbsp;{partes} =&nbsp;<strong>{brl(rule.terco)}</strong></>}
          <InfoTip inline text={<>
            A divisão usa o <strong>resultado do próprio mês</strong>: tudo que entra no mês (salários previstos inclusive) menos tudo que sai no mês (incluindo a fatura do cartão que vence nele). Sobras de meses anteriores não entram; só a economia guardada passa de um mês para o outro.
            {' '}Ela se atualiza sozinha a cada lançamento. {isCur ? 'Agora' : monthLabel(vm, true)}: 
            <strong>{brl(rule.base)}</strong> ÷ {rule.partes} = <strong>{brl(rule.terco)}</strong> por parte
            {rule.partes > 1 && <> ({['valor individual', !rule.semAdiantar && 'adiantar contas', !rule.semGuardar && 'guardar'].filter(Boolean).join(', ')})</>}.
            {' '}Valor individual ÷ 2 = <strong>{brl(porPessoa)}</strong> para cada um.
            {' '}Gastos pessoais, contas adiantadas e o que vai para a caixinha não diminuem a divisão.
            {' '}Se guardar ou adiantar passar da sua parte, o excedente sai das outras partes (ex.: guardar tudo zera adiantar e valores individuais).
          </>} />
        </span>}>
        <div className="stack" style={{ gap: 12 }}>
          {(
          <div className="grid grid-3">
            <div className="third">
              <div className="third-head"><span>🙋 Valores individuais<InfoTip inline align="left" text={`${brl(rule.valorIndividual)} ÷ 2 = ${brl(porPessoa)} para cada um gastar sem consultar o outro. Despesas marcadas como Pessoal saem do valor de quem gastou. O que não for gasto continua no valor atual no mês seguinte.`} /></span><span className="third-value">{brl(rule.valorIndividual)}</span></div>
              {rule.individuais.map((x) => (
                <div key={x.profile.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar profile={x.profile} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700 }}>{x.profile.name}</div>
                    <div className="faint small">{isCur ? `este mês foi adicionado ${brl(x.cotaMes)}` : futuro ? `vai receber ${brl(x.cotaMes)}` : `recebeu ${brl(x.cotaMes)}`}{x.gastoMes > 0 && ` · gastou ${brl(x.gastoMes)}`}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`num ${x.atual < 0 ? 'neg' : ''}`} style={{ fontWeight: 800 }}>{brl(x.atual)}</div>
                    <div className="faint small">{isCur ? 'valor atual' : futuro ? 'previsto no mês' : 'no fim do mês'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`third ${rule.semAdiantar ? 'off' : ''}`}>
              <div className="third-head"><span>📅 Adiantar contas<InfoTip inline align="left" text="Valor para pagar antes contas dos próximos meses, como parcelas do cartão. Toque na setinha para ver a sugestão do que adiantar." /></span><span className="third-value">{rule.semAdiantar ? '—' : brl(rule.adiantar.cota)}</span></div>
              {rule.semAdiantar ? (
                <>
                  <span className="small muted">Desligado este mês<InfoTip inline align="left" text="Sem adiantar contas este mês: o saldo fica dividido só entre guardar e os valores individuais." /></span>
                  {isCur && <ActionButton action={setRuleFlag.bind(null, 'sem_adiantar', false)} className="btn btn-sm">Voltar a adiantar</ActionButton>}
                </>
              ) : (
                <>
                  <Meter used={rule.adiantar.usado} total={rule.adiantar.cota} />
                  <span className="small muted">Adiantado {brl(rule.adiantar.usado)} · resta {brl(Math.max(0, rule.adiantar.resta))}</span>
                  {isCur && <AdvancePicker suggestions={rule.adiantar.sugestoes} all={rule.futuras} />}
                  {isCur && <ActionButton action={setRuleFlag.bind(null, 'sem_adiantar', true)} className="btn btn-sm btn-ghost link-btn"
                    confirm="Não adiantar contas este mês? O saldo passa a ser dividido entre guardar e os valores individuais.">
                    Não adiantar contas este mês
                  </ActionButton>}
                </>
              )}
            </div>

            <div className={`third ${rule.semGuardar ? 'off' : ''}`}>
              <div className="third-head"><span>💰 Guardar<InfoTip inline text="Valor para a caixinha (economia). Só sai do saldo atual depois que vocês confirmarem em Guardar na caixinha." /></span><span className="third-value">{rule.semGuardar ? '—' : brl(rule.guardar.cota)}</span></div>
              {rule.semGuardar ? (
                <>
                  <span className="small muted">Desligado este mês<InfoTip inline text="Sem economizar este mês: o saldo fica dividido só entre adiantar contas e os valores individuais." /></span>
                  {isCur && <ActionButton action={setRuleFlag.bind(null, 'sem_guardar', false)} className="btn btn-sm">Voltar a economizar</ActionButton>}
                </>
              ) : (
                <>
                  <Meter used={rule.guardar.usado} total={rule.guardar.cota} />
                  <span className="small muted">Na caixinha {doMes}: {brl(rule.guardar.usado)}</span>
                  {isCur && (rule.guardar.resta > 0
                    ? <SaveToBox cents={rule.guardar.resta} saldo={s.saldoAtual} />
                    : <span className="small pos" style={{ fontWeight: 700 }}>✓ Valor do mês guardado na caixinha</span>)}
                  {isCur && <ActionButton action={setRuleFlag.bind(null, 'sem_guardar', true)} className="btn btn-sm btn-ghost link-btn"
                    confirm="Não economizar este mês? O saldo passa a ser dividido entre adiantar contas e os valores individuais.">
                    Não economizar este mês
                  </ActionButton>}
                </>
              )}
            </div>
          </div>
          )}
          {rule.base <= 0 && <p style={{ margin: 0 }} className="small"><strong className="neg">Sem saldo novo para dividir.</strong><InfoTip inline align="left" text="Os valores individuais que sobraram de meses anteriores continuam disponíveis." /></p>}
        </div>
      </Fold>

      {!isCur && (
        <Fold id="mes-lancamentos" title={`Lançamentos de ${monthLabel(vm, true).toLowerCase()} (${lancMes.length})`}>
          {lancMes.length === 0 ? <div className="empty">Nada lançado neste mês.</div> : (
            <div className="list">{lancMes.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
          )}
        </Fold>
      )}

      <Fold id="proximos" title={isCur ? 'Próximos meses' : `Meses depois de ${monthLabel(vm)}`} right={<Link href="/projecao" className="link">Ver previsão</Link>}>
        <div className="list">
          {proximos.map((r) => (
            <Link className="row row-link" key={r.month} href={`/?m=${r.month}`}>
              <div className="row-main">
                <div className="row-title">{monthLabel(r.month, true)}</div>
                <div className="row-meta">entra {brl(r.receitas)} · sai {brl(r.despesas)} · resultado do mês</div>
              </div>
              <div className={`row-amount ${r.resultado < 0 ? 'neg' : 'pos'}`}>{brl(r.resultado)}</div>
              <span className="tile-more">ver ›</span>
            </Link>
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
