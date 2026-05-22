'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RedevelopmentProject {
  project: string;
  station: string;
  line: string;
  completionYear: number;
  yearLabel: string;
  phase: '工事中' | '完成直後' | '計画確定';
  note: string;
  developer: string;
  totalFloor: string;
  height?: string;
  description: string;
}

interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  description?: string;
}

const PHASE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  '工事中':   { bg: 'rgba(232,93,58,0.10)',  text: '#e85d3a',       border: 'rgba(232,93,58,0.30)' },
  '完成直後': { bg: 'rgba(168,118,48,0.12)',  text: 'var(--accent)', border: 'var(--accent-dim)' },
  '計画確定': { bg: 'rgba(59,130,246,0.10)',  text: '#3b82f6',       border: 'rgba(59,130,246,0.30)' },
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ──────────────────────────────────────────
// モーダル
// ──────────────────────────────────────────
function ProjectModal({
  project,
  onClose,
}: {
  project: RedevelopmentProject;
  onClose: () => void;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const s = PHASE_STYLE[project.phase] ?? PHASE_STYLE['計画確定'];

  // ESC キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // スクロールロック
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ニュース取得
  useEffect(() => {
    const q = `${project.project} ${project.station} 再開発`;
    fetch(`/api/news?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: NewsItem[]) => setNews(data))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [project.project, project.station]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-card">
        {/* ヘッダー */}
        <div
          className="flex items-start justify-between px-6 py-4 sticky top-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', zIndex: 1 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {project.phase}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {project.yearLabel} {project.completionYear}年
              </span>
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {project.project}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>
              {project.station}駅
              <span style={{ color: 'var(--text-muted)' }}> · {project.line}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none px-2 py-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 概要テーブル */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              プロジェクト概要
            </h3>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {[
                { label: '事業者',   value: project.developer },
                { label: '延床面積', value: project.totalFloor },
                ...(project.height ? [{ label: '高さ', value: project.height }] : []),
                { label: project.yearLabel, value: `${project.completionYear}年` },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className="flex items-start gap-4 px-4 py-3"
                  style={{
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-sub)' : 'none',
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-muted)',
                  }}
                >
                  <span className="text-xs font-semibold w-20 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 詳細説明 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              詳細
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {project.description}
            </p>
          </section>

          {/* 関連ニュース */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              関連ニュース
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="rounded-xl p-4 animate-pulse"
                    style={{ background: 'var(--bg-muted)', height: 60 }}
                  />
                ))}
              </div>
            ) : news.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                関連ニュースが見つかりませんでした
              </p>
            ) : (
              <div className="space-y-2">
                {news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-card-link block"
                  >
                    <p className="text-sm font-medium line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{item.source}</span>
                      <span>·</span>
                      <span>{formatDate(item.publishedAt)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// カードグリッド + モーダル管理
// ──────────────────────────────────────────
export default function RedevelopmentWatch({
  projects,
}: {
  projects: RedevelopmentProject[];
}) {
  const [selected, setSelected] = useState<RedevelopmentProject | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {projects.map((p) => {
          const s = PHASE_STYLE[p.phase] ?? PHASE_STYLE['計画確定'];
          return (
            <button
              key={p.project}
              onClick={() => setSelected(p)}
              className="rounded-xl p-4 flex flex-col gap-2 text-left transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-dim)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(168,118,48,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* バッジ + 竣工年 */}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                >
                  {p.phase}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {p.yearLabel} {p.completionYear}年
                </span>
              </div>
              {/* プロジェクト名 */}
              <p className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {p.project}
              </p>
              {/* 最寄り駅 */}
              <p className="text-xs" style={{ color: 'var(--accent)' }}>
                {p.station}駅 <span style={{ color: 'var(--text-muted)' }}>· {p.line}</span>
              </p>
              {/* 説明 */}
              <p className="text-xs leading-snug mt-auto" style={{ color: 'var(--text-muted)' }}>
                {p.note}
              </p>
              {/* 詳細を見るヒント */}
              <p className="text-xs mt-1" style={{ color: 'var(--accent)', opacity: 0.7 }}>
                詳細を見る →
              </p>
            </button>
          );
        })}
      </div>

      {selected && <ProjectModal project={selected} onClose={close} />}
    </>
  );
}
