export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        <span style={{ color: 'var(--border)' }}>|</span>
        <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
        {/* 駅ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="h-9 w-44 rounded-lg mb-2" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-4 w-60 rounded" style={{ background: 'var(--bg-muted)' }} />
          </div>
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--bg-muted)' }} />
            <div className="h-7 w-20 rounded" style={{ background: 'var(--bg-muted)' }} />
          </div>
        </div>

        {/* シミュレーター */}
        <div
          className="rounded-xl mb-8"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 240 }}
        />

        {/* ニュース + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-4 w-24 rounded col-span-full" style={{ background: 'var(--bg-muted)' }} />
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              />
            ))}
          </div>
          <div
            className="rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 220 }}
          />
        </div>
      </main>
    </div>
  );
}
