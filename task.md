# CrestFlow Project Tasks & Design Context

## Design Context

### Users & Purpose
- **Target Audience:** Freelance video editors, creative producers, digital contractors, and independent creative agencies.
- **Context of Use:** Fast-paced daily client work tracking, itemized deliverable logging, client relationship management, and billing cycle reconciliation.
- **Job to be Done:** Replaces messy spreadsheets, manual invoice calculations, and lost deliverable links with a unified, high-performance workspace managing the complete lifecycle from inquiry to payment clearance.
- **Emotional Goal:** Calm, confidence, precision, and focus. The interface must feel reliable and clutter-free, reducing financial anxiety with clear, straightforward data presentation.

### Brand Personality
- **3-Word Personality:** Flat, Restrained, Utilitarian.
- **Voice & Tone:** Direct, understated, professional SaaS tool. Copy is plain and functional ("Save", "Log Work", "Export PDF") rather than marketing-driven or chirpy ("Let's go!", "Get started"). A user should feel every line of CSS was intentionally written by hand.
- **Anti-References:** Web3/crypto glow dashboards, playful cartoonish SaaS tools with pastel pill badges everywhere, heavy glassmorphism/backdrop-blur cards, and distracting bouncy motion.

### Aesthetic Direction
- **Visual Mode:** **PRESERVE, NOT REDESIGN.** The existing look is the single source of truth.
- **Color Discipline:** 
  - Neutral grays and slate family for structure, typography, and calm states.
  - Color is strictly semantic and reserved for items needing attention: Indigo (`#4F46E5`) for primary actions and Paid status; Blue (`#2563EB`) for secondary actions; Red (`#DC2626`) for danger/delete and Overdue status.
  - Zero decorative gradients, neon combos, or pastel pill backgrounds.
- **Status & Badges:** Plain 13px text (weight 500, no background pills, no borders). Optional 6px solid dot preceding the label. Never use color alone to distinguish table rows; all tables must read clearly in grayscale.
- **Typography:** Existing sans-serif stack. Small, uppercase, letter-spaced slate table headers. No oversized headings, no mono "techy" accents, and no text shadows.
- **Buttons & Elevation:** Flat buttons with `border: none`, 8px radius, standard keyboard focus, and `background-color 120ms ease` transition only. No card lift, shadows, or floating animations.
- **Theming:** Full Light and Dark mode support mapped cleanly through existing navy/slate tokens.

### Core Design Principles
1. **Meaning Over Decoration:** Color carries meaning only (status, category, action, danger). If removing a color element does not diminish comprehension, remove it.
2. **Text Over Pills:** Show status, tags, and amounts as plain, legible typography rather than colored pill capsules with pastel fills.
3. **Restraint in Motion:** Limit animations to immediate, subtle `120ms` hover transitions. Eliminate decorative bounces, glows, shimmers, and scale effects.
4. **Data Preservation & Respect:** Expired, inactive, or closed accounts never destroy or hide historical invoices or work items. Historical data remains accessible, read-only, and downloadable.
5. **Utilitarian Hierarchy:** Visual prominence is achieved through spacing, typographic weight, and gray scale contrast rather than bright accents.
