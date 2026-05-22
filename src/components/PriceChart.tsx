'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export interface PriceChartData {
  period: string;
  avgPricePerUnit: number;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: 'var(--accent)' }}>
          平均坪単価: <strong>{p.value.toLocaleString()}</strong> 万円/坪
        </p>
      ))}
    </div>
  );
}

export default function PriceChart({ data }: { data: PriceChartData[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 rounded-xl text-sm"
        style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
      >
        グラフデータがありません
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="period"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={(v: string) => v.replace('年第', 'Q').replace('四半期', '')}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}万`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="avgPricePerUnit"
            name="平均坪単価"
            stroke="var(--chart-line1)"
            strokeWidth={2}
            dot={{ fill: 'var(--chart-line1)', r: 3 }}
            activeDot={{ r: 5, fill: 'var(--accent)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
