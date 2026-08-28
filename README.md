# PACT — AI-to-AI Agentic Commerce Engine

PACT (Policy-Enforced Autonomous Commercial Transactions) makes merchants transactable by AI buyers with deterministic backend policy enforcement.

Built for the **Razorpay Buildathon** under the **AI Growth and Agentic Commerce** track.

## 💡 Core Principle

> **AI can propose. PACT decides what becomes real.**

AI agents negotiate commercial deals using real catalog data, but all financial arithmetic, stock availability, discount caps, budget limits, and payment creations are deterministically validated by server-side code (PACT Firewall).

## 🏗️ High-Level System Architecture

```
User
 ↓
Buyer AI
 ↓
Structured Buyer Intent
 ↓
Merchant Agent
 ↓
Merchant Offer
 ↓
PACT Deal Compiler
 ↓
PACT Firewall (Policy Engine)
 ↓
Approval Gate / Validation
 ↓
Razorpay Test Mode Payment
 ↓
Audit Trail Telemetry
```

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Server-side API Routes, Firebase Admin SDK
- **Database & Auth**: Firebase Auth, Firestore
- **Payment**: Razorpay Test Mode SDK & Webhooks
- **AI**: Gemini API / LLM Structured Output Integration

## 🚀 Local Development Setup

1. **Clone the repository & install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in the required keys:
   ```bash
   cp .env.example .env.local
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Environment Variables (`.env.example`)

- `NEXT_PUBLIC_APP_URL`: Base URL of the application.
- `NEXT_PUBLIC_FIREBASE_*`: Firebase Client API configuration.
- `FIREBASE_ADMIN_*`: Firebase Admin SDK credentials for server-side verification.
- `GEMINI_API_KEY`: LLM key for Buyer AI and Merchant Agent reasoning.
- `RAZORPAY_*`: Test mode Key ID, Secret, and Webhook secret.

## 📌 Current Development Phase

- **Phase -1**: Project Setup & Development Foundation (Completed)
- **Phase 0**: Frontend Shell & UI Components (Completed)
- **Phase 1**: Firebase Integration (Next Phase)
