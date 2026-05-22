import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 新型キャッシング機構を有効化（Next.js 16+）
  cacheComponents: true,

  // キャッシュライフサイクル設定
  cacheLife: {
    // 週次更新向けプロファイル
    weekly: {
      stale: 300,        // 5分間クライアント側でキャッシュ
      revalidate: 604800, // 1週間後に背景更新
      expire: 2592000,   // 30日後に完全削除
    },
  },
};

export default nextConfig;
