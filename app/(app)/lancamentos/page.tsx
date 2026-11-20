import Link from 'next/link';
import MonthPicker from '@/components/MonthPicker';
import TxRow from '@/components/TxRow';
import { isValidMonth, monthLabel, monthOf } from '@/lib/dates';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';
import type { Tx } from '@/lib/types';

type SP = { m?: string; p?: string; t?: string; q?: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sum = (l: Tx[]) => l.reduce((a, t) => a + t.amount, 0);

export default async function Lancamentos({ searchParams }: { searchParams: SP }) {
  const d = await loadData();
  const month = isValidMonth(searchParams.m) ? searchParams.m : monthOf(d.today);
  const who = searchParams.p === 'nos' ? 'nos' : Number(searchParams.p) || null;
  const type = searchParams.t === 'receita' || searchParams.t === 'despesa' ? searchParams.t : null;
  const q = (searchParams.q ?? '').trim().slice(0, 60);

  // Com busca: procura em todos os meses; sem busca: mostra o mês escolhido
  let list = q ? d.txs.filter((t) => norm(t.description).includes(norm(q))) : d.txs.filter((t) => t.month === month);
  if (who === 'nos') list = list.filter((t) => !t.profile_id);
  else if (who) list = list.filter((t) => t.profile_id === who);
  if (type) list = list.filter((t) => t.kind === type);

  const receitas = list.filter((t) => t.kind === 'receita');
  const despesas = list.filter((t) => t.kind === 'despesa');

  const href = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const v = { m: month, p: who ? String(who) : undefined, t: type ?? undefined, q: q || undefined, ...over };
    Object.entries(v).forEach(([k, val]) => val && p.set(k, val));
    return `/lancamentos?${p}`;
  };

  const Section = ({ title, items }: { title: string; items: Tx[] }) => (
    <div className="panel">
      <div className="panel-head"><h2 className="section-title">{title}</h2><span className="num muted small">{brl(sum(items))}</span></div>
      {items.length ? <div className="list">{items.map((t) => <TxRow key={t.id} t={t} profiles={d.profiles} today={d.today} />)}</div>
        : <div className="empty">Nada por aqui.</div>}
    </div>
  );

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-sub">Toque em ✓ para marcar como pago ou recebido.</p>
        </div>
        {!q && <MonthPicker month={month} path="/lancamentos" extra={`${who ? `&p=${who}` : ''}${type ? `&t=${type}` : ''}`} />}
      </div>

      <form action="/lancamentos" className="toolbar">
        <input type="hidden" name="m" value={month} />
        {who && <input type="hidden" name="p" value={String(who)} />}
        {type && <input type="hidden" name="t" value={type} />}
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar por nome (ex.: aluguel, curso…)" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn">Buscar</button>
        {q && <Link className="btn btn-ghost" href={href({ q: undefined })}>Limpar</Link>}
      </form>

      <div className="toolbar">
        <Link className={`btn btn-sm ${!who ? 'btn-primary' : ''}`} href={href({ p: undefined })}>Todos</Link>
        {d.profiles.map((p) => (
          <Link key={p.id} className={`btn btn-sm ${who === p.id ? 'btn-primary' : ''}`} href={href({ p: String(p.id) })}>{p.name}</Link>
        ))}
        <Link className={`btn btn-sm ${who === 'nos' ? 'btn-primary' : ''}`} href={href({ p: 'nos' })}>Nós</Link>
        <span style={{ width: 8 }} />
        <Link className={`btn btn-sm ${!type ? 'btn-primary' : ''}`} href={href({ t: undefined })}>Tudo</Link>
        <Link className={`btn btn-sm ${type === 'receita' ? 'btn-primary' : ''}`} href={href({ t: 'receita' })}>Receitas</Link>
        <Link className={`btn btn-sm ${type === 'despesa' ? 'btn-primary' : ''}`} href={href({ t: 'despesa' })}>Despesas</Link>
      </div>

      {q ? (
        <Section title={`${list.length} resultado(s) para “${q}” em todos os meses`} items={[...list].sort((a, b) => b.due_date.localeCompare(a.due_date))} />
      ) : (
        <>
          <div className="panel" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div><div className="muted small">Entrou</div><div className="tile-value pos">{brl(sum(receitas))}</div></div>
            <div><div className="muted small">Saiu</div><div className="tile-value neg">{brl(sum(despesas))}</div></div>
            <div><div className="muted small">Sobra</div><div className={`tile-value ${sum(receitas) - sum(despesas) < 0 ? 'neg' : 'pos'}`}>{brl(sum(receitas) - sum(despesas))}</div></div>
          </div>
          {type !== 'despesa' && <Section title="Receitas" items={receitas} />}
          {type !== 'receita' && (
            <>
              <Section title="Despesas fixas" items={despesas.filter((t) => t.recurrence === 'fixa' && t.payment === 'conta')} />
              <Section title="Despesas variáveis" items={despesas.filter((t) => t.recurrence === 'variavel' && t.payment === 'conta')} />
              <Section title={`Cartão (fatura ${monthLabel(month)})`} items={despesas.filter((t) => t.payment === 'cartao')} />
            </>
          )}
        </>
      )}
    </div>
  );
}
