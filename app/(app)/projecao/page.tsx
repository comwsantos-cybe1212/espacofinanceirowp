import Link from 'next/link';
import { MonthBars } from '@/components/Charts';
import { monthLabel } from '@/lib/dates';
import { projection } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

export default async function Previsao({ searchParams }: { searchParams: { regra?: string } }) {
  const d = await loadData();
  const regra = searchParams.regra === '1';
  const rows = projection(d, 12, regra);

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Previsão</h1>
          <p className="page-sub">O que sobra em um mês passa para o seguinte.</p>
        </div>
        <div className="segmented" style={{ minWidth: 280 }}>
          <Link href="/projecao" className={!regra ? 'on' : ''}>Sem regra</Link>
          <Link href="/projecao?regra=1" className={regra ? 'on' : ''}>Com regra de 3</Link>
        </div>
      </div>

      {regra && <p className="note" style={{ margin: 0 }}>Simulando: todo mês ⅓ da sobra é gasto em diversão, ⅓ é guardado e ⅓ adianta contas.</p>}

      <div className="panel">
        <div className="list">
          {rows.map((r, i) => (
            <div className="row" key={r.month}>
              <div className="row-main">
                <div className="row-title">{monthLabel(r.month, true)}{i === 0 && <span className="faint small"> · este mês</span>}</div>
                <div className="row-meta">
                  começa {brl(r.inicio)} · <span className="pos">+{brl(r.receitas)}</span> · <span className="neg">−{brl(r.despesas)}</span>
                  {regra && r.terco > 0 && <> · guardar {brl(r.terco)}</>}
                </div>
              </div>
              <div className={`row-amount ${r.fim < 0 ? 'neg' : 'pos'}`}>{brl(r.fim)}</div>
            </div>
          ))}
        </div>
      </div>

      <details className="more">
        <summary>Ver gráfico e detalhes</summary>
        <div className="stack">
          <div className="panel">
            <MonthBars data={rows.map((r) => ({ name: monthLabel(r.month), value: r.fim / 100 }))} label="Saldo previsto" color="#3ddc97" signed />
          </div>
          <div className="panel table-wrap">
            <table className="table">
              <thead>
                <tr><th>Mês</th><th>Começa com</th><th>Receitas</th><th>Despesas</th><th>No cartão</th><th>Previsto</th><th>Cada ⅓</th><th>Economia</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.month} className={i === 0 ? 'current' : ''}>
                    <td>{monthLabel(r.month)}</td>
                    <td>{brl(r.inicio)}</td>
                    <td className="pos">{brl(r.receitas)}</td>
                    <td className="neg">{brl(r.despesas)}</td>
                    <td className="muted">{brl(r.cartao)}</td>
                    <td className={r.fim < 0 ? 'neg' : 'pos'}><strong>{brl(r.fim)}</strong></td>
                    <td className="muted">{r.terco > 0 ? brl(r.terco) : '—'}</td>
                    <td>{brl(r.economia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="faint small" style={{ marginBottom: 0 }}>Este mês mostra só o que ainda falta receber/pagar. Gastos variáveis futuros entram quando forem lançados.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
