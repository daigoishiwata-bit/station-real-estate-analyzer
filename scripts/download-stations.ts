/**
 * 国土数値情報 N02（鉄道・駅データ）を取得し
 * public/data/stations.json に書き出すスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/download-stations.ts
 *
 * データ取得元:
 *   国土数値情報ダウンロードサービス
 *   https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html
 *
 * 事前準備:
 *   上記URLから最新年度の GeoJSON（N02-**_Station.geojson）を
 *   scripts/N02_Station.geojson として保存してください。
 *   （ZIPを解凍すると .geojson が含まれています）
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseN02GeoJSON, type N02GeoJSON } from '../src/lib/station-data';

const INPUT_PATH = join(__dirname, 'N02_Station.geojson');
const OUTPUT_PATH = join(__dirname, '..', 'public', 'data', 'stations.json');

// 対象の都道府県コード（首都圏に絞る）
const TARGET_PREF_CODES = new Set([11, 12, 13, 14]); // 埼玉・千葉・東京・神奈川

async function main() {
  console.log('[1/3] GeoJSON を読み込み中...');
  let raw: string;
  try {
    raw = await readFile(INPUT_PATH, 'utf-8');
  } catch {
    console.error(
      `エラー: ${INPUT_PATH} が見つかりません。\n` +
        '国土数値情報から N02 GeoJSON をダウンロードして ' +
        'scripts/N02_Station.geojson として保存してください。\n' +
        'URL: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html',
    );
    process.exit(1);
  }

  console.log('[2/3] パース・変換中...');
  const geojson = JSON.parse(raw) as N02GeoJSON;
  const allStations = parseN02GeoJSON(geojson);

  // 首都圏のみに絞り込む
  const metroStations = allStations.filter((s) =>
    TARGET_PREF_CODES.has(s.prefCode),
  );

  console.log(
    `    全国: ${allStations.length}件 → 首都圏: ${metroStations.length}件`,
  );

  console.log('[3/3] public/data/stations.json に書き込み中...');
  await writeFile(OUTPUT_PATH, JSON.stringify(metroStations, null, 2), 'utf-8');

  console.log('完了: stations.json を生成しました。');
}

main().catch((err) => {
  console.error('スクリプトエラー:', err);
  process.exit(1);
});
