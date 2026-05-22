import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CSE_API = 'https://www.googleapis.com/customsearch/v1';
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  description?: string;
}

// ── Google Custom Search API ──────────────────────────────
async function fetchCSE(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey, cx, q: query, num: '5', lr: 'lang_ja', gl: 'jp', sort: 'date',
    });
    const res = await fetch(`${GOOGLE_CSE_API}?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { items?: Array<{
      title: string; link: string; displayLink: string; snippet: string;
      pagemap?: { metatags?: Array<{ 'article:published_time'?: string }> };
    }> };
    return (json.items ?? []).map((item) => ({
      title: item.title.replace(/\s*[-|｜].*$/, '').trim() || item.title,
      url: item.link,
      publishedAt: item.pagemap?.metatags?.[0]?.['article:published_time'] ?? new Date().toISOString(),
      source: item.displayLink,
      description: item.snippet || undefined,
    }));
  } catch {
    return [];
  }
}

// ── Google News RSS（フォールバック）────────────────────────
function extractTagContent(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata) return cdata[1]!.trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return plain ? plain[1]!.trim() : '';
}

async function fetchRSS(query: string): Promise<NewsItem[]> {
  try {
    const params = new URLSearchParams({ q: query, hl: 'ja', gl: 'JP', ceid: 'JP:ja' });
    const res = await fetch(`${GOOGLE_NEWS_RSS}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
    for (const block of blocks) {
      const rawTitle = extractTagContent(block, 'title');
      const link = extractTagContent(block, 'link');
      const pubDate = extractTagContent(block, 'pubDate');
      const sourceName = extractTagContent(block, 'source');
      const desc = extractTagContent(block, 'description');
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim() || rawTitle;
      if (!title || !link) continue;
      items.push({
        title, url: link,
        publishedAt: pubDate || new Date().toISOString(),
        source: sourceName || 'Google ニュース',
        description: desc || undefined,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json([]);

  let items = await fetchCSE(q);
  if (items.length === 0) {
    items = await fetchRSS(q);
  }

  return NextResponse.json(items.slice(0, 5), {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
