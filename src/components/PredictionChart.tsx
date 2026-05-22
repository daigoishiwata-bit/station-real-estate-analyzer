'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PricePeriod, ForecastPoint } from '@/lib/prediction';

// =========================================
// 型
// =========================================

interface ChartPoint {
  label: string;
  actual?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
}

interface Props {
  history: PricePeriod[];
  forecast: ForecastPoint[];
}

// =========================================
// ユーティリティ
// =========================================

/** "2023年第1四半期" → "2023Q1" */
function toShortLabel(period: string): string {
  return period.replace(/(\d{4})年第(\d)四半期/, '$1Q$2');
}

// =========================================
// カスタム Tooltip
// =========================================

function CustomTooltip({
  active,
  payload,
  label,
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
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value?.toFixed(1)} 万円/坪</span>
        </p>
      ))}
    </div>
  );
}

// =========================================
// コンポーネント
// =========================================

export default function PredictionChart({ history, forecast }: Props) {
  const historicalPoints: ChartPoint[] = history.map((p) => ({
    label: toShortLabel(p.period),
    actual: p.avgPricePerUnit,
  }));

  // 履歴の最終点と予測の最初のポイントをつなぐブリッジ
  const lastActual = history.at(-1);
  const forecastPoints: ChartPoint[] = forecast.map((f) => ({
    label: toShortLabel(f.period),
    predicted: f.predicted,
    lower: f.lower,
    upper: f.upper,
  }));

  // 折れ線を滑らかにつなぐため、最終実績点を予測側にも追加
  if (lastActual && forecastPoints.length > 0) {
    forecastPoints.unshift({
      label: toShortLabel(lastActual.period),
      predicted: lastActual.avgPricePerUnit,
      lower: lastActual.avgPricePerUnit,
      upper: lastActual.avgPricePerUnit,
    });
  }

  // 予測開始ラベル（縦線用）
  const forecastStartLabel = forecastPoints[0]?.label;

  const allData: ChartPoint[] = [...historicalPoints];
  const forecastMap = new Map(forecastPoints.map((p) => [p.label, p]));

  // 予測点を末尾にマージ（ラベルが重複しないように）
  for (const fp of forecastPoints) {
    if (!allData.find((p) => p.label === fp.label)) {
      allData.push(fp);
    } else {
      const existing = allData.find((p) => p.label === fp.label)!;
      existing.predicted = fp.predicted;
      existing.lower = fp.lower;
      existing.upper = fp.upper;
    }
  }

  // 表示間引き（データが多い場合は1年おき = 4四半期）
  const tickInterval = allData.length > 20 ? 3 : 1;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={allData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1e1e1e" strokeDasharray="4 2" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}万`}
          width={42}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{ fontSize: 11, color: '#888', paddingTop: 8 }}
          formatter={(value: string) =>
            value === 'actual' ? '実績（坪単価）'
            : value === 'predicted' ? '予測（坪単価）'
            : '予測レンジ'
          }
        />

        {/* 予測開始の縦線 */}
        {forecastStartLabel && (
          <ReferenceLine
            x={forecastStartLabel}
            stroke="#242424"
            strokeDasharray="4 2"
            label={{ value: '予測→', fill: '#555', fontSize: 10, position: 'insideTopRight' }}
          />
        )}

        {/* 信頼区間（エリア） */}
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="rgba(201,168,92,0.12)"
          name="予測レンジ"
          legendType="none"
          activeDot={false}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="var(--bg-card)"
          legendType="none"
          activeDot={false}
          dot={false}
        />

        {/* 実績ライン */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#c9a85c"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#c9a85c' }}
          name="actual"
          connectNulls={false}
        />

        {/* 予測ライン（破線） */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#c9a85c"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4, fill: '#c9a85c' }}
          name="predicted"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
