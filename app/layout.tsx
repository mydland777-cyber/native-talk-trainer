import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ことばパスポート",
  description: "旅行で使える翻訳アプリ",
  applicationName: "ことばパスポート",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ことばパスポート",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}