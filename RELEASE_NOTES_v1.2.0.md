# CrestFlow v1.2.0 Release Notes

Welcome to **CrestFlow v1.2.0**! This major release introduces an end-to-end decentralized UPI payment gateway (**YouPi**), full subscription billing lifecycle management, an admin management suite, modern multi-page routing with public portals, and deep architectural and security hardening across the platform.

---

## 🚀 What's New in v1.2.0

### 1. ⚡ YouPi UPI Payment Gateway & Subscription Billing
- **0% Transaction Fee UPI Gateway**: Direct peer-to-merchant payment processing via NPCI UPI rails straight to your bank account without third-party aggregator cuts or settlement delays.
- **Dynamic NPCI UPI QR Codes**: In-app QR generation with verified KYC payee name, exact order amounts, and clean transaction references (`upi://pay?pa=...&am=...`).
- **Real-Time Payment Detection**: Dual-layer cross-device listener combining live Server-Sent Events (SSE) streams (`/api/v1/checkout/:id/stream`) with a 2-second background polling fallback.
- **Instant Bank UTR Verification**: Built-in 12-digit bank reference input allowing users to verify payment immediately if telecom network SMS alerts are delayed.
- **Subscription Management Modal**: Self-serve subscription checkout, plan upgrades, tier switching, and status tracking directly within the application.
- **Comprehensive Admin Control Center**:
  - **Plan Manager**: Create and configure custom monthly/annual subscription tiers.
  - **Merchant UPI Settings**: Manage receiving VPA accounts and payee KYC credentials.
  - **Payment Approvals Queue**: Review pending and manual bank UTR payment submissions with 1-click approvals.
  - **User Subscriptions Inspector**: Inspect active customer tiers, subscription periods, and payment histories.
  - **Beta Whitelist Manager**: Grandfathered VIP access for early adopters and beta freelancers.

---

### 2. 🌐 Multi-Page Routing & Public Portals
- **Client-Side History API Router**: Modern multi-page navigation supporting deep linking, clean URLs, and browser back/forward history without full page refreshes.
- **Live Client Statement Portal (`/portal/:clientId`)**: Dedicated, read-only client dashboard displaying real-time project deliverables, completed work logs, and invoice payment statuses.
- **Branded Client Onboarding Intake Hub (`/onboarding/:freelancerId`)**: Shareable intake page with QR code for prospective clients to submit project briefs, deliverables, and rate cards—convertible to active clients in 1 click.
- **Public Freelancer Showcase Profile (`/profile/:freelancerId`)**: Shareable portfolio and rate card showcasing past projects, client testimonials, and verified reviews.
- **Dedicated Legal & Support Pages**: Built-in `/privacy`, `/terms`, and `/contact` views styled to match the design system.

---

### 3. 📄 Smart Invoice Engine & Hardened PDF Renderer
- **Modular PDF Color Engine (`pdfColorEngine.ts`)**: Decoupled high-fidelity PDF styling with exact CSS-to-canvas token translation.
- **Dynamic Billing Cycle Dates**: Billing cycles automatically calculate from the client's last payment date up to the present date, preventing overlapping charge intervals.
- **Local Embedded QR Generator (`QRCodeSVG`)**: Replaced external QR generation APIs with local SVG rendering to eliminate data leaks and protect client payment privacy.
- **Duplicate Invoice Safeguards**: Automated checks preventing duplicate billing for the same billing period, with built-in cleanup helpers.

---

### 4. 🛡️ Security, Auth & Database Hardening
- **Google OAuth Scope Sanitization**: Removed high-privilege Gmail and Drive scopes from default authentication, eliminating Google's *"Unverified App"* browser security warning.
- **Firestore Security Rules Hardening (`firestore.rules`)**: Strict role-based access control protecting user profiles, subscriptions, invoices, and client data.
- **Postgres Database Migrations**: Added Supabase migrations for billing paths, cleaning up legacy objects, and securing portal invoice policies.

---

## 📦 Commits Included in this Release
- `2fb320f` feat: release v1.2.0 - YouPi UPI gateway, subscription billing, multi-page routing, and profile system
- `60cd08d` fix(qr): eliminate external qrserver leak and use local QRCodeSVG
- `5ea5b02` security(db): add migration to drop open portal invoice policy and emergency rollback
