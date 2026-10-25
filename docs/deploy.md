# Deploying the storefront

The storefront is a Next.js app, deployed on [Vercel](https://vercel.com). The backend (database, rules, Cloud Functions) is deployed to Firebase by `npm run setup` or the Firebase CLI. Firebase App Hosting runs Next.js too, but had problems with the language handling in server rendering, so Vercel is the recommended host.

## Deploy button

The **Deploy with Vercel** button in the [README](../README.md) copies the repository to your GitHub account and asks for the required variables. In a fork, change `repository-url` in the button's link to your own repository.

## Variables

All of them are in `.env.local` after `npm run setup`. In Vercel, add them under Project → Settings → Environment Variables.

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_APIKEY` | Yes | Firebase web app config: API key. Public by design: the security rules and App Check protect the data. |
| `NEXT_PUBLIC_AUTHDOMAIN` | Yes | Firebase web app config: sign-in domain (`<project>.firebaseapp.com`). |
| `NEXT_PUBLIC_PROJECTID` | Yes | Firebase project id. |
| `NEXT_PUBLIC_STORAGEBUCKET` | Yes | Firebase Storage bucket. |
| `NEXT_PUBLIC_MESSAGINGSENDERID` | Yes | Firebase web app config: sender id. |
| `NEXT_PUBLIC_APPID` | Yes | Firebase web app config: app id. |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | Yes | Algolia application id. |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` | Yes | Algolia **search-only** key (never the write or admin key). |
| `NEXT_PUBLIC_SITE_URL` | Recommended | The store's public address, for canonical links, the sitemap and share previews. Defaults to Vercel's production address. |
| `NEXT_PUBLIC_MEASUREMENTID` | No | Firebase web app config: Google Analytics id, if the web app has one. Store analytics are set in Admin → Settings → General instead. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | No, recommended | The reCAPTCHA Enterprise key for App Check (see [SECURITY-SETUP.md](SECURITY-SETUP.md)). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | No, recommended | Server only. The whole JSON key of a read-only service account, for server-rendered pages. Needed before App Check is enforced on Firestore. |
| `NEXT_PUBLIC_CACHE_DURATION` | No | Minutes the browser keeps catalogue queries (default 2). |

Store details, branding, languages, currency and shipping are not variables: they're set in the admin panel and take effect without a redeploy.

## After the first deploy

1. Run `npm run setup -- --project <id> --site https://<your-address>`. It saves the address for e-mail links and payments, and adds it to Firebase sign-in's authorized domains.
2. For your own domain, follow section 2 of [STORE-SETUP.md](STORE-SETUP.md).
3. Deploy the functions again whenever `functions/.env` changes: `npx firebase-tools deploy --only functions`.
