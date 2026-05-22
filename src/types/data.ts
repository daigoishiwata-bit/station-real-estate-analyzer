/**
 * 全外部API・内部データ構造の型定義
 */

// =========================================
// 不動産情報ライブラリAPI (XIT001)
// =========================================

export interface RealEstateDataRow {
  /** 都道府県コード */
  prefCode: number;
  /** 市区町村名 */
  municipality: string;
  /** 取引種別（APIが返す日本語文字列） */
  tradeType: string;
  /** 取引価格（総額、万円） */
  tradePrice: number;
  /** 坪単価（万円/坪） */
  pricePerUnit: number;
  /** 面積（平方メートル） */
  area: number;
  /** 建築年 */
  buildingYear: number;
  /** 建物構造 */
  structure: string;
  /** 取引時点（例：2023年第1四半期） */
  period: string;
  /** 最寄り駅名 ※ あれば */
  nearestStation?: string;
  /** 駅までの距離（分）※ あれば */
  distanceToStation?: number;
}

export interface RealEstateApiResponse {
  /** 取引情報のリスト */
  data: RealEstateDataRow[];
  /** ページネーション情報 */
  paging?: {
    totalCount: number;
    pageSize: number;
    currentPage: number;
  };
}

// =========================================
// 駅情報（国土数値情報 GeoJSON）
// =========================================

export interface StationData {
  /** 駅ID（一意の識別子） */
  stationId: string;
  /** 駅名 */
  stationName: string;
  /** 路線名 */
  lineName: string;
  /** 事業者名（運営会社） */
  operatorName?: string;
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 乗降客数（年間）※ あれば */
  passengerCount?: number;
  /** 都道府県コード */
  prefCode: number;
  /** 市区町村名 */
  municipality: string;
}

// =========================================
// ニュースAPI (NewsAPI)
// =========================================

export interface NewsItem {
  /** ニュースタイトル */
  title: string;
  /** ニュース記事URL */
  url: string;
  /** 記事の説明 */
  description?: string;
  /** 記事本文の一部 */
  content?: string;
  /** 出版日 */
  publishedAt: Date;
  /** ニュースソース（媒体名） */
  source: string;
  /** イメージURL */
  imageUrl?: string;
  /** センチメント分析（オプション） */
  sentiment?: "positive" | "negative" | "neutral";
  /** 信頼度スコア（0～1） */
  confidence?: number;
}

export interface NewsApiResponse {
  /** ニュース記事のリスト */
  articles: NewsItem[];
  /** 総件数 */
  totalResults: number;
  /** ステータス */
  status: "ok" | "error";
}

// =========================================
// 内部キャッシュデータ構造
// =========================================

export interface CachedDataEntry<T> {
  /** キャッシュデータ */
  data: T;
  /** キャッシュ作成日時 */
  cachedAt: Date;
  /** キャッシュ有効期限 */
  expiresAt: Date;
  /** キャッシュキー（識別用） */
  cacheKey: string;
}

// =========================================
// API レスポンス統合型（駅単位の統合データ）
// =========================================

export interface StationAnalysisData {
  /** 駅情報 */
  station: StationData;
  /** 不動産価格データ（複数期間） */
  realEstateHistory: RealEstateDataRow[];
  /** 周辺ニュース */
  newsItems: NewsItem[];
  /** 分析メタデータ */
  metadata: {
    /** データ取得日時 */
    fetchedAt: Date;
    /** 価格上昇率（%） */
    priceGrowthRate?: number;
    /** キャッシュ状態 */
    isCached: boolean;
  };
}

// =========================================
// エラーハンドリング
// =========================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public apiName: string,
    message: string
  ) {
    super(`[${apiName}] ${message}`);
    this.name = "ApiError";
  }
}

export class RateLimitError extends ApiError {
  constructor(
    apiName: string,
    public retryAfterSeconds: number
  ) {
    super(429, apiName, `Rate limit exceeded. Retry after ${retryAfterSeconds}s`);
    this.name = "RateLimitError";
  }
}
