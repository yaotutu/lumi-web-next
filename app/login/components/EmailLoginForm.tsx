"use client";

/**
 * 邮箱验证码登录表单
 *
 * 功能：
 * - 邮箱输入
 * - 发送验证码（60秒倒计时）
 * - 验证码输入（4位数字）
 * - 登录
 * - Loading 状态
 * - 错误提示
 *
 * 用户体验：
 * - 验证码输入框自动聚焦
 * - 发送验证码后显示倒计时
 * - 登录成功后跳转到 redirect 参数指定的页面
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isSuccess, getErrorMessage } from "@/lib/utils/api-helpers";

/**
 * 倒计时秒数
 */
const COUNTDOWN_SECONDS = 60;

export default function EmailLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  // 表单状态
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    // 清除之前的错误
    setError("");

    // 验证邮箱格式
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("邮箱格式不正确");
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // JSend 格式判断
      if (isSuccess(data)) {
        // 发送成功
        setCodeSent(true);
        setCountdown(COUNTDOWN_SECONDS);
        setError("");
      } else {
        throw new Error(getErrorMessage(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setIsSendingCode(false);
    }
  };

  /**
   * 登录
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的错误
    setError("");

    // 验证输入
    if (!email) {
      setError("请输入邮箱");
      return;
    }
    if (!code) {
      setError("请输入验证码");
      return;
    }
    if (code.length !== 4) {
      setError("验证码必须是4位数字");
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      // JSend 格式判断
      if (isSuccess(data)) {
        // 登录成功，跳转
        router.push(redirect);
        router.refresh(); // 刷新服务端组件
      } else {
        throw new Error(getErrorMessage(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 邮箱输入 */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-muted mb-2"
        >
          邮箱
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-surface-1 border border-surface-3 rounded-lg text-text-strong placeholder:text-text-subtle focus:outline-none focus:border-accent-yellow transition-colors"
          disabled={isLoggingIn}
          required
        />
      </div>

      {/* 发送验证码按钮 */}
      <button
        type="button"
        onClick={handleSendCode}
        disabled={isSendingCode || countdown > 0 || isLoggingIn}
        className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSendingCode
          ? "发送中..."
          : countdown > 0
            ? `${countdown}秒后可重新发送`
            : codeSent
              ? "重新发送验证码"
              : "发送验证码"}
      </button>

      {/* 验证码输入 */}
      {codeSent && (
        <div className="fade-in-up">
          <label
            htmlFor="code"
            className="block text-sm font-medium text-text-muted mb-2"
          >
            验证码
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => {
              // 只允许输入数字，最多4位
              const value = e.target.value.replace(/\D/g, "").slice(0, 4);
              setCode(value);
            }}
            placeholder="0000"
            maxLength={4}
            className="w-full px-4 py-3 bg-surface-1 border border-surface-3 rounded-lg text-text-strong placeholder:text-text-subtle focus:outline-none focus:border-accent-yellow transition-colors text-center text-2xl font-mono tracking-widest"
            disabled={isLoggingIn}
            required
          />
          <p className="mt-2 text-xs text-text-subtle text-center">
            请输入邮箱收到的4位验证码
          </p>
        </div>
      )}

      {/* 登录按钮 */}
      {codeSent && (
        <button
          type="submit"
          disabled={isLoggingIn || code.length !== 4}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed fade-in-up"
        >
          {isLoggingIn ? "登录中..." : "登录"}
        </button>
      )}
    </form>
  );
}
