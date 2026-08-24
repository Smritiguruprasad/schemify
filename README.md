# FinSetu AI

### Intelligent Scheme Matching & Channel-Partner Routing for SC Beneficiaries

> **Smart India Hackathon 2026 — Problem Statement 26092**

FinSetu AI is a **multilingual, explainable financial-access platform** designed to help SC beneficiaries discover suitable government schemes, understand their eligibility, calculate affordability, find eligible channel partners, and track their applications through a single guided journey.

**Discover → Match → Calculate → Route → Apply → Track**

FinSetu does **not** replace lenders, NSFDC, or authorized channel partners. Instead, it acts as an intelligent **pre-application layer** that helps beneficiaries make better-informed decisions and submit better-prepared applications.

---

## The Problem

Accessing government-backed financial schemes can be difficult because beneficiaries often need to:

* Identify which scheme fits their purpose.
* Understand complex eligibility requirements.
* Determine how much financial assistance they may receive.
* Understand EMI, repayment, and moratorium implications.
* Find the correct authorized channel partner.
* Prepare the required documents.
* Track their application after submission.

The result can be **wrong-channel applications, incomplete documentation, poor financial understanding, and unnecessary delays**.

FinSetu addresses this gap by bringing the entire pre-application journey into one platform.

---

## Our Solution

FinSetu combines a **rule-first eligibility engine, scheme knowledge graph, financial calculator, geospatial partner router, multilingual voice interface, and application tracking system**.

### Core Journey

```text
                 ┌──────────────┐
                 │   DISCOVER   │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │    MATCH     │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │  CALCULATE   │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │    ROUTE     │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │    APPLY     │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │    TRACK     │
                 └──────────────┘
```

---

# Key Features

## 1. Smart Scheme Recommender

A **rule-first eligibility engine** evaluates a beneficiary's profile against available schemes.

### Inputs

* SC status / certificate
* Family income
* Purpose of financing
* Project or course cost
* Education status
* Course type
* Location
* Beneficiary profile

### Outputs

* Ranked eligible schemes
* Eligibility explanation
* Applicable rules
* Required documents
* Recommended next steps

The AI layer assists with **intent extraction and explanation**, while the actual eligibility decision remains governed by explicit scheme rules.

---

## 2. Scheme Knowledge Graph

FinSetu maintains structured, versioned scheme information containing:

* Project-cost bands
* Maximum assistance
* Beneficiary contribution/rates
* Interest rates
* Repayment periods
* Moratorium
* Channel type
* Required documents
* Special provisions

Every recommendation can be traced back to its underlying rule/source.

This reduces the risk of outdated or hallucinated AI-generated financial information.

---

## 3. Scheme-Aware Financial Calculator

Instead of using a generic loan calculator, FinSetu uses **scheme-specific financial rules**.

The system can calculate:

* Eligible loan amount
* EMI
* Interest
* Total repayment
* Moratorium impact
* Affordability scenarios

For the proposed MVP, the eligible loan calculation follows the scheme-aware constraint:

```text
Eligible Loan =
min(90% of Project/Course Cost, Scheme Cap)
```

The system then presents the financial outcome in a user-friendly manner.

---

## 4. Geo-Spatial Partner Router

Finding the correct financial channel is one of FinSetu's major differentiators.

The router:

```text
Authorized Partners
       ↓
Eligibility / Compliance Gates
       ↓
Scheme Capability
       ↓
Geospatial Ranking
       ↓
Best Available Partners
       ↓
User Confirmation
```

Potential partner categories include:

* SCAs
* PSBs
* RRBs
* NBFC-MFIs
* Cooperative institutions
* Small Finance Banks

The system first verifies authorization and configured compliance requirements before ranking partners using factors such as:

* Distance
* Service capability
* Scheme compatibility
* Current availability

## NPA/overdue information is treated as a **compliance gate**, rather than an opaque consumer credit score.

## 5. Multilingual & Voice-First Interface

FinSetu is designed for users with varying levels of digital literacy.

The proposed language layer uses **BHASHINI APIs** for:

* Language detection
* Translation
* Speech-to-text
* Text-to-speech

Users can interact with the system in their preferred language and receive guided explanations of:

* Scheme eligibility
* Financial terms
* EMI
* Required documents
* Application steps

## Critical financial values and eligibility outcomes remain represented in a consistent canonical format to avoid translation ambiguity.

## 6. Application & Transparency Dashboard

After scheme selection and partner routing, FinSetu supports:

* Consent-based application handoff
* Document checklist
* Application status
* Partner acknowledgement
* Pending-action alerts
* Grievance/escalation trail
* Application tracking ID
* Aggregate analytics

The goal is to make the process transparent for both beneficiaries and the supporting ecosystem.

---

# Technical Architecture

The proposed architecture follows a modular pipeline:

```text
┌──────────────────────────────┐
│        Citizen Layer         │
│      Web / Mobile / Voice    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Eligibility & Profile      │
│          Engine              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│    Scheme Knowledge Graph    │
│   Versioned Scheme Rules     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Partner Eligibility +        │
│      Geo Router              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Application Tracking +       │
│        Analytics             │
└──────────────────────────────┘
```

The technical approach is explicitly **rule-first AI + geospatial routing + multilingual accessibility + secure workflow**.

---

# Technology Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| Frontend       | React / Next.js                      |
| Application    | Progressive Web App (PWA)            |
| Backend        | FastAPI / Node.js                    |
| Database       | PostgreSQL                           |
| Geospatial     | PostGIS                              |
| AI / ML        | Python                               |
| ML Models      | XGBoost / Embeddings                 |
| Language       | BHASHINI APIs                        |
| Search         | Semantic Search                      |
| Authentication | Role-Based Access Control            |
| Security       | Consent, Least Privilege, Audit Logs |

The proposed MVP stack is based on the architecture defined in the SIH proposal.

---

# AI Architecture

FinSetu intentionally separates **AI reasoning from policy decisions**.

```text
                    User Input
                        │
                        ▼
              ┌──────────────────┐
              │ Intent Extraction│
              │   & Translation  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Eligibility Rule │
              │      Engine      │
              └────────┬─────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
       Eligible             Not Eligible
              │                  │
              ▼                  ▼
       Scheme Ranking       Explanation
              │
              ▼
      Affordability Check
              │
              ▼
       Partner Eligibility
              │
              ▼
       Geo-Spatial Ranking
              │
              ▼
       Application Handoff
```

### Design Principle

> **AI explains and assists. Rules decide.**

AI is responsible for:

* Intent extraction
* Natural-language understanding
* Translation
* Recommendation ranking
* Explanations

The authoritative eligibility outcome comes from the **versioned scheme rules** rather than unrestricted LLM output.

---

# Example MVP Flow

### User Input

> "I am an SC beneficiary and I need ₹8 lakh to start a tailoring unit."

FinSetu processes the request:

```text
User Profile
     ↓
SC + Income + Purpose + Project Cost
     ↓
Intent Extraction
     ↓
Scheme Eligibility Engine
     ↓
Applicable Scheme(s)
     ↓
Explain Eligibility
     ↓
Calculate Eligible Amount + EMI
     ↓
Find Eligible Nearby Partners
     ↓
Generate Document Checklist
     ↓
Application Handoff
     ↓
Tracking ID
```

An alternative proposed demonstration flow supports a student seeking financing for a professional course and receiving an ELS recommendation with affordability information.

---

# Security & Trust

FinSetu handles potentially sensitive financial and beneficiary information, so security is a core design requirement.

### Principles

* Consent-based data processing
* Role-Based Access Control
* Least-privilege architecture
* Encryption
* Tamper-evident records
* Audit trails
* Source-traceable recommendations
* Versioned scheme rules

### AI Safety

FinSetu mitigates AI hallucination by ensuring:

```text
AI Recommendation
       ↓
Authoritative Rule
       ↓
Source / Version
       ↓
Explainable Result
```

Potential risks such as stale rules, incorrect routing, privacy violations, and language errors are addressed through effective-date master data, authorization gates, consent controls, encryption, auditability, and canonical financial values.

---

# Impact

FinSetu measures success across the entire ecosystem rather than simply counting application downloads.

### Beneficiaries

* Understand which scheme fits their purpose
* Understand eligibility and financial implications
* Find an eligible nearby partner
* Submit a more complete application
* Track application progress

### Channel Partners

* Receive scheme-aligned applications
* Reduce misrouted applications
* Reduce incomplete submissions
* Pre-check documentation
* Provide acknowledgement and status updates

### NSFDC / MoSJE

* Improve financial-literacy reach
* Understand scheme demand
* Analyze demand by geography and purpose
* Monitor routing and turnaround
* Improve fund-utilization visibility

### Ecosystem

* Transparent citizen journey
* Privacy-preserving aggregate insights
* Identification of regional/language friction
* Ability to scale to additional social-finance schemes

---

# Proposed MVP KPIs

| Metric                                             |      Target |
| -------------------------------------------------- | ----------: |
| Recommendations traceable to explicit rule/source  |       ≥ 90% |
| Partner suggestions satisfying authorization gates |       ≥ 95% |
| Reduction in avoidable routing/incomplete cases    |       ≥ 30% |
| Reduction in time to find correct channel          |       ≥ 20% |
| Multilingual usability task completion             |       ≥ 80% |
| Basic profile → scheme shortlist                   | < 2 minutes |
| Partner options displayed                          |           3 |
| Recommendations carrying rule/source trace         |        100% |

These are **proposed MVP targets**, not measured production results.

---

# Why FinSetu?

### Traditional Journey

```text
Search for scheme
      ↓
Read complicated eligibility criteria
      ↓
Figure out financial assistance
      ↓
Find channel partner
      ↓
Visit / contact partner
      ↓
Discover missing documents
      ↓
Repeat process
```

### FinSetu Journey

```text
Tell us what you need
          ↓
Understand eligibility
          ↓
Get matched to schemes
          ↓
Calculate affordability
          ↓
Find eligible partners
          ↓
Prepare documents
          ↓
Apply
          ↓
Track
```

---

# Killer Differentiator

FinSetu is **not another lending platform**.

It does not:

* Sanction loans
* Disburse loans
* Replace NSFDC
* Replace authorized channel partners

Instead:

> **FinSetu sits before the existing channel system and improves scheme discovery, eligibility understanding, affordability calculation, partner routing, application preparation, and transparency.**

---

# Feasibility

FinSetu is designed to build on the existing channel-finance ecosystem rather than create a new lending institution.

The proposal identifies an existing ecosystem involving SCAs and multiple categories of channel partners. FinSetu can consume scheme and partner master data and integrate with application handoff interfaces without changing who ultimately sanctions or disburses financing.

The platform can therefore be introduced incrementally:

```text
Phase 1
Scheme Discovery + Eligibility
        ↓
Phase 2
Financial Calculator
        ↓
Phase 3
Partner Geo-Routing
        ↓
Phase 4
Multilingual Voice
        ↓
Phase 5
Application Tracking
        ↓
Phase 6
Analytics + Ecosystem Expansion
```

---

# Project Status

**Current Stage:** Smart India Hackathon 2026 Prototype / MVP

### Planned MVP Components

* [ ] Beneficiary onboarding
* [ ] Scheme master database
* [ ] Rule-based eligibility engine
* [ ] AI intent extraction
* [ ] Explainable scheme recommendations
* [ ] Scheme-aware financial calculator
* [ ] Partner database
* [ ] PostGIS geospatial routing
* [ ] Partner eligibility gates
* [ ] Multilingual interface
* [ ] Voice interaction
* [ ] Document checklist generation
* [ ] Application handoff
* [ ] Application tracking
* [ ] Admin analytics dashboard
* [ ] Audit and consent layer

---

# Getting Started

## Prerequisites

Make sure you have the following installed:

* Node.js 20+
* Python 3.11+
* PostgreSQL 15+
* PostGIS
* Git

## Clone the Repository

```bash
git clone https://github.com/<your-username>/finsetu-ai.git
cd finsetu-ai
```

## Mobile App (current MVP — UI-first)

The active codebase is an **Expo React Native app** running entirely on local
mock data (no external services required). See `docs/api-contract.md` and
`docs/integrations.md` for the backend plan.

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on any Android/iOS device.

## Frontend (legacy web plan)

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend

python -m venv venv

# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

> Update the commands above according to the final repository structure.

---

# Suggested Repository Structure

```text
finsetu-ai/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── rules/
│   │   └── main.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── schemes/
│   ├── partners/
│   └── seed/
│
├── ml/
│   ├── ranking/
│   ├── embeddings/
│   └── intent/
│
├── docs/
│
├── .env.example
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

# Data & Governance

Scheme rules, financial limits, interest rates, repayment periods, and partner eligibility can change over time.

Therefore, production deployments should use:

* Versioned scheme master data
* Effective dates
* Authorized sources
* Rule traceability
* Partner authorization updates
* Audit logs

This is a core FinSetu design principle rather than an optional feature.

---

# Research & References

FinSetu's proposal is based on the Smart India Hackathon problem statement and official ecosystem research involving:

* Smart India Hackathon 2026 — Problem Statement 26092
* National Scheduled Castes Finance and Development Corporation (NSFDC)
* Ministry of Social Justice and Empowerment
* PM-SURAJ
* BHASHINI
* Ministry of Electronics and Information Technology

The proposal specifically notes that official scheme limits, rates, and partner eligibility can change, so the production implementation should rely on **versioned authorized master data**.

---

# Team

**FinSetu AI**

Built for **Smart India Hackathon 2026**

**Problem Statement:** 26092
**Organization:** Ministry of Social Justice and Empowerment
**Category:** Software
**Theme:** Miscellaneous

---

# Vision

FinSetu aims to make government-backed financial assistance **understandable, accessible, explainable, and easier to navigate**.

Instead of asking citizens to understand a complex financial ecosystem first, FinSetu brings that complexity behind a simple interface:

> **Tell us what you need. We'll help you understand what you're eligible for, what you can afford, where to apply, and what happens next.**

---

## License

This project is currently developed as a Smart India Hackathon 2026 prototype.

License information will be added as the project is prepared for public release.
