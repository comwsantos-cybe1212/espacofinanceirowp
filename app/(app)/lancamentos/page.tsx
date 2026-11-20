import Link from 'next/link';
import LaunchList, { LaunchFilters } from '@/components/LaunchList';
import MonthPicker from '@/components/MonthPicker';
import { isValidMonth, monthOf } from '@/lib/dates';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';
import type { Tx } from '@/lib/types';

type SP = { m?: string; p?: string; t?: string; q?: string; c?: string; s?: string };

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
  const doMes = list;
  if (who === 'nos') list = list.filter((t) => !t.profile_id);
  else if (who) list = list.filter((t) => t.profile_id === who);
  if (searchParams.c) list = list.filter((t) => t.category === searchParams.c);
  if (searchParams.s === 'pago') list = list.filter((t) => t.paid);
  if (searchParams.s === 'aberto') list = list.filter((t) => !t.paid && t.due_date >= d.today);
  if (searchParams.s === 'atrasado') list = list.filter((t) => !t.paid && t.due_date < d.today);
  const order = (a: Tx, b: Tx) => b.due_date.localeCompare(a.due_date) || b.id - a.id;
  const receitas = type === 'despesa' ? [] : list.filter((t) => t.kind === 'receita').sort(order);
  const despesas = type === 'receita' ? [] : list.filter((t) => t.kind === 'despesa').sort(order);

  const entrou = sum(doMes.filter((t) => t.kind === 'receita'));
  const saiu = sum(doMes.filter((t) => t.kind === 'despesa'));

  const href = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    Object.entries({ ...searchParams, m: month, ...over }).forEach(([k, val]) => val && p.set(k, String(val)));
    return `/lancamentos?${p}`;
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-sub">Toque em ✓ para marcar como pago ou recebido.</p>
        </div>
        {!q && <MonthPicker month={month} path="/lancamentos" extra={Object.entries(searchParams).filter(([k]) => k !== 'm').map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`).join('')} />}
      </div>

      <div className="tabs">
        <Link className={!type ? 'on' : ''} href={href({ t: undefined, c: undefined })}>Todos</Link>
        <Link className={type === 'receita' ? 'on' : ''} href={href({ t: 'receita', c: undefined })}>Lançamentos de Receita</Link>
        <Link className={type === 'despesa' ? 'on' : ''} href={href({ t: 'despesa', c: undefined })}>Lançamentos de Despesa</Link>
      </div>

      <form action="/lancamentos" className="toolbar">
        {Object.entries(searchParams).filter(([k]) => k !== 'q').map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar por nome (ex.: aluguel, curso…)" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn">Buscar</button>
        {q && <Link className="btn btn-ghost" href={href({ q: undefined })}>Limpar</Link>}
      </form>
      <LaunchFilters profiles={d.profiles} />

      {!q && (
        <div className="grid grid-3 tiles">
          <div className="panel tile" style={{ ['--c' as string]: 'var(--green)' }}><div className="tile-label">Entrou</div><div className="tile-value" style={{ marginTop: 6 }}>{brl(entrou)}</div></div>
          <div className="panel tile" style={{ ['--c' as string]: 'var(--red)' }}><div className="tile-label">Saiu</div><div className="tile-value" style={{ marginTop: 6 }}>{brl(saiu)}</div></div>
          <div className="panel tile" style={{ ['--c' as string]: 'var(--blue)' }}><div className="tile-label">Sobra</div><div className="tile-value" style={{ marginTop: 6 }}>{brl(entrou - saiu)}</div></div>
        </div>
      )}
      {q && <p className="muted" style={{ margin: 0 }}>Resultados para “{q}” em todos os meses.</p>}

      <LaunchList key={JSON.stringify(searchParams)} receitas={receitas} despesas={despesas} profiles={d.profiles} today={d.today} />
    </div>
  );
}
