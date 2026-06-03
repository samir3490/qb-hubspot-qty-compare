# Fix Firebase “permission denied” / broken AlgoTrader

Project **agrasen-technologies** hosts **three apps**. Rules must allow **all** paths:

- `users/{uid}/…` — **AlgoTrader** (holdings, trades, orders)
- `qtyCompareUsers/{uid}/…` — **QB↔HubSpot compare**
- `students`, `volunteers`, … — **Donor transparency**

## Deploy merged rules (required)

**Option A — Firebase Console (fastest)**

1. [Firebase Console](https://console.firebase.google.com/) → **agrasen-technologies** → **Firestore** → **Rules**
2. Copy the entire contents of **`../firebase-agrasen/firestore.rules`** (or `firestore.rules` in this repo — same file)
3. **Publish**

**Option B — CLI**

```bash
cd ../firebase-agrasen
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

## After publishing

1. Refresh AlgoTrader — holdings/trades should reappear (data was in Firestore; the app could not read it)
2. QB compare app — save settings again
3. Re-enable GitHub **Strategy scan** workflow when ready

## Stop AlgoTrader emails immediately

Until rules are fixed, disable **Actions → Strategy scan (15 min)** in the algo-trader GitHub repo, or pause all strategies in the app.

See **`../firebase-agrasen/README.md`** for full explanation.
