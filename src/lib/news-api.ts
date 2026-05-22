import { cacheLife, cacheTag } from 'next/cache';
import { NewsItem, ApiError, RateLimitError } from '@/types/data';
import { safeTag } from '@/lib/cache';


// =========================================
// Google Custom Search API（主要ニュースソース）
// =========================================

const GOOGLE_CSE_API = 'https://www.googleapis.com/customsearch/v1';

interface GoogleCSEItem {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{ 'article:published_time'?: string }>;
    newsarticle?: Array<{ datepublished?: string }>;
  };
}

interface GoogleCSEResponse {
  items?: GoogleCSEItem[];
  error?: { message: string };
}

function transformCSEItem(item: GoogleCSEItem): NewsItem {
  const metaDate =
    item.pagemap?.metatags?.[0]?.['article:published_time'] ??
    item.pagemap?.newsarticle?.[0]?.datepublished;
  return {
    title: item.title.replace(/\s*[-|｜].*$/, '').trim() || item.title,
    url: item.link,
    description: item.snippet || undefined,
    publishedAt: metaDate ? new Date(metaDate) : new Date(),
    source: item.displayLink,
  };
}

async function fetchGoogleCSE(query: string, count = 10): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return [];

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(count, 10)),
    lr: 'lang_ja',
    gl: 'jp',
    sort: 'date',
  });

  try {
    const res = await fetch(`${GOOGLE_CSE_API}?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as GoogleCSEResponse;
    return (json.items ?? []).map(transformCSEItem);
  } catch {
    return [];
  }
}

// =========================================
// Google News RSS（CSE のフォールバック）
// =========================================

const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

function extractTagContent(xml: string, tag: string): string {
  // CDATA あり: <tag><![CDATA[...]]></tag>
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata) return cdata[1]!.trim();
  // プレーンテキスト: <tag>...</tag>
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return plain ? plain[1]!.trim() : '';
}

function parseGoogleNewsRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const rawTitle = extractTagContent(block, 'title');
    const link     = extractTagContent(block, 'link');
    const pubDate  = extractTagContent(block, 'pubDate');
    const sourceName = extractTagContent(block, 'source');
    const description = extractTagContent(block, 'description');

    // Google News タイトルは "記事名 - 媒体名" 形式のため末尾の媒体名を除去
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim() || rawTitle;

    if (!title || !link) continue;

    items.push({
      title,
      url: link,
      publishedAt: pubDate ? new Date(pubDate) : new Date(),
      source: sourceName || 'Google ニュース',
      description: description || undefined,
    });
  }

  return items;
}

async function fetchGoogleNewsRSS(query: string): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    q: query,
    hl: 'ja',
    gl: 'JP',
    ceid: 'JP:ja',
  });

  try {
    const res = await fetch(`${GOOGLE_NEWS_RSS}?${params}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRSS(xml);
  } catch {
    return [];
  }
}

// =========================================
// 公開 API
// =========================================

export interface StationNewsOptions {
  /** 取得件数（最大 100、デフォルト 20） */
  pageSize?: number;
  /** 何日前までのニュースを取得するか（デフォルト 30） */
  daysBack?: number;
  /** ソート順（デフォルト publishedAt） */
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
}

/**
 * 駅周辺の不動産・開発関連ニュースを取得する
 * Google Custom Search API を優先し、失敗時は Google News RSS にフォールバック
 *
 * @param stationName 駅名（例: "渋谷"）
 */
export async function fetchStationNews(
  stationName: string,
  options: StationNewsOptions = {},
): Promise<NewsItem[]> {
  'use cache';
  cacheLife('days');
  cacheTag(`news-station-${safeTag(stationName)}`);

  const { pageSize = 10 } = options;
  const query = `${stationName}駅 再開発 OR 不動産 OR マンション OR 開発計画`;

  let articles = await fetchGoogleCSE(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(query);
  }

  return articles.slice(0, pageSize);
}

/**
 * エリア名・複数キーワードで広域の不動産ニュースを取得する
 *
 * @param keywords 検索キーワード配列（例: ["渋谷区", "港区"]）
 */
export async function fetchAreaNews(
  keywords: string[],
  options: StationNewsOptions = {},
): Promise<NewsItem[]> {
  'use cache';
  cacheLife('days');
  cacheTag(`news-area-${keywords.map(safeTag).join('_').slice(0, 64)}`);

  if (keywords.length === 0) return [];

  const { pageSize = 10 } = options;
  const query = `${keywords.join(' OR ')} 不動産 OR 再開発`;

  let articles = await fetchGoogleCSE(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(query);
  }

  return articles.slice(0, pageSize);
}

/**
 * 首都圏の新築マンション情報を Google CSE で取得する
 */
export async function fetchNewMansionListings(pageSize = 6): Promise<NewsItem[]> {
  'use cache';
  cacheLife('days');
  cacheTag('new-mansion-listings');

  const query = '首都圏 新築マンション 販売中 OR 抽選 OR 分譲予定 2026';
  let articles = await fetchGoogleCSE(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(query);
  }
  return articles.slice(0, pageSize);
}

/**
 * 直近の不動産市場全般のニュースを取得する
 */
export async function fetchLatestRealEstateNews(
  options: Pick<StationNewsOptions, 'pageSize' | 'daysBack'> = {},
): Promise<NewsItem[]> {
  'use cache';
  cacheLife('days');
  cacheTag('news-real-estate-latest');

  const { pageSize = 10 } = options;
  const query = '首都圏 マンション 住宅購入 不動産 再開発 OR 値上がり OR 新線';

  let articles = await fetchGoogleCSE(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(query);
  }

  return articles.slice(0, pageSize);
}

/**
 * 駅エリアの新築マンション情報を検索する（SUUMO / HOMES 等を含む）
 *
 * @param stationName 駅名（例: "渋谷"）
 */
export async function fetchStationMansionSearch(
  stationName: string,
  pageSize = 7,
): Promise<NewsItem[]> {
  'use cache';
  cacheLife('days');
  cacheTag(`mansion-station-${safeTag(stationName)}`);

  const query = `${stationName}駅 新築マンション 価格 SUUMO OR HOMES OR マンションコミュニティ`;
  let articles = await fetchGoogleCSE(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(`${stationName}駅 新築マンション 価格`);
  }
  return articles.slice(0, pageSize);
}
