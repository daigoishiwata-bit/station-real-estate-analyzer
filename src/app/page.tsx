import { Suspense } from 'react';
import SearchTabs from '@/components/SearchTabs';
import AIChatWrapper from '@/components/AIChatWrapper';
import FeaturedStations from '@/components/FeaturedStations';
import { fetchLatestRealEstateNews, fetchNewMansionListings } from '@/lib/news-api';

const POPULAR_STATIONS = [
  { id: 'N02-007510', name: '吉祥寺' },
  { id: 'N02-006056', name: '武蔵小杉' },
  { id: 'N02-006017', name: '二子玉川' },
  { id: 'N02-006821', name: '大宮' },
  { id: 'N02-002948', name: '流山おおたかの森' },
  { id: 'N02-007378', name: '本八幡' },
];

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1">

      {/* ヘッダー */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)', fontSize: '1.25rem' }}>◆</span>
          <span className="font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            すまいコンパス
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
        >
          住宅購入サポート
        </span>
      </header>

      {/* ===== AIチャット ヒーローセクション ===== */}
      <section className="px-6 pt-10 pb-6 max-w-3xl mx-auto w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            具体的な物件の相談、できます。
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            価格・エリア・ローン・比較など、住宅購入の疑問をAIに直接聞いてください。
            国土交通省の取引データをもとに、相場感を踏まえて回答します。
          </p>
        </div>
        <AIChatWrapper />
      </section>

      {/* ===== サブコンテンツ ===== */}
      <div className="max-w-5xl mx-auto w-full px-6 space-y-10 pb-14">

        {/* 駅検索 */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                駅・路線から相場を調べる
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              エリア（市区町村）単位の取引データ・周辺ニュースを確認
            </p>
          </div>
          <div className="max-w-xl">
            <SearchTabs />
            <div className="mt-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>よく検索される駅</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_STATIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`/station/${s.id}`}
                    className="station-chip text-sm px-3 py-1.5 rounded-full"
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 注目駅ピックアップ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                値上がり注目エリア
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              再開発・新線・人口増など値上がり根拠が明確な駅をピックアップ
            </p>
          </div>
          <FeaturedStations />
        </section>

        {/* 新築マンション情報 */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                新築マンション情報
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              首都圏 販売中・抽選受付中・分譲予定物件
            </p>
          </div>
          <Suspense fallback={<MansionSkeleton />}>
            <NewMansionSection />
          </Suspense>
        </section>

        {/* 最新ニュース */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                首都圏 不動産最新ニュース
              </h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Google 検索による最新情報
            </p>
          </div>
          <Suspense fallback={<NewsSkeleton />}>
            <LatestNewsSection />
          </Suspense>
        </section>

      </div>

      {/* フッター */}
      <footer
        className="px-6 py-4 text-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        すまいコンパス　|　データソース: 国土交通省 不動産情報ライブラリ・国土数値情報　|　本サービスの情報は参考目的です。最終判断は不動産業者・FPにご相談ください。
      </footer>
    </main>
  );
}

// ====================================================================
// 新築マンション情報セクション
// ====================================================================

const SUUMO_TOP = 'https://suumo.jp/ms/shinchiku/';

async function NewMansionSection() {
  const listings = await fetchNewMansionListings(6);

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          新築マンション情報を取得できませんでした。
        </p>
        <a
          href={SUUMO_TOP}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-4 py-2 rounded-lg font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          SUUMOで新築マンションを探す →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {listings.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-card-link flex flex-col"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                style={{
                  background: 'rgba(168,118,48,0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(168,118,48,0.3)',
                }}
              >
                新築
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {item.source}
              </span>
            </div>
            <p className="text-sm font-medium line-clamp-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs mt-auto" style={{ color: 'var(--text-muted)' }}>
              <span>
                {new Intl.DateTimeFormat('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                }).format(item.publishedAt)}
              </span>
            </div>
          </a>
        ))}
      </div>
      <div className="flex justify-center">
        <a
          href={SUUMO_TOP}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          SUUMOで詳細を見る →
        </a>
      </div>
    </div>
  );
}

function MansionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 animate-pulse"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 110 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-10 rounded" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-muted)' }} />
          </div>
          <div className="h-3.5 rounded mb-2" style={{ background: 'var(--bg-muted)', width: '90%' }} />
          <div className="h-3.5 rounded mb-3" style={{ background: 'var(--bg-muted)', width: '70%' }} />
          <div className="h-3 rounded" style={{ background: 'var(--bg-muted)', width: '30%' }} />
        </div>
      ))}
    </div>
  );
}

// ====================================================================
// 最新ニュースセクション
// ====================================================================

async function LatestNewsSection() {
  const news = await fetchLatestRealEstateNews({ pageSize: 6 });

  if (news.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ニュースを取得できませんでした。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {news.map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-card-link"
        >
          <p className="text-sm font-medium line-clamp-2 mb-2" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs mt-auto" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{item.source}</span>
            <span>·</span>
            <span>
              {new Intl.DateTimeFormat('ja-JP', {
                month: 'short',
                day: 'numeric',
              }).format(item.publishedAt)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 animate-pulse"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 100 }}
        >
          <div className="h-3.5 rounded mb-2" style={{ background: 'var(--bg-muted)', width: '90%' }} />
          <div className="h-3.5 rounded mb-3" style={{ background: 'var(--bg-muted)', width: '70%' }} />
          <div className="h-3 rounded" style={{ background: 'var(--bg-muted)', width: '40%' }} />
        </div>
      ))}
    </div>
  );
}
