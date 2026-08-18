import type { NextConfig } from "next";

/**
 * GitHub Pages 向けの静的エクスポート設定。
 *
 * 通常のビルド（Vercel など、サーバーが動く環境向け）ではこの分岐は素通りし、
 * 今までどおり /api/grade がサーバーレス関数として動く。
 *
 * NEXT_STATIC_EXPORT=true を付けてビルドしたときだけ、GitHub Pages のような
 * 静的ホスティング向けに `output: "export"` を有効にする。採点APIはサーバーが
 * 必要なので静的エクスポートでは動かせない。ビルド前に `src/app/api` ごと除外する
 * 運用にしている（.github/workflows/deploy-pages.yml 参照）ので、ここでは
 * サブパス（プロジェクトページの /<repo-name>/ 配下）の解決だけを担当する。
 */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        basePath: basePath || undefined,
        assetPrefix: basePath ? `${basePath}/` : undefined,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
