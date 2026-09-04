# PACT — Policy-Enforced Autonomous Commercial Transactions
### Razorpay Buildathon — AI Growth & Agentic Commerce Track

> **Core Principle**: *AI can reason and propose. PACT decides what becomes real.*

PACT is an enterprise-grade autonomous AI-to-AI commerce pipeline that connects Buyer AI agents to Merchant AI agents with strict, deterministic policy enforcement, multi-merchant catalog discovery, and zero-trust Razorpay financial settlement.

---

## 🏗️ System Architecture & Deal Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1e293b', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#3b82f6', 'lineColor': '#60a5fa', 'secondaryColor': '#0f172a', 'tertiaryColor': '#1e1e2e', 'textColor': '#ffffff', 'fontSize': '14px' }}}%%
flowchart TD
    subgraph Buyer_Layer["1. BUYER INTENT STAGE"]
        A["Buyer Natural Language Prompt"] --> B["Autonomous Intent Engine"]
        B --> C["Structured Buyer Constraints<br/>Qty, Budget, Max Delivery SLA"]
    end

    subgraph Merchant_Layer["2. MERCHANT REASONING STAGE"]
        D["Active Merchant AI Agent"]
        E[("Authoritative Firestore Catalog<br/>Stock, Baseline Unit Prices, Margin Caps")]
        F["Deterministic Offer Proposal<br/>Selected SKUs, Validated Margin Discount"]
        D <--> E
        D --> F
    end

    Buyer_Layer --> Merchant_Layer

    subgraph Compiler_Layer["3. DETERMINISTIC DEAL COMPILER"]
        G["PACT Deal Compiler Engine<br/>Zero LLM Arithmetic"]
        H["Compiled Deal Contract Spec<br/>Subtotal, Discount, Authoritative Payable"]
        G --> H
    end

    Merchant_Layer --> Compiler_Layer

    subgraph Firewall_Layer["4. PACT FIREWALL POLICY GATE"]
        I{"PACT Firewall Engine<br/>9 Zero-Trust Server Rules"}
        J["REJECTED<br/>Audit Logged"]
        K["PENDING_APPROVAL<br/>Merchant Admin Gate"]
        L["VALIDATED & SIGNED"]
        I -->|Fails Checks| J
        I -->|Exceeds Limit| K
        I -->|All 9 Gates Passed| L
    end

    Compiler_Layer --> Firewall_Layer

    subgraph Settlement_Layer["5. RAZORPAY SETTLEMENT RAIL"]
        M["Razorpay Isolated Order Service<br/>Direct Firestore Amount in Integer Paise"]
        N["Razorpay Standard Checkout Checkout.js"]
        O["Server-Side HMAC-SHA256 Signature Verification"]
        P[("Immutable Transaction Settlement & Audit Trail")]
        M --> N
        N --> O
        O --> P
    end

    Firewall_Layer --> Settlement_Layer

    style Buyer_Layer fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#93c5fd
    style Merchant_Layer fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#6ee7b7
    style Compiler_Layer fill:#0f172a,stroke:#8b5cf6,stroke-width:2px,color:#c4b5fd
    style Firewall_Layer fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fde68a
    style Settlement_Layer fill:#0f172a,stroke:#06b6d4,stroke-width:2px,color:#a5f3fc

    style A fill:#1e293b,stroke:#3b82f6,stroke-width:1.5px,color:#ffffff
    style B fill:#1e293b,stroke:#3b82f6,stroke-width:1.5px,color:#ffffff
    style C fill:#1e293b,stroke:#3b82f6,stroke-width:1.5px,color:#ffffff
    style D fill:#1e293b,stroke:#10b981,stroke-width:1.5px,color:#ffffff
    style E fill:#1e293b,stroke:#10b981,stroke-width:1.5px,color:#ffffff
    style F fill:#1e293b,stroke:#10b981,stroke-width:1.5px,color:#ffffff
    style G fill:#1e293b,stroke:#8b5cf6,stroke-width:1.5px,color:#ffffff
    style H fill:#1e293b,stroke:#8b5cf6,stroke-width:1.5px,color:#ffffff
    style I fill:#1e293b,stroke:#f59e0b,stroke-width:1.5px,color:#ffffff
    style J fill:#450a0a,stroke:#ef4444,stroke-width:1.5px,color:#fca5a5
    style K fill:#451a03,stroke:#f59e0b,stroke-width:1.5px,color:#fde68a
    style L fill:#064e3b,stroke:#10b981,stroke-width:1.5px,color:#a7f3d0
    style M fill:#1e293b,stroke:#06b6d4,stroke-width:1.5px,color:#ffffff
    style N fill:#1e293b,stroke:#06b6d4,stroke-width:1.5px,color:#ffffff
    style O fill:#1e293b,stroke:#06b6d4,stroke-width:1.5px,color:#ffffff
    style P fill:#1e293b,stroke:#06b6d4,stroke-width:1.5px,color:#ffffff
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

### 4. Razorpay Secure Settlement
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
