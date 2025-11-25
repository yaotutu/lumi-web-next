import type { Metadata } from "next";
import "./globals.css";

// 移除自定义字体配置,使用系统默认字体以兼容 Turbopack
export const metadata: Metadata = {
  title: "AI3D",
  description: "AI 3D 模型生成平台 - 输入文字描述，一键生成高质量3D模型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
