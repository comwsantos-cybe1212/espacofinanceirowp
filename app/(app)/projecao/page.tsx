import Link from 'next/link';
import { MonthBars } from '@/components/Charts';
import InfoTip from '@/components/InfoTip';
import { monthLabel } from '@/lib/dates';
import { projection } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

export default async function Previsao() {
  const d = await loadData();
  const rows = projection(d, 12);
  const economia = d.savings.reduce((a, m) => a + m.amount, 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Previsão<InfoTip inline align="left" text="Resultado de cada mês olhando só para ele: o que entra no mês − o que sai no mês (inclui a fatura do cartão que vence nele). Nada acumula de um mês para o outro; só a economia guardada passa adiante. Gastos variáveis futuros entram quando forem lançados." /></h1>
        </div>
        {economia > 0 && <span className="chip violet">Economia guardada: {brl(economia)}</span>}
      </div>

      <div className="panel">
        <div className="list">
          {rows.map((r, i) => (
            <Link className="row row-link" key={r.month} href={`/?m=${r.month}`}>
              <div className="row-main">
                <div className="row-title">{monthLabel(r.month, true)}{i === 0 && <span className="faint small"> · este mês</span>}</div>
                <div className="row-meta">
                  <span className="pos">entra {brl(r.receitas)}</span> · <span className="neg">sai {brl(r.despesas)}</span>
                  {r.terco > 0 && <> · cada ⅓ {brl(r.terco)}</>}
                </div>
              </div>
              <div className={`row-amount ${r.resultado < 0 ? 'neg' : 'pos'}`}>{brl(r.resultado)}</div>
              <span className="tile-more">ver ›</span>
            </Link>
          ))}
        </div>
      </div>

      <details className="more">
        <summary>Ver gráfico e detalhes</summary>
        <div className="stack">
          <div className="panel">
            <MonthBars data={rows.map((r) => ({ name: monthLabel(r.month), value: r.resultado / 100 }))} label="Resultado do mês" color="#3b82f6" signed />
          </div>
          <div className="panel table-wrap">
            <table className="table">
              <thead>
                <tr><th>Mês</th><th>Entra</th><th>Sai</th><th>No cartão</th><th>Resultado</th><th>Cada ⅓</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.month} className={i === 0 ? 'current' : ''}>
                    <td>{monthLabel(r.month)}</td>
                    <td className="pos">{brl(r.receitas)}</td>
                    <td className="neg">{brl(r.despesas)}</td>
                    <td className="muted">{brl(r.cartao)}</td>
                    <td className={r.resultado < 0 ? 'neg' : 'pos'}><strong>{brl(r.resultado)}</strong></td>
                    <td className="muted">{r.terco > 0 ? brl(r.terco) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
