# CrestFlow Design Context

## Mode: PRESERVE, NOT REDESIGN
CrestFlow is a freelancing client manager with an established UI. The existing
look is the source of truth. Your job is to match it, not improve it. Where
Impeccable's general taste conflicts with this file, THIS FILE WINS.
Before any UI work, read the existing CSS variables / Tailwind config /
components and reuse them. Never add a new hex, font, or button style.

## Overrides of Impeccable defaults
- Do NOT convert the palette to OKLCH or re-derive colors. Keep the current tokens.
- Do NOT swap the current font family, even if it is one Impeccable flags.
  Use the font already in the app, with the existing sizes and weights.
- Do NOT run a "bolder", "overdrive", "delight", or "colorize" pass. Those
  commands are disabled for this project.
- Do NOT add motion beyond a plain background-color hover transition.

## Brand personality
Flat, restrained, professional SaaS tool. Hierarchy comes from spacing, weight,
and gray tones, not color. A person should believe every line of CSS was
written by hand.

## Palette (only these)
- Sidebar: deep navy (~#0F172A), muted slate text (~#CBD5E1), white brand name
- Active nav item: indigo (~#4F46E5), white text
- Page: white / #F8FAFC. Cards and tables: white, 1px #E5E7EB border
- Primary text: near-black navy (~#0F172A). Secondary text and table headers:
  slate (~#64748B)
- Primary button: indigo (~#4F46E5). Secondary button: blue (~#2563EB)
- Retainer / sub-client badge: tint #F3E8FF, text #7E22CE
- Invoiced status: tint #DCFCE7, text #15803D
- Delete: red (~#DC2626)
- Streak chip: soft amber/cream with amber border, orange flame icon
- Watch Preview pill: soft indigo tint, indigo text
Color carries meaning only: status, category, action, danger. Never decoration.
Dark mode uses the same navy/slate family via the existing theme tokens.
Never hardcode colors in components. Hex values above are approximate; the
codebase tokens are authoritative.

## Buttons
- Primary: solid indigo, white text. Secondary: solid blue, white text
- Neutral (Sort, Show Closed): flat light-gray background, slate text
- Icon buttons (edit, delete, play, open): no background, gray icon, red for
  delete, faint gray background on hover only
- No borders, rings, or outlines on buttons (`border: none`). Keep default
  keyboard focus behavior, no decorative colored focus rings
- Hover/active: plain darker shade of the same color. No scale, lift,
  translate, shine, or animated underline
- Transition: `background-color 120ms ease` only
- Radius ~8px, padding ~8px 14px, font weight 500, no uppercase or tracking
- Disabled: 50% opacity, default cursor
- Reuse the existing button component. If none fits, ask.

## Typography
- Existing font only. No new imports, no mono "techy" accents, no gradient text
- Table headers: small, uppercase, letter-spaced, slate
- No oversized headings, text shadows, or glow

## Forbidden
Gradients (anywhere), glassmorphism/backdrop-blur, glow or colored shadows,
emoji as icons, sparkle/robot/"AI" icons or badges, decorative blobs or
patterns, card hover-lift, nested cards, pill-everything styling, radius >12px,
neon or saturated accent combos, shimmer/pulse/float/bounce animations,
colored side-stripe borders on cards, and marketing-style microcopy
("Let's go!", "Get started"). Use plain labels like "Save", "Log Work".

## Before finishing any task
Diff your changes and confirm: no new hex values, no gradients, no new fonts,
no new shadows, no new button styles. If a request seems to need any of these,
STOP and ask instead of improvising.
