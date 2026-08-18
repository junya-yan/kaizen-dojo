import type { Metadata, Viewport } from "next";
import { M_PLUS_1_Code, Zen_Kaku_Gothic_New } from "next/font/google";

import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-zen-kaku",
  display: "swap",
});

const mplusCode = M_PLUS_1_Code({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mplus-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kaizen-dojo — 品質検査ドリル",
  description:
    "「動く」を「安心して使える」に変える力を鍛える、ソフトウェア品質学習アプリ。テストも通り、手元では正しく動いているコードから、まだ見えていないリスクを見つける訓練をする。",
};

export const viewport: Viewport = {
  themeColor: "#e9ebe6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${mplusCode.variable}`}>
      <body>{children}</body>
    </html>
  );
}
