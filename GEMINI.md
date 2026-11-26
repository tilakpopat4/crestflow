# CrestFlow Design Context

## Mode: SECTION 9 VISUAL SYSTEM
CrestFlow uses one unified, high-contrast studio palette across Landing, Sign-In, Pricing, and the App. Before any UI work, read `src/index.css` `@theme` tokens and reuse them.

## Design Tokens (Exact Approved Palette)
- Canvas: `#0B0B0E`
- Surface: `#131318`
- Raised: `#1B1B22`
- Line / border: `#2A2A33`
- Primary text: `#F7F7F8`
- Muted / secondary text: `#A1A1AA`
- Brand fill: `#E0002B` (white text `#F7F7F8`)
- Brand highlight / hover glow: `#FF2D4A`
- Gold accent: `#FFC145` (**ONLY** on Pro badge, metric totals, and trial progress)
- Success: `#2DD4A0` (e.g. Paid status chip)
- Warning: `#FFB020` (e.g. Pending status chip)
- Danger: `#F0607A` (used with icon + text, e.g. Overdue status chip / error messages — NEVER `#E0002B` as a fill for errors)

## Typography (Max 3 Families, 3 Weights)
- Condensed display (`Anton`, weight 400, self-hosted with `font-display: swap`): marketing headlines and big dashboard KPI numbers **only**.
- UI (`Inter`): interface body and headings.
- Monospace (`JetBrains Mono` / system monospace): table numerals and tabular figures (`tabular-nums`).

## Status Chips & Badges
- Paid: `#2DD4A0` (Mint)
- Pending: `#FFB020` (Amber)
- Overdue / Changes: `#F0607A` (Rose, icon + text)
- Gold `#FFC145`: strictly reserved for Pro badge, KPI totals, and trial progress bar/label.
- Streak / status indicator: plain text or calm `#1B1B22` chip with `#2A2A33` 1px line, zero emojis.

## Buttons, Motion & Radii
- Primary button: `#E0002B` fill, `#F7F7F8` text, subtle `#FF2D4A` hover glow (glow allowed **ONLY** on primary button hover, hero backdrop, and best-value pricing card).
- Secondary button: `#1B1B22` raised surface with `1px solid #2A2A33` line, `#F7F7F8` text.
- Clear keyboard focus rings (`outline` / `ring` using `#FF2D4A` or `#F7F7F8`).
- Spacing & radii: consistent `8px` spacing unit, max 2 corner radii (`8px` and `12px`).
- Motion: short, subtle (`150ms`–`250ms`), number count-up on dashboard KPIs; completely disabled under `prefers-reduced-motion`.
- Accessibility: WCAG AA contrast everywhere; zero emojis anywhere in the UI.

## Before finishing any task
Diff your changes and confirm: tokens match `#0B0B0E`/`#131318`/`#1B1B22`/`#2A2A33`/`#E0002B`/`#FF2D4A`/`#FFC145`/`#2DD4A0`/`#FFB020`/`#F0607A`, gold and glow are scoped strictly to allowed elements, and max 3 font families / 3 weights are used.
