# FinSetu AI — Integration & Deployment Guide (for backend/infra teammates)

The current MVP is **UI-only with local storage** (AsyncStorage). Nothing in this
doc is configured yet — this is the step-by-step path to wire real services later.
Everything below has a free tier.

---

## Phase A — Real backend

### A1. FastAPI + Postgres + PostGIS (local dev)

```bash
backend/
  python -m venv venv && venv\Scripts\activate
  pip install fastapi uvicorn sqlalchemy alembic psycopg[binary] geoalchemy2 pydantic-settings
```

`docker-compose.yml` for the DB:

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: finsetu
      POSTGRES_DB: finsetu
    ports: ["5432:5432"]
```

Enable geospatial queries once:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX partners_geom_idx ON partners USING GIST (geom);
```

Load `data/schemes.ts` and `data/partners.ts` as seed rows. Store scheme rules
as JSONB, add `effective_from` + `version`, and always filter by latest effective row.

Implement the endpoints in `docs/api-contract.md`. Then replace bodies of
`src/services/api.ts` functions with HTTP calls.

### A2. Free hosting

| Piece | Service | Free tier notes |
|---|---|---|
| API | Render web service (Docker or Python) | Spins down after inactivity; first request cold-starts (~30-50 s) |
| DB | Supabase project | PostGIS available; 500 MB; also gives Auth + Storage free |
| App (APK) | EAS Build | ~15 free queue builds/month |

Env vars to keep secret server-side: `GEMINI_API_KEY` (Phase B),
`BHASHINI_API_KEY` / `BHASHINI_UID` (Phase C), `DATABASE_URL`.

## Phase B — Optional AI intent extraction (free)

1. Create key at Google AI Studio (aistudio.google.com) — free tier.
2. Add `POST /ai/intent`: prompt Gemini Flash with the user's sentence, force a
   strict JSON response matching `BeneficiaryProfile` partials.
3. Rules: if confidence < threshold → return `{ "needs_clarification": [...] }`
   and the UI keeps the form flow. The LLM never decides eligibility.
   Fallback if quota exhausted: deterministic form flow (already how the app works).

## Phase C — BHASHINI language layer (free, registration required)

1. Register at ULCA (ulcaconsole.bhashini.gov.in) — free, takes a few days for keys.
2. Use Bhashini pipeline APIs for translation, ASR (speech-to-text), TTS.
3. Proxy calls through the FastAPI backend so keys never ship in the app bundle.
4. Until then, the app ships static `en.json` / `hi.json` bundles +
   `expo-speech` on-device TTS (works offline, no keys).

## Phase D — Ship the APK

```bash
npm install -g eas-cli
eas login                      # free Expo account
eas build:configure
eas build -p android --profile preview   # produces installable .apk
```

For Play Store internal testing: `eas build -p android --profile production`
(.aab) then upload via Play Console (one-time $25 fee — otherwise sideload the
preview APK at zero cost).

## Demo-day resilience checklist

- [ ] App works fully offline (all data local) except map tiles + voice test
- [ ] If Bhashini keys pending: voice toggle uses expo-speech (no network)
- [ ] If backend not deployed yet: mock layer already returns realistic data
- [ ] Reset demo data from Settings between pitches
