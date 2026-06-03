# Fix Firebase “permission denied” when saving settings

Your app stores settings at `qtyCompareUsers/{your-user-id}/settings/config`.  
Firestore **blocks all reads/writes** until you publish the rules below.

## Option A — Firebase Console (fastest, no CLI)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **agrasen-technologies**
2. **Build → Firestore Database**
   - If you see **Create database**, create it (Production mode is OK once rules are published)
3. Open the **Rules** tab
4. Replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /qtyCompareUsers/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Click **Publish**
6. Confirm **Authentication → Sign-in method → Email/Password** is **Enabled**
7. In the app: sign out → sign in → **Settings → Save settings to cloud**

## Option B — Firebase CLI

From the project folder:

```bash
cd qb-hubspot-qty-compare
npx firebase-tools login
npx firebase-tools use agrasen-technologies
npx firebase-tools deploy --only firestore:rules
```

## Verify it worked

1. Save settings in the app — green “Settings saved to the cloud” message
2. Open Firestore → **Data** — you should see `qtyCompareUsers` → your uid → `settings` → `config`
3. Sign in on another device with the **same email** — settings should load automatically

## Still failing?

| Symptom | Fix |
|--------|-----|
| `permission-denied` on save | Rules not published, or wrong Firebase project in Vercel env vars |
| Can't sign up / sign in | Enable Email/Password in Authentication |
| Settings empty on 2nd device | Different email account, or save was never successful on first device |
| History tab empty / error | Same rules fix; compare runs also write under `qtyCompareUsers/{uid}/runs` |

## Vercel env vars (must match this project)

All `NEXT_PUBLIC_FIREBASE_*` values on Vercel must point to **agrasen-technologies**, not another Firebase project.
