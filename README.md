# PACT — Policy-Enforced Autonomous Commercial Transactions
### Razorpay Buildathon — AI Growth & Agentic Commerce Track

> **Core Principle**: *AI can reason and propose. PACT decides what becomes real.*

PACT is an enterprise-grade autonomous AI-to-AI commerce pipeline that connects Buyer AI agents to Merchant AI agents with strict, deterministic policy enforcement, multi-merchant catalog discovery, and zero-trust Razorpay financial settlement.

---

## 🏗️ System Architecture & Deal Flow

```mermaid
flowchart TD
    subgraph Buyer_Layer["1. BUYER INTENT STAGE"]
        A[Buyer Natural Language Prompt] --> B[Autonomous Intent Engine]
        B --> C[Structured Buyer Constraints\nQty, Budget, Max Delivery SLA]
    end

    subgraph Merchant_Layer["2. MERCHANT REASONING STAGE"]
        C --> D[Active Merchant AI Agent]
        D <--> E[(Authoritative Firestore Catalog\nStock, Baseline Unit Prices, Margin Caps)]
        D --> F[Deterministic Offer Proposal\nSelected SKUs, Validated Margin Discount]
    end

    subgraph Compiler_Layer["3. DETERMINISTIC DEAL COMPILER"]
        F --> G[PACT Deal Compiler Engine\nZero LLM Arithmetic]
        G --> H[Compiled Deal Contract Spec\nSubtotal, Discount, Authoritative Payable]
    end

    subgraph Firewall_Layer["4. PACT FIREWALL POLICY GATE"]
        H --> I{PACT Firewall Engine\n9 Zero-Trust Server Rules}
        I -->|Fails Stock, Price Drift, Discount, Budget| J[REJECTED\nAudit Logged]
        I -->|Exceeds Limit / Threshold| K[PENDING_APPROVAL\nMerchant Admin Gate]
        I -->|All 9 Policy Gates Passed| L[VALIDATED & SIGNED]
    end

    subgraph Settlement_Layer["5. RAZORPAY SETTLEMENT RAIL"]
        L --> M[Razorpay Isolated Order Service\nDirect Firestore Amount in Integer Paise]
        M --> N[Razorpay Standard Checkout Checkout.js]
        N --> O[Server-Side HMAC-SHA256 Signature Verification]
        O --> P[(Immutable Transaction Settlement & Audit Trail)]
    end
```

---

## ⚡ Key Architectural Pillars

### 1. Zero-Trust Autonomous Commerce Pipeline
- **Buyer AI**: Natural language intent parsing into normalized commercial constraints.
- **Merchant AI**: Reads active inventory and margin policies to formulate real-time counterproposals and bundled discounts.
- **Multi-Merchant Discovery**: Real-time cross-catalog discovery and routing across verified merchants (`ErgoSpace`, `DeskForge`, `CyberTech`, `OfficePro`, `NordicLiving`).

### 2. PACT Deterministic Deal Compiler
- Pure TypeScript compiler executing on the server with **Zero LLM math**.
- Recalculates all pricing, taxes, line-item totals, and discounts deterministically against live warehouse catalogs.

### 3. PACT Policy Firewall (9 Server-Side Security Gates)
Before any transaction can proceed to payment, the deal contract must pass 9 atomic verification checks:
1. `PRODUCT_VALIDITY`: Verifies items exist, belong to the merchant, and are actively published.
2. `INVENTORY_CHECK`: Real-time stock verification against requested quantity.
3. `PRICE_VERIFICATION`: Stale contract drift protection against live catalog prices.
4. `DISCOUNT_LIMIT`: Validates negotiated discounts do not exceed merchant maximum policy caps.
5. `BUDGET_CONSTRAINT`: Ensures final contract amount satisfies the buyer budget ceiling.
6. `DELIVERY_CONSTRAINT`: Enforces delivery lead time SLA against merchant warehouse capabilities.
7. `TRANSACTION_LIMIT`: Enforces platform-level auto-settlement caps.
8. `HUMAN_APPROVAL_GATE`: Routes high-value transactions exceeding threshold (`> ₹50,000`) to store manager approval.
9. `DUPLICATE_PROTECTION`: Guarantees transaction idempotency.

### 4. Razorpay Secure Settlement Rail
```mermaid
sequenceDiagram
    autonumber
    participant UI as Deal Room (Stage 5)
    participant Server as PACT Settlement API
    participant DB as Firestore (Authoritative)
    participant RZP as Razorpay API
    participant SDK as Razorpay Checkout.js

    UI->>Server: POST /api/payments/create-order { dealId }
    Server->>DB: Fetch Validated Deal Contract
    Note over Server,DB: Amount derived ONLY from Firestore finalAmount (Paise)
    Server->>RZP: orders.create({ amount, currency: "INR", receipt: dealId })
    RZP-->>Server: Return razorpay_order_id
    Server-->>UI: Return Order Credentials (Key ID, Order ID, Amount)
    UI->>SDK: Open Razorpay Modal
    SDK-->>UI: Return payment_id, order_id, signature
    UI->>Server: POST /api/payments/verify { dealId, razorpay_payment_id, signature }
    Server->>Server: HMAC-SHA256 Verification with RAZORPAY_KEY_SECRET
    Server->>DB: Update Deal to PAID & Write Immutable Audit Record
    Server-->>UI: Settlement Verified (200 OK)
```

- **Zero AI Access to Credentials**: AI agents have zero access to Razorpay API keys or payment creation pathways.
- **Backend-Driven Amounts**: Client-side amounts are completely ignored. Payment amounts are calculated strictly from Firestore verified deal contracts.
- **HMAC-SHA256 Cryptographic Verification**: Server-side signature validation prevents client tampering.
- **Webhook & State Idempotency**: Atomic checks prevent duplicate orders or multiple charges.

### 5. Multi-Tenant Merchant Isolation & Audit Telemetry
- Complete tenant data isolation: Merchants only see transactions, audit logs, and analytics belonging directly to their store.
- Comprehensive decision telemetry recording all events across `BUYER_AGENT`, `MERCHANT_AGENT`, `DEAL_COMPILER`, `PACT_FIREWALL`, and `RAZORPAY`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Core** | Next.js 16 (App Router, Turbopack), React 19, TypeScript (Strict Mode) |
| **Styling & Design** | Tailwind CSS, React Bits (`SpotlightCard`, `Magnet`, `BorderGlow`, `Ripple`), Framer Motion |
| **Database & Auth** | Google Firebase Firestore, Firebase Admin SDK, Firebase Auth |
| **Payment Gateway** | Razorpay Test Mode API, Razorpay Checkout SDK, HMAC-SHA256 Webhooks |
| **AI Intent Engine** | Google Gemini API (Structured Output Parsing & Merchant Counterproposal Engine) |
| **Validation** | Zod Schemas for all API routes and contract compilation |

---

## 🚀 Getting Started

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/sushanth-arun/PACT-razorpay-buildathon.git
cd PACT-razorpay-buildathon
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Razorpay Test Mode Keys
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id

# Firebase Admin SDK (Server-Side)
FIREBASE_ADMIN_PROJECT_ID=your_firebase_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_client_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Initialize Database Seed
Seed the multi-merchant catalog, inventory, and default governance policies by visiting:
```
http://localhost:3000/api/seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the PACT platform.

---

## 🧪 Verification & Build

```bash
# Typecheck
npx tsc --noEmit

# Lint Check
npm run lint

# Production Build
npm run build
```

---

## 📜 License
MIT License. Built for the Razorpay Buildathon 2026.
