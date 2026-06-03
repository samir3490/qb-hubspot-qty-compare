# QB ↔ HubSpot Quantity Compare

Compare product quantities between **QuickBase** (source of truth) and **HubSpot** with minimal API usage. Built for daily reconciliation—not per-item polling.

## Features

- Connect via **API keys** in the UI (stored in browser `localStorage`)
- **Bulk fetch**: ~1–5 QuickBase + ~4 HubSpot API calls for ~300 SKUs
- Match on **SKU**, flag mismatches, QB-only, HubSpot-only
- Excludes Product Families: PumpLoc, Home&Foundry, Literature, Popfin, Cooler, Signage, Samples, Edge, DO NOT USE
- **Excel export** (Summary, Mismatches, QB Only, HubSpot Only, Matches)
- Optional **Vercel Cron** daily compare via environment variables

## Quick start (local)

```bash
cd qb-hubspot-qty-compare
npm install
npm run dev
```

Open [http://localhost:3000/settings](http://localhost:3000/settings):

1. **QuickBase**: realm hostname, user token, table ID, field IDs (SKU, quantity summary field, product family).
2. **HubSpot**: Private app token, object type `products`, properties `hs_sku`, `qty_available`.

Then **Run compare** on the home page.

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

`vercel.json` runs `/api/cron/compare` daily at **11:00 UTC**. Set on Vercel:

- `CRON_SECRET` — random string
- All `QB_*` and `HUBSPOT_*` / `HS_PROP_*` variables

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.

## Security

- **Do not commit** `.env` or tokens.
- UI tokens live in **localStorage** (your browser only); they are POSTed to your deployment’s API routes over HTTPS.
- For production teams, prefer **Vercel env vars** only and restrict who can open Settings.
- Use HubSpot Private App scopes: `crm.objects.products.read` (compare only).

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/compare` | POST | Run full compare |
| `/api/test/quickbase` | POST | Test QB connection |
| `/api/test/hubspot` | POST | Test HubSpot connection |
| `/api/export` | POST | Excel download |
| `/api/cron/compare` | GET | Scheduled compare (env + CRON_SECRET) |

## License

Private / internal use.
