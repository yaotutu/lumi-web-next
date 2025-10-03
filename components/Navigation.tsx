import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/home", active: true },
  { label: "3D Workspace", href: "/workspace/generate" },
  { label: "Assets", href: "/assets" },
  {
    label: "Affiliate Program",
    href: "https://www.tripo3d.ai/affiliate",
    external: true,
  },
];

function IconTripoGlyph() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-5 w-5 text-[var(--accent-yellow)]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2.75a1 1 0 0 1 .86.49l7.5 12.5a1 1 0 0 1-.86 1.51H4.5a1 1 0 0 1-.86-1.51l7.5-12.5a1 1 0 0 1 .86-.49ZM12 6.36 7.7 13.75h8.6L12 6.36Z" />
    </svg>
  );
}

function IconArrowBack() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2.75a1 1 0 0 1 .95.68l1.44 4.45 4.55 1.46a1 1 0 0 1 0 1.9l-4.55 1.46-1.44 4.45a1 1 0 0 1-1.9 0l-1.44-4.45-4.55-1.46a1 1 0 0 1 0-1.9l4.55-1.46 1.44-4.45a1 1 0 0 1 .9-.68Z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M14.57 2.94a1 1 0 0 1 .9 1.46l-1.98 3.66h4.01a1 1 0 0 1 .75 1.65L10.8 21.06a1 1 0 0 1-1.77-.92l1.83-5.14H6.63a1 1 0 0 1-.86-1.51l7.2-10.2a1 1 0 0 1 .6-.35Z" />
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

function IconContact() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      focusable="false"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 8h6" />
      <path d="M7 12h10" />
      <path d="M7 16h8" />
      <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
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
                <IconTripoGlyph />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.32em] text-foreground-subtle">
                TRIPO STUDIO
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
            <Link
              href="https://www.tripo3d.ai/app/home"
              target="_blank"
              rel="noreferrer"
              className="ml-4 hidden items-center gap-1 rounded-[6.25rem] px-3 py-1 text-foreground-subtle transition-colors hover:text-foreground md:flex"
            >
              <IconArrowBack />
              <span className="truncate">Tripo Lite Version</span>
            </Link>

            <button
              type="button"
              className="flex h-9 items-center justify-center gap-1 rounded-[6.25rem] bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-pink)] to-[var(--accent-purple)] px-4 text-[13px] font-semibold text-white shadow-[0_12px_32px_rgba(80,59,227,0.35)] transition hover:opacity-90"
            >
              <IconSpark />
              Generate 3D Models
            </button>

            <div className="hidden items-center gap-2 overflow-hidden rounded-[6.25rem] border border-border-subtle bg-[rgba(16,17,20,0.68)] pl-3 pr-2 text-foreground-subtle md:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-yellow)] text-[13px] font-semibold text-black">
                <IconBolt />
              </span>
              <span className="pr-3 text-[13px]">?</span>
              <div className="relative flex items-center">
                <span className="absolute -inset-[1px] rounded-[6.25rem] bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-40" />
                <button
                  type="button"
                  className="relative flex h-8 items-center justify-center gap-1 rounded-[6.25rem] bg-white/10 px-3 text-[12px] font-semibold text-foreground transition hover:bg-white/20"
                >
                  Upgrade
                </button>
              </div>
            </div>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-[1.5rem] border border-border-subtle text-foreground-subtle transition hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)] md:flex"
            >
              <IconBell />
            </button>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-[1.5rem] border border-border-subtle text-foreground-subtle transition hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)] md:flex"
            >
              <IconContact />
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
