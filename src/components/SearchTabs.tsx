'use client';

import { useState } from 'react';
import StationSearch from '@/components/StationSearch';
import LineSearch from '@/components/LineSearch';

type Tab = 'search' | 'line';

export default function SearchTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('search');

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4">
      {/* タブ */}
      <div
        className="flex rounded-lg p-1 self-center"
        style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
      >
        {([['search', '駅名で探す'], ['line', '路線から探す']] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 検索コンポーネント */}
      <div className="w-full">
        {activeTab === 'search' ? <StationSearch /> : <LineSearch />}
      </div>
    </div>
  );
}
