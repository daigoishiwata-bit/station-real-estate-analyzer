'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { StationData } from '@/types/data';
import type { OperatorEntry } from '@/app/api/stations/lines/route';

type Step = 'operator' | 'line' | 'station';

export default function LineSearch() {
  const router = useRouter();

  const [operators, setOperators] = useState<OperatorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('operator');
  const [selectedOperator, setSelectedOperator] = useState<OperatorEntry | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stations/lines')
      .then((r) => r.json())
      .then((d: { operators: OperatorEntry[] }) => setOperators(d.operators))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectOperator = (op: OperatorEntry) => {
    setSelectedOperator(op);
    setSelectedLine(null);
    setStations([]);
    setStep('line');
  };

  const selectLine = async (lineName: string) => {
    if (!selectedOperator) return;
    setSelectedLine(lineName);
    setStep('station');
    setStationsLoading(true);
    try {
      const res = await fetch(
        `/api/stations/search?operator=${encodeURIComponent(selectedOperator.operatorName)}&line=${encodeURIComponent(lineName)}`,
      );
      const data: StationData[] = await res.json();
      setStations(data);
    } catch {
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  const reset = (toStep: Step) => {
    if (toStep === 'operator') {
      setSelectedOperator(null);
      setSelectedLine(null);
      setStations([]);
      setStep('operator');
    } else if (toStep === 'line') {
      setSelectedLine(null);
      setStations([]);
      setStep('line');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse h-40 rounded-xl" style={{ background: 'var(--bg-muted)' }} />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* パンくず */}
      <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <button
          onClick={() => reset('operator')}
          className={step !== 'operator' ? 'hover:underline cursor-pointer' : ''}
          style={{ color: step === 'operator' ? 'var(--text-primary)' : 'var(--accent)' }}
        >
          鉄道会社
        </button>
        {selectedOperator && (
          <>
            <span>›</span>
            <button
              onClick={() => reset('line')}
              className={step !== 'line' ? 'hover:underline cursor-pointer' : ''}
              style={{ color: step === 'line' ? 'var(--text-primary)' : 'var(--accent)' }}
            >
              {selectedOperator.operatorName}
            </button>
          </>
        )}
        {selectedLine && (
          <>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)' }}>{selectedLine}</span>
          </>
        )}
      </div>

      {/* 鉄道会社一覧 */}
      {step === 'operator' && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            鉄道会社を選択
          </p>
          <div className="flex flex-col gap-1.5">
            {operators.map((op) => (
              <button
                key={op.operatorName}
                onClick={() => selectOperator(op)}
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-glow)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)';
                }}
              >
                <span>{op.operatorName}</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{op.lines.length}路線</span>
                  <span>›</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 路線一覧 */}
      {step === 'line' && selectedOperator && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            路線を選択
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedOperator.lines.map((l) => (
              <button
                key={l.lineName}
                onClick={() => selectLine(l.lineName)}
                className="line-chip"
              >
                {l.lineName}
                <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({l.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 駅一覧 */}
      {step === 'station' && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            駅を選択
          </p>
          {stationsLoading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-16 rounded animate-pulse"
                  style={{ background: 'var(--bg-muted)' }}
                />
              ))}
            </div>
          ) : stations.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              駅が見つかりませんでした
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stations.map((s) => (
                <button
                  key={s.stationId}
                  onClick={() => router.push(`/station/${s.stationId}`)}
                  className="line-chip"
                >
                  {s.stationName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
