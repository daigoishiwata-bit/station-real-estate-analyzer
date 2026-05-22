'use client';

import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('@/components/AIChat'), {
  ssr: false,
  loading: () => (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 180 }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}
      >
        <span style={{ color: 'var(--accent)' }}>◆</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          住宅購入 AI相談
        </span>
      </div>
      <div className="px-5 py-4 animate-pulse">
        <div className="h-3 w-64 rounded mb-2" style={{ background: 'var(--bg-muted)' }} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--bg-muted)' }} />
          ))}
        </div>
      </div>
    </section>
  ),
});

export default function AIChatWrapper() {
  return <AIChat />;
}
