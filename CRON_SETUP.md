# Daily cron + email alerts

Automated job: **every day at 6:00 AM US Central** (`0 12 * * *` UTC).  
During daylight saving (CDT), that is **7:00 AM** local Central time.  
Emails **samir3490@gmail.com** when **quantity mismatches** exist.

Optional: enable **Auto-update HubSpot quantities on daily compare** in Settings (or set `CRON_AUTO_SYNC_HUBSPOT=true` on Vercel) to push QuickBase qty to HubSpot after mismatches are found. Requires HubSpot scope `crm.objects.products.write`.

## 1. Vercel env vars (required)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Random string; Vercel Cron sends `Authorization: Bearer …` |
| `ALERT_EMAIL` | Default: `samir3490@gmail.com` |
| `CRON_FIREBASE_UID` | Your Firebase Auth user id (see below) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full service account JSON (one line) |

**Important:** After changing env vars on Vercel, **redeploy** production so the new values take effect.

**Email (pick one):**

| Option A — Resend | Option B — Gmail SMTP |
|-------------------|------------------------|
| `RESEND_API_KEY` | `SMTP_USER=samir3490@gmail.com` |
| `EMAIL_FROM=Name <onboarding@resend.dev>` | `SMTP_PASS=` Gmail [App Password](https://myaccount.google.com/apppasswords) |
| | `SMTP_HOST=smtp.gmail.com` |
| | `SMTP_PORT=587` |

## 2. Firebase service account

1. Firebase Console → **Project settings → Service accounts**
2. **Generate new private key** → download JSON
3. In Vercel → **Settings → Environment Variables**
4. Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
5. Value: paste entire JSON as **one line** (minified)

## 3. Your Firebase user id (`CRON_FIREBASE_UID`)

After saving settings in the app once:

1. Firestore → **Data** → `qtyCompareUsers` → copy the document id (your uid)

Or: Firebase Console → Authentication → Users → copy **User UID**.

Set as `CRON_FIREBASE_UID` on Vercel.

## 4. Firestore rules for Admin SDK

Service account bypasses client rules. No change needed if admin key is from same project.

## 5. Test manually

**Check cron is configured (no compare run):**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://qb-hubspot-qty-compare.vercel.app/api/cron/compare?status=1"
```

Expect `"ready": true` with `configLoaded`, `emailConfigured`, and `cronFirebaseUidSet` all true.

**Run compare + email now:**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://qb-hubspot-qty-compare.vercel.app/api/cron/compare
```

Response when mismatches exist: `"emailSent": true` (or `"emailError"` if SMTP misconfigured)

## 6. Vercel Cron plan

Cron jobs require **Vercel Pro** (or equivalent) on the project. Confirm under **Project → Settings → Cron Jobs**.

## Behavior

- Loads API keys from **your saved Firestore settings** (same as the app UI)
- Compares QuickBase vs HubSpot in bulk
- **No email** if all quantities match
- Email includes top 50 mismatches + link to the app
- Saves run to Firestore under your user (History tab)
- If auto-sync is enabled, updates HubSpot `qty_available` (or your configured qty property) from QuickBase for mismatch rows
