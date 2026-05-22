'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { AreaTrendBar } from '@/lib/area-trends';

interface Props {
  data: AreaTrendBar[];
  trend: 'rising' | 'declining';
}

const COLOR_RISING   = '#16a34a';
const COLOR_DECLINING = '#ef4444';

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AreaTrendBar }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  const sign = d.changeRate >= 0 ? '+' : '';
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: '0.8125rem',
        lineHeight: 1.8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {d.name}
      </p>
      <p style={{ color: 'var(--text-secondary)' }}>
        変化率: <strong style={{ color: d.changeRate >= 0 ? COLOR_RISING : COLOR_DECLINING }}>
          {sign}{d.changeRate}%
        </strong>
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        {d.startPrice.toLocaleString()} → {d.endPrice.toLocaleString()} 万円/坪
      </p>
    </div>
  );
}

export default function TrendBarChart({ data, trend }: Props) {
  const color = trend === 'rising' ? COLOR_RISING : COLOR_DECLINING;

  const chartData = [...data].sort((a, b) =>
    trend === 'rising' ? a.changeRate - b.changeRate : b.changeRate - a.changeRate,
  );

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          unit="%"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="changeRate" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={color}
              fillOpacity={entry === chartData[chartData.length - 1] ? 1 : 0.65}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
