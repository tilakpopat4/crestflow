# CrestFlow ⚡

<div align="center">

**A modern, comprehensive freelancing client manager, deliverables tracker, and professional invoicing ecosystem.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini_2.0-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)

[Features](#-key-features) • [Architecture](#-architecture--tech-stack) • [Quick Start](#-getting-started) • [Environment Config](#-environment-variables) • [Workflows](#-core-workflows)

</div>

---

## 📖 Overview

**CrestFlow** is built specifically for modern freelance video editors, creative producers, and digital contractors. It replaces fragmented spreadsheets, notes, and invoicing apps with a unified, high-performance workspace that manages the complete client lifecycle from initial inquiry to final payment clearance and career milestone celebrations.

---

## ✨ Key Features

### 👥 Client Lifecycle Management
- **Full Client Profiles:** Maintain client contact info, billing email, phone number, default deliverables rate, and customizable payment cycles (15, 30, 45, or 60 days).
- **Client Closure Workflow:** Archive or close inactive/completed clients while retaining 100% of their historical deliverables, invoices, and analytics, with one-click reopening anytime.
- **Cycle & Overdue Tracking:** Automatic detection of overdue payment cycles with one-click reminder dispatch via WhatsApp, default Email client, or direct Gmail API.
- **Referral & Public Profile Links:** Generate personalized client acquisition links (`/?freelancerId=<UID>`) for inquiry intake and service presentation.

### 🎬 Itemized Work Log & Deliverables Tracker
- **Smart Work Logging:** Log daily deliverables with client association, quantity, custom rates, delivery dates, and status tracking (`Uninvoiced` vs `Invoiced`).
- **Direct Google Drive Upload Integration:** Upload video edits, project files, and reels directly to Google Drive right from the app with OAuth token handling, resumable file uploading, real-time percentage progress bar, and automatic public-read permissions (`anyoneWithLink`).
- **In-App Embedded Media Player:** Universal embedded video player (`MediaEmbedModal`) featuring native Google Drive iframe preview (`/preview`), YouTube, and Vimeo support so both clients and freelancers can stream videos directly within the portal without permissions issues or leaving the tab.
- **Live Video Link Previews:** Automatic detection and extraction of links from Instagram Reels, YouTube Shorts/Videos, TikTok, Vimeo, and Google Drive.
- **Optimized Google Drive Thumbnails:** Direct image/thumbnail resolution for Google Drive links avoiding third-party cookie restrictions.
- **Batch Invoice Integration:** One-click import of uninvoiced items into cycle invoices based on date ranges.

### 🧾 Professional Invoicing & Instant UPI Payments
- **Dynamic PDF Invoice Generation:** Clean, high-resolution PDF generation with client details, itemized deliverables, discounts, extra charges, and bank details.
- **Tailwind CSS v4 Safe Rendering:** Custom color-conversion engine (`oklab`/`oklch` to RGB) preventing canvas rasterization crashes during PDF rendering under Tailwind v4.
- **NPCI Dynamic UPI QR Codes:** Embeds real-time UPI QR codes and payment URIs with pre-filled amounts and invoice transaction notes (GPay, PhonePe, Paytm, BHIM).
- **Direct Gmail API Dispatch:** Authorize Gmail OAuth to attach and dispatch invoice PDFs directly from the app to client inboxes without leaving your workflow.
- **Itemized Work Summary Printouts:** Produce sanitized, non-financial delivery summaries for client management or production teams.
- **Payment Reconciliation:** Toggle payment statuses (`Pending` / `Paid`) with custom payment date recording that synchronizes client cycle timelines.
- **Lifetime Revenue & "Total Earned Till Today" Bar:** High-visibility revenue summary at the bottom of the invoice tab showing lifetime earnings from paid invoices, pending collections, and invoice counts.

### 🌐 Dedicated Client Portal & Reviews
- **Self-Service Client Portal:** Independent client login mode (`/?portal=client`) enabling clients to view their ongoing project status, review deliverable links, inspect invoices, and initiate payments.
- **Client Testimonial & Review System:** Built-in review submission allowing clients to rate work (1–5 stars) with testimonials that populate your public freelancer portfolio.
- **Public Freelancer Profile:** Sharable profile page presenting services, professional title, contact links, and verified client reviews.

### 🏆 Career Journey & Milestone Celebrations
- **Freelance Career Start Date:** Enter your career start date in profile settings to track total days active in your craft.
- **Portal Worked Days Counter:** Prominently displays `🔥 X days worked` in the portal top-right header with human-readable duration breakdowns (years, months, days).
- **Upcoming Milestone Countdown:** Real-time countdown to your next freelancing milestone.
- **Automatic Anniversary Celebrations:** Celebratory banners and pop-up modals celebrating 1 month, 3 months, 6 months, 9 months, 1 year, 1.5 years, 2 years, and beyond.

### 📊 Executive Financial Analytics
- **Visual Earnings & KPIs:** Real-time stats on Total Revenue, Pending Collections, Invoiced Totals, and Active Clients.
- **Interactive Revenue Charts:** Monthly performance breakdowns powered by Recharts.
- **Contribution Activity Heatmap:** GitHub-style daily calendar tracking deliveries and payment activity throughout the year.
- **FCM Web Push Notifications:** Device registration for Firebase Cloud Messaging overdue follow-up alerts.

### 🛠️ Productivity & Workspace Utilities
- **Google Gemini AI Work Summarizer:** Summarize raw deliverable lists into polished, executive client update emails and handover notes.
- **Sticky Notes System:** Multi-colored draggable/dockable notes organized by client or general workspace.
- **Universal Search (`⌘K` or `/`):** Instant search across all clients, deliverables, and invoice records.
- **Offline Data Sync & CSV Backup:** Export and import entire database state via JSON/CSV for data portability.
- **Adaptive Theme System:** Seamless Light, Dark, and System Auto appearance modes.
- **Admin Management Console:** Secure admin console (`/admin`) for platform monitoring and account governance.

---

## 🏗 Architecture & Tech Stack

```
d:\crestflow\
├── src/
│   ├── components/            # UI components and functional views
│   │   ├── AnniversaryModal.tsx   # Milestone celebration modal
│   │   ├── ClientDashboard.tsx    # Single client detailed workspace
│   │   ├── ClientPortal.tsx       # Dedicated client-facing portal
│   │   ├── ClientsTab.tsx         # Client lifecycle & list view
│   │   ├── DashboardTab.tsx       # Main executive analytics & KPIs
│   │   ├── GlobalHeader.tsx       # Top search, worked days badge & theme toggle
│   │   ├── InvoiceTab.tsx         # Invoicing engine, PDF renderer & revenue bar
│   │   ├── ProfileModal.tsx       # Freelancer settings & career start date
│   │   ├── PublicFreelancerProfile.tsx # Shareable portfolio
│   │   ├── ReviewsTab.tsx         # Client reviews & ratings
│   │   ├── Sidebar.tsx            # Navigation rail
│   │   ├── StickyNotesWidget.tsx  # Quick notes widget
│   │   └── WorkLogTab.tsx         # Itemized deliverables manager
│   ├── context/
│   │   └── ThemeContext.tsx       # Light/Dark/System theme provider
│   ├── hooks/
│   │   └── useFirestore.ts        # Real-time Firestore sync hook
│   ├── lib/
│   │   ├── anniversary.ts         # Career milestones & duration math
│   │   ├── fcmService.ts          # Firebase Cloud Messaging web push
│   │   ├── geminiService.ts       # Google Gemini AI integration
│   │   ├── gmailService.ts        # Gmail REST API integration
│   │   ├── paymentUtils.ts        # UPI generation, cycle reminders, email templates
│   │   └── utils.ts               # Video link extractors & drive thumbnail resolvers
│   ├── firebase.ts            # Firebase client SDK initialization
│   ├── types.ts               # Core TypeScript data schemas
│   ├── App.tsx                # Primary application shell & routing
│   └── main.tsx               # App entry point
├── package.json
└── vite.config.ts
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | High-performance SPA with instant HMR |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type-safe data structures and models |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS utility architecture |
| **Database & Auth** | [Firebase Firestore](https://firebase.google.com/docs/firestore) + Auth | Cloud persistence & Google OAuth authentication |
| **Push Notifications** | [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging) | Real-time browser overdue reminders |
| **AI Intelligence** | [Google Gemini 2.0](https://ai.google.dev/) (`@google/genai`) | Client work summarization |
| **Document Generation** | [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF) | High-resolution PDF invoice compilation |
| **QR & Payments** | [qrcode.react](https://github.com/zpao/qrcode.react) + NPCI UPI Spec | Dynamic UPI QR codes and deep links |
| **Icons & UI** | [Lucide React](https://lucide.dev/) + [Recharts](https://recharts.org/) | Modern iconography and data visualization |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A Firebase project with **Firestore** and **Google Authentication** enabled
- A [Google AI Studio](https://aistudio.google.com/) API Key (optional, for AI Work Summarizer)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tilakpopat4/crestflow.git
   cd crestflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (see [Environment Variables](#-environment-variables) below).

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🔐 Environment Variables

Create a `.env` or `.env.local` file in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini AI (Optional - can also be configured per-user in Profile Settings)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Google OAuth Client ID for Gmail API Invoice Delivery
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 🔄 Core Workflows

### 1. Generating an Invoice
1. Navigate to **Invoices** (`/invoice`).
2. Select an active client from the dropdown.
3. Choose the billing period date range — uninvoiced deliverables within the range will be automatically imported.
4. Review itemized titles, rates, add custom discounts or extra costs.
5. Click **Download PDF Invoice** to compile your PDF and register the invoice in history.
6. Use **Send via Gmail** to dispatch the PDF directly to the client's email via the Gmail API.

### 2. Client Portal Experience
1. Send the client their portal link (`/?portal=client`).
2. Clients sign in using Google.
3. They can review itemized delivery links, inspect past and current invoices, scan the UPI QR code to pay, and submit testimonials.

### 3. Career Milestones & Days Worked
1. Click your profile avatar / settings in the sidebar.
2. Enter your **Freelancing Start Date**.
3. View your active days worked badge in the top-right header (`🔥 X days worked`).
4. On milestone anniversaries (1 mo, 6 mos, 1 yr, etc.), celebratory cards and banners will trigger automatically.

---

## 📄 License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with ❤️ for the freelance creator economy.
</div>
