# Design Tokens

A shared design reference for reproducing **Tripo Studio**’s visual system inside our Next.js project. Tokens map directly to Tailwind `@theme` keys so the class names (for example `bg-surface-2`, `text-foreground-subtle`, `shadow-glass`) stay semantic.

## Color Palette

| Token | Value | Notes |
| --- | --- | --- |
| `background` | `#050506` | Global page background, deep neutral used beneath gradients.
| `surface-1` | `#0C0D10` | Dark cards and lower elevation panels.
| `surface-2` | `#101114` | Default surface for cards and sections.
| `surface-3` | `#1B1D20` | Highest elevation/darker contrast banding.
| `overlay` | `rgba(255,255,255,0.03)` | Glass highlight overlay for translucent panels.
| `foreground` | `#F2F2F2` | Primary text color.
| `foreground-muted` | `rgba(255,255,255,0.68)` | Secondary text, supporting copy.
| `foreground-subtle` | `rgba(255,255,255,0.4)` | Tertiary text, captions.
| `yellow-1` | `#F9CF00` | Brand accent, CTA emphasis, glow effects.
| `purple-1` | `#503BE3` | Left hero gradient + pill buttons.
| `pink-1` | `#FB23C2` | Gradient partner color, highlight borders.
| `blue-2` | `#1CA1F1` | Secondary accent for charts, empty states.
| `green-1` | `#3FDD78` | Success states / progress chips.
| `red-1` | `#FF3E3E` | Error toasts, warnings.
| `orange-1` | `#FB923C` | Supplementary accent (prompts, stats).
| `white-5` | `rgba(255,255,255,0.05)` | Subtle surface tint, borders.
| `white-10` | `rgba(255,255,255,0.1)` | Divider lines, inset strokes.
| `white-20` | `rgba(255,255,255,0.2)` | Hover states, icon containers.
| `black-40` | `rgba(0,0,0,0.4)` | Shadows on bright elements.
| `black-60` | `rgba(0,0,0,0.6)` | High contrast outlines on bright backgrounds.

All values are defined in `app/globals.css` so Tailwind generates utilities like `bg-surface-2`, `text-foreground-muted`, `border-border-subtle`, etc.

## Radii

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `0.75rem` | Chips, small inputs.
| `radius-md` | `1rem` | Medium cards, buttons.
| `radius-lg` | `1.25rem` | Default panel/card radius.
| `radius-xl` | `2rem` | Hero callouts, large modals.
| `radius-pill` | `6.25rem` | Navigation pills, CTA buttons.

## Shadows & Blur

| Token | Value | Notes |
| --- | --- | --- |
| `shadow-glass` | `0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px rgba(0,0,0,0.45)` | Primary elevated glass card shadow.
| `shadow-soft` | `0 12px 45px rgba(0,0,0,0.4)` | Secondary surface shadow (less blur).
| `shadow-glow-yellow` | `0 0 36px rgba(249,207,0,0.45)` | Applied on CTA hover states.
| `blur-glass` | `40px` | Backdrop blur strength for frosted panels.

## Background Treatments

- **Gradient stack (body)**: radial accent spots from `purple-1`, `pink-1`, `yellow-1` layered over a `160°` linear gradient transitioning from `surface-2` → `background` → `surface-3`.
- **Noise overlay**: SVG fractal noise tiled at `320px`, blended with `mix-blend-mode: screen` for subtle texture.
- Utility `.glass-panel` combines the overlay gradient, `shadow-glass` and blur to recreate Tripo’s frosted glass cards.

## Typography

- `--font-sans`: `Geist Sans` (via `next/font`), serves as the default UI font.
- `--font-mono`: `Geist Mono` for code-like elements when needed.
- Global body styles enforce antialiased rendering and `line-height: 1.5` to mirror the source site’s vertical rhythm.

## Iconography

Tripo Studio relies on a custom glyph set (`i-tripo:*`). We will recreate equivalent icons as inline SVG assets under `components/icons/` with matching stroke weights (16dp grid, 1.5px stroke). Navigation will get bespoke icons first (bolt, bell, contact, generate). Tokens above supply consistent colors (`foreground-subtle` for default, `yellow-1` or gradients for active states).

## Utilities

Custom utilities added in `app/globals.css`:

- `.glass-panel`: Frosted glass surface with gradient overlay and blur.
- `.surface-card`: Opaque dark surface with soft shadow.
- `.border-gradient-yellow`: Gradient stroke used around primary CTAs / featured cards.

These mirror frequently repeated patterns on the source page and keep component markup cleaner as we proceed.
