import Anthropic from '@anthropic-ai/sdk';
import { cacheLife, cacheTag } from 'next/cache';
import type { StationData, NewsItem } from '@/types/data';
import type { PredictionResult } from './prediction';
import { safeTag } from './cache';

// =========================================
// 型定義
// =========================================

export interface AIAnalysisResult {
  summary: string;
  keyFactors: string[];
  outlook: string;
  risks: string[];
  confidenceNote: string;
}

// =========================================
// Claude プロンプト
// =========================================

const SYSTEM_PROMPT = `あなたは日本の首都圏不動産市場の専門アナリストです。
与えられた駅エリアのデータを分析し、日本語で簡潔・具体的な洞察を提供してください。

## 首都圏市場の現状コンテキスト（2024〜2025年）
- 都心5区（港・渋谷・千代田・中央・新宿）は坪単価500〜1200万円台で高止まり
- 日銀の利上げ局面により住宅ローン金利が上昇傾向（変動0.4〜1.0%、固定1.5〜2.5%程度）
- 大規模再開発ラッシュ：虎ノ門・品川・麻布台・渋谷エリアで価格押し上げ効果
- 中古マンション価格は新築不足を背景に高騰継続（特に築10年以内）
- 路線価値：山手線>東急東横・田園都市線>小田急>京王>京浜急行の順に坪単価が高い傾向
- 郊外エリアはリモートワーク需要一服後、価格上昇が鈍化傾向

## 出力フォーマット（JSON）
{
  "summary": "1〜2文の総括コメント（具体的な数値観や他エリア比較を含める）",
  "keyFactors": ["主要因1（具体的に）", "主要因2（具体的に）", "主要因3（具体的に）"],
  "outlook": "今後3〜5年の見通し（1〜2文、強気/中立/弱気の判断を明確に）",
  "risks": ["リスク1（具体的に）", "リスク2（具体的に）"],
  "confidenceNote": "分析の信頼度・制約に関する一言"
}

## 制約
- すべてのフィールドを必ず返すこと
- keyFactors・risks は 2〜4 項目の配列（文字列）
- 推測と事実を混同しない（データが不足なら正直に述べる）
- 路線・エリアの特性（交通アクセス・再開発・住環境）を積極的に活用して分析する`;

function buildUserPrompt(
  station: StationData,
  prediction: PredictionResult | null,
  news: NewsItem[],
  relatedLines: string[],
): string {
  const lines: string[] = [];
  lines.push(`## 駅情報`);
  lines.push(`- 駅名: ${station.stationName}駅`);
  lines.push(`- 代表路線: ${station.lineName}`);
  if (relatedLines.length > 1) {
    lines.push(`- 乗り入れ路線: ${relatedLines.join('・')}`);
    lines.push(`- 乗り入れ路線数: ${relatedLines.length}路線（交通利便性${relatedLines.length >= 4 ? '◎' : relatedLines.length >= 2 ? '○' : '△'}）`);
  }
  lines.push(`- 事業者: ${station.operatorName ?? '不明'}`);
  lines.push(`- エリア: ${station.prefCode === 13 ? '東京' : station.prefCode === 14 ? '神奈川' : station.prefCode === 12 ? '千葉' : station.prefCode === 11 ? '埼玉' : '首都圏'}`);

  if (prediction) {
    lines.push('');
    lines.push('## 価格予測データ');
    lines.push(`- 年率換算価格変化率: ${prediction.annualGrowthRate >= 0 ? '+' : ''}${prediction.annualGrowthRate}%`);
    lines.push(`- 決定係数（R²）: ${prediction.rSquared}（${Number(prediction.rSquared) >= 0.7 ? 'トレンドが明確' : '変動が大きい'}）`);
    lines.push(`- ${prediction.confidenceNote}`);
    const last = prediction.historicalData.at(-1);
    if (last) lines.push(`- 直近坪単価: ${last.avgPricePerUnit.toFixed(1)} 万円/坪`);
    lines.push(`- 3年後予測坪単価: ${prediction.forecast.at(4)?.predicted.toFixed(1) ?? 'N/A'} 万円/坪`);
  } else {
    lines.push('');
    lines.push('## 価格データ: 不十分（APIキー未設定）');
    lines.push('- 価格トレンドは上記の路線・エリア特性から推定してください');
  }

  if (news.length > 0) {
    lines.push('');
    lines.push('## 周辺ニュース（最新5件）');
    for (const item of news.slice(0, 5)) {
      lines.push(`- [${item.source}] ${item.title}`);
    }
  }

  lines.push('');
  lines.push('乗り入れ路線・エリアの特性・価格データを踏まえて、指定のJSONフォーマットで詳細な分析を返してください。');
  lines.push('価格データがなくても、路線・エリアの定性的な特性から具体的な分析を行ってください。');
  return lines.join('\n');
}

// =========================================
// キャッシュ付き内部関数（APIキーが確認済みの場合のみ呼ばれる）
// =========================================

async function _cachedAnalyze(
  station: StationData,
  prediction: PredictionResult | null,
  news: NewsItem[],
  relatedLines: string[],
): Promise<AIAnalysisResult | null> {
  'use cache';
  cacheLife('days');
  cacheTag(`ai-analysis-${safeTag(station.stationId)}`);

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(station, prediction, news, relatedLines),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const raw = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(raw) as AIAnalysisResult;

    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.keyFactors) ||
      typeof parsed.outlook !== 'string'
    ) return null;

    return {
      summary: parsed.summary,
      keyFactors: (parsed.keyFactors as string[]).slice(0, 4),
      outlook: parsed.outlook,
      risks: Array.isArray(parsed.risks) ? (parsed.risks as string[]).slice(0, 4) : [],
      confidenceNote: parsed.confidenceNote ?? '',
    };
  } catch {
    return null;
  }
}

// =========================================
// パブリック API（キャッシュ境界の外でAPIキーチェック）
// =========================================

/**
 * Claude API を使って駅エリアの定性分析を生成する。
 * ANTHROPIC_API_KEY が未設定の場合は null を即返し、キャッシュしない。
 */
export async function analyzeStationWithAI(
  station: StationData,
  prediction: PredictionResult | null,
  news: NewsItem[],
  relatedLines: string[] = [],
): Promise<AIAnalysisResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return _cachedAnalyze(station, prediction, news, relatedLines);
}
