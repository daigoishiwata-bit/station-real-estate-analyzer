import type { AIAnalysisResult } from '@/lib/ai-analysis';

interface Props {
  analysis: AIAnalysisResult;
}

export default function AIInsightCard({ analysis }: Props) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>◆</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI エリア分析
        </h3>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
        >
          Claude
        </span>
      </div>

      {/* 総括 */}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {analysis.summary}
      </p>

      {/* 主要因 */}
      {analysis.keyFactors.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            価格変動の主要因
          </p>
          <ul className="flex flex-col gap-1.5">
            {analysis.keyFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>▸</span>
                <span style={{ color: 'var(--text-secondary)' }}>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 仕切り */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* 今後の見通し */}
      <div>
        <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          今後の見通し（3〜5年）
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {analysis.outlook}
        </p>
      </div>

      {/* リスク要因 */}
      {analysis.risks.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#f87171' }}>
            リスク要因
          </p>
          <ul className="flex flex-col gap-1.5">
            {analysis.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }}>!</span>
                <span style={{ color: 'var(--text-secondary)' }}>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 信頼度コメント */}
      {analysis.confidenceNote && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
        >
          {analysis.confidenceNote}
        </p>
      )}
    </div>
  );
}
