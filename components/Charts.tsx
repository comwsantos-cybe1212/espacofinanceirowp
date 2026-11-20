'use client';

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Profile } from '@/lib/types';

const AXIS = { stroke: '#626aa0', fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid stroke="rgba(140,150,255,0.10)" vertical={false} />;
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(Math.round(v)));

type Row = Record<string, string | number>;

function Tip({ active, payload, label, names }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string; names: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <i style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span className="muted">{names[p.dataKey] ?? p.dataKey}</span>
          <strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{money(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function Legend({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="legend">
      {profiles.map((p) => <span key={p.id}><i style={{ background: p.color }} />{p.name}</span>)}
    </div>
  );
}

/** Gastos por categoria, uma barra por perfil */
export function CategoryChart({ data, profiles, height = 300 }: { data: Row[]; profiles: Profile[]; height?: number }) {
  const names = Object.fromEntries(profiles.map((p) => [`p${p.id}`, p.name]));
  return (
    <div style={{ width: '100%', height: Math.max(height, data.length * 44 + 40) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid stroke="rgba(140,150,255,0.10)" horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={compact} />
          <YAxis type="category" dataKey="category" {...AXIS} width={110} stroke="#98a0d4" />
          <Tooltip cursor={{ fill: 'rgba(140,150,255,0.06)' }} content={<Tip names={names} />} />
          {profiles.map((p) => <Bar key={p.id} dataKey={`p${p.id}`} fill={p.color} radius={[0, 4, 4, 0]} maxBarSize={14} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Evolução mensal dos gastos de cada perfil */
export function TrendChart({ data, profiles, labels }: { data: Row[]; profiles: Profile[]; labels: Record<string, string> }) {
  const names = Object.fromEntries(profiles.map((p) => [`p${p.id}`, p.name]));
  return (
    <div className="chart-box">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
          {GRID}
          <XAxis dataKey="month" {...AXIS} tickFormatter={(m) => labels[m] ?? m} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          <Tooltip content={<Tip names={names} />} labelFormatter={(m) => labels[m] ?? m} />
          {profiles.map((p) => (
            <Line key={p.id} type="monotone" dataKey={`p${p.id}`} stroke={p.color} strokeWidth={2.5} dot={{ r: 3, fill: p.color }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras simples (faturas futuras, saldo previsto) */
export function MonthBars({ data, label, color = '#4de3ff', signed = false }: { data: { name: string; value: number }[]; label: string; color?: string; signed?: boolean }) {
  return (
    <div className="chart-box" style={{ height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          {GRID}
          <XAxis dataKey="name" {...AXIS} interval={0} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 46 : 24} />
          <YAxis {...AXIS} tickFormatter={compact} width={44} />
          {signed && <ReferenceLine y={0} stroke="#626aa0" />}
          <Tooltip cursor={{ fill: 'rgba(140,150,255,0.06)' }} content={<Tip names={{ value: label }} />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={34}>
            {data.map((d) => <Cell key={d.name} fill={signed && d.value < 0 ? '#ff5d7a' : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
