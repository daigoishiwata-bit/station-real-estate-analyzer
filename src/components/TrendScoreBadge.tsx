interface Props {
  score: number | undefined;
  growthRate: number | undefined;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80';  // 緑
  if (score >= 40) return '#c9a85c';  // ゴールド
  return '#f87171';                   // 赤
}

function scoreLabel(score: number): string {
  if (score >= 80) return '非常に有望';
  if (score >= 60) return '有望';
  if (score >= 40) return '普通';
  if (score >= 20) return '低調';
  return '要注意';
}

export default function TrendScoreBadge({ score, growthRate }: Props) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>トレンドスコア</p>

      {score !== undefined ? (
        <div className="flex items-end gap-3">
          {/* 円グラフ風スコア表示 */}
          <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke="var(--border)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={scoreColor(score)}
                strokeWidth="2.5"
                strokeDasharray={`${score} ${100 - score}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-lg font-bold"
              style={{ color: scoreColor(score) }}
            >
              {score}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: scoreColor(score) }}>
              {scoreLabel(score)}
            </p>
            {growthRate !== undefined && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                価格上昇率{' '}
                <span style={{ color: growthRate >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                  {growthRate >= 0 ? '+' : ''}{growthRate}%
                </span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          データ不足（算出不可）
        </p>
      )}
    </div>
  );
}
