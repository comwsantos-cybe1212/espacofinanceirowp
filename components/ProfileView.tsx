'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_COLORS, categoryEmoji } from '@/lib/categories';
import { monthLabel } from '@/lib/dates';
import { brl } from '@/lib/format';
import type { Individual, ProfileSummary } from '@/lib/finance';
import Avatar from './Avatar';
import InfoTip from './InfoTip';
import { ChangePhoto } from './Forms';

type Extra = (Individual & { dividido: boolean }) | null;

/** Resultado individual: ganhos, gastos (com metade do que é de "Nós") e no que mais gastou */
export function ProfileView({ s, individual }: { s: ProfileSummary; individual?: Extra }) {
  const [cat, setCat] = useState<string | null>(null);
  const chosen = s.categorias.find((c) => c.category === cat);
  const data = s.categorias.map((c) => ({ name: c.category, value: c.amount / 100 }));

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="kpi green"><small>Ganhos</small><b>{brl(s.ganhos)}</b></div>
        <div className="kpi red"><small>Gastos<InfoTip inline text={'Gastos e ganhos de "Nós" contam 50% para cada um.'} /></small><b>{brl(s.gastos)}</b></div>
      </div>
      <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="third" style={{ gap: 2 }}><span className="small muted">Fixos</span><strong className="num">{brl(s.fixos)}</strong></div>
        <div className="third" style={{ gap: 2 }}><span className="small muted">Variáveis</span><strong className="num">{brl(s.variaveis)}</strong></div>
      </div>
      {individual && (
        <div className="third" style={{ background: 'var(--accent-soft)' }}>
          <div className="third-head"><span>🙋 Valor individual atual<InfoTip inline align="left" text="Pode gastar sem consultar o outro. O que não gastar continua aqui no mês seguinte." /></span> <span className={`third-value ${individual.atual < 0 ? 'neg' : ''}`}>{brl(individual.atual)}</span></div>
          <span className="small muted">
            {individual.dividido
              ? <>Este mês foi adicionado <strong className="pos">{brl(individual.cotaMes)}</strong>.</>
              : <>A divisão deste mês ainda não foi feita (vai adicionar {brl(individual.cotaMes)}).</>}
            {individual.anterior !== 0 && <> Vindo dos meses anteriores: {brl(individual.anterior)}.</>}
            {individual.gastoMes > 0 && <> Gasto este mês: {brl(individual.gastoMes)}.</>}
          </span>
        </div>
      )}

      <div className="panel" style={{ padding: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 6 }}>No que mais gastou<InfoTip inline align="left" text="Toque em uma parte do gráfico ou no nome da categoria para ver os lançamentos." /></h3>
        {data.length === 0 ? <div className="empty">Sem gastos neste mês.</div> : (
          <>
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none"
                    onClick={(e: { name?: string }) => setCat((c) => (c === e.name ? null : e.name ?? null))} cursor="pointer">
                    {data.map((d) => <Cell key={d.name} fill={CATEGORY_COLORS[d.name] ?? '#94a3b8'} opacity={cat && cat !== d.name ? 0.35 : 1} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend" style={{ justifyContent: 'center' }}>
              {s.categorias.map((c) => (
                <button key={c.category} type="button" className="legend-btn" onClick={() => setCat((x) => (x === c.category ? null : c.category))}
                  style={{ color: CATEGORY_COLORS[c.category] ?? 'var(--muted)', fontWeight: cat === c.category ? 800 : 600 }}>
                  <i style={{ background: CATEGORY_COLORS[c.category] ?? '#94a3b8' }} />{c.category}
                </button>
              ))}
            </div>
            <p style={{ textAlign: 'center', margin: 0 }}>Total: <strong>{brl(s.gastos)}</strong></p>
          </>
        )}
        {chosen && (
          <div className="list" style={{ marginTop: 12 }}>
            <div className="small" style={{ fontWeight: 800 }}>{categoryEmoji(chosen.category)} {chosen.category} · {brl(chosen.amount)}</div>
            {chosen.items.map((i) => (
              <div className="row" key={i.id}>
                <div className="row-main small">{i.description}{i.shared && <span className="faint"> · Nós (50%)</span>}{i.recurrence === 'fixa' && <span className="faint"> · fixo</span>}</div>
                <div className="row-amount small">{brl(i.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Atalhos dos perfis no Início: abrem só os dados da pessoa escolhida */
export function ProfileChips({ items }: { items: { s: ProfileSummary; individual: Extra }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const cur = items.find((i) => i.s.profile.id === open);
  return (
    <>
      <div className="chips">
        {items.map(({ s }) => (
          <button key={s.profile.id} type="button" className="profile-chip" onClick={() => setOpen(s.profile.id)}>
            <Avatar profile={s.profile} size={42} />
            <div style={{ textAlign: 'left' }}><strong>{s.profile.name}</strong><span>ver resultados do mês</span></div>
          </button>
        ))}
      </div>
      {cur && createPortal(
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 480 }}>
            <button type="button" className="modal-x" onClick={() => setOpen(null)} aria-label="Fechar">×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Avatar profile={cur.s.profile} size={44} />
              <h3 style={{ margin: 0, flex: 1 }}>{cur.s.profile.name}</h3>
              <span style={{ marginRight: 30 }}><ChangePhoto profile={cur.s.profile} /></span>
            </div>
            <p className="muted" style={{ margin: '0 0 14px' }}>Resultados de {monthLabel(cur.s.month, true)}</p>
            <ProfileView s={cur.s} individual={cur.individual} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
