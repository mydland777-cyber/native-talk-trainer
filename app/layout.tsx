import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Sans_SC, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-sc",
});

export const metadata: Metadata = {
  title: "Native Talk Trainer",
  description: "個人用の外国語学習Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${nunito.variable} ${notoSansKr.variable} ${notoSansSc.variable}`}
        style={{
          fontFamily:
            "var(--font-nunito), var(--font-noto-sans-sc), var(--font-noto-sans-kr), sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}