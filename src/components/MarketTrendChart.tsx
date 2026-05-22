'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// 2019Q1〜2025Q1 の首都圏エリア別坪単価サンプルデータ（万円/坪）
// 国土交通省 不動産取引価格情報を参考にした近似値
const MARKET_DATA = [
  { period: '2019Q1', tokyo: 452, kanagawa: 218, chiba: 128, saitama: 138 },
  { period: '2019Q3', tokyo: 461, kanagawa: 222, chiba: 130, saitama: 141 },
  { period: '2020Q1', tokyo: 468, kanagawa: 225, chiba: 133, saitama: 144 },
  { period: '2020Q3', tokyo: 472, kanagawa: 228, chiba: 135, saitama: 146 },
  { period: '2021Q1', tokyo: 495, kanagawa: 238, chiba: 141, saitama: 153 },
  { period: '2021Q3', tokyo: 524, kanagawa: 252, chiba: 149, saitama: 161 },
  { period: '2022Q1', tokyo: 558, kanagawa: 267, chiba: 156, saitama: 169 },
  { period: '2022Q3', tokyo: 579, kanagawa: 278, chiba: 161, saitama: 174 },
  { period: '2023Q1', tokyo: 601, kanagawa: 289, chiba: 166, saitama: 179 },
  { period: '2023Q3', tokyo: 628, kanagawa: 299, chiba: 171, saitama: 184 },
  { period: '2024Q1', tokyo: 648, kanagawa: 308, chiba: 176, saitama: 189 },
  { period: '2024Q3', tokyo: 664, kanagawa: 315, chiba: 180, saitama: 193 },
  { period: '2025Q1', tokyo: 672, kanagawa: 320, chiba: 183, saitama: 196 },
];

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const nameMap: Record<string, string> = {
    tokyo: '東京', kanagawa: '神奈川', chiba: '千葉', saitama: '埼玉',
  };
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
      <p className="font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{nameMap[p.name] ?? p.name}</span>
          <span className="font-semibold ml-auto pl-3" style={{ color: p.color }}>
            {p.value}万円/坪
          </span>
        </p>
      ))}
    </div>
  );
}

const LINES = [
  { key: 'tokyo',    label: '東京',   color: '#a87630' },
  { key: 'kanagawa', label: '神奈川', color: '#3a78bf' },
  { key: 'chiba',    label: '千葉',   color: '#16a34a' },
  { key: 'saitama',  label: '埼玉',   color: '#9333ea' },
];

export default function MarketTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={MARKET_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 2" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}万`}
          width={44}
          domain={[100, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => {
            const l = LINES.find((l) => l.key === value);
            return <span style={{ color: 'var(--text-secondary)' }}>{l?.label ?? value}</span>;
          }}
        />
        {LINES.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: l.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
