import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "智览时政",
  description: "海内外新闻智能聚合与多视角分析平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
