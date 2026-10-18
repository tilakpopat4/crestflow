# Discovery Findings: CrestFlow Architecture & YouPI PG Gateway Integration

**Date:** 2026-10-18  
**Scope:** Subscription billing integration using YouPI PG UPI gateway.

---

## 1. CrestFlow Platform Stack & Architecture

| Layer | Implementation in CrestFlow | Details / Observations |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.0.1 + TypeScript (~5.8.2) + Vite 6.2.3 | Fast single-page application (SPA). Tailwind CSS v4. |
| **Database** | Dual Persistence: Supabase (PostgreSQL 15+) & Firebase Firestore | Supabase is used for relational tables (`clients`, `invoices`, `work_items`, `profiles`, `subscription_payments`, `subscription_whitelist`). |
| **ORM / Query Layer** | `@supabase/supabase-js` (Direct SQL/RLS) & Firebase Web SDK | No heavy ORM (like Prisma or Drizzle) currently in use; queries use type-safe Supabase RPC and client queries with PostgreSQL Row-Level Security. |
| **Authentication** | Firebase Auth (Client-side) | User IDs (`user.uid`) are Firebase string identifiers (e.g., `s9df81j...`), synchronized into Supabase `profiles`. |
| **Migration Tool** | Supabase SQL schema (`supabase/schema.sql`) | Schema and RLS policies are versioned as SQL scripts run in PostgreSQL / Supabase CLI. |
| **Backend / Server** | `express` (^4.21.2) installed in `package.json` | Currently running Vite dev server. A backend server entrypoint (`server.js` or `server/`) is required to safely hold gateway secrets, issue orders, and handle server-to-server HMAC webhooks. |
| **Test Framework** | Not yet configured in `package.json` | Vitest / Supertest should be added for unit testing entitlements and integration testing webhook/order flows. |
| **Deployment Setup** | Firebase Hosting & Supabase PostgreSQL | Feature flag `VITE_BILLING_ENABLED` and server-side `BILLING_ENABLED` needed. |

---

## 2. YouPI PG API Discovery (from `youpi-pg/openapi.yaml` & `packages/core/`)

### A. Order Creation
- **Endpoint:** `POST /api/v1/payments`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Merchant-Id`: Optional UUID
  - `Idempotency-Key`: Optional string
- **Request Body:**
  ```json
  {
    "orderId": "CF-SUB-1001",
    "amount": "49.00",
    "currency": "INR",
    "customer": {
      "name": "Freelancer Name",
      "email": "user@example.com",
      "phoneNumber": "9876543210"
    },
    "description": "CrestFlow Pro Monthly Subscription",
    "returnUrl": "https://crestflow.app/order-success?orderId=CF-SUB-1001",
    "metadata": {
      "userId": "firebase_uid",
      "planId": "pro_monthly"
    }
  }
  ```
- **Response (`201 Created` / `200 OK`):**
  ```json
  {
    "paymentId": "c7942127-14e3-469a-9e4a-9359a16f903a",
    "orderId": "CF-SUB-1001",
    "amount": "49.00",
    "amountPaise": "4900",
    "currency": "INR",
    "status": "INITIATED",
    "queuePosition": 0,
    "checkoutUrl": "http://localhost:7000/checkout/c7942127-14e3-469a-9e4a-9359a16f903a"
  }
  ```

---

### B. Payment Status Verification
- **Endpoint:** `GET /api/v1/payments/{paymentId}`
- **Response:**
  ```json
  {
    "paymentId": "c7942127-14e3-469a-9e4a-9359a16f903a",
    "orderId": "CF-SUB-1001",
    "amount": "49.00",
    "amountPaise": "4900",
    "currency": "INR",
    "status": "SUCCESS",
    "method": "UPI",
    "verificationLevel": 2,
    "completedAt": "2026-10-18T16:30:00.000Z",
    "metadata": { "userId": "...", "planId": "..." }
  }
  ```
- **Order States in YouPI PG:**
  - `INITIATED`: Payment session created, awaiting queue slot.
  - `ACTIVE`: Displayed to customer on checkout QR / UPI intent screen.
  - `QUEUED`: Waiting in single-slot concurrency FIFO queue.
  - `PROCESSING`: Customer submitted UTR or observer detected incoming transaction.
  - `SUCCESS`: Final authoritative success (verified by SMS/Gmail observer).
  - `FAILED`: Explicit bank rejection or verification failure.
  - `EXPIRED`: Session timeout reached without matching bank confirmation.
  - `CANCELLED`: Session aborted by customer or merchant cancel API.

---

### C. Authoritative Server-to-Server Webhook Contract
- **HTTP Method:** `POST` to merchant's configured Webhook URL (e.g., `/api/youpi-webhook`).
- **Signature Headers:**
  - `X-Gateway-Signature: sha256=<64_hex_digest>`
  - `X-Gateway-Event: SUCCESS`
  - `X-Gateway-Delivery-Id: <uuid>`
  - `X-Gateway-Timestamp: <timestamp_ms>`
- **HMAC Calculation:**
  ```javascript
  const expectedHmac = 'sha256=' + crypto
    .createHmac('sha256', process.env.YOUPI_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac));
  ```
- **Payload Shape:**
  ```json
  {
    "event": "SUCCESS",
    "paymentId": "c7942127-14e3-469a-9e4a-9359a16f903a",
    "orderId": "CF-SUB-1001",
    "amount": "49.00",
    "amountPaise": 4900,
    "currency": "INR",
    "method": "UPI",
    "utr": "123456789012",
    "completedAt": "2026-10-18T16:30:00.000Z",
    "metadata": {
      "userId": "firebase_uid",
      "planId": "pro_monthly"
    }
  }
  ```
