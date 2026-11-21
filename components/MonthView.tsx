import Avatar from '@/components/Avatar';
import Fold from '@/components/Fold';
import InfoTip from '@/components/InfoTip';
import { IconArrowDown, IconArrowUp, IconCalendar, IconCard, IconWallet } from '@/components/Icons';
import TxRow from '@/components/TxRow';
import { dateLabel, monthLabel } from '@/lib/dates';
import { invoices, projection } from '@/lib/finance';
import { brl } from '@/lib/format';
import type { AppData } from '@/lib/types';

function Tile({ label, value, hint, color, icon, info }: { label: string; value: number; hint?: React.ReactNode; color: string; icon: React.ReactNode; info: string }) {
  return (
    <div className="panel tile" style={{ ['--c' as string]: color }}>
      <div className="tile-label"><span className="tile-ico">{icon}</span>{label}<InfoTip text={info} /></div>
      <div className="tile-value">{brl(value)}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

const sum = (l: { amount: number }[]) => l.reduce((a, t) => a + t.amount, 0);

/** Início em outro mês: previsão (meses futuros) ou resultado (meses passados) */
export default function MonthView({ d, month, cur, openMonth }: { d: AppData; month: string; cur: string; openMonth: string }) {
  const doMes = d.txs.filter((t) => t.month === month);
  const receitas = doMes.filter((t) => t.kind === 'receita').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const despesas = doMes.filter((t) => t.kind === 'despesa').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const fatura = invoices(d).find((f) => f.month === month);
  const futuro = month > cur;

  let body: React.ReactNode;
  if (futuro) {
    const row = projection(d, 25).find((r) => r.month === month);
    const entra = row?.receitas ?? 0;
    const sai = row?.despesas ?? 0;
    const resultado = entra - sai;
    const partes = 3;
    const terco = resultado > 0 ? Math.floor(resultado / partes) : 0;
    const porPessoa = Math.floor(terco / Math.max(d.profiles.length, 1));
    body = (
      <>
        <div className="grid grid-5 tiles">
          <Tile label="Começa com" value={row?.inicio ?? 0} color="var(--text)" icon={<IconWallet />}
            info="O que deve sobrar dos meses anteriores, se tudo que está lançado for recebido e pago." />
          <Tile label="Vai entrar" value={entra} color="var(--blue)" icon={<IconArrowUp />} hint={`${receitas.length} receita(s)`}
            info="Receitas previstas para este mês (salários recorrentes e outras já lançadas)." />
          <Tile label="Vai sair" value={sai} color="var(--red)" icon={<IconArrowDown />} hint={row && row.cartao > 0 ? `inclui ${brl(row.cartao)} do cartão` : undefined}
            info="Contas previstas para este mês, incluindo a fatura do cartão que vence nele. Gastos variáveis só aparecem se já tiverem sido lançados." />
          <Tile label="Fatura do cartão" value={fatura?.total ?? 0} color="var(--pink)" icon={<IconCard />}
            hint={!fatura ? 'Sem compras no cartão' : month <= openMonth ? `vence ${dateLabel(fatura.due)} · já conta em ${monthLabel(cur)}` : `vence ${dateLabel(fatura.due)}`}
            info="Total da fatura deste mês: parcelas, compras e contas fixas no cartão já lançadas. A fatura que está aberta recebendo compras agora já entra no Falta pagar do mês atual, por isso não aparece de novo no Vai sair deste mês." />
          <Tile label="Sobra no fim do mês" value={row?.fim ?? 0} color={(row?.fim ?? 0) < 0 ? 'var(--red)' : 'var(--green)'} icon={<IconCalendar />}
            info="Começa com + vai entrar − vai sair." />
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Divisão prevista
              <InfoTip inline align="left" text="Estimativa: o resultado do próprio mês (o que entra − o que sai) dividido em 3. A divisão de verdade é feita automaticamente quando o mês chegar, com os valores lançados até lá." />
            </h2>
            <span className="muted small">{resultado > 0 ? <><strong className="pos">{brl(resultado)}</strong> ÷ 3 = <strong>{brl(terco)}</strong></> : <strong className="neg">sem sobra prevista</strong>}</span>
          </div>
          {resultado > 0 ? (
            <div className="grid grid-3">
              <div className="third">
                <div className="third-head"><span>🙋 Valores individuais</span><span className="third-value">{brl(terco)}</span></div>
                {d.profiles.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar profile={p} size={24} /><span className="small" style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                    <strong className="num">{brl(porPessoa)}</strong>
                  </div>
                ))}
              </div>
              <div className="third"><div className="third-head"><span>📅 Adiantar contas</span><span className="third-value">{brl(terco)}</span></div></div>
              <div className="third"><div className="third-head"><span>💰 Guardar</span><span className="third-value">{brl(terco)}</span></div></div>
            </div>
          ) : (
            <p className="small" style={{ margin: 0 }}>O que vai sair passa o que vai entrar em <strong className="neg">{brl(-resultado)}</strong>.</p>
          )}
        </section>
      </>
    );
  } else {
    const entrou = sum(receitas);
    const saiu = sum(despesas);
    body = (
      <div className="grid grid-3 tiles">
        <Tile label="Entrou" value={entrou} color="var(--green)" icon={<IconArrowUp />} info="Todas as receitas deste mês." />
        <Tile label="Saiu" value={saiu} color="var(--red)" icon={<IconArrowDown />} hint={fatura ? `inclui fatura ${brl(fatura.total)}` : undefined} info="Todas as despesas deste mês, incluindo a fatura do cartão que venceu nele." />
        <Tile label="Resultado do mês" value={entrou - saiu} color={entrou - saiu < 0 ? 'var(--red)' : 'var(--blue)'} icon={<IconCalendar />} info="Entrou − saiu." />
      </div>
    );
  }

  return (
    <>
      {body}
      <Fold id={`mes-lancamentos`} title={`Lançamentos de ${monthLabel(month, true).toLowerCase()} (${doMes.length})`}>
        {doMes.length === 0 ? <div className="empty">Nada lançado neste mês.</div> : (
          <div className="list">{[...receitas, ...despesas].map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
        )}
      </Fold>
    </>
  );
}
