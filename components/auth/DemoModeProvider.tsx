"use client";

/**
 * 演示模式自动登录提供者
 *
 * 作用：在演示模式下自动登录用户
 * 特性：
 * - 页面加载时自动执行演示登录
 * - 确保演示用户身份始终有效
 * - 提供演示状态指示
 */

import { useEffect, useState } from "react";
import { useUser } from "@/stores/auth-store";
import { autoLoginDemo } from "@/lib/auth-client";

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const user = useUser();

  useEffect(() => {
    // 演示模式自动登录
    const performAutoLogin = async () => {
      if (isDemoMode && !autoLoginAttempted) {
        console.log("演示模式：执行自动登录...");
        setAutoLoginAttempted(true);

        try {
          const demoUser = await autoLoginDemo();
          if (demoUser) {
            console.log("演示模式：自动登录成功", demoUser);
          } else {
            console.error("演示模式：自动登录失败");
          }
        } catch (error) {
          console.error("演示模式：自动登录异常", error);
        }
      }
    };

    performAutoLogin();
  }, [isDemoMode, autoLoginAttempted]);

  return (
    <>
      {children}

      {/* 演示模式指示器 */}
      {isDemoMode && user && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium shadow-lg animate-pulse">
          演示模式 - {user.email}
        </div>
      )}
    </>
  );
}