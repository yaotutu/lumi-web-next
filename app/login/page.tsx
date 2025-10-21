/**
 * 登录页面
 * 路径：/login
 *
 * 功能：
 * - 邮箱验证码登录
 * - 支持 redirect 参数（登录后跳转）
 *
 * 设计：
 * - 深色主题（专业 3D 工具风格）
 * - 居中卡片布局
 * - 黄色主题色
 */

import { Suspense } from "react";
import EmailLoginForm from "./components/EmailLoginForm";

export const metadata = {
  title: "登录 - Lumi",
  description: "登录 Lumi 3D 模型生成平台",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-yellow/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-yellow/5 rounded-full blur-3xl" />
      </div>

      {/* 登录卡片 */}
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 fade-in-up">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-strong mb-2">
              欢迎来到 Lumi
            </h1>
            <p className="text-text-subtle">AI 3D 模型生成平台</p>
          </div>

          {/* 登录表单 */}
          <Suspense fallback={<FormSkeleton />}>
            <EmailLoginForm />
          </Suspense>

          {/* 底部提示 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-subtle">
              登录即表示您同意我们的{" "}
              <a href="#" className="text-accent-yellow hover:underline">
                服务条款
              </a>{" "}
              和{" "}
              <a href="#" className="text-accent-yellow hover:underline">
                隐私政策
              </a>
            </p>
          </div>
        </div>

        {/* 开发环境提示 */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-4 bg-surface-2 rounded-lg border border-accent-yellow/20">
            <p className="text-sm text-text-muted text-center">
              <span className="text-accent-yellow">开发环境提示：</span>
              验证码固定为 <span className="font-mono font-bold">0000</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 表单加载骨架屏
 */
function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 邮箱输入框 */}
      <div>
        <div className="h-4 w-16 bg-surface-3 rounded mb-2" />
        <div className="h-12 bg-surface-3 rounded-lg" />
      </div>

      {/* 发送验证码按钮 */}
      <div className="h-12 bg-surface-3 rounded-lg" />

      {/* 验证码输入框 */}
      <div>
        <div className="h-4 w-16 bg-surface-3 rounded mb-2" />
        <div className="h-12 bg-surface-3 rounded-lg" />
      </div>

      {/* 登录按钮 */}
      <div className="h-12 bg-surface-3 rounded-lg" />
    </div>
  );
}
