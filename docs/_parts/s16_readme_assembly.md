
---

## 12. `README.md` (repo root)

````md
# FinSetu AI — NSFDC Pre-Application Guide

**Smart India Hackathon 2026 · PS 26092 · Ministry of Social Justice & Empowerment**

FinSetu is a bilingual (English/हिंदी), offline-first React Native app that helps
SC beneficiaries **discover → match → calculate → route → apply → track**
NSFDC-backed schemes — with a fully explainable rule engine and compliant
channel-partner routing.

> Demo build: scheme/partner data is illustrative seed data. FinSetu does not
> sanction or disburse loans.

## Quickstart

```bash
npm install
npx expo start          # press a = Android, i = iOS, w = web
npm test                # engine unit tests
```

Requires Node 18+. No native build needed — runs in Expo Go / emulators.

## Architecture

```
app/            expo-router screens (index, home, profile, match,
                calc, partners, apply, track, settings, admin)
src/engine/     PURE decision core: rules.ts (matcher + tracer),
                calc.ts (EMI/moratorium), types.ts
src/services/   storage.ts (AsyncStorage), api.ts (mock FastAPI seam)
src/store/      AppStore.tsx (context state machine)
src/i18n/       i18next en/hi JSON (~130 keys each)
src/components/ ui kit, SVG charts, timeline
data/           versioned scheme master, partner network, districts
docs/architecture/  C4 diagrams + ADRs
```

**Key design decisions** (see `docs/architecture/adr/`):

1. Rule engine over LLM scoring — deterministic, auditable, bilingual traces.
2. Manual district selection instead of GPS — zero permission friction offline.
3. NPA/e-KYC as routing compliance gates, not credit scores.
4. Every recommendation carries rule-trace + scheme version + source ref.
5. `services/api.ts` is the single swap point for the real FastAPI backend.

## Judge demo script (3 min)

| Step | Screen | Persona | What to say |
|------|--------|---------|-------------|
| 1 | index → home | Sunita, 32, SC woman, ₹2.5L income, ₹6L dairy unit | Bilingual gate; six-step journey |
| 2 | profile wizard | same | Indian-formatted amounts; words on review step |
| 3 | match | certificate *pending* variant | Conditional banner; open "Why this result?" |
| 4 | calc | ELS student | Moratorium toggle capitalizes interest |
| 5 | partners | Sehore user | Radius auto-widens 25→50 km; compliance chips |
| 6 | apply + track | any | Consent gate; FS-2026-XXXXX ID; simulate update |
| 7 | admin | official | Status/purpose aggregates |

## Swap-in backend contract

| Mock (`services/api.ts`) | Future endpoint |
|---|---|
| `fetchMatchResults` | `POST /eligibility/match` |
| `fetchNearbyPartners` | `GET /partners/nearby?scheme&district` |
| `addApplication` | `POST /applications` |
| `advanceApplication` | partner webhook → status events |
````

---

## 13. Assembling this document

All sections live as fragments under `docs/_parts/`; concatenate them in order
into `docs/FINSETU_FULL_BUILD.md`:

```powershell
$parts = @(
  '01_intro.md','02_core.md',
  '03_data_schemes.md','04_data_rest.md','04_services_store.md',
  '05_i18n.md','06_components_ui.md','07_components_charts.md',
  '08_screens_a.md',
  's09_screen_match.md','s10_screen_calc.md','s11_screen_partners.md',
  's12_screen_apply.md','s13_track_settings.md','s14_admin_entry.md',
  's15_tests.md','s16_readme_assembly.md'
)
$root = "$PSScriptRoot\_parts"
$out  = "$PSScriptRoot\FINSETU_FULL_BUILD.md"
($parts | ForEach-Object { Get-Content -Raw -LiteralPath (Join-Path $root $_) }) -join "`n" |
  Set-Content -Encoding UTF8 -LiteralPath $out
Write-Host "Wrote $out ($([math]::Round((Get-Item $out).Length/1kb)) KB)"
```

---

*End of build walkthrough. FinSetu AI — every recommendation explained, every
rupee accounted for.*
