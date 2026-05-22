'use client';

// 値上がり注目エリア — 具体的な値上がり根拠がある駅を定義

interface FeaturedStation {
  stationId: string;
  name: string;
  line: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
  priceRange: string;
  appreciation: string;   // 値上がり根拠（1行）
  detail: string;
}

const FEATURED: FeaturedStation[] = [
  {
    stationId: 'N02-002948',
    name: '流山おおたかの森',
    line: 'つくばエクスプレス・野田線',
    tag: '人口増加率 全国1位',
    tagColor: '#ef4444',
    tagBg: 'rgba(239,68,68,0.10)',
    tagBorder: 'rgba(239,68,68,0.30)',
    priceRange: '坪単価 120〜200万円',
    appreciation: '都内比 大幅割安 × TX沿線需要増で継続上昇中',
    detail: '流山市は全国トップクラスの人口増加率を継続。TX（つくばエクスプレス）で秋葉原まで約30分。市の子育て支援策（保育所整備・移住促進）で30〜40代ファミリーが急増しており、住宅需要が供給を上回る状態が続いている。首都圏では数少ない「まだ割安で成長余地がある」エリア。',
  },
  {
    stationId: 'N02-002958',
    name: '八潮',
    line: 'つくばエクスプレス',
    tag: 'TX沿線 穴場',
    tagColor: 'var(--accent)',
    tagBg: 'rgba(168,118,48,0.12)',
    tagBorder: 'rgba(168,118,48,0.35)',
    priceRange: '坪単価 80〜140万円',
    appreciation: '流山・守谷より大幅割安。TX需要の波及で今後の上昇余地が大きい',
    detail: '同じTX沿線でも流山おおたかの森より約3〜4割安い価格帯が魅力。秋葉原まで約23分と都心アクセスも良好。沿線の開発が進むにつれ、八潮エリアへの注目度も上昇傾向にある。早期購入で含み益が狙えるエリアとして注目されている。',
  },
  {
    stationId: 'N02-006056',
    name: '武蔵小杉',
    line: '東急東横線・南武線',
    tag: '3路線直通×継続開発',
    tagColor: '#3b82f6',
    tagBg: 'rgba(59,130,246,0.10)',
    tagBorder: 'rgba(59,130,246,0.30)',
    priceRange: '坪単価 270〜380万円',
    appreciation: '渋谷・横浜・品川3方向へ直通。新規住宅タワー供給で人口流入が継続',
    detail: '東横線（渋谷まで約15分）・南武線（川崎まで約3分）・横須賀線（品川まで約9分）の3路線が使えるハブ駅。複数の住宅タワー開発が続いており、駅周辺の商業・医療・教育インフラが年々充実。ここ数年で坪単価が着実に上昇しており、保有資産としての安定性が高い。',
  },
  {
    stationId: 'N02-006821',
    name: '大宮',
    line: '埼京線・高崎線・東北線',
    tag: 'GCS構想×新幹線ハブ',
    tagColor: '#8b5cf6',
    tagBg: 'rgba(139,92,246,0.10)',
    tagBorder: 'rgba(139,92,246,0.30)',
    priceRange: '坪単価 130〜220万円',
    appreciation: 'さいたまGCS構想で大宮・浦和エリアの都市格が上昇。都内比 割安で上昇余地あり',
    detail: '「さいたまグレーターシティ構想（GCS）」により大宮・浦和エリアの都市機能を強化する方針が策定済み。新幹線・在来線7路線が集まる埼玉最大の交通ハブとして、都心通勤者の受け皿需要が安定して高い。坪単価は都内の1/3〜1/2程度で、価格上昇余地が大きい。',
  },
  {
    stationId: 'N02-006343',
    name: '勝どき',
    line: '都営大江戸線',
    tag: '湾岸再開発 波及',
    tagColor: '#0d9488',
    tagBg: 'rgba(13,148,136,0.10)',
    tagBorder: 'rgba(13,148,136,0.30)',
    priceRange: '坪単価 300〜420万円',
    appreciation: '晴海フラッグ（5,600戸）完成で周辺人口急増。湾岸エリア全体の再評価が進行中',
    detail: '2024年に入居開始した「晴海フラッグ」の人口流入（約5,600戸・約12,000人）により、勝どき〜晴海エリアの生活インフラ整備が加速。商業施設・病院・学校の新設が相次ぎ、住宅需要が急増している。都心（東京駅まで約20分）へのアクセスの良さに対して、まだ割安感が残るエリア。',
  },
  {
    stationId: 'N02-009964',
    name: '越谷レイクタウン',
    line: '武蔵野線',
    tag: '外環道整備×大型商業',
    tagColor: '#16a34a',
    tagBg: 'rgba(22,163,74,0.10)',
    tagBorder: 'rgba(22,163,74,0.30)',
    priceRange: '坪単価 90〜150万円',
    appreciation: '外環道東側の整備進捗で陸路アクセスが向上。郊外型住宅エリアで価格が底堅い',
    detail: '日本最大級のショッピングセンター「イオンレイクタウン」が徒歩圏内にあり、日常の生活利便性が高い。武蔵野線で西船橋・府中本町方面に乗り換えなし。外環道路の東側区間（東名接続）の整備が進むことで、車での移動利便性も向上。広い住居を手頃な価格で取得したいファミリーに根強い人気。',
  },
];

const CARD_BASE: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
};

export default function FeaturedStations() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {FEATURED.map((s) => (
        <a
          key={s.stationId}
          href={`/station/${s.stationId}`}
          className="rounded-xl p-4 flex flex-col gap-2.5 transition-all"
          style={CARD_BASE}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-dim)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(168,118,48,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          {/* タグ + 路線 */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
              style={{ background: s.tagBg, color: s.tagColor, border: `1px solid ${s.tagBorder}` }}
            >
              {s.tag}
            </span>
            <span className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
              {s.line}
            </span>
          </div>

          {/* 駅名 */}
          <p className="text-lg font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {s.name}
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>駅</span>
          </p>

          {/* 価格帯 */}
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            {s.priceRange}
          </p>

          {/* 値上がり根拠（強調） */}
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-sub)' }}
          >
            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              📈 {s.appreciation}
            </p>
          </div>

          {/* 詳細 */}
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>
            {s.detail}
          </p>

          <p className="text-xs mt-auto" style={{ color: 'var(--accent)', opacity: 0.8 }}>
            価格データを見る →
          </p>
        </a>
      ))}
    </div>
  );
}
