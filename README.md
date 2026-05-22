# 駅エリア不動産価値分析ツール

首都圏（東京・神奈川・千葉・埼玉）の駅ごとに、過去の不動産価格推移・周辺開発ニュース・AI による将来予測を確認できる Next.js 16 製ウェブアプリ。

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて各 API キーを入力してください。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `MLIT_API_KEY` | ◎ | 国土交通省 不動産情報ライブラリ（[登録](https://www.reinfolib.mlit.go.jp/)） |
| `NEWS_API_KEY` | ○ | NewsAPI.org（[登録](https://newsapi.org/register)） |
| `ANTHROPIC_API_KEY` | ○ | AI 分析機能（[取得](https://console.anthropic.com/)） |
| `REVALIDATE_SECRET` | ○ | キャッシュ手動更新用トークン（任意の文字列） |

### 3. 駅データの準備

国土数値情報の駅データ（GeoJSON）をダウンロードして配置します。

1. [国土数値情報ダウンロード](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html) から最新の **N02_Station.geojson** を取得
2. ファイルを `scripts/N02_Station.geojson` に配置
3. 変換スクリプトを実行

```bash
npm run download-stations
```

`public/data/stations.json` が生成されます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で動作確認してください。

---

## デプロイ（Vercel）

### 手順

1. GitHub リポジトリを Vercel に連携
2. Vercel ダッシュボードで Environment Variables に `.env.local` の内容を登録
3. `public/data/stations.json` をリポジトリにコミットしておく（Vercel のビルド時に読み込まれます）
4. デプロイ

### 週次自動更新

`vercel.json` に Cron ジョブが設定されています（毎週月曜 09:00 JST）。

```
GET /api/revalidate
Authorization: Bearer <CRON_SECRET>  ← Vercel が自動付与
```

Vercel は `CRON_SECRET` 環境変数を自動生成し、Cron 呼び出し時に Authorization ヘッダーへ付与します。追加設定は不要です。

#### 手動でキャッシュ更新する場合

```bash
curl -X GET https://your-domain.vercel.app/api/revalidate \
  -H "Authorization: Bearer <REVALIDATE_SECRET>"
```

---

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                    # トップページ（駅検索）
│   ├── station/[stationId]/
│   │   └── page.tsx                # 駅詳細ページ
│   └── api/
│       ├── stations/search/
│       │   └── route.ts            # 駅名検索 API
│       └── revalidate/
│           └── route.ts            # 週次キャッシュ更新 API
├── components/
│   ├── StationSearch.tsx           # オートコンプリート検索（Client Component）
│   ├── PriceChart.tsx              # 価格推移グラフ（Client Component）
│   ├── PredictionChart.tsx         # 価格予測グラフ（Client Component）
│   ├── NewsCard.tsx                # ニュースカード
│   ├── TrendScoreBadge.tsx         # トレンドスコア表示
│   └── AIInsightCard.tsx           # AI 分析結果カード
├── lib/
│   ├── real-estate-api.ts          # 国土交通省 API クライアント
│   ├── station-data.ts             # 駅データ読み込み・検索
│   ├── news-api.ts                 # NewsAPI クライアント
│   ├── cache.ts                    # キャッシュ管理・タグ定義
│   ├── prediction.ts               # 線形回帰による価格予測エンジン
│   └── ai-analysis.ts              # Claude AI による定性分析
└── types/
    └── data.ts                     # 型定義
```

---

## 使用技術

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16（App Router、`use cache`） |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 |
| グラフ | Recharts |
| AI | Claude API（`claude-opus-4-7`、adaptive thinking） |
| デプロイ | Vercel |
| データ | 国土交通省 不動産情報ライブラリ、国土数値情報、NewsAPI |
