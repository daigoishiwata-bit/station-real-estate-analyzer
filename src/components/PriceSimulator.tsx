'use client';

import { useState } from 'react';

const FLOOR_PLANS = [
  { label: '1K',    modifier: 1.10 },
  { label: '1LDK',  modifier: 1.05 },
  { label: '2LDK',  modifier: 1.00 },
  { label: '3LDK',  modifier: 0.97 },
] as const;

const AGE_OPTIONS = [
  { label: '新築',    modifier: 1.15 },
  { label: '5年以内', modifier: 1.00 },
  { label: '10年以内',modifier: 0.88 },
  { label: '20年以内',modifier: 0.75 },
  { label: '20年超',  modifier: 0.62 },
] as const;

const WALK_OPTIONS = [
  { label: '5分以内',  modifier: 1.15 },
  { label: '10分以内', modifier: 1.00 },
  { label: '15分以内', modifier: 0.90 },
  { label: '15分超',   modifier: 0.80 },
] as const;

const TSUBO = 3.3058;

interface Props {
  stationName: string;
  basePricePerTsubo: number;
  municipalityName?: string;
}

function formatPrice(man: number): string {
  if (man >= 10000) {
    return `${(man / 10000).toFixed(2)}億円`;
  }
  return `${Math.round(man).toLocaleString()}万円`;
}

function SelectGroup<T extends readonly { label: string }[]>({
  options,
  selected,
  onSelect,
}: {
  options: T;
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt, i) => (
        <button
          key={opt.label}
          onClick={() => onSelect(i)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: selected === i ? 'var(--accent)' : 'var(--bg-muted)',
            color: selected === i ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${selected === i ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function PriceSimulator({ stationName, basePricePerTsubo, municipalityName }: Props) {
  const [fpIdx, setFpIdx] = useState(2);   // 2LDK
  const [area, setArea] = useState(60);
  const [ageIdx, setAgeIdx] = useState(1); // 5年以内
  const [walkIdx, setWalkIdx] = useState(1); // 10分以内

  const fpMod   = FLOOR_PLANS[fpIdx]!.modifier;
  const ageMod  = AGE_OPTIONS[ageIdx]!.modifier;
  const walkMod = WALK_OPTIONS[walkIdx]!.modifier;

  const adjTsubo   = basePricePerTsubo * fpMod * ageMod * walkMod;
  const pricePerSqm = adjTsubo / TSUBO;
  const center      = pricePerSqm * area;
  const low  = Math.round((center * 0.85) / 100) * 100;
  const high = Math.round((center * 1.15) / 100) * 100;

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}
      >
        <span style={{ color: 'var(--accent)' }}>◆</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          物件価格シミュレーター
        </h2>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {stationName}駅エリアの相場ベース
        </span>
      </div>

      {/* データ出典エリア表示 */}
      {municipalityName && (
        <div
          className="flex items-start gap-1.5 px-5 py-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="mt-px shrink-0">📍</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            このデータは<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{municipalityName}</span>の取引データをもとにしています。
            同じ市区町村内の駅は同じデータが適用されます。
          </span>
        </div>
      )}

      <div className="p-5">
        {/* 入力グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">

          {/* 間取り */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>間取り</p>
            <SelectGroup options={FLOOR_PLANS} selected={fpIdx} onSelect={setFpIdx} />
          </div>

          {/* 専有面積 */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              専有面積：<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{area} ㎡</span>
            </p>
            <input
              type="range"
              min={20}
              max={120}
              step={5}
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span>20㎡</span><span>120㎡</span>
            </div>
          </div>

          {/* 築年数 */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>築年数</p>
            <SelectGroup options={AGE_OPTIONS} selected={ageIdx} onSelect={setAgeIdx} />
          </div>

          {/* 駅徒歩 */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>駅からの徒歩時間</p>
            <SelectGroup options={WALK_OPTIONS} selected={walkIdx} onSelect={setWalkIdx} />
          </div>
        </div>

        {/* 結果 */}
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-sub)' }}
        >
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            {FLOOR_PLANS[fpIdx]!.label}・{area}㎡・築{AGE_OPTIONS[ageIdx]!.label}・徒歩{WALK_OPTIONS[walkIdx]!.label} の想定価格帯
          </p>
          <div className="flex items-end gap-2 flex-wrap">
            <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatPrice(low)}
            </span>
            <span className="text-lg mb-0.5" style={{ color: 'var(--text-secondary)' }}>〜</span>
            <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatPrice(high)}
            </span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            坪単価換算：約 {Math.round(adjTsubo)} 万円/坪
          </p>
        </div>

        <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※ 参考価格です。実際の価格は物件により異なります。国土交通省 不動産情報ライブラリの取引データをもとに算出しています。
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          ※ 価格は市区町村単位の取引データをもとに算出しています。同じ市区町村内の駅は同じ相場ベースが適用されます。実際の価格は駅・町丁目・物件条件により異なります。
        </p>
      </div>
    </section>
  );
}
