import Link from "next/link";

const NAV_LINKS = [
  { label: "首页", href: "/", active: true },
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
  return (
    <header className="sticky inset-x-0 top-0 z-50 pt-4">
      <div className="mx-auto flex w-full max-w-[1600px] items-center px-3">
        <div className="glass-panel flex h-14 w-full items-center justify-between !rounded-[6.25rem] px-4">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <IconAI3DGlyph />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.32em] text-foreground-subtle">
                AI3D STUDIO
              </span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-foreground-subtle lg:flex">
              {NAV_LINKS.map(({ label, href, active, external }) => (
                <Link
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className={`transition-colors ${
                    active
                      ? "text-foreground"
                      : "hover:text-foreground text-foreground-subtle"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 whitespace-nowrap text-xs font-medium">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-[1.5rem] border border-border-subtle text-foreground-subtle transition hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)] md:flex"
            >
              <IconBell />
            </button>

            <Link
              href="/auth"
              className="flex h-9 items-center justify-center rounded-[6.25rem] border border-border-subtle px-4 text-[13px] text-foreground transition hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)]"
            >
              Sign up/Log in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
