/**
 * 線形回帰による不動産価格予測エンジン
 * 外部ライブラリ不使用・純粋TypeScript実装
 */

export interface PricePeriod {
  period: string;        // "2023年第1四半期"
  avgPricePerUnit: number;
  count: number;
}

export interface ForecastPoint {
  period: string;
  predicted: number;
  lower: number;         // 95%信頼区間 下限
  upper: number;         // 95%信頼区間 上限
  isForcast: true;
}

export interface PredictionResult {
  /** 学習に使った期間データ */
  historicalData: PricePeriod[];
  /** 予測データ（四半期単位、isForecast = true） */
  forecast: ForecastPoint[];
  /** 年率換算の価格変化率（%） */
  annualGrowthRate: number;
  /** R²（決定係数）: 0〜1、1に近いほど当てはまりが良い */
  rSquared: number;
  /** 信頼度メモ */
  confidenceNote: string;
}

// =========================================
// 内部ユーティリティ
// =========================================

/** "2024年第3四半期" → 連続インデックス（例: 2024*4+2 = 8098） */
function periodToIndex(period: string): number {
  const m = period.match(/(\d{4})年第(\d)四半期/);
  if (!m) return 0;
  return parseInt(m[1]!) * 4 + (parseInt(m[2]!) - 1);
}

/** 連続インデックス → 期間文字列 */
function indexToPeriod(idx: number): string {
  const year = Math.floor(idx / 4);
  const q = (idx % 4) + 1;
  return `${year}年第${q}四半期`;
}

/** 単純線形回帰 y = a + b*x を解く */
function linearRegression(xs: number[], ys: number[]): { a: number; b: number; rSquared: number } {
  const n = xs.length;
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i]!, 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { a: sumY / n, b: 0, rSquared: 0 };

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;

  const meanY = sumY / n;
  const ssTot = ys.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, v, i) => s + (v - (a + b * xs[i]!)) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { a, b, rSquared };
}

/** 残差の標準偏差（予測区間計算用） */
function residualStdDev(xs: number[], ys: number[], a: number, b: number): number {
  if (xs.length < 3) return 0;
  const ssRes = xs.reduce((s, x, i) => s + (ys[i]! - (a + b * x)) ** 2, 0);
  return Math.sqrt(ssRes / (xs.length - 2));
}

// =========================================
// メイン API
// =========================================

/**
 * 価格履歴から線形回帰モデルを構築し、将来予測を生成する
 *
 * @param history  `aggregateByPeriod` が返す履歴データ
 * @param quarters 予測する四半期数（デフォルト: 12 = 3年分）
 */
export function predictPrices(
  history: PricePeriod[],
  quarters = 12,
): PredictionResult | null {
  const valid = history.filter((p) => p.avgPricePerUnit > 0 && p.count >= 3);
  if (valid.length < 4) return null;

  const sorted = [...valid].sort((a, b) => periodToIndex(a.period) - periodToIndex(b.period));

  const xs = sorted.map((p) => periodToIndex(p.period));
  const ys = sorted.map((p) => p.avgPricePerUnit);

  const { a, b, rSquared } = linearRegression(xs, ys);
  const sigma = residualStdDev(xs, ys, a, b);

  // 95%信頼区間のt値近似（自由度 n-2、大標本では ~1.96）
  const tValue = sorted.length >= 30 ? 1.96 : 2.0;

  // 最終四半期の翌四半期から予測
  const lastIdx = xs[xs.length - 1]!;
  const forecast: ForecastPoint[] = [];

  for (let i = 1; i <= quarters; i++) {
    const idx = lastIdx + i;
    const predicted = Math.max(0, a + b * idx);
    const margin = tValue * sigma;
    forecast.push({
      period: indexToPeriod(idx),
      predicted: Math.round(predicted * 10) / 10,
      lower: Math.max(0, Math.round((predicted - margin) * 10) / 10),
      upper: Math.round((predicted + margin) * 10) / 10,
      isForcast: true,
    });
  }

  // 年率換算: 1四半期あたりの変化率 × 4
  const lastActual = ys[ys.length - 1]!;
  const annualGrowthRate = lastActual > 0
    ? Math.round((b * 4 / lastActual) * 1000) / 10
    : 0;

  const confidenceNote =
    rSquared >= 0.7
      ? `高信頼度（R²=${rSquared.toFixed(2)}）: データに強いトレンドが見られます`
      : rSquared >= 0.4
      ? `中程度の信頼度（R²=${rSquared.toFixed(2)}）: 参考値としてお使いください`
      : `低信頼度（R²=${rSquared.toFixed(2)}）: データが不安定です。予測の信頼性が低い可能性があります`;

  return {
    historicalData: sorted,
    forecast,
    annualGrowthRate,
    rSquared: Math.round(rSquared * 100) / 100,
    confidenceNote,
  };
}
