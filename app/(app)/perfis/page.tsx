import Avatar from '@/components/Avatar';
import { ProfileEditor } from '@/components/Forms';
import MonthPicker from '@/components/MonthPicker';
import { isValidMonth, monthLabel, monthOf } from '@/lib/dates';
import { personalSpending, ruleOfThree } from '@/lib/finance';
import { brl } from '@/lib/format';
import { loadData } from '@/lib/data';

export default async function Perfis({ searchParams }: { searchParams: { m?: string } }) {
  const d = await loadData();
  const cur = monthOf(d.today);
  const month = isValidMonth(searchParams.m) ? searchParams.m : cur;
  const rule = ruleOfThree(d);

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Perfis</h1>
          <p className="page-sub">Gastos individuais de cada um. Gastos de “nós” não entram aqui.</p>
        </div>
        <MonthPicker month={month} path="/perfis" />
      </div>

      <div className="grid grid-2">
        {d.profiles.map((profile) => {
          const s = personalSpending(d, profile.id, month);
          const ind = rule.diversao.find((x) => x.profile.id === profile.id);
          const top = s.categorias[0]?.amount || 1;
          return (
            <div key={profile.id} className="panel stack" style={{ gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar profile={profile} size={56} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{profile.name}</div>
                  <div className="small muted">Gastos individuais em {monthLabel(month)}</div>
                </div>
                <div className="tile-value neg">{brl(s.total)}</div>
              </div>

              <div className="grid grid-2" style={{ gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                <div className="third" style={{ gap: 2 }}><span className="small muted">Fixos</span><strong className="num">{brl(s.totalFixos)}</strong></div>
                <div className="third" style={{ gap: 2 }}><span className="small muted">Variáveis</span><strong className="num">{brl(s.totalVariaveis)}</strong></div>
              </div>

              {month === cur && ind && (
                <div className="third" style={{ background: 'color-mix(in srgb, var(--accent-2) 12%, var(--surface-2))' }}>
                  <div className="third-head">🎉 Valor individual <span className="third-value">{brl(ind.cota)}</span></div>
                  <div className={`bar ${ind.usado > ind.cota ? 'over' : ''}`}><div style={{ width: `${ind.cota > 0 ? Math.min(100, (ind.usado / ind.cota) * 100) : 0}%` }} /></div>
                  <span className="small muted">
                    Usou {brl(ind.usado)} · {ind.resta >= 0 ? <>pode gastar <strong className="pos">{brl(ind.resta)}</strong></> : <strong className="neg">passou {brl(-ind.resta)}</strong>}
                  </span>
                </div>
              )}

              <div>
                <h3 className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>Com o que mais gasta</h3>
                {s.categorias.length === 0 ? <div className="empty">Sem gastos individuais.</div> : (
                  <div className="stack" style={{ gap: 8 }}>
                    {s.categorias.map((c) => (
                      <div key={c.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="small"><span>{c.category}</span><strong className="num">{brl(c.amount)}</strong></div>
                        <div className="bar" style={{ marginTop: 4 }}><div style={{ width: `${(c.amount / top) * 100}%`, background: profile.color }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {s.fixos.length > 0 && (
                <details className="more">
                  <summary>Ver gastos fixos ({s.fixos.length})</summary>
                  <div className="list">
                    {s.fixos.map((t) => (
                      <div className="row" key={t.id}>
                        <div className="row-main small">{t.description} <span className="faint">· {t.category}</span></div>
                        <div className="row-amount small">{brl(t.amount)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {s.variaveis.length > 0 && (
                <details className="more" style={{ marginTop: -10 }}>
                  <summary>Ver gastos variáveis ({s.variaveis.length})</summary>
                  <div className="list">
                    {s.variaveis.map((t) => (
                      <div className="row" key={t.id}>
                        <div className="row-main small">{t.description}{t.inst_total > 1 && <span className="faint"> {t.inst_no}/{t.inst_total}</span>} <span className="faint">· {t.category}</span></div>
                        <div className="row-amount small">{brl(t.amount)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <details className="more">
        <summary>Editar nome, foto e cor</summary>
        <div className="grid grid-2">{d.profiles.map((p) => <ProfileEditor key={p.id} profile={p} />)}</div>
      </details>
    </div>
  );
}
