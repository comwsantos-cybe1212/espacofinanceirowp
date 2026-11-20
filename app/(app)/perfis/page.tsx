import Avatar from '@/components/Avatar';
import { CategoryChart, Legend, TrendChart } from '@/components/Charts';
import { ProfileEditor } from '@/components/Forms';
import MonthPicker from '@/components/MonthPicker';
import { isValidMonth, monthLabel, monthOf } from '@/lib/dates';
import { monthlyTrend, spendingByProfile } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

export default async function Perfis({ searchParams }: { searchParams: { m?: string } }) {
  const d = await loadData();
  const month = isValidMonth(searchParams.m) ? searchParams.m : monthOf(d.today);
  const { byCategory, totals } = spendingByProfile(d, month);
  const trend = monthlyTrend(d, month, 6);
  const labels = Object.fromEntries(trend.map((r) => [r.month as string, monthLabel(r.month as string)]));

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Perfis</h1>
          <p className="page-sub">Quanto cada um gastou e com o quê.</p>
        </div>
        <MonthPicker month={month} path="/perfis" />
      </div>

      <div className="grid grid-2">
        {totals.map(({ profile, despesas, receitas }) => {
          const mine = byCategory.filter((c) => Number(c[`p${profile.id}`]) > 0).sort((a, b) => Number(b[`p${profile.id}`]) - Number(a[`p${profile.id}`]));
          return (
            <div key={profile.id} className="panel">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <Avatar profile={profile} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.name}</div>
                  <div className="small muted">gastou <strong className="neg">{brl(despesas)}</strong> · recebeu <strong className="pos">{brl(receitas)}</strong></div>
                </div>
              </div>
              {mine.length === 0 ? <div className="empty">Sem gastos neste mês.</div> : (
                <div className="list">
                  {mine.slice(0, 5).map((c) => (
                    <div className="row" key={c.category as string}>
                      <div className="row-main small">{c.category}</div>
                      <div className="row-amount small">{brl(Math.round(Number(c[`p${profile.id}`]) * 100))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="more">
        <summary>Ver gráficos</summary>
        <div className="grid grid-2">
          <div className="panel">
            <h2 className="section-title" style={{ marginBottom: 10 }}>Por categoria · {monthLabel(month)}</h2>
            <Legend profiles={d.profiles} />
            {byCategory.length ? <CategoryChart data={byCategory} profiles={d.profiles} /> : <div className="empty">Nenhuma despesa.</div>}
          </div>
          <div className="panel">
            <h2 className="section-title" style={{ marginBottom: 10 }}>Últimos 6 meses</h2>
            <Legend profiles={d.profiles} />
            <TrendChart data={trend} profiles={d.profiles} labels={labels} />
          </div>
        </div>
      </details>

      <details className="more">
        <summary>Editar nome, foto e cor</summary>
        <div className="grid grid-2">{d.profiles.map((p) => <ProfileEditor key={p.id} profile={p} />)}</div>
      </details>
    </div>
  );
}
