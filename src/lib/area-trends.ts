import { cacheLife } from 'next/cache';
import { fetchRealEstateHistory, PREF_CODES, type PrefCode } from './real-estate-api';

// MLIT データが安定して公開されている5年分
const CHART_YEARS = [2020, 2021, 2022, 2023, 2024] as const;
const START_YEAR = CHART_YEARS[0];
const END_YEAR   = CHART_YEARS[CHART_YEARS.length - 1];

interface CandidateArea {
  label: string;
  prefCode: PrefCode;
  cityCode: string;
}

// 首都圏の主要駅エリア（代表駅名 → 対応する市区町村コードで MLIT データを取得）
const CANDIDATE_AREAS: CandidateArea[] = [
  // 東京
  { label: '虎ノ門',           prefCode: PREF_CODES.TOKYO,    cityCode: '13103' }, // 港区
  { label: '渋谷',             prefCode: PREF_CODES.TOKYO,    cityCode: '13113' }, // 渋谷区
  { label: '豊洲',             prefCode: PREF_CODES.TOKYO,    cityCode: '13108' }, // 江東区
  { label: '新宿',             prefCode: PREF_CODES.TOKYO,    cityCode: '13104' }, // 新宿区
  { label: '品川',             prefCode: PREF_CODES.TOKYO,    cityCode: '13109' }, // 品川区
  { label: '池袋',             prefCode: PREF_CODES.TOKYO,    cityCode: '13116' }, // 豊島区
  { label: '上野',             prefCode: PREF_CODES.TOKYO,    cityCode: '13106' }, // 台東区
  { label: '青砥',             prefCode: PREF_CODES.TOKYO,    cityCode: '13122' }, // 葛飾区
  // 神奈川
  { label: '武蔵小杉',         prefCode: PREF_CODES.KANAGAWA, cityCode: '14131' }, // 川崎市中原区
  { label: '日吉・綱島',       prefCode: PREF_CODES.KANAGAWA, cityCode: '14108' }, // 横浜市港北区
  { label: '横浜',             prefCode: PREF_CODES.KANAGAWA, cityCode: '14103' }, // 横浜市西区
  { label: '海老名',           prefCode: PREF_CODES.KANAGAWA, cityCode: '14213' }, // 海老名市
  // 埼玉
  { label: '浦和',             prefCode: PREF_CODES.SAITAMA,  cityCode: '11103' }, // さいたま市浦和区
  { label: '大宮',             prefCode: PREF_CODES.SAITAMA,  cityCode: '11101' }, // さいたま市大宮区
  { label: '春日部',           prefCode: PREF_CODES.SAITAMA,  cityCode: '11213' }, // 春日部市
  { label: '八潮',             prefCode: PREF_CODES.SAITAMA,  cityCode: '11239' }, // 八潮市
  // 千葉
  { label: '流山おおたかの森', prefCode: PREF_CODES.CHIBA,    cityCode: '12228' }, // 流山市
  { label: '本八幡',           prefCode: PREF_CODES.CHIBA,    cityCode: '12203' }, // 市川市
  { label: '柏',               prefCode: PREF_CODES.CHIBA,    cityCode: '12217' }, // 柏市
  { label: '千葉',             prefCode: PREF_CODES.CHIBA,    cityCode: '12101' }, // 千葉市中央区
];

function periodToYear(period: string): number {
  const m = period.match(/^(\d{4})年/);
  return m ? parseInt(m[1]!, 10) : 0;
}

function computeYearlyAvgs(
  history: Awaited<ReturnType<typeof fetchRealEstateHistory>>,
): Record<number, number> {
  const byYear = new Map<number, number[]>();
  for (const row of history) {
    if (row.pricePerUnit <= 0) continue;
    const year = periodToYear(row.period);
    if (!(CHART_YEARS as ReadonlyArray<number>).includes(year)) continue;
    const arr = byYear.get(year) ?? [];
    arr.push(row.pricePerUnit);
    byYear.set(year, arr);
  }
  const result: Record<number, number> = {};
  for (const year of CHART_YEARS) {
    const vals = byYear.get(year);
    result[year] = vals && vals.length > 0
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
      : 0;
  }
  return result;
}

function computeTrend(avgs: Record<number, number>): number {
  const first = CHART_YEARS.find(y => (avgs[y] ?? 0) > 0);
  const last  = [...CHART_YEARS].reverse().find(y => (avgs[y] ?? 0) > 0);
  if (first === undefined || last === undefined || first === last) return 0;
  return ((avgs[last]! - avgs[first]!) / avgs[first]!);
}

// ===================================
// 公開型（棒グラフ用）
// ===================================

export interface AreaTrendBar {
  name: string;
  /** 5年間の変化率（例: 85.7 = +85.7%） */
  changeRate: number;
  /** 期間最初の平均坪単価（万円/坪） */
  startPrice: number;
  /** 期間最後の平均坪単価（万円/坪） */
  endPrice: number;
}

export async function fetchAreaTrends(): Promise<{
  rising: AreaTrendBar[];
  declining: AreaTrendBar[];
}> {
  'use cache';
  cacheLife('weeks');

  const results = await Promise.all(
    CANDIDATE_AREAS.map(async (area) => {
      try {
        const history = await fetchRealEstateHistory(
          area.prefCode,
          START_YEAR,
          END_YEAR,
          area.cityCode,
        );
        const yearlyAvgs = computeYearlyAvgs(history);
        const hasData = CHART_YEARS.some(y => (yearlyAvgs[y] ?? 0) > 0);
        if (!hasData) return null;

        const trend = computeTrend(yearlyAvgs);
        const first = CHART_YEARS.find(y => (yearlyAvgs[y] ?? 0) > 0);
        const last  = [...CHART_YEARS].reverse().find(y => (yearlyAvgs[y] ?? 0) > 0);

        return {
          label:      area.label,
          trend,
          startPrice: first !== undefined ? (yearlyAvgs[first] ?? 0) : 0,
          endPrice:   last  !== undefined ? (yearlyAvgs[last]  ?? 0) : 0,
        };
      } catch {
        return null;
      }
    }),
  );

  const valid  = results.filter((r): r is NonNullable<typeof r> => r !== null);
  const sorted = [...valid].sort((a, b) => b.trend - a.trend);

  const toBar = (items: typeof valid): AreaTrendBar[] =>
    items.map((item) => ({
      name:       item.label,
      changeRate: Math.round(item.trend * 1000) / 10,   // 小数第1位まで
      startPrice: item.startPrice,
      endPrice:   item.endPrice,
    }));

  return {
    rising:   toBar(sorted.slice(0, 5)),
    declining: toBar([...sorted].slice(-5).reverse()),
  };
}
