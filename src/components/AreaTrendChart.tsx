'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface AreaSeries {
  name: string;
  color: string;
  values: number[]; // 各年の坪単価（万円/坪）
}

const DEFAULT_YEARS = ['2020', '2021', '2022', '2023', '2024'];

function buildData(areas: AreaSeries[], years: string[]) {
  return years.map((year, i) => {
    const row: Record<string, string | number> = { year };
    for (const a of areas) row[a.name] = a.values[i] ?? 0;
    return row;
  });
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
      }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}年</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <span className="font-semibold ml-auto pl-3" style={{ color: p.color }}>
            {p.value}万/坪
          </span>
        </p>
      ))}
    </div>
  );
}

export default function AreaTrendChart({ areas, years = DEFAULT_YEARS }: { areas: AreaSeries[]; years?: string[] }) {
  const data = buildData(areas, years);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 2" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => `${v}`}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}万`}
          width={46}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => {
            const a = areas.find((a) => a.name === value);
            return <span style={{ color: 'var(--text-secondary)' }}>{a?.name ?? value}</span>;
          }}
        />
        {areas.map((a) => (
          <Line
            key={a.name}
            type="monotone"
            dataKey={a.name}
            stroke={a.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: a.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
