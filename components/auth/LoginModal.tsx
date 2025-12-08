"use client";

/**
 * 全局登录弹窗组件
 *
 * 功能：
 * - 响应全局登录状态，显示/隐藏弹窗
 * - 复用邮箱验证码登录逻辑
 * - 登录成功后执行回调（如重试失败的请求）
 * - 自动刷新认证状态
 *
 * 设计：
 * - 居中显示
 * - 遮罩层（点击关闭）
 * - ESC 键关闭
 * - 登录成功后自动关闭
 */

import { useEffect, useState } from "react";
import { getErrorMessage, isSuccess } from "@/lib/utils/api-helpers";
import { authActions } from "@/stores/auth-store";
import { loginModalActions, useLoginModal } from "@/stores/login-modal-store";

/**
 * 倒计时秒数
 */
const COUNTDOWN_SECONDS = 60;

/**
 * 登录弹窗内容组件
 * 复用 EmailLoginForm 的逻辑，但适配弹窗模式
 */
function LoginModalContent() {
  const { onSuccess } = useLoginModal();

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
        // 登录成功
        // 1. 刷新认证状态
        await authActions.refreshAuth();

        // 2. 执行成功回调（如重试失败的请求）
        if (onSuccess) {
          await onSuccess();
        }

        // 3. 关闭弹窗
        loginModalActions.close();
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
          htmlFor="modal-email"
          className="block text-sm font-medium text-text-muted mb-2"
        >
          邮箱
        </label>
        <input
          id="modal-email"
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
            htmlFor="modal-code"
            className="block text-sm font-medium text-text-muted mb-2"
          >
            验证码
          </label>
          <input
            id="modal-code"
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

      {/* 在完整页面登录链接 */}
      <div className="text-center">
        <a
          href="/login"
          className="text-sm text-text-subtle hover:text-accent-yellow transition-colors"
        >
          在完整页面登录
        </a>
      </div>
    </form>
  );
}

/**
 * 全局登录弹窗组件
 */
export default function LoginModal() {
  const { isOpen, context } = useLoginModal();
  const [isDemoMode, setIsDemoMode] = useState(true);

  // 演示模式下禁用登录弹窗
  if (isDemoMode) {
    return null; // 不渲染任何内容
  }

  // ESC 键关闭弹窗
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        loginModalActions.close();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // 弹窗未打开，不渲染
  if (!isOpen) {
    return null;
  }

  // 根据上下文显示不同的标题
  const getTitle = () => {
    switch (context) {
      case "workspace":
        return "登录后继续创作";
      case "gallery":
        return "登录后继续操作";
      case "history":
        return "登录后查看历史记录";
      default:
        return "欢迎回来";
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 fade-in"
        onClick={() => loginModalActions.close()}
      />

      {/* 弹窗内容 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="glass-panel w-full max-w-md p-8 fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-strong mb-2">
              {getTitle()}
            </h2>
            <p className="text-sm text-text-subtle">
              使用邮箱验证码登录，无需密码
            </p>
          </div>

          {/* 登录表单 */}
          <LoginModalContent />
        </div>
      </div>
    </>
  );
}
