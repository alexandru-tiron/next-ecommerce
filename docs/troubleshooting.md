# Troubleshooting

Problems seen while building and running this store, and how to fix them.

## Deploying

### "Cannot determine backend specification. Timeout after 10000" when deploying functions

The CLI took too long to load the functions. Deploy with a longer timeout: `FUNCTIONS_DISCOVERY_TIMEOUT=60 npx firebase-tools deploy --only functions` (in PowerShell: `$env:FUNCTIONS_DISCOVERY_TIMEOUT=60` first). `npm run setup` sets it for you.

### "Secret … not found" or a deploy that stops asking for secret values

Every function's secrets must exist before deploying, even unused ones. Set them with `npx firebase-tools functions:secrets:set EMAIL_PASSWORD` and `… ALGOLIA_API_WRITE_KEY`. Any placeholder works for a feature you don't use yet. Stripe and NETOPIA secrets are only needed once `ENABLE_STRIPE` or `ENABLE_NETOPIA` is `true`.

### "Key FIREBASE_… is reserved" in `functions/.env`

Variables starting with `FIREBASE_`, `X_GOOGLE_` or `GOOGLE_` can't be set there. `FIREBASE_SERVICE_ACCOUNT_KEY` belongs in Vercel only.

### "Unhandled error cleaning up build images" after a successful deploy

Harmless. Old build images remain in Artifact Registry and cost a few cents a month. Delete them in the Google Cloud console, or set a cleanup policy (`npx firebase-tools functions:artifacts:setpolicy`).

### Functions fail with billing errors, or deploys say the project must be on Blaze

Billing was turned off, or the billing account has a problem. Check the project in the Firebase console under Usage and billing.

## The live store

### Product lists are empty, but products exist in the admin panel

The lists come from Algolia. Check `NEXT_PUBLIC_ALGOLIA_APP_ID` and `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` in Vercel, then rebuild the index from Admin → Settings → Reindex search. Algolia removes free applications that stay unused for a long time; if yours is gone, create a new one, run `npm run setup` again (step 7) and reindex.

### The contact form, checkout or voucher check fail with "Unauthenticated", although signed in

App Check is enforced on the functions, and the browser didn't get a token. Add the store's domain to the reCAPTCHA key (Google Cloud console → Security → reCAPTCHA) and check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. See [SECURITY-SETUP.md](SECURITY-SETUP.md).

### Sign-in fails on a new domain with "unauthorized domain"

Add the domain in the Firebase console under Authentication → Settings → Authorized domains, or run `npm run setup -- --project <id> --site https://<domain>`.

### No order e-mails arrive

Check Admin → Settings → Notifications, `EMAIL_USER` in `functions/.env` and the `EMAIL_PASSWORD` secret (a Gmail app password, not the account password). Look in the function logs for "[Email]" lines. For an address on your own domain, set up SPF, DKIM and DMARC ([STORE-SETUP.md](STORE-SETUP.md), section 3).

### A new team member can't open the admin panel

Roles apply on the next sign-in. Ask them to sign out and back in. Removed members lose access within an hour.

### The setup link says it's invalid

Each link works once and for 7 days, and never after the wizard is finished. Create a new one with `npm run setup-link -- --site https://<address> --project <id> --yes`.

## Running locally

### `npm run dev:demo` or `npm run test:rules` fail to start the Firestore emulator

The emulators need Java 11 or newer (`java -version`). On Windows, "Unable to establish loopback connection" means Java can't create its socket file. Set `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\temp` and run again. More emulator fixes are in [scripts/README.md](../scripts/README.md).

### "Port 4000 taken" or "port 8080 taken"

Another program, or an emulator left over from an earlier run, is using it. Close it, or change the port in `firebase.json` on your machine.
