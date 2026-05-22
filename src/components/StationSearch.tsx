'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { StationData } from '@/types/data';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function StationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StationData[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 250);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length === 0) { setSuggestions([]); setIsOpen(false); return; }
    try {
      const res = await fetch(`/api/stations/search?q=${encodeURIComponent(q)}`);
      const data: StationData[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => { fetchSuggestions(debouncedQuery); }, [debouncedQuery, fetchSuggestions]);

  const selectStation = (station: StationData) => {
    setQuery(station.stationName);
    setIsOpen(false);
    router.push(`/station/${station.stationId}`);
  };

  const handleSearch = () => {
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectStation(suggestions[activeIndex]);
    } else if (suggestions.length > 0) {
      selectStation(suggestions[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      if (!isOpen && suggestions.length > 0) setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: isOpen ? `0 0 0 2px var(--accent-dim)` : '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.15s',
        }}
      >
        {/* 検索アイコン */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="駅名を入力（例: 渋谷、新宿、横浜）"
          className="flex-1 bg-transparent outline-none text-base"
          style={{ color: 'var(--text-primary)' }}
          aria-label="駅名検索"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          autoComplete="off"
        />

        {/* クリアボタン */}
        {query && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setIsOpen(false); inputRef.current?.focus(); }}
            style={{ color: 'var(--text-muted)' }}
            className="hover:opacity-70 transition-opacity flex-shrink-0 text-sm px-1"
            aria-label="クリア"
          >
            ✕
          </button>
        )}

        {/* 検索ボタン */}
        <button
          onClick={handleSearch}
          disabled={suggestions.length === 0}
          className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            opacity: suggestions.length === 0 ? 0.4 : 1,
            cursor: suggestions.length === 0 ? 'default' : 'pointer',
          }}
        >
          検索
        </button>
      </div>

      {/* サジェストドロップダウン */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full mt-2 w-full rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {suggestions.map((station, idx) => (
            <li
              key={station.stationId}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={() => selectStation(station)}
              onMouseEnter={() => setActiveIndex(idx)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: idx === activeIndex ? 'var(--bg-muted)' : 'transparent',
                borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-sub)' : undefined,
              }}
            >
              <span className="text-xs px-2 py-0.5 rounded" style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
              }}>
                {station.lineName}
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {station.stationName}駅
              </span>
              {station.operatorName && (
                <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                  {station.operatorName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
