# QB ↔ HubSpot Quantity Compare

Compare product quantities between **QuickBase** (source of truth) and **HubSpot** with minimal API usage. Built for daily reconciliation—not per-item polling.

## Features

- **Firebase Auth** — sign in / sign up with email & password
- **Firebase Firestore** — API keys, field mappings, and compare run history stored per user
- **Bulk fetch**: ~1–5 QuickBase + ~4 HubSpot API calls for ~300 SKUs
- Match on **SKU**, flag mismatches, QB-only, HubSpot-only
- Excludes Product Families: PumpLoc, Home&Foundry, Literature, Popfin, Cooler, Signage, Samples, Edge, DO NOT USE
- **Excel export** (Summary, Mismatches, QB Only, HubSpot Only, Matches)
- **HubSpot sync** — update HubSpot quantities from QuickBase (manual button or optional daily auto-sync)
- Optional **Vercel Cron** daily compare at **6:00 AM US Central** (12:00 UTC)

## Quick start (local)

```bash
cd qb-hubspot-qty-compare
npm install
npm run dev
```

1. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_FIREBASE_*` values.
2. In [Firebase Console](https://console.firebase.google.com/) → **agrasen-technologies**:
   - **Authentication** → Sign-in method → enable **Email/Password**
   - **Firestore** → Create database (if needed)
   - Deploy rules: `firebase deploy --only firestore:rules` (requires Firebase CLI)
3. `npm run dev` → open [http://localhost:3000](http://localhost:3000) → **Sign up**
4. **Settings**: QuickBase + HubSpot API keys (saved to Firestore)
5. **Run compare** — results also saved under **History**

### Finding QuickBase field IDs

In your Items table: **Settings → Fields** — the numeric **FID** in the URL or field properties. Common fields from your export:

| Field | Typical FID (verify in your app) |
|-------|----------------------------------|
| SKU | 6 |
| Product Family | 8 |
| Record ID# | 3 |
| Total QTY Available… | *your summary field FID* |

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: QB HubSpot quantity compare app"
gh repo create qb-hubspot-qty-compare --public --source=. --push
```

### 2. Import on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import the GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. Add environment variables from `.env.example` if using **Cron** (optional).
4. Deploy.

### 3. Cron (optional)

`vercel.json` runs `/api/cron/compare` daily at **6:00 AM US Central** (`0 12 * * *` UTC). Set on Vercel:

- `CRON_SECRET` — random string
- All `QB_*` and `HUBSPOT_*` / `HS_PROP_*` variables

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.

## Firestore data model

```
qtyCompareUsers/{uid}/settings/config   → ConnectionConfig (QB + HubSpot keys)
qtyCompareUsers/{uid}/runs/{runId}      → CompareResult snapshot
```

Rules in `firestore.rules` restrict access to `request.auth.uid == userId`.

## Security

- **Do not commit** `.env.local` or API tokens.
- QuickBase / HubSpot tokens are stored in **Firestore** (encrypted at rest by Google); protect with strong auth passwords.
- Deploy `firestore.rules` before production use.
- HubSpot Private App: `crm.objects.products.read` + `crm.schemas.products.read` for compare; add `crm.objects.products.write` for sync.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/compare` | POST | Run full compare |
| `/api/sync/hubspot` | POST | Update HubSpot qty from QuickBase (mismatch rows) |
| `/api/test/quickbase` | POST | Test QB connection |
| `/api/test/hubspot` | POST | Test HubSpot connection |
| `/api/export` | POST | Excel download |
| `/api/cron/compare` | GET | Scheduled compare (env + CRON_SECRET) |

## License

Private / internal use.
