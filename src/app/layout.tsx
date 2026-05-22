import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "すまいコンパス｜首都圏 住宅購入サポート",
  description: "中央線・東急・埼京線など首都圏の駅ごとに坪単価推移・再開発情報・AI相談をまとめて確認。住宅購入の判断をデータで支えます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
