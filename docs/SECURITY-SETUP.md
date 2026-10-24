# Security setup

What every store needs before it takes real orders, and how to check it. The code ships secure defaults; these steps connect them to your own Firebase project.

## 1. Security rules

`firestore.rules` and `storage.rules` deny everything that isn't explicitly allowed:

- Customers can only read and change their own profile, addresses, cart and wishlist, and only the fields the store uses. The account e-mail must match the sign-in e-mail, and creation dates can't be changed.
- Cart quantities must be whole numbers from 1 to 999. Prices saved in the cart are only for display: the order function reads every price from the catalogue.
- Orders are created only by the `validateAndCreateOrder` function. Customers can read their own orders; admins can read and update all of them.
- Uploads are admin-only: photos up to 5 MB, SVG icons and logos up to 200 KB. Anyone can open an uploaded file by its link, but only admins can list folders.

Deploy them whenever they change:

```bash
firebase deploy --only firestore:rules,storage
```

Never replace them with the open "test mode" rules from the Firebase console.

The rules have automated tests (`tests/rules/`) that run on the Firestore and Storage emulators for anonymous visitors, customers, other customers and admins. CI runs them on every pull request. To run them locally (needs Java 11+ and the Firebase CLI):

```bash
npm run test:rules
```

## 2. Secrets

The e-mail password and the Algolia write key live in Google Secret Manager, not in `functions/.env`. Set each one once; the command asks for the value:

```bash
firebase functions:secrets:set EMAIL_PASSWORD
firebase functions:secrets:set ALGOLIA_API_WRITE_KEY
```

Then delete those two lines from `functions/.env` if they are still there. The deploy fails while a name is both a secret and a `.env` value. Card payment keys are secrets too (see "Card payments" in the README).

- **Local emulators** read secrets from `functions/.secret.local` (gitignored), one `NAME=value` per line.
- **To rotate a secret**, set it again with the same command, then redeploy the functions that use it. The deploy output lists them.
- **The Firebase web config** (`NEXT_PUBLIC_*` values) is public by design. It ships in every visitor's browser; the rules and App Check protect the data, not the config.

## 3. App Check

App Check makes Firebase and the Cloud Functions accept requests only from your storefront, which blocks scripts that call them directly with your public config.

1. In the Google Cloud console, open **Security → reCAPTCHA** and create a website key for your store's domains.
2. In the Firebase console, open **App Check → Apps**, register your web app with the **reCAPTCHA Enterprise** provider, and enter the site key.
3. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to the site key in `.env.local` and in your hosting environment (Vercel), then redeploy the storefront.
4. Watch **App Check → APIs** for a few days. Almost all requests should show as verified.
5. Turn on enforcement for the callable functions: set `ENFORCE_APP_CHECK=true` in `functions/.env` and redeploy them (`setAdminPrivilege`, `validateAndCreateOrder`, `checkVoucher`, `sendContactMessage`, `syncAllProductsToAlgolia`, plus the card payment functions you use).
6. Enforce App Check for Cloud Firestore, once server-rendered pages read Firestore with the service account key (next section). In **App Check → APIs → Cloud Firestore**, choose **Enforce**. Without the key, server pages read Firestore like a browser, and enforcement would stop the store from loading.

Leave Cloud Storage unenforced. Product images are opened by their links, and the image optimizer fetches them without an App Check token. Uploads are already limited to admins by `storage.rules`.

**Local development:** in **App Check → Apps → Manage debug tokens**, add a token, and set it as `NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN` in `.env.local`. It only works in `npm run dev`, never in a production build.

## 4. Server access to Firestore

Server-rendered pages (the home page, product pages, the footer, the sitemap) read Firestore with the Admin SDK when `FIREBASE_SERVICE_ACCOUNT_KEY` is set. That lets App Check be enforced on Firestore. Without the key they fall back to the web SDK, which keeps working only while Firestore doesn't enforce App Check.

1. In the Google Cloud console, open **IAM & Admin → Service accounts** and create an account (for example `storefront-reader`) with only the **Cloud Datastore Viewer** role. It can read data but not change it.
2. Open the account's **Keys** tab, add a JSON key and download it.
3. In Vercel, add an environment variable `FIREBASE_SERVICE_ACCOUNT_KEY` with the file's contents (or the contents in base64), marked **Sensitive**, then redeploy. Delete the downloaded file.

The key can read every document, customers' details included, so treat it like a password. Never put it in a `NEXT_PUBLIC_` variable or the repository. To rotate it, create a new key, update the variable, redeploy, and delete the old key.

Server pages keep store data in Next's data cache for a few minutes (one minute for products, because orders change stock). Admin saves refresh it at once through `/api/revalidate`, which only accepts signed-in admins.

## 5. Security headers

Every response carries HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` and `Cross-Origin-Opener-Policy` (set in `next.config.ts`). Every page also gets a Content-Security-Policy with a fresh nonce for each request (`src/middleware.ts`), so the browser only runs the scripts the store rendered.

If you add a third-party service (analytics, chat, a new payment widget), add its origins to `src/lib/csp.ts`, or the browser will block it. Blocked requests show in the browser console as CSP errors.

Check a deployed store with [securityheaders.com](https://securityheaders.com).

## Checklist

- [ ] Rules deployed from this repository (`firebase deploy --only firestore:rules,storage`)
- [ ] `EMAIL_PASSWORD` and `ALGOLIA_API_WRITE_KEY` set as secrets and removed from `functions/.env`
- [ ] App Check registered, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` set, and `ENFORCE_APP_CHECK=true` once the metrics look right
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set in Vercel (read-only account), then App Check enforced on Cloud Firestore
- [ ] A budget alert on the Google Cloud billing account
- [ ] Only the people who need it have admin rights (`npm run make-admin -- --revoke` removes them)
