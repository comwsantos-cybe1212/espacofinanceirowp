import Link from 'next/link';
import MonthPicker from '@/components/MonthPicker';
import TxRow from '@/components/TxRow';
import { isValidMonth, monthLabel, monthOf } from '@/lib/dates';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

type SP = { m?: string; p?: string; t?: string };

export default async function Lancamentos({ searchParams }: { searchParams: SP }) {
  const d = await loadData();
  const month = isValidMonth(searchParams.m) ? searchParams.m : monthOf(d.today);
  const pid = Number(searchParams.p) || null;
  const type = searchParams.t === 'receita' || searchParams.t === 'despesa' ? searchParams.t : null;

  let list = d.txs.filter((t) => t.month === month);
  if (pid) list = list.filter((t) => t.profile_id === pid);
  const receitas = list.filter((t) => t.kind === 'receita');
  const despesas = list.filter((t) => t.kind === 'despesa');
  const fixas = despesas.filter((t) => t.recurrence === 'fixa' && t.payment === 'conta');
  const variaveis = despesas.filter((t) => t.recurrence === 'variavel' && t.payment === 'conta');
  const cartao = despesas.filter((t) => t.payment === 'cartao');
  const sum = (l: typeof list) => l.reduce((a, t) => a + t.amount, 0);

  const q = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const v = { m: month, p: pid ? String(pid) : undefined, t: type ?? undefined, ...over };
    Object.entries(v).forEach(([k, val]) => val && p.set(k, val));
    return `/lancamentos?${p}`;
  };

  const Section = ({ title, items }: { title: string; items: typeof list }) => (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="panel-head"><h2 className="section-title">{title}</h2><span className="num muted small">{brl(sum(items))}</span></div>
      {items.length ? <div className="list">{items.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
        : <div className="empty">Nada por aqui.</div>}
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-sub">Toque em ✓ para marcar como pago ou recebido.</p>
        </div>
        <MonthPicker month={month} path="/lancamentos" extra={`${pid ? `&p=${pid}` : ''}${type ? `&t=${type}` : ''}`} />
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <Link className={`btn btn-sm ${!pid ? 'btn-primary' : ''}`} href={q({ p: undefined })}>Todos</Link>
        {d.profiles.map((p) => (
          <Link key={p.id} className={`btn btn-sm ${pid === p.id ? 'btn-primary' : ''}`} href={q({ p: String(p.id) })}>{p.name}</Link>
        ))}
        <span style={{ width: 8 }} />
        <Link className={`btn btn-sm ${!type ? 'btn-primary' : ''}`} href={q({ t: undefined })}>Tudo</Link>
        <Link className={`btn btn-sm ${type === 'receita' ? 'btn-primary' : ''}`} href={q({ t: 'receita' })}>Receitas</Link>
        <Link className={`btn btn-sm ${type === 'despesa' ? 'btn-primary' : ''}`} href={q({ t: 'despesa' })}>Despesas</Link>
      </div>

      <div className="panel" style={{ marginBottom: 14, display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div><div className="muted small">Entrou</div><div className="tile-value pos">{brl(sum(receitas))}</div></div>
        <div><div className="muted small">Saiu</div><div className="tile-value neg">{brl(sum(despesas))}</div></div>
        <div><div className="muted small">Sobra</div><div className={`tile-value ${sum(receitas) - sum(despesas) < 0 ? 'neg' : 'pos'}`}>{brl(sum(receitas) - sum(despesas))}</div></div>
      </div>

      {type !== 'despesa' && <Section title="Receitas" items={receitas} />}
      {type !== 'receita' && (
        <>
          <Section title="Despesas fixas" items={fixas} />
          <Section title="Despesas variáveis" items={variaveis} />
          <Section title={`Cartão de crédito (fatura ${monthLabel(month)})`} items={cartao} />
        </>
      )}
    </>
  );
}
