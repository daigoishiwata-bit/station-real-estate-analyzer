import { NextRequest, NextResponse } from 'next/server';
import { invalidateWeeklyRealEstateCache } from '@/lib/cache';

/**
 * 週次キャッシュ更新エンドポイント
 *
 * Vercel Cron から毎週月曜 09:00 JST に呼び出される。
 * Authorization: Bearer <REVALIDATE_SECRET> ヘッダーで認証。
 *
 * GET /api/revalidate
 */
export async function GET(req: NextRequest) {
  // Vercel Cron は CRON_SECRET を自動付与、手動呼び出しは REVALIDATE_SECRET を使用
  const validSecrets = [
    process.env.CRON_SECRET,
    process.env.REVALIDATE_SECRET,
  ].filter(Boolean);

  if (validSecrets.length === 0) {
    return NextResponse.json(
      { error: 'No secret configured. Set REVALIDATE_SECRET or CRON_SECRET.' },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !validSecrets.includes(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    invalidateWeeklyRealEstateCache();

    return NextResponse.json({
      ok: true,
      message: '週次キャッシュを正常に無効化しました',
      revalidatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Revalidation failed', detail: message },
      { status: 500 },
    );
  }
}
