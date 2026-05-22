import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { StationData } from '@/types/data';
import { formatOperatorName, formatLineName } from '@/lib/station-data';

export interface LineEntry {
  lineName: string;
  count: number;
}

export interface OperatorEntry {
  operatorName: string;
  lines: LineEntry[];
}

/**
 * GET /api/stations/lines
 * 首都圏の事業者→路線ツリーを返す（表示名フォーマット済み）
 */
export async function GET() {
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'data', 'stations.json'), 'utf-8');
    const stations = JSON.parse(raw) as StationData[];

    // 事業者 → 路線 → 駅数 の集計（フォーマット済み名称で集計）
    const opMap = new Map<string, Map<string, number>>();

    for (const s of stations) {
      const op = formatOperatorName(s.operatorName ?? '不明');
      const ln = formatLineName(s.lineName);
      if (!opMap.has(op)) opMap.set(op, new Map());
      const lineMap = opMap.get(op)!;
      lineMap.set(ln, (lineMap.get(ln) ?? 0) + 1);
    }

    // 駅数の多い事業者順にソート
    const operators: OperatorEntry[] = Array.from(opMap.entries())
      .map(([operatorName, lineMap]) => ({
        operatorName,
        lines: Array.from(lineMap.entries())
          .map(([lineName, count]) => ({ lineName, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => {
        const totalA = a.lines.reduce((s, l) => s + l.count, 0);
        const totalB = b.lines.reduce((s, l) => s + l.count, 0);
        return totalB - totalA;
      });

    return NextResponse.json({ operators });
  } catch {
    return NextResponse.json({ operators: [] });
  }
}
