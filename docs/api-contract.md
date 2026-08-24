# FinSetu AI — Backend API Contract (v1)

The mobile app (`app/`) currently runs entirely on a **mock service layer** in
`src/services/api.ts`. Every function below maps 1:1 to a future FastAPI endpoint.
When the backend is ready, swap the function bodies for HTTP calls — **no UI changes needed**.

Base URL convention: `https://<host>/api/v1`

---

## 1. POST /eligibility/match

Mirrors: `fetchMatchResults(profile)`

Request:
```json
{
  "name": "Sunita Devi",
  "age": 32,
  "gender": "female",
  "scStatus": "verified",
  "annualIncome": 240000,
  "purpose": "business",
  "projectCost": 300000,
  "district": "Bhopal"
}
```

Response:
```json
{
  "results": [
    {
      "scheme": { "...full scheme master object..." },
      "status": "eligible",
      "score": 0.81,
      "failedHardCount": 0,
      "incomeDelta": null,
      "traces": [
        {
          "label": { "en": "Family income ₹3,00,000 or less", "hi": "..." },
          "expected": "≤ ₹3,00,000",
          "actual": "₹2,40,000",
          "passed": true
        }
      ]
    }
  ]
}
```

Rules: `results` must be sorted — eligible first by `score` desc, then
`conditional`, then `ineligible` by fewest hard failures.
Soft rules (e.g. SC certificate pending) produce `conditional`.

## 2. GET /calculator/plan?scheme_id=&project_cost=&moratorium=1

Mirrors: `computeLoanPlan(scheme, cost, moratoriumOn)` in `src/engine/calc.ts`
(currently pure client-side; backend should re-verify).

```json
{
  "eligibleLoan": 270000,
  "contribution": 30000,
  "principal": 283500,
  "emi": 3137,
  "totalInterest": 92940,
  "totalPayable": 376440,
  "moratoriumApplied": true,
  "moratoriumInterest": 13500,
  "months": 120,
  "ratePct": 6
}
```

Formula contract: `eligibleLoan = min(round(cost × fundingPercent / 100), maxAssistance)`;
EMI always rounded **up**; moratorium interest capitalized into principal.

## 3. GET /partners/nearby?scheme_id=&district=

Mirrors: `fetchNearbyPartners(schemeId, districtName)`

```json
{
  "radiusKm": 50,
  "expanded": true,
  "items": [
    {
      "partner": {
        "id": "p_sca_bpl",
        "name": "MP SC Finance & Development Corporation (SCA)",
        "type": "SCA",
        "lat": 23.2599,
        "lng": 77.4126,
        "authorizedSchemes": ["new_swarnima", "term_loan_scheme"],
        "npaCompliant": true,
        "kycEnabled": true,
        "availability": "open",
        "lastVerified": "2026-07-15"
      },
      "distanceKm": 3
    }
  ]
}
```

Gates (server-enforced later): partner authorized for scheme AND `npaCompliant`
AND `kycEnabled`. Radius expansion order: 25 → 50 → 100 km, stop when ≥3 results.

## 4. Applications

| Endpoint | Mirrors | Notes |
|---|---|---|
| `POST /applications` | `addApplication(...)` | Returns tracking ID `FS-YYYY-XXXXX`; idempotency key required |
| `GET /applications` | store `applications` | Ordered newest first |
| `PATCH /applications/{id}/advance` | `advanceApplication(id)` | State machine: `submitted → acknowledged → under_review → sanctioned` |

Application object:
```json
{
  "id": "FS-2026-K7M3X",
  "schemeId": "new_swarnima",
  "partnerId": "p_sca_bpl",
  "status": "acknowledged",
  "docsPending": ["project_report"],
  "createdAt": "2026-08-24T10:00:00Z",
  "updatedAt": "2026-08-24T15:30:00Z",
  "timeline": [{ "status": "submitted", "at": "2026-08-24T10:00:00Z" }]
}
```

## 5. Reserved (not in MVP UI logic)

- `POST /ai/intent` — free-text → profile fields (Gemini/Groq free tier), schema-validated, low-confidence → clarifying question
- `POST /translate | /tts | /stt` — BHASHINI proxy; keys stay server-side

## Data masters

Scheme + partner seed data lives in `data/schemes.ts` and `data/partners.ts`.
Backend must load these as **versioned rows with effective dates** (see
`docs/integrations.md`). All rule labels are `{en, hi}` objects — keep that shape.
