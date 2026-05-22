import { readFile } from 'fs/promises';
import { join } from 'path';
import { cacheLife, cacheTag } from 'next/cache';
import { StationData } from '@/types/data';

// =========================================
// 定数
// =========================================

export const METRO_PREF_CODES = [11, 12, 13, 14] as const; // 埼玉・千葉・東京・神奈川

// =========================================
// 表示用フォーマット関数
// =========================================

const OPERATOR_SHORT: Record<string, string> = {
  '東日本旅客鉄道': 'JR東日本',
  '東海旅客鉄道': 'JR東海',
  '西日本旅客鉄道': 'JR西日本',
  '北海道旅客鉄道': 'JR北海道',
  '四国旅客鉄道': 'JR四国',
  '九州旅客鉄道': 'JR九州',
};

/** "東日本旅客鉄道" → "JR東日本" など */
export function formatOperatorName(name: string): string {
  return OPERATOR_SHORT[name] ?? name;
}

/** "4号線丸ノ内線" → "丸ノ内線" など（番号プレフィックスを除去） */
export function formatLineName(name: string): string {
  return name.replace(/^\d+号線/, '');
}

// =========================================
// 国土数値情報 N02 GeoJSON 型定義（内部用）
// =========================================

interface N02Properties {
  N02_001: string;   // 鉄道区分コード
  N02_002: string;   // 事業者種別
  N02_003: string;   // 路線名
  N02_004: string;   // 事業者名（運営会社）
  N02_005: string;   // 駅名
  N02_005c?: string; // N02 内部コード（都道府県コードとは無関係）
}

type Coord2D = [number, number];

interface N02Feature {
  type: 'Feature';
  properties: N02Properties;
  geometry:
    | { type: 'Point'; coordinates: Coord2D }
    | { type: 'LineString'; coordinates: Coord2D[] }
    | { type: 'MultiLineString'; coordinates: Coord2D[][] };
}

export interface N02GeoJSON {
  type: 'FeatureCollection';
  features: N02Feature[];
}

// =========================================
// GeoJSON パーサー
// =========================================

function toPointCoords(feature: N02Feature): Coord2D | null {
  const { type, coordinates } = feature.geometry;
  if (type === 'Point') return coordinates as Coord2D;
  if (type === 'LineString') {
    const coords = coordinates as Coord2D[];
    return coords[Math.floor(coords.length / 2)] ?? null;
  }
  if (type === 'MultiLineString') {
    const lines = coordinates as Coord2D[][];
    const first = lines[0];
    return first ? (first[Math.floor(first.length / 2)] ?? null) : null;
  }
  return null;
}

/**
 * 座標から首都圏の都道府県コードを推定する
 * N02 データに標準的な市区町村コードが含まれないため座標で判定する
 */
function detectPrefCode(lat: number, lon: number): number {
  // 首都圏の大まかな範囲外はまず除外（関西・九州・沖縄等を排除）
  if (lon < 138.8 || lon > 141.2 || lat < 34.9 || lat > 36.5) return 0;
  // 千葉: 東側
  if (lon >= 139.93 && lat >= 35.0 && lat <= 36.1) return 12;
  // 埼玉: 北側
  if (lat >= 35.86 && lon >= 139.0 && lon <= 140.0) return 11;
  // 神奈川: 南側（東部）
  if (lon >= 139.35 && lat < 35.58) return 14;
  // 神奈川: 西部（相模原・厚木・小田原など。lon >= 138.9 で関西等を除外）
  if (lon >= 138.9 && lon < 139.35 && lat >= 35.10 && lat < 35.67) return 14;
  // 東京: 中央部
  if (lat >= 35.48 && lat <= 35.90 && lon >= 138.95 && lon <= 139.93) return 13;
  return 0; // 首都圏外
}

/**
 * 国土数値情報 N02 GeoJSON を StationData[] に変換する
 * scripts/download-stations.ts から呼び出して public/data/stations.json を生成する
 */
export function parseN02GeoJSON(geojson: N02GeoJSON): StationData[] {
  const seen = new Set<string>();
  const result: StationData[] = [];

  geojson.features.forEach((feature, i) => {
    const props = feature.properties;
    // N02_005 = 駅名、N02_003 = 路線名、N02_004 = 事業者名
    const stationName = props.N02_005?.trim();
    const lineName = props.N02_003?.trim();
    if (!stationName) return;

    // 同一駅・同一路線の重複除去
    const key = `${stationName}::${lineName}`;
    if (seen.has(key)) return;
    seen.add(key);

    const coords = toPointCoords(feature);
    if (!coords) return;

    const [lon, lat] = coords;
    const prefCode = detectPrefCode(lat, lon);
    const operatorName = props.N02_004?.trim();

    result.push({
      stationId: `N02-${i.toString().padStart(6, '0')}`,
      stationName,
      lineName: lineName ?? '',
      operatorName,
      latitude: lat,
      longitude: lon,
      prefCode,
      municipality: '',
    });
  });

  return result;
}

// =========================================
// データ読み込み（サーバー専用・キャッシュ付き）
// =========================================

// 処理済み駅データを public/data/stations.json から読み込む
// 駅データは滅多に変わらないため 'max' プロファイルで長期キャッシュする
async function loadStationList(): Promise<StationData[]> {
  'use cache';
  cacheLife('max');
  cacheTag('station-list');

  const filePath = join(process.cwd(), 'public', 'data', 'stations.json');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    throw new Error(
      '駅データファイルが存在しません: public/data/stations.json\n' +
        'scripts/download-stations.ts を実行してデータを生成してください。',
    );
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('stations.json の形式が不正です（配列である必要があります）');
  }
  // 表示用に事業者名・路線名をフォーマット
  return (parsed as StationData[]).map((s) => ({
    ...s,
    operatorName: formatOperatorName(s.operatorName ?? ''),
    lineName: formatLineName(s.lineName),
  }));
}

// =========================================
// 距離計算（Haversine 公式）
// =========================================

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =========================================
// 公開 API
// =========================================

/**
 * 駅名（部分一致）で検索する
 *
 * @param query     検索クエリ（例: "渋谷"）
 * @param prefCodes 絞り込む都道府県コード（省略時は全対象）
 */
export async function searchStations(
  query: string,
  prefCodes?: readonly number[],
): Promise<StationData[]> {
  const list = await loadStationList();
  return list.filter(
    (s) =>
      s.stationName.includes(query) &&
      (!prefCodes?.length || prefCodes.includes(s.prefCode)),
  );
}

/**
 * 駅 ID で 1 件取得する
 */
export async function findStationById(
  stationId: string,
): Promise<StationData | undefined> {
  const list = await loadStationList();
  return list.find((s) => s.stationId === stationId);
}

/**
 * 指定座標から半径 radiusKm 以内の駅を距離順で返す
 *
 * @param latitude  緯度
 * @param longitude 経度
 * @param radiusKm  検索半径（km）、デフォルト 1.0km
 */
export async function findNearbyStations(
  latitude: number,
  longitude: number,
  radiusKm: number = 1.0,
): Promise<(StationData & { distanceKm: number })[]> {
  const list = await loadStationList();
  return list
    .map((s) => ({
      ...s,
      distanceKm: haversineKm(latitude, longitude, s.latitude, s.longitude),
    }))
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * 同一駅に乗り入れる全路線名を返す（座標近傍 + 同駅名で判定）
 */
export async function findRelatedLines(station: StationData): Promise<string[]> {
  const list = await loadStationList();
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const s of list) {
    if (s.stationName !== station.stationName) continue;
    const dist = haversineKm(station.latitude, station.longitude, s.latitude, s.longitude);
    if (dist > 0.6) continue;
    if (!seen.has(s.lineName)) {
      seen.add(s.lineName);
      lines.push(s.lineName);
    }
  }
  return lines;
}

// =========================================
// 市区町村コード逆引き（国土地理院 API）
// =========================================

interface GsiReverseResult {
  results?: { muniCd?: string; lv01Nm?: string };
}

/**
 * 緯度経度から市区町村コードを取得する（国土地理院 逆ジオコーダー使用）
 * 結果は永続キャッシュ（駅位置は変わらないため）
 */
export async function getMunicipalityCode(
  lat: number,
  lng: number,
): Promise<{ code: string; name: string } | null> {
  'use cache';
  cacheLife('max');
  cacheTag(`muni-${lat.toFixed(4)}-${lng.toFixed(4)}`);

  try {
    const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as GsiReverseResult;
    const code = data.results?.muniCd;
    const name = data.results?.lv01Nm;
    if (!code) return null;
    return { code, name: name ?? '' };
  } catch {
    return null;
  }
}

/**
 * 首都圏（埼玉・千葉・東京・神奈川）の全駅一覧を返す
 */
export async function listMetroStations(): Promise<StationData[]> {
  const list = await loadStationList();
  return list.filter((s) =>
    (METRO_PREF_CODES as readonly number[]).includes(s.prefCode),
  );
}
