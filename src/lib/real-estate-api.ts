import { cacheLife, cacheTag } from 'next/cache';
import { RealEstateDataRow, ApiError, RateLimitError } from '@/types/data';

const API_BASE_URL = 'https://www.reinfolib.mlit.go.jp/ex-api/external';
const API_NAME = '不動産情報ライブラリ(XIT001)';

// =========================================
// 定数
// =========================================

export const PREF_CODES = {
  SAITAMA: 11,
  CHIBA: 12,
  TOKYO: 13,
  KANAGAWA: 14,
} as const;

export type PrefCode = (typeof PREF_CODES)[keyof typeof PREF_CODES];

export const TARGET_PREF_CODES: PrefCode[] = [
  PREF_CODES.SAITAMA,
  PREF_CODES.CHIBA,
  PREF_CODES.TOKYO,
  PREF_CODES.KANAGAWA,
];

// 取引種別コード（XIT001 仕様: 有効コードは 01, 02 のみ）
const PRICE_CLASSIFICATION = {
  RESIDENTIAL_WITH_BUILDING: '01', // 宅地（土地と建物）
  USED_CONDO: '02',                // 中古マンション等
} as const;

// =========================================
// 生 API レスポンス型（XIT001 フィールド定義）
// =========================================

interface RawTradeRecord {
  Type: string;
  MunicipalityCode: string;
  Prefecture: string;
  Municipality: string;
  DistrictName?: string;
  TradePrice: string;
  PricePerUnit?: string; // 坪単価（円/坪）※宅地系のみ
  Area?: string;          // 専有面積/土地面積（㎡）
  UnitPrice?: string;
  TotalFloorArea?: string;
  BuildingYear?: string;
  Structure?: string;
  Period: string;
  Remarks?: string;
}

interface RawXIT001Response {
  status: string;
  data: RawTradeRecord[];
}

// =========================================
// 変換ユーティリティ
// =========================================

function toNumber(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[,，]/g, '').replace(/[^0-9.]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
}

// "昭和45年" / "平成20年" / "令和3年" → 西暦
function buildingYearToAD(raw?: string): number {
  if (!raw) return 0;
  if (/^\d{4}/.test(raw)) return parseInt(raw, 10);

  const ERA: Record<string, number> = {
    昭和: 1925,
    平成: 1988,
    令和: 2018,
  };
  for (const [era, base] of Object.entries(ERA)) {
    const m = raw.match(new RegExp(`${era}(\\d+)年`));
    if (m) return base + parseInt(m[1], 10);
  }
  return 0;
}

function transformRecord(raw: RawTradeRecord, prefCode: number): RealEstateDataRow {
  const rawPpu = toNumber(raw.PricePerUnit);
  const tradePriceMan = toNumber(raw.TradePrice) / 10000;
  const areaSqm = toNumber(raw.Area);
  let pricePerUnit = 0;
  if (rawPpu > 0) {
    pricePerUnit = (rawPpu * 3.3058) / 10000; // 円/㎡ → 万円/坪
  } else if (tradePriceMan > 0 && areaSqm > 0) {
    pricePerUnit = (tradePriceMan / areaSqm) * 3.3058; // 万円/㎡ → 万円/坪
  }

  return {
    prefCode,
    municipality: raw.Municipality,
    tradeType: raw.Type,
    tradePrice: tradePriceMan,
    pricePerUnit,
    area: areaSqm,
    buildingYear: buildingYearToAD(raw.BuildingYear),
    structure: raw.Structure ?? '',
    period: raw.Period,
    nearestStation: undefined,
    distanceToStation: undefined,
  };
}

// =========================================
// API クライアント
// =========================================

async function fetchQuarter(
  prefCode: number,
  year: number,
  quarter: 1 | 2 | 3 | 4,
  priceClassification: string,
  cityCode?: string,
): Promise<RealEstateDataRow[]> {
  'use cache';
  cacheLife('days');
  cacheTag(`real-estate-${prefCode}-${year}-Q${quarter}-${priceClassification}`);

  const apiKey = process.env.MLIT_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, API_NAME, 'MLIT_API_KEY が環境変数に設定されていません');
  }

  const params = new URLSearchParams({
    year: String(year),
    quarter: String(quarter),
    area: String(prefCode),
    priceClassification,
    ...(cityCode && { city: cityCode }),
    language: 'ja',
  });

  const response = await fetch(`${API_BASE_URL}/XIT001?${params}`, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    cache: 'no-store', // キャッシュは 'use cache' で管理
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
    throw new RateLimitError(API_NAME, retryAfter);
  }

  // 404 = その四半期のデータ未公開（未来の四半期など）— エラーではなく空データとして扱う
  if (response.status === 404) return [];

  if (!response.ok) {
    throw new ApiError(response.status, API_NAME, `${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as RawXIT001Response;
  if (!Array.isArray(json.data)) return [];

  return json.data.map((r) => transformRecord(r, prefCode));
}

// =========================================
// 並列実行ヘルパー（最大同時リクエスト数を制限）
// =========================================

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]!() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxConcurrent, tasks.length) }, worker),
  );
  return results;
}

// =========================================
// 公開 API
// =========================================

/**
 * 指定エリア・期間の不動産取引データを取得する（最大8並列で高速化）
 *
 * @param prefCode  都道府県コード（PREF_CODES から選択）
 * @param startYear 取得開始年
 * @param endYear   取得終了年（省略時は startYear と同年）
 * @param cityCode  市区町村コード（省略時は都道府県全体）
 */
export async function fetchRealEstateHistory(
  prefCode: PrefCode,
  startYear: number,
  endYear: number = startYear,
  cityCode?: string,
): Promise<RealEstateDataRow[]> {
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
  const quarters: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const classifications = [
    PRICE_CLASSIFICATION.RESIDENTIAL_WITH_BUILDING,
    PRICE_CLASSIFICATION.USED_CONDO,
  ];

  // 未来の四半期を除外したタスクリストを構築
  const tasks: (() => Promise<RealEstateDataRow[]>)[] = [];
  for (let year = startYear; year <= endYear; year++) {
    for (const quarter of quarters) {
      if (year === endYear && quarter > currentQuarter) continue;
      for (const cls of classifications) {
        const y = year;
        const q = quarter;
        const c = cls;
        tasks.push(() => fetchQuarter(prefCode, y, q, c, cityCode));
      }
    }
  }

  // 最大8並列で取得（レート制限を考慮しつつ順次フォールバック付き）
  const settled = await runWithConcurrency(tasks, 8);

  const results: RealEstateDataRow[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') results.push(...r.value);
  }
  return results;
}

/**
 * 新築・築浅（築 maxAgeYears 年以内）の取引データを抽出する
 *
 * @param rows       fetchRealEstateHistory の結果
 * @param maxAgeYears 最大築年数（デフォルト 2）
 */
export function extractNewBuildings(
  rows: RealEstateDataRow[],
  maxAgeYears = 2,
): RealEstateDataRow[] {
  const currentYear = new Date().getFullYear();
  return rows
    .filter(
      (r) =>
        r.buildingYear > 0 &&
        currentYear - r.buildingYear <= maxAgeYears &&
        r.tradePrice > 0 &&
        r.area > 0,
    )
    .sort((a, b) => {
      // 新しい順 → 取引価格降順
      if (b.buildingYear !== a.buildingYear) return b.buildingYear - a.buildingYear;
      return b.tradePrice - a.tradePrice;
    });
}

/**
 * 市区町村名で絞り込む（fetchRealEstateHistory の結果に対して適用）
 * XIT001 API は NearestStation を返さないため市区町村レベルで集計する
 */
export function filterByMunicipality(
  rows: RealEstateDataRow[],
  municipality: string,
): RealEstateDataRow[] {
  return rows.filter((r) => r.municipality === municipality);
}

/**
 * 期間ごとの平均坪単価を集計する
 * period（例: "2023年第1四半期"）をキーに平均値を返す
 */
export function aggregateByPeriod(
  rows: RealEstateDataRow[],
): { period: string; avgPricePerUnit: number; count: number }[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    if (row.pricePerUnit <= 0) continue;
    const entry = map.get(row.period) ?? { sum: 0, count: 0 };
    entry.sum += row.pricePerUnit;
    entry.count += 1;
    map.set(row.period, entry);
  }

  return Array.from(map.entries())
    .map(([period, { sum, count }]) => ({
      period,
      avgPricePerUnit: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
