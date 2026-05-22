import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { searchStations, METRO_PREF_CODES, formatOperatorName, formatLineName } from '@/lib/station-data';
import type { StationData } from '@/types/data';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const operator = req.nextUrl.searchParams.get('operator')?.trim() ?? '';
  const line = req.nextUrl.searchParams.get('line')?.trim() ?? '';

  try {
    // 路線ブラウザ用: operator + line で絞り込み（フォーマット済み名称で比較）
    if (operator || line) {
      const raw = await readFile(join(process.cwd(), 'public', 'data', 'stations.json'), 'utf-8');
      const all = (JSON.parse(raw) as StationData[]).map((s) => ({
        ...s,
        operatorName: formatOperatorName(s.operatorName ?? ''),
        lineName: formatLineName(s.lineName),
      }));
      const results = all.filter(
        (s) =>
          (!operator || s.operatorName === operator) &&
          (!line || s.lineName === line),
      );
      return NextResponse.json(results);
    }

    if (q.length < 1) return NextResponse.json([]);

    const results = await searchStations(q, METRO_PREF_CODES);
    return NextResponse.json(results.slice(0, 10));
  } catch {
    return NextResponse.json([]);
  }
}
