# Quick start

From nothing to a live, branded store with a test order, in about 30 minutes. No Firebase experience needed.

To look around first without creating any account, run the store on your computer with demo data: `npm install`, then `npm run dev:demo` (needs [Java 11 or newer](https://adoptium.net)). It prints an admin account to sign in with.

## What you need

- [Node.js](https://nodejs.org) 20.17 or newer.
- A Google account. The store runs on Firebase, which needs the **Blaze** (pay-as-you-go) plan for its functions and file storage. Small stores usually stay within the free usage, and the setup creates a budget alert so costs can't surprise you.
- A [Vercel](https://vercel.com) account for the storefront (the free Hobby plan works to start).
- An [Algolia](https://www.algolia.com) account for product search. The free plan is enough. A built-in search is planned, after which this becomes optional.
- Optional: a Gmail or Google Workspace address with an [app password](https://support.google.com/accounts/answer/185833), for order e-mails.

## 1. Get the code

Fork the repository on GitHub (or use it as a template), then clone your copy:

```bash
git clone https://github.com/<you>/<your-store>.git
cd <your-store>
npm install
```

## 2. Set up the backend

```bash
npm run setup
```

The setup asks a few questions and does the rest. In order, it:

1. Checks Node and signs you in to Firebase.
2. Creates a Firebase project, or uses one you have, and asks where to keep the data.
3. Checks the Blaze plan and creates a monthly **budget alert**.
4. Creates the database, turns on e-mail sign-in and creates the file storage.
5. Registers the web app and fetches its configuration.
6. Writes `.env.local`, `.firebaserc` and `functions/.env`, and stores the e-mail password in Secret Manager.
7. Configures Algolia (keys, index and sorted replicas).
8. Deploys the security rules, the database indexes and the Cloud Functions.
9. Creates a **one-time setup link** that makes you the owner.
10. Optionally adds the demo catalogue.
11. Prints what's left.

To see every step without changing anything, run `npm run setup -- --dry-run`. If a step fails, fix the problem and run `npm run setup` again: finished steps are reused.

## 3. Deploy the storefront

Click **Deploy with Vercel** in the [README](../README.md), or import the repository in Vercel. Fill in the variables from your `.env.local` (they're described in [deploy.md](deploy.md)). Vercel builds the store and gives it an address such as `my-store.vercel.app`.

Then tell the backend that address, so e-mail links, sign-in and the setup link use it:

```bash
npm run setup -- --project <your-project-id> --site https://my-store.vercel.app
```

Set `NEXT_PUBLIC_SITE_URL` in Vercel to the same address and redeploy.

## 4. Claim the store and set it up

Open the setup link printed at the end (`https://…/setup#token=…`). Sign up, or sign in, and click **Become the owner**. The wizard then walks through:

1. Store details.
2. Branding.
3. Languages, currency and tax.
4. Shipping.
5. Payments.
6. Legal pages.

The link works once and expires after 7 days. For a new one, run `npm run setup-link -- --site https://my-store.vercel.app --project <id> --yes` (see [scripts/README.md](../scripts/README.md)).

## 5. Add products and place a test order

In the admin panel (`/admin`), add a category, a brand and a product. Place an order on the store with cash on delivery, then accept it in Admin → Orders. You should receive the confirmation and status e-mails.

The admin dashboard shows a checklist of what's left, including the security settings. Before opening the store, go through [going-live.md](going-live.md).
