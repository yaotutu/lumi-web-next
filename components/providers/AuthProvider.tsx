"use client";

import { useEffect } from "react";
import { useIsLoaded, authActions } from "@/stores/auth-store";

/**
 * 认证状态初始化组件
 * 在应用启动时自动加载用户认证状态
 *
 * 职责：
 * - 在应用最顶层初始化用户认证状态
 * - 确保所有子组件都能访问到已初始化的用户信息
 * - 解决组件间认证状态时序问题
 */
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoaded = useIsLoaded();

  useEffect(() => {
    console.log("🚀 [AuthProvider] 初始化认证状态", { isLoaded });
    if (!isLoaded) {
      authActions.refreshAuth().then(() => {
        console.log("✅ [AuthProvider] 认证状态初始化完成");
      });
    }
  }, [isLoaded]);

  return <>{children}</>;
}
