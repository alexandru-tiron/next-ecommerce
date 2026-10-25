# Going live

Check these before telling customers about the store. The admin dashboard's checklist covers most of them and shows what's still open.

## The store

- [ ] Store details, logo and brand colour (Admin → Settings → General and Branding).
- [ ] Language, currency and time zone (Admin → Settings → Languages & currency). The currency is saved with each order, so set it before the first real order.
- [ ] Shipping price and the free-shipping threshold; the VAT rate prices include.
- [ ] Legal pages adapted to your business and country (Admin → Settings → Pages). The templates are a starting point, not legal advice.
- [ ] Your own domain, with the address set in Vercel (`NEXT_PUBLIC_SITE_URL`) and in the functions (`SITE_URL`). See [STORE-SETUP.md](STORE-SETUP.md).
- [ ] E-mail on your own domain, with SPF, DKIM and DMARC records, if you don't use a plain Gmail address.
- [ ] Demo products removed, if you added the demo catalogue (their ids start with `demo-`).

## Payments

- [ ] Cash on delivery, Stripe and/or NETOPIA switched on in Admin → Settings → Payments.
- [ ] Card payments tested in the providers' test modes, then switched to live keys (Stripe) or live mode (NETOPIA).
- [ ] A test order placed, accepted and cancelled, with the e-mails received.

## Security

- [ ] App Check registered, `ENFORCE_APP_CHECK=true` in `functions/.env`, and the functions deployed.
- [ ] App Check enforced on Cloud Firestore once its metrics show mostly verified requests (this needs `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel first). See [SECURITY-SETUP.md](SECURITY-SETUP.md).
- [ ] Multi-factor sign-in for every owner and admin (Authentication → Settings → Multi-factor authentication in the Firebase console, then each person enrolls from their account).
- [ ] Only the people who need it on the team, each with the smallest role that works (Admin → Team).
- [ ] Backups: point-in-time recovery or a backup schedule on the database (Google Cloud console → Firestore → Disaster recovery).
- [ ] A budget alert on the project (created by `npm run setup`, or in Billing → Budgets & alerts).
- [ ] The latest rules deployed: `npx firebase-tools deploy --only firestore:rules,storage`. The dashboard shows whether they're current.
