import type { Metadata } from "next";
import "./globals.css";
// 全局认证状态初始化
import AuthProvider from "@/components/providers/AuthProvider";
// 全局登录弹窗组件
import LoginModal from "@/components/auth/LoginModal";
// 全局 Toast 组件
import GlobalToast from "@/components/ui/GlobalToast";

// 移除自定义字体配置,使用系统默认字体以兼容 Turbopack
export const metadata: Metadata = {
  title: "AI3D",
  description: "AI 3D 模型生成平台 - 输入文字描述,一键生成高质量3D模型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* 全局认证状态初始化 */}
        <AuthProvider>
          {/* 页面内容 */}
          {children}

          {/* 全局登录弹窗（响应 API 401 错误） */}
          <LoginModal />

          {/* 全局 Toast 提示 */}
          <GlobalToast />
        </AuthProvider>
      </body>
    </html>
  );
}
