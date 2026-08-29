# PACT — AI-to-AI Agentic Commerce Engine

PACT (**Policy-Enforced Autonomous Commercial Transactions**) makes merchants transactable by AI buyers with deterministic backend policy enforcement.

Built for the **Razorpay Buildathon** under the **AI Growth and Agentic Commerce** track.

---

## 💡 Core Principle

> **AI can reason and propose. PACT decides what becomes real.**

AI agents negotiate commercial deals using real merchant catalog data, but all financial arithmetic, stock availability, discount caps, budget limits, and contract compilation are deterministically validated by server-side code (**PACT Firewall**).

```
BUYER AI ──> BUYER INTENT ──> MERCHANT AGENT ──> MERCHANT OFFER ──> DEAL COMPILER ──> DEAL CONTRACT
                                                                                            │
                                                                                            ▼
                                                                                   🔥 PACT FIREWALL
                                                                                  (9 Server Rules)
                                                                                            │
                                                      ┌─────────────────────────────────────┴─────────────────────────────────────┐
                                                      ▼                                     ▼                                     ▼
                                                  VALIDATED                         PENDING_APPROVAL                           REJECTED
                                             (All rules PASS,                     (Exceeds merchant                        (Failed stock, price,
                                              ≤ ₹50k threshold)                   approval threshold)                      discount, or budget)
```

---

## 🏛️ Architecture & Implemented Phases

### Phase 0: Design System & Reactive Shell
- Modern dark-mode UI with **React Bits** components (`BorderGlow`, `Magnet`, `Ripple`, `SpotlightCard`).
- Standardized typography, responsive layouts, and full status lifecycle badges.

### Phase 1: Firestore Schema & Seed Data
- Collections: `merchants`, `products`, `buyer_intents`, `merchant_offers`, `deals`, `policy_evaluations`, and `audit_events`.
- Pre-seeded **ErgoSpace** merchant with realistic product catalogs, stocks, prices, and governance policies.

### Phase 2: Audit Trail & Real-time Telemetry
- Immutable, tamper-evident audit logging capturing every lifecycle event (`INTENT_PARSED`, `OFFER_GENERATED`, `DEAL_COMPILED`, `POLICY_CHECK_PASSED`, `POLICY_CHECK_FAILED`, `DEAL_VALIDATED`, `DEAL_REJECTED`, `HUMAN_APPROVAL_REQUIRED`).

### Phase 3: Buyer AI (Natural Language Intent Extraction)
- Powered by **Google Gemini 3.1 Flash-Lite** structured JSON outputs.
- Extracts structured intent (`productIntent`, `quantity`, `budget`, `deliveryMaxDays`, `discountRequestedPercent`, `urgency`).
- Deterministic fallback modes for offline/testing resilience.

### Phase 4: Merchant Agent (Autonomous Offer Generation)
- Autonomous reasoning agent discovering matching active products from live Firestore catalogs.
- Calculates optimal bundle quantities, safe margin-preserving discounts, and delivery SLAs.

### Phase 5: PACT Deal Compiler
- Pure TypeScript server-side compiler (**Zero Gemini AI calls for math**).
- Validates products against live catalog, rechecks unit pricing, deterministically calculates subtotals, discounts, and final amounts.
- Exports structured deal contracts in JSON or text summary formats.

### Phase 6: PACT Firewall (Policy Governance Gate)
- Server-side deterministic policy gate executing **9 security rules** against live Firestore data (**Zero Gemini AI calls**):
  1. `PRODUCT_VALIDITY`: Verifies items exist, belong to merchant, and are active.
  2. `INVENTORY_CHECK`: Real-time stock verification against requested quantity.
  3. `PRICE_VERIFICATION`: Stale contract drift protection against live catalog prices.
  4. `DISCOUNT_LIMIT`: Validates discount does not exceed `merchant.maxDiscountPercent`.
  5. `BUDGET_CONSTRAINT`: Ensures `finalAmount <= buyerBudget`.
  6. `DELIVERY_CONSTRAINT`: Ensures `deliveryDays <= buyerDeliveryMaxDays`.
  7. `TRANSACTION_LIMIT`: Warnings for amounts above auto-settlement caps.
  8. `HUMAN_APPROVAL_GATE`: Routes high-value transactions (`> ₹50,000`) to `PENDING_APPROVAL`.
  9. `DUPLICATE_PROTECTION`: Idempotent state verification.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router), React 19
- **Language & Types**: TypeScript (Strict), Zod validation schemas
- **Styling**: Tailwind CSS, Vanilla CSS animations, Framer Motion
- **UI & Micro-interactions**: React Bits (`BorderGlow`, `Magnet`, `Ripple`, `SpotlightCard`)
- **Database & Server**: Firebase Firestore, Firebase Admin SDK
- **AI Intent Parsing**: Google Gemini 3.1 Flash-Lite API
- **Icons**: Lucide React

---

## 🚀 Local Development Setup

1. **Clone the repository & install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create `.env.local` based on `.env.example`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_ADMIN_PROJECT_ID=your_firebase_project_id
   FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

3. **Seed Database**:
   Visit [http://localhost:3000/api/seed](http://localhost:3000/api/seed) to populate initial merchant catalog and policies.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification Commands

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build
npm run build
```

---

## 🔒 Security & Determinism Guarantee

- **Zero LLM Arithmetic**: All calculations (subtotals, discounts, delivery SLAs, final contract amounts) execute strictly via deterministic TypeScript code.
- **Server Authority**: The frontend cannot alter prices, approve deals, or bypass the PACT Firewall.
- **Payment Decoupling**: Payment processing (Razorpay) is decoupled and only triggered after deterministic Firewall validation.
