"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "首页", href: "/" },
  { label: "3D工作台", href: "/workspace" },
  { label: "资产", href: "/assets" },
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
                AI3D STUDIO
              </span>
            </Link>
            <nav className="hidden items-center gap-7 text-[13px] text-foreground-subtle lg:flex">
              {NAV_LINKS.map(({ label, href }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`relative font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-foreground"
                        : "hover:text-foreground"
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

            <Link
              href="/auth"
              className="flex h-9 items-center justify-center rounded-full border border-border-subtle px-5 text-[13px] font-medium text-foreground transition-all duration-200 hover:border-yellow-1/60 hover:bg-yellow-1/5 hover:text-yellow-1"
            >
              Sign up/Log in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
