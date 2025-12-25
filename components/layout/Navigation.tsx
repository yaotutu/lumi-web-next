"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authActions, useIsLoaded, useUser } from "@/stores/auth-store";
import { apiPost } from "@/lib/api-client";

type NavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "首页", href: "/" },
  { label: "3D工作台", href: "/workspace" },
  { label: "历史记录", href: "/history" },
  { label: "打印机", href: "/printers" },
];

function IconAI3DGlyph() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-5 w-5 text-[var(--accent-yellow)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 19 12 5l6 14" />
      <path d="m8.5 14.5 7-3" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5" />
      <path d="M5 15.5h14" />
      <path d="M12 19.5a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const isLoaded = useIsLoaded();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 检查点击是否在菜单外部
      if (!target.closest("[data-user-menu]")) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showUserMenu]);

  // 退出登录
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // 调用后端代理接口退出登录
      await apiPost('/api/auth/logout', {});

      // 清除前端状态（无论登出接口成功与否）
      authActions.resetAuth();
      setShowUserMenu(false);
      // 先跳转，再刷新
      router.push("/");
      // 延迟一点时间，确保跳转完成后再刷新
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (error) {
      console.error("退出登录失败：", error);
      // 即使登出接口失败，也清除前端状态
      authActions.resetAuth();
      setShowUserMenu(false);
      router.push("/");
      setTimeout(() => {
        router.refresh();
      }, 100);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky inset-x-0 top-0 z-50 pt-3">
      <div className="mx-auto flex w-full max-w-[1600px] items-center px-3">
        <div className="flex h-[52px] w-full items-center justify-between rounded-[6.25rem] border border-white-5 bg-gradient-to-r from-white-5/40 to-white-5/20 px-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-[24px]">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/10">
                <IconAI3DGlyph />
              </span>
              <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-foreground">
                AI3D
              </span>
            </Link>
            <nav className="flex items-center gap-7 text-[13px] text-foreground-subtle">
              {NAV_LINKS.map(({ label, href }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`relative font-medium transition-colors duration-200 ${
                      isActive ? "text-foreground" : "hover:text-foreground"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-yellow-1" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 whitespace-nowrap text-xs font-medium">
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border-subtle text-foreground-subtle transition-all duration-200 hover:border-yellow-1/60 hover:bg-yellow-1/5 hover:text-yellow-1 md:flex"
            >
              <IconBell />
            </button>

            {/* 用户菜单 */}
            {!isLoaded ? (
              // 加载中
              <div className="h-9 w-24 animate-pulse rounded-full bg-surface-3" />
            ) : user ? (
              // 已登录：显示用户名和下拉菜单
              <div className="relative" data-user-menu>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-9 items-center justify-center gap-2 rounded-full border border-border-subtle px-5 text-[13px] font-medium text-foreground transition-all duration-200 hover:border-yellow-1/60 hover:bg-yellow-1/5 hover:text-yellow-1"
                >
                  <span className="max-w-[150px] truncate">{user.name || user.email || user.id}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border-subtle bg-surface-2/95 backdrop-blur-sm shadow-lg">
                    <div className="p-3 border-b border-border-subtle">
                      <p className="text-xs text-text-muted">登录身份</p>
                      <p className="mt-1 text-sm text-text-strong truncate">
                        {user.name || user.email || user.id}
                      </p>
                    </div>
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-3 hover:text-text-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? "退出中..." : "退出登录"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 未登录：显示登录按钮
              <Link
                href="/login"
                className="flex h-9 items-center justify-center rounded-full border border-border-subtle px-5 text-[13px] font-medium text-foreground transition-all duration-200 hover:border-yellow-1/60 hover:bg-yellow-1/5 hover:text-yellow-1"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
