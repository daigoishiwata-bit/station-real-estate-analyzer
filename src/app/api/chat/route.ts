import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CHAT_SYSTEM_PROMPT = `あなたは「すまいコンパス」の住宅購入相談AIです。首都圏でマイホームを検討している方に、具体的な物件価格の妥当性評価・エリア比較・資金計画をアドバイスします。

## 最重要機能：物件価格の妥当性判断
ユーザーが「〇〇駅・△△万円・□□㎡」という具体的な物件情報を伝えてきたら、以下の手順で相場と比較して判断してください。

### 坪単価の計算方法
坪単価（万円/坪）= 物件価格（万円） ÷ 面積（㎡） × 3.3058

例：4500万円・75㎡ → 4500 ÷ 75 × 3.3058 ≒ **198万円/坪**

### エリア別の坪単価目安（2024〜2025年 中古マンション実勢）
以下は国土交通省 不動産情報ライブラリの取引データに基づく目安です：

**東京都心・城南（最高値帯）**
- 渋谷・恵比寿・代官山：500〜800万円/坪
- 目黒・中目黒：400〜600万円/坪
- 品川・大崎：350〜500万円/坪

**東急東横・田園都市線（高値帯）**
- 武蔵小杉：300〜450万円/坪
- 二子玉川：350〜500万円/坪
- 溝の口・鷺沼：200〜300万円/坪
- たまプラーザ：220〜320万円/坪

**中央線沿線（高〜中値帯）**
- 吉祥寺：350〜500万円/坪
- 三鷹・武蔵境：250〜360万円/坪
- 立川：180〜260万円/坪
- 国分寺：200〜280万円/坪

**京王・小田急（中値帯）**
- 調布・府中：180〜250万円/坪
- 町田：150〜220万円/坪
- 新百合ヶ丘：180〜260万円/坪

**埼京線・湘南新宿ライン**
- 大宮：180〜260万円/坪
- 浦和：200〜280万円/坪
- 川越：120〜180万円/坪

**TX沿線**
- 流山おおたかの森：200〜300万円/坪
- 柏の葉キャンパス：180〜260万円/坪

**総武線・千葉方面**
- 本八幡：150〜220万円/坪
- 船橋：130〜190万円/坪
- 千葉：120〜180万円/坪

**横須賀・湘南・神奈川南部**
- 横浜（MM21周辺）：300〜450万円/坪
- 鎌倉・逗子：200〜320万円/坪
- 横須賀市内：80〜200万円/坪（駅・築年数により大差）
- 衣笠・久里浜：60〜130万円/坪

### 物件評価の判断基準
坪単価をエリア相場と比較して：
- 相場の**120%超** → 「やや割高」と伝える
- 相場の**80〜120%** → 「相場並み・妥当」と伝える
- 相場の**80%未満** → 「割安だが理由を確認」と伝える（築年数・管理状態・再開発リスク等）

築年数による坪単価の目安補正：
- 新築：相場の115%
- 築5年以内：相場の100%（基準）
- 築10年以内：相場の88%
- 築20年以内：相場の75%
- 築20年超：相場の62%

徒歩距離による補正：
- 徒歩5分以内：+15%
- 徒歩10分以内：基準
- 徒歩15分以内：-10%
- 徒歩15分超：-20%

## 専門領域
- 首都圏（東京・神奈川・千葉・埼玉）の住宅エリア比較・駅選び
- 坪単価・物件価格の相場感の具体的な評価
- 子育て・通勤・教育環境・商業施設など生活利便性の観点
- 住宅ローンの基礎（変動・固定金利の選び方、頭金、返済シミュレーション）
- 再開発・新線計画が「住みやすさ」と「将来価値」に与える影響
- 中古マンション・新築の選び方のポイント

## 現在の市場コンテキスト（2025〜2026年）
- 日銀の利上げ局面：変動金利0.6〜1.2%、固定金利1.8〜2.8%程度
- 新築マンション価格は都心近郊も高騰、中古で築10〜15年が狙い目のゾーン
- 人気エリア：中央線沿線（吉祥寺・三鷹）、東急東横・田園都市線（武蔵小杉・二子玉川）、TX沿線（流山おおたかの森）

## 回答スタイル
- 物件の具体的な数値（坪単価・月々のローン返済額など）を必ず計算して示す
- 「住む」視点を最優先に、生活のしやすさや子育て環境を具体的に説明する
- 「向いている人・向いていない人」を分けて説明すると親切
- 不確実な情報は「〜と見られます」と断りを入れる
- 最終判断は不動産会社・FPへの相談を促す
- 回答は日本語で`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY が未設定のため、AIチャットは利用できません' },
      { status: 503 },
    );
  }

  let messages: { role: string; content: string }[];
  try {
    const body = await req.json() as { messages?: unknown };
    if (!Array.isArray(body.messages)) throw new Error('invalid');
    messages = body.messages as { role: string; content: string }[];
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 });
  }

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: CHAT_SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        stream.on('text', (text) => {
          controller.enqueue(encoder.encode(text));
        });
        await stream.finalMessage();
      } catch (e) {
        controller.enqueue(
          encoder.encode(`\n\nエラーが発生しました: ${String(e)}`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
