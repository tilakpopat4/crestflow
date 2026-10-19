# Phase 5: Multi-Page Routing Architecture & Profile Settings Page

## Executive Objective
Transition CrestFlow from an in-memory tab-switched workspace with a popup modal for profile settings into a **true multi-page routing architecture**. Every primary area (`/dashboard`, `/clients`, `/work`, `/invoices`, `/reviews`, `/profile`, `/admin`) will have its own dedicated URL path with full browser history support (Back/Forward navigation, bookmarks, and deep-linking). Profile settings will be promoted from a constrained floating modal into a **spacious, first-class full-page experience** (`/profile`) organized into focused, modular settings cards.

---

## 1. Architectural Strategy & Route Mapping

### 1.1 Canonical Route Table
| Route Path | Legacy Alias | View / Page Component | Responsibility |
| :--- | :--- | :--- | :--- |
| `/` | `""` | Redirect to `/dashboard` | Root entry point for authenticated users. |
| `/dashboard` | `tab=dashboard` | `DashboardTab.tsx` | Overview, earnings stats, upcoming payments, quick actions. |
| `/clients` | `tab=clients` | `ClientsTab.tsx` | Client CRM, sub-clients, rates, contact info, client filter. |
| `/work` | `/work-log`, `tab=work` | `WorkLogTab.tsx` | Video & reel deliverable logging, production statuses, links. |
| `/invoices` | `/invoice`, `tab=invoice` | `InvoiceTab.tsx` | Invoice generator, UPI payment QR renderer, PDF exports. |
| `/reviews` | `tab=reviews` | `ReviewsTab.tsx` | Testimonials, client review approval queue, ratings. |
| `/profile` | `/settings`, modal | `ProfilePage.tsx` *(New)* | Full-page creator profile, UPI invoice settings, theme, API keys, subscription. |
| `/admin` | `?admin=true` | `AdminTab.tsx` | Merchant controls, plan pricing, user management, whitelist. |
| `/privacy` | `#/privacy` | `PrivacyPolicyPage.tsx` | Legal privacy policy. |
| `/terms` | `#/terms` | `TermsOfServicePage.tsx` | Terms of service. |
| `/contact` | `#/contact` | `ContactPage.tsx` | Support and contact inquiry page. |
| `/?freelancerId=:id` | — | `PublicFreelancerProfile.tsx` | Public client onboarding & portfolio. |
| `/?portal=client` | `#/portal` | `ClientPortal.tsx` | External client review & invoice settlement portal. |
| `/?feedback=true` | — | `ClientFeedbackForm.tsx` | Post-delivery client rating form. |

### 1.2 Routing Engine Decision: Zero-Dependency Browser History Router
- **Decision**: Implement a type-safe, lightweight history router (`src/lib/router.ts` / `useAppRouter.ts`) utilizing the standard HTML5 `window.history.pushState`, `window.history.replaceState`, and `popstate` event listeners.
- **Rationale**:
  1. **Zero React 19 Peer Dependency Conflicts**: Keeps `package.json` stable and avoids React 19 RC/mismatch flags.
  2. **Zero Bundle Bloat**: ~1.5 KB footprint vs ~45 KB for `react-router-dom`.
  3. **Seamless Framer Motion (`motion/react`) Integration**: Allows page transitions with `AnimatePresence` and custom reduced-motion guards without router wrapper friction.
  4. **Production Ready**: Already fully supported by `vercel.json` rewrite (`/(.*) -> /index.html`) and Vite dev server.

---

## 2. Work Breakdown & Implementation Tasks

### Task 1: Lightweight Routing & URL Navigation System
- **Files**: `src/lib/router.ts`, `src/hooks/useAppRouter.ts`
- **Actions**:
  - Create route parser and path resolver supporting:
    - Route matching (`/dashboard`, `/clients`, `/work`, `/invoices`, `/reviews`, `/profile`, `/admin`, `/privacy`, `/terms`, `/contact`).
    - Query parameter parsing (`?id=...`, `?q=...`, `?freelancerId=...`).
    - Path aliases (`/settings` -> `/profile`, `/work-log` -> `/work`, `/invoice` -> `/invoices`).
  - Implement `navigate(path, options)` with `pushState` / `replaceState` and instant popstate dispatch.
  - Support browser Back and Forward buttons with reactive state updates.

### Task 2: Dedicated Full-Page Profile Component (`ProfilePage.tsx`)
- **Directory**: `src/components/profile/` and `src/components/ProfilePage.tsx`
- **Actions**:
  - Replace constrained 388-line `ProfileModal.tsx` modal with a clean, spacious full page layout conforming strictly to `GEMINI.md` and `AGENTS.md` (no file exceeding 300 lines).
  - Decompose into focused subcomponents:
    1. `src/components/profile/ProfileHeader.tsx`: Page title, breadcrumb/back indicator, quick save action, last updated status.
    2. `src/components/profile/ProfileGeneralCard.tsx`: Full Name, Professional Title, Services Description, Bio/Experience, Freelance Start Date with work anniversary calculation.
    3. `src/components/profile/ProfileInvoicingCard.tsx`: UPI ID (with automatic invoice QR code explanation), Phone number, Client Onboarding Link with one-click copy.
    4. `src/components/profile/ProfilePreferencesCard.tsx`: App Appearance (Light, Dark, Auto) using existing `ThemeContext`, Gemini AI API key for automated work summarizer.
    5. `src/components/profile/ProfileSubscriptionCard.tsx`: CrestFlow Pro plan status, days remaining, active renewal date, and "Extend Plan" / "Subscribe" triggers.
  - Implement calm feedback: Non-intrusive inline "Saved" state when profile updates are committed to Firestore public + private collections.

### Task 3: Shell Navigation Updates (`Sidebar.tsx` & `GlobalHeader.tsx`)
- **Files**: `src/components/Sidebar.tsx`, `src/components/GlobalHeader.tsx`
- **Actions**:
  - **`Sidebar.tsx`**:
    - Update nav items to trigger route changes to `/dashboard`, `/clients`, `/work`, `/invoices`, `/reviews`.
    - Highlight active route based on `window.location.pathname`.
    - Update bottom profile user card to navigate to `/profile` on click with active link indicator.
  - **`GlobalHeader.tsx`**:
    - Avatar/User Profile button navigates directly to `/profile`.
    - Search selection (client/invoice/work) performs coordinated navigation:
      - Client match -> navigates to `/clients` and passes client filter.
      - Work match -> navigates to `/work`.
      - Invoice match -> navigates to `/invoices`.

### Task 4: Root Application Decomposition (`App.tsx`)
- **File**: `src/App.tsx`
- **Actions**:
  - Refactor `App.tsx` from **771 lines** down to **< 250 lines** by delegating tab/modal orchestration to the routing layer.
  - Replace `activeTab` state with reactive `currentRoute` from `useAppRouter()`.
  - Lazy-load `ProfilePage` alongside existing tab views.
  - Preserve all auth guards, blocked user checks, and mandatory profile completion redirect (redirects new users to `/profile` if profile is incomplete, without intrusive modal overlays).

### Task 5: Automated Regression & Navigation Tests
- **File**: `tests/routing-navigation.test.ts`
- **Actions**:
  - Add test suite covering:
    - Canonical path resolution and alias redirection (`/settings` -> `/profile`, `/work-log` -> `/work`).
    - Query parameter preservation during navigation.
    - Deep-link loading for direct URLs (`/profile`, `/invoices`).
    - Profile save payload separation (public fields vs private subcollection fields).
  - Verify `npm run build` and `npm run lint` succeed with zero errors.

---

## 3. Design & Quality Constraints

1. **Design System Adherence (`GEMINI.md`)**:
   - Palette: Slate family, white/navy backgrounds, indigo `#4F46E5` for primary actions.
   - Restrained, flat SaaS appearance: No pill buttons, no tinted pastel backgrounds, no gradients, no bouncing animations.
   - Status indicators: Plain text with optional 6px dot.
2. **File Size Limit (`AGENTS.md`)**:
   - Keep all new and refactored files between **200–300 lines max**.
   - `ProfilePage.tsx` must delegate section rendering to `src/components/profile/*`.
   - `App.tsx` must be refactored from 771 lines to under 250 lines.
3. **Preserve Application Security**:
   - Ensure split architecture for `profiles` is strictly maintained (public document in `/profiles/{uid}` vs private subcollection in `/profiles/{uid}/private/settings`).

---

## 4. Verification Plan & Acceptance Criteria

| Criteria | Verification Procedure | Pass Threshold |
| :--- | :--- | :--- |
| **Direct URL Access** | Navigate directly to `http://localhost:3000/profile` in address bar. | Loads full-page Profile Settings directly without opening dashboard first. |
| **Sidebar Navigation** | Click "Clients", "Work Log", "Invoices", "Dashboard", and user avatar in sidebar. | Address bar updates to `/clients`, `/work`, `/invoices`, `/dashboard`, `/profile`. |
| **History Navigation** | Click Back and Forward buttons in browser. | Views transition smoothly matching URL history; active sidebar tab updates accurately. |
| **Profile Settings Functionality** | Update professional title, UPI ID, theme mode, and Gemini key on `/profile`, then click Save. | Persists correctly to Firestore and local cache; theme updates in real-time. |
| **Client Search Deep-Link** | Use global search bar to click a specific client. | Navigates to `/clients` and auto-selects the client. |
| **File Size Audit** | Count lines of `App.tsx` and `ProfilePage.tsx`. | Both files $\le 300$ lines. |
| **Production Build** | Run `npm run build; npm run lint`. | 0 errors, 0 type warnings, bundle compiles cleanly. |
