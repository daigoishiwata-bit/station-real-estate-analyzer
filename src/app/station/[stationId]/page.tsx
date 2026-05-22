import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { findStationById, findRelatedLines, getMunicipalityCode } from '@/lib/station-data';
import { fetchRealEstateHistory, extractNewBuildings, PREF_CODES } from '@/lib/real-estate-api';
import { fetchStationNews } from '@/lib/news-api';
import { assembleStationAnalysis } from '@/lib/cache';
import { analyzeStationWithAI } from '@/lib/ai-analysis';
import type { StationData, NewsItem, RealEstateDataRow } from '@/types/data';
import NewsCard from '@/components/NewsCard';
import AIInsightCard from '@/components/AIInsightCard';
import PriceSimulator from '@/components/PriceSimulator';

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = CURRENT_YEAR - 2; // 直近2年（約16回のAPI呼び出し）

function computeMedianPriceTsubo(history: RealEstateDataRow[]): number | undefined {
  const withPpu = history.filter((r) => r.pricePerUnit > 0);

  // マンション系のみ・築2000年以降に限定（古い郊外物件が中央値を下げるため）
  // APIは取引種別を'中古マンション等'という日本語文字列で返す
  const condoPrices = withPpu
    .filter((r) => r.tradeType === '中古マンション等' && r.buildingYear >= 2000)
    .map((r) => r.pricePerUnit)
    .sort((a, b) => a - b);

  // データが少ない場合は築年数フィルターを外してフォールバック
  const prices = condoPrices.length >= 3
    ? condoPrices
    : withPpu.filter((r) => r.tradeType === '中古マンション等').map((r) => r.pricePerUnit).sort((a, b) => a - b);

  if (prices.length === 0) {
    const fallback = withPpu.map((r) => r.pricePerUnit).sort((a, b) => a - b);
    if (fallback.length === 0) return undefined;
    return fallback[Math.floor(fallback.length * 0.75)]!;
  }

  // 75パーセンタイルを使用（市区町村全体より駅近エリアは高値帯に集中するため）
  return prices[Math.floor(prices.length * 0.75)]!;
}

const PREF_NAMES: Record<number, string> = {
  [PREF_CODES.TOKYO]: '東京',
  [PREF_CODES.KANAGAWA]: '神奈川',
  [PREF_CODES.CHIBA]: '千葉',
  [PREF_CODES.SAITAMA]: '埼玉',
};

// ====================================================================
// AI分析セクション（独立した Suspense 境界で遅延ストリーミング）
// ====================================================================

async function AIInsightSection({
  station,
  news,
  relatedLines,
}: {
  station: StationData;
  news: NewsItem[];
  relatedLines: string[];
}) {
  const aiAnalysis = await analyzeStationWithAI(station, null, news, relatedLines);

  if (!aiAnalysis) {
    return (
      <div
        className="rounded-xl p-5 h-full flex items-center justify-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          AI分析には{' '}
          <code style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>ANTHROPIC_API_KEY</code>{' '}
          が必要です
        </p>
      </div>
    );
  }

  return <AIInsightCard analysis={aiAnalysis} />;
}

// ====================================================================
// 駅メインコンテンツ
// ====================================================================

async function StationBaseSection({ stationId }: { stationId: string }) {
  const station = await findStationById(stationId);
  if (!station) notFound();

  const [relatedLines, muniInfo] = await Promise.all([
    findRelatedLines(station),
    getMunicipalityCode(station.latitude, station.longitude),
  ]);

  let history: Awaited<ReturnType<typeof fetchRealEstateHistory>> = [];
  let news: Awaited<ReturnType<typeof fetchStationNews>> = [];

  const prefCode = station.prefCode as (typeof PREF_CODES)[keyof typeof PREF_CODES];

  const [historyResult, newsResult] = await Promise.allSettled([
    fetchRealEstateHistory(prefCode, START_YEAR, CURRENT_YEAR, muniInfo?.code),
    fetchStationNews(station.stationName),
  ]);

  if (historyResult.status === 'fulfilled') history = historyResult.value;
  if (newsResult.status === 'fulfilled') news = newsResult.value;

  const analysis = assembleStationAnalysis(station, history, news);
  const basePricePerTsubo = computeMedianPriceTsubo(history);

  return (
    <>
      {/* 駅ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            {station.stationName}
            <span className="text-lg font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>駅</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {relatedLines.length <= 3
              ? relatedLines.join('・')
              : `${relatedLines.slice(0, 2).join('・')} ほか${relatedLines.length - 2}路線`}
            　·　{PREF_NAMES[station.prefCode] ?? ''}
          </p>
        </div>
        {analysis.metadata.priceGrowthRate !== undefined && (
          <div
            className="rounded-xl px-4 py-3 text-right shrink-0"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>直近2年 坪単価変化率</p>
            <p
              className="text-2xl font-bold"
              style={{ color: analysis.metadata.priceGrowthRate >= 0 ? '#16a34a' : '#ef4444' }}
            >
              {analysis.metadata.priceGrowthRate >= 0 ? '+' : ''}
              {analysis.metadata.priceGrowthRate}%
            </p>
          </div>
        )}
      </div>

      {/* 物件価格シミュレーター */}
      {basePricePerTsubo !== undefined && (
        <div className="mb-8">
          <PriceSimulator
            stationName={station.stationName}
            basePricePerTsubo={basePricePerTsubo}
          />
        </div>
      )}

      {/* ニュース + AI分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 周辺開発ニュース（2/3） */}
        <section className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            周辺開発ニュース
          </h2>
          {analysis.newsItems.length === 0 ? (
            <p className="text-sm rounded-xl p-4" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)',
            }}>
              ニュースが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analysis.newsItems.slice(0, 6).map((item, i) => (
                <NewsCard key={i} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* AI分析（1/3）— 別 Suspense でストリーミング */}
        <section>
          <Suspense fallback={<AIInsightSkeleton />}>
            <AIInsightSection
              station={station}
              news={news}
              relatedLines={relatedLines}
            />
          </Suspense>
        </section>

      </div>

      {/* 新築・築浅 取引実績（国土交通省データ） */}
      <div className="mt-8">
        <div className="flex items-baseline gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--accent)' }}>◆</span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              近隣の新築・築浅 取引実績
            </h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            築2年以内・国土交通省 不動産情報ライブラリより
          </p>
        </div>
        <NewBuildingSection history={history} municipality={station.municipality} />
      </div>
    </>
  );
}

// ====================================================================
// 新築・築浅 取引実績セクション（国土交通省データ）
// ====================================================================

function NewBuildingSection({
  history,
  municipality,
}: {
  history: RealEstateDataRow[];
  municipality: string;
}) {
  const newBuildings = extractNewBuildings(history, 2).slice(0, 6);
  const suumoUrl = `https://suumo.jp/ms/shinchiku/`;

  if (newBuildings.length === 0) {
    return (
      <div className="space-y-3">
        <p
          className="text-sm rounded-xl p-4"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          {municipality}エリアの直近2年間に新築・築浅の取引データは見つかりませんでした。
        </p>
        <div className="flex justify-center">
          <a
            href={suumoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-5 py-2.5 rounded-lg font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            SUUMOで新築マンションを探す →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {newBuildings.map((item, i) => (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* バッジ */}
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: 'rgba(168,118,48,0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(168,118,48,0.3)',
                }}
              >
                {new Date().getFullYear() - item.buildingYear === 0
                  ? '新築'
                  : `築${new Date().getFullYear() - item.buildingYear}年`}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.municipality}
              </span>
            </div>

            {/* 取引価格 */}
            <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
              {item.tradePrice >= 10000
                ? `${(item.tradePrice / 10000).toFixed(2)}億円`
                : `${Math.round(item.tradePrice).toLocaleString()}万円`}
            </p>

            {/* スペック */}
            <div className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
              <p>専有面積: <span className="font-medium">{item.area}㎡</span></p>
              {item.pricePerUnit > 0 && (
                <p>坪単価: <span className="font-medium">{Math.round(item.pricePerUnit)}万円/坪</span></p>
              )}
              {item.structure && (
                <p>構造: {item.structure}</p>
              )}
              <p>建築年: {item.buildingYear}年</p>
              <p>取引時点: {item.period}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs mb-4 text-center" style={{ color: 'var(--text-muted)' }}>
        ※ 国土交通省 不動産情報ライブラリの実際の取引データをもとにした情報です。個別物件の特定はできません。
      </p>

      <div className="flex justify-center">
        <a
          href={suumoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          SUUMOで新築マンションを探す →
        </a>
      </div>
    </div>
  );
}

// ====================================================================
// ページルート
// ====================================================================

async function StationPageContent({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  return <StationBaseSection stationId={stationId} />;
}

export default function StationPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <a
          href="/"
          className="flex items-center gap-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← 検索に戻る
        </a>
        <span style={{ color: 'var(--border)' }}>|</span>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            すまいコンパス
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Suspense fallback={<StationPageSkeleton />}>
          <StationPageContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

// ====================================================================
// スケルトン UI
// ====================================================================

function StationPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 駅ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-40 rounded-lg mb-2" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-4 w-56 rounded" style={{ background: 'var(--bg-muted)' }} />
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--bg-muted)' }} />
          <div className="h-7 w-20 rounded" style={{ background: 'var(--bg-muted)' }} />
        </div>
      </div>

      {/* ニュース + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-4 w-24 rounded col-span-full" style={{ background: 'var(--bg-muted)' }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
          ))}
        </div>
        <AIInsightSkeleton />
      </div>
    </div>
  );
}

function AIInsightSkeleton() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 240 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 rounded-full" style={{ background: 'var(--bg-muted)' }} />
        <div className="h-4 w-28 rounded" style={{ background: 'var(--bg-muted)' }} />
      </div>
      <div className="space-y-2.5">
        {[100, 85, 95, 70, 90].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ background: 'var(--bg-muted)', width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {[80, 90, 65].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ background: 'var(--bg-muted)', width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: 'var(--accent)', opacity: 0.4 }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI分析中...</span>
      </div>
    </div>
  );
}
