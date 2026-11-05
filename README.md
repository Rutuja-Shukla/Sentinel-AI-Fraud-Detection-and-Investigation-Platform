# Sentinel — AI Fraud Detection and Investigation System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-cyan.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-teal.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini%20API-3.8%20Flash-indigo.svg)](https://ai.google.dev/)

An enterprise-grade financial crime operations platform engineered for real-time transaction surveillance, multi-signal risk assessment, explainable AI case analysis, and auditable case management.

---

## 🏛️ System Architecture

Sentinel combines deterministic rule heuristics, statistical anomaly detection, and server-side Explainable AI into a unified operational platform:

```
[ Financial Transactions / CSV Ingestion ]
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│              Sentinel Core Ingestion Gateway             │
│   (Schema Validation, Idempotency & Duplicate Shield)    │
└──────────────────────────┬───────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Deterministic Rules Engine  │ │ Statistical Anomaly Engine   │
│  - 10 Configurable Heuristics│ │ - Z-Score & IQR Deviation    │
│  - Velocity & Cadence Bursts │ │ - Haversine Speed (km/h)     │
│  - Geo Leap & Impossible Spd │ │ - Isolation Tree Proxy       │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Transparent Risk Scoring Engine        │
        │   (0–100 Bounded Score, Correlation Damping) │
        └──────────────────────┬───────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Investigation Workflows    │ │  Explainable AI Assistant    │
│ - Triage, Notes & Escalation │ │ - Server-side Gemini 3.8     │
│ - Multi-Party Sanction Logic │ │ - Advisory Hypotheses        │
│ - Append-Only Audit Ledger   │ │ - Non-Altering Evidence      │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## ✨ Key Capabilities

1. **Deterministic Fraud Rules Engine (10 Rules)**
   - `RULE_HIGH_AMOUNT`: Flags transactions exceeding 3.5σ or 4x above the customer historical average.
   - `RULE_VELOCITY`: Detects high-frequency burst activity (> 3 transactions within 10 minutes).
   - `RULE_GEO_LEAP`: Computes Haversine spatial distance and elapsed time; flags implied travel speed > 850 km/h.
   - `RULE_FAILED_BURST`: Flags successful authorization preceded by 2+ declined authentication attempts.
   - `RULE_RAPID_DRAIN`: Identifies rapid fund liquidations (> 80% drain) following large deposits.
   - `RULE_FREQUENCY_SURGE`: Flags when 24h frequency surges > 3.5x customer baseline.
   - `RULE_NEW_MERCHANT_BURST`: High-value payments routed to unobserved merchants in elevated MCC categories.
   - `RULE_IDENTICAL_AMOUNTS`: Automated card testing detection (3+ identical amounts within 15 minutes).
   - `RULE_OFF_HOURS_ANOMALY`: Flags high-value transactions executed between 01:00 and 05:00 UTC.
   - `RULE_DEVICE_FINGERPRINT`: Detects device fingerprints associated with 3+ distinct customer accounts.

2. **Statistical Anomaly Detection Engine**
   - Parametric (Z-Score) and non-parametric (IQR) scoring.
   - Spatial displacement (km), travel speed (km/h), temporal intervals (minutes), and novel device/merchant indicators.
   - Isolation Tree Anomaly Factor proxy across normalized multi-dimensional vectors.
   - Keeps anomaly score strictly separate from deterministic rule scores.

3. **Transparent Risk Scoring**
   - Weighted fusion model with correlation damping to avoid double-counting overlapping signals.
   - Standard financial risk tiers: **Low (0–29)**, **Medium (30–59)**, **High (60–79)**, and **Critical (80–100)**.
   - Returns granular contributing factors and rule justifications. *(AI models do not generate or alter the deterministic numerical score)*.

4. **Explainable AI Investigation Assistant**
   - Server-side integration with **Gemini 3.8 Flash** (`@google/genai`) using structured JSON schemas (`Type.OBJECT`).
   - Generates an **Executive Summary**, **Behavioral Pattern Analysis**, **Threat Evidence**, **Plausible Benign Explanations**, and an **Investigator Checklist**.
   - Includes automatic deterministic forensic fallback if an API key is not configured.

5. **Investigation Case Management & Auditing**
   - Complete case lifecycle: `NEW` &rarr; `UNDER_INVESTIGATION` &rarr; `ESCALATED` &rarr; `AWAITING_INFO` &rarr; `CONFIRMED_FRAUD` / `RESOLVED_LEGITIMATE` &rarr; `CLOSED`.
   - Formal case resolution recording regulatory remedies (`ACCOUNT_RESTRICTED`, `FUNDS_HELD`, `MERCHANT_DISPUTE`, `FALSE_POSITIVE_WHITELIST`) with mandatory audit reasons.
   - Append-only compliance ledger with JSON state diffs and actor provenance.

6. **Automated Testing Suite & ML Ground-Truth Evaluation**
   - **8 Automated Invariant Tests:** Boundary validation, duplicate idempotency, geo-leap calculations, decline bursts, Z-score sensitivity, score range bounds, RBAC enforcement, and audit trail integrity.
   - **Machine Learning Evaluation:** Measures empirical performance against 1,200 synthetic banking transactions with labelled ground truth. Calculates real **Confusion Matrix (TP, FP, TN, FN)**, **Precision**, **Recall**, **F1 Score**, and **False Positive Rate (FPR)** with an interactive cutoff slider (20–90 pts) and trade-off sensitivity curves.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Framer Motion
- **Backend:** Node.js, Express, tsx
- **AI Integration:** `@google/genai` (Gemini 3.8 Flash server-side integration)
- **Data & Persistence:** In-memory ACID repository with JSON snapshot persistence and unique idempotency constraints

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation

```bash
# Clone the repository
git clone https://github.com/Rutuja-Shukla/Sentinel-AI-Fraud-Detection-and-Investigation-Platform.git
cd Sentinel-AI-Fraud-Detection-and-Investigation-Platform

# Install dependencies
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Optional for AI-assisted investigation briefs
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

### Running Locally

```bash
# Start the full-stack server (Express + Vite middlewares on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📋 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/overview` | Aggregated executive KPI metrics and time-series distributions |
| `GET` | `/api/transactions` | Query transactions with search, filters, sorting, and pagination |
| `GET` | `/api/transactions/:id` | Detailed telemetry, matched rules, and anomaly details |
| `POST` | `/api/transactions` | Ingest single transaction with duplicate detection |
| `POST` | `/api/transactions/upload` | Batch CSV transaction ingestion |
| `GET` | `/api/fraud/alerts` | Query high and critical risk alerts (&ge; 60 pts) |
| `GET` | `/api/fraud/rules` | Retrieve all 10 detection rules and scoring weights |
| `PATCH`| `/api/fraud/rules/:id` | Tune rule thresholds, severity, and weights (Admin only) |
| `GET` | `/api/customers` | Directory of synthetic customer profiles |
| `GET` | `/api/customers/:id` | Customer profile, known devices, and activity history |
| `GET` | `/api/cases` | Query investigation cases by status and severity |
| `POST` | `/api/cases` | Open a new investigation case |
| `PATCH`| `/api/cases/:id` | Update case status with transition validation |
| `POST` | `/api/cases/:id/notes` | Append timestamped investigative note |
| `POST` | `/api/cases/:id/resolve` | Commit formal finding and apply sanctions |
| `POST` | `/api/ai/investigation-summary` | Generate server-side Gemini explainable AI report |
| `GET` | `/api/audit-logs` | Query append-only compliance audit trail |
| `POST` | `/api/evaluation/run` | Execute automated test suite and ML evaluation |
| `POST` | `/api/system/reset` | Re-seed synthetic dataset to pristine benchmark state |

---

## ⚖️ Disclaimer

All transaction and customer data in Sentinel is synthetically generated for software engineering demonstration and evaluation purposes. No real cardholder data (CHD), personally identifiable information (PII), or active credentials are used or stored.
