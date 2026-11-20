import Avatar from '@/components/Avatar';
import InfoTip from '@/components/InfoTip';
import { ProfileEditor } from '@/components/Forms';
import MonthPicker from '@/components/MonthPicker';
import { ProfileView } from '@/components/ProfileView';
import { isValidMonth, monthLabel, monthOf } from '@/lib/dates';
import { profileSummary, ruleOfThree } from '@/lib/finance';
import { loadData } from '@/lib/data';

export default async function Perfis({ searchParams }: { searchParams: { m?: string } }) {
  const d = await loadData();
  const cur = monthOf(d.today);
  const month = isValidMonth(searchParams.m) ? searchParams.m : cur;
  const rule = ruleOfThree(d);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Perfis<InfoTip inline align="left" text={'Ganhos e gastos de cada um no mês escolhido. Tudo que é de "Nós" conta 50% para cada.'} /></h1>
        </div>
        <MonthPicker month={month} path="/perfis" />
      </div>

      <div className="grid grid-2">
        {d.profiles.map((p) => {
          const found = rule.individuais.find((x) => x.profile.id === p.id);
          const ind = month === cur && found ? { ...found, dividido: rule.dividido } : null;
          return (
            <div key={p.id} className="panel stack" style={{ gap: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar profile={p} size={52} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 19 }}>{p.name}</div>
                  <div className="small muted">Resultados de {monthLabel(month, true)}</div>
                </div>
              </div>
              <ProfileView s={profileSummary(d, p, month)} individual={ind} />
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
