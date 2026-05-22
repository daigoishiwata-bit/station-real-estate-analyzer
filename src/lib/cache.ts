import { revalidateTag } from 'next/cache';
import {
  RateLimitError,
  StationData,
  RealEstateDataRow,
  NewsItem,
  StationAnalysisData,
} from '@/types/data';
import { PREF_CODES, type PrefCode } from '@/lib/real-estate-api';

// =========================================
// ユーティリティ
// =========================================

/** cacheTag・revalidateTag に渡す文字列を URL 安全にする */
export function safeTag(value: string): string {
  return value.replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龠]/g, '_');
}

// =========================================
// キャッシュタグ定数（全 API ファイルで共有）
// =========================================

export const CACHE_TAGS = {
  stationList: 'station-list',
  newsLatest: 'news-real-estate-latest',
  stationNews: (name: string) => `news-station-${safeTag(name)}`,
  areaNews: (keywords: string[]) =>
    `news-area-${keywords.map(safeTag).join('_').slice(0, 64)}`,
  realEstate: (
    prefCode: number,
    year: number,
    quarter: number,
    cls: string,
  ) => `real-estate-${prefCode}-${year}-Q${quarter}-${cls}`,
} as const;

// =========================================
// 個別無効化
// =========================================

/** 駅名に紐づくニュースキャッシュを無効化する */
export function invalidateStationNews(stationName: string): void {
  revalidateTag(CACHE_TAGS.stationNews(stationName), 'max');
}

/** 駅リストキャッシュを無効化する */
export function invalidateStationList(): void {
  revalidateTag(CACHE_TAGS.stationList, 'max');
}

/** 最新不動産ニュースキャッシュを無効化する */
export function invalidateLatestNews(): void {
  revalidateTag(CACHE_TAGS.newsLatest, 'max');
}

/** 指定四半期の不動産データキャッシュを無効化する */
export function invalidateRealEstateQuarter(
  prefCode: PrefCode,
  year: number,
  quarter: 1 | 2 | 3 | 4,
): void {
  for (const cls of ['03', '07'] as const) {
    revalidateTag(CACHE_TAGS.realEstate(prefCode, year, quarter, cls), 'max');
  }
}

// =========================================
// 週次一括無効化
// =========================================

/**
 * 全都道府県・当該四半期の不動産データを無効化する
 * Vercel Cron Job や手動 API から週1回呼び出す
 */
export function invalidateWeeklyRealEstateCache(): void {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = (Math.ceil((now.getMonth() + 1) / 3)) as 1 | 2 | 3 | 4;

  for (const prefCode of Object.values(PREF_CODES) as PrefCode[]) {
    invalidateRealEstateQuarter(prefCode, year, quarter);
    // 前四半期も合わせて更新（API の公開タイミングのズレに対応）
    const prevQuarter = quarter === 1 ? 4 : (quarter - 1) as 1 | 2 | 3 | 4;
    const prevYear = quarter === 1 ? year - 1 : year;
    invalidateRealEstateQuarter(prefCode, prevYear, prevQuarter);
  }

  invalidateLatestNews();
}

// =========================================
// レート制限リトライ
// =========================================

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * RateLimitError に対応したリトライラッパー
 *
 * @param fn        実行する非同期関数
 * @param maxRetries 最大リトライ回数（デフォルト 3）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof RateLimitError) {
        await sleep(err.retryAfterSeconds * 1000);
      } else if (attempt < maxRetries) {
        await sleep(1000 * 2 ** attempt); // 指数バックオフ: 1s, 2s, 4s
      }
    }
  }

  throw lastError;
}

// =========================================
// データ正規化・統合（StationAnalysisData 組み立て）
// =========================================

/** "2023年第1四半期" → ソート可能な数値に変換 */
function periodToSortKey(period: string): number {
  const m = period.match(/(\d{4})年第(\d)四半期/);
  if (!m) return 0;
  return parseInt(m[1]!) * 10 + parseInt(m[2]!);
}

/**
 * 価格上昇率（%）を計算する
 * 直近4四半期の平均坪単価 vs 2年前の4四半期の平均坪単価
 */
function calcPriceGrowthRate(rows: RealEstateDataRow[]): number | undefined {
  const validRows = rows.filter((r) => r.pricePerUnit > 0);
  if (validRows.length < 4) return undefined;

  // 期間ごとに平均坪単価を集計
  const byPeriod = new Map<string, number[]>();
  for (const r of validRows) {
    const arr = byPeriod.get(r.period) ?? [];
    arr.push(r.pricePerUnit);
    byPeriod.set(r.period, arr);
  }

  const periods = Array.from(byPeriod.keys()).sort(
    (a, b) => periodToSortKey(a) - periodToSortKey(b),
  );

  if (periods.length < 8) return undefined;

  const avg = (keys: string[]) => {
    const vals = keys.flatMap((k) => byPeriod.get(k) ?? []);
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  const recentPeriods = periods.slice(-4);
  const oldPeriods = periods.slice(-8, -4);

  const recentAvg = avg(recentPeriods);
  const oldAvg = avg(oldPeriods);

  if (oldAvg === 0) return undefined;
  return Math.round(((recentAvg - oldAvg) / oldAvg) * 1000) / 10; // 小数第1位
}

/**
 * 各 API からのデータを統合して StationAnalysisData を生成する
 *
 * @param station           駅情報（station-data.ts より）
 * @param realEstateHistory 不動産履歴（real-estate-api.ts より）
 * @param newsItems         周辺ニュース（news-api.ts より）
 * @param isCached          キャッシュから返したデータかどうか
 */
export function assembleStationAnalysis(
  station: StationData,
  realEstateHistory: RealEstateDataRow[],
  newsItems: NewsItem[],
  isCached = true,
): StationAnalysisData {
  const priceGrowthRate = calcPriceGrowthRate(realEstateHistory);

  return {
    station,
    realEstateHistory,
    newsItems,
    metadata: {
      fetchedAt: new Date(),
      priceGrowthRate,
      isCached,
    },
  };
}
