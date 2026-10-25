# Store setup

How to turn a fresh deployment into your own store: its details, look, languages and currency, your domain, and e-mail that reaches customers' inboxes. Deployment and security come first; see the [README](../README.md) and [SECURITY-SETUP.md](SECURITY-SETUP.md).

## 1. Admin → Settings

Everything below is stored in Firestore under `Settings/` and takes effect within seconds of clicking **Save**. Nothing needs a rebuild or a new deployment.

| Tab | What it sets |
| --- | --- |
| **General** | Store name, company name, VAT ID, registration number, country, address, phone, the contact, orders and support e-mail addresses, social links, and analytics. |
| **Branding** | Logo, favicon, the image shown when a page is shared, brand colour, font and corner style. The colour picker warns when white text on the colour would be hard to read. |
| **Languages & currency** | Default language, the languages visitors can switch between (English, Romanian, German), currency and time zone. |
| **Shipping** | Flat shipping price, an optional free-shipping threshold, and the VAT rate the prices include. |
| **Payments** | Cash on delivery, Stripe and NETOPIA. NETOPIA only takes RON and is hidden at checkout for other currencies. |
| **Notifications** | Which e-mails the store sends. |
| **Home & footer** | Order and visibility of the home page sections, and extra footer links with a label for each language. |
| **Pages** | About us, how to buy, delivery and payment, returns, terms and conditions, and privacy policy, written in a text editor for each language. |
| **Slider**, **Categories and Brands** | Home page slides and the catalogue structure. |

Notes:

- **Currency.** Prices are entered and shown in the store currency, and changing it doesn't convert existing prices. Each order keeps the currency it was placed in, so set the currency before taking orders.
- **Country.** It's a two-letter code such as `DE`. Stores in Romania (`RO`) also show the ANPC consumer protection links in the footer and the legal templates.
- **Pages.** Until you save your own text, each page shows a built-in template filled in with the store's details (company, address, shipping price, VAT, contact addresses). Use **Load template** to start from it. The templates are a starting point, not legal advice: have them checked for your country.
- **Languages.** Visitors get the store's default language until they pick another in the header; their choice is kept in a cookie. Customers' order e-mails use the language they ordered in. E-mails to the store use the default language.

### Team and roles

Admin → Team lists the people who can open the admin panel. Each has one role:

| Role | Can |
| --- | --- |
| **Owner** | Everything, including adding, changing and removing team members. |
| **Admin** | Run the store: products, orders, customers, vouchers, analytics and settings. |
| **Staff** | Orders (status and tracking number) and stock only. |

- Only owners change the team, and nobody changes their own role, so a store always keeps an owner.
- A person needs an account in the store first: they sign up on the login page, then an owner adds their e-mail address.
- Changes apply when the person next signs in. Removed members are signed out and lose access within an hour.
- The first owner comes from the setup wizard's one-time link (`npm run setup` or `npm run setup-link`), or from `npm run make-admin`. There is no other way to become an owner.
- Every role change is recorded and shown under "Recent changes" on the Team page.

## 2. Custom domain

1. **Vercel.** Add the domain under Project → Settings → Domains and follow the DNS instructions. Vercel issues the HTTPS certificate.
2. **Store URL.** Set `NEXT_PUBLIC_SITE_URL` in Vercel to `https://your-domain` (used for canonical links, the sitemap and share previews) and `SITE_URL` in `functions/.env` to the same value (used in e-mail links and as the return address after card payments). Redeploy the functions after changing it.
3. **Firebase Authentication.** In the Firebase console, open Authentication → Settings → Authorized domains and add the domain. Without it, Google sign-in and the e-mail action links fail on the new domain.
4. **App Check.** In Google Cloud, open Security → reCAPTCHA, edit the site key and add the domain. Without it, the store can't get App Check tokens and the protected functions reject requests.
5. **Card payments.** Nothing changes for Stripe or NETOPIA: their webhooks call the Cloud Functions directly.
6. **Check.** Open the store on the new domain, sign in, and send a message from the contact page. The contact form needs a working App Check token.

## 3. E-mail that arrives

The Cloud Functions send order confirmations, status updates, new-order notifications and contact messages through the Gmail or Google Workspace account in `EMAIL_USER` (in `functions/.env`), using an [app password](https://support.google.com/accounts/answer/185833) stored as the `EMAIL_PASSWORD` secret:

```bash
firebase functions:secrets:set EMAIL_PASSWORD
```

The e-mails use the store's logo (PNG or JPG; most mail apps don't show SVG, so SVG logos fall back to the store name), brand colour and details, and come in the customer's language.

**A plain Gmail address** (`…@gmail.com`) needs no DNS setup: Google signs the messages. Gmail limits sending to about 500 messages a day.

**An address on your own domain** (Google Workspace) needs three DNS records, or mail providers will send the store's e-mails to spam or reject them:

| Record | Host | Value |
| --- | --- | --- |
| SPF (TXT) | `@` | `v=spf1 include:_spf.google.com ~all` |
| DKIM (TXT) | `google._domainkey` | Generated in the Google Admin console under Apps → Google Workspace → Gmail → Authenticate email. Click **Start authentication** after adding the record. |
| DMARC (TXT) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@your-domain` |

- A domain can have only one SPF record. If you already have one (for example for a newsletter service), add `include:_spf.google.com` to it instead of creating a second.
- Start DMARC with `p=none` and read the reports sent to the `rua` address for a couple of weeks. Once only your own services appear, change it to `p=quarantine`, and later to `p=reject`.
- Check the setup by sending yourself an order confirmation and choosing **Show original** in Gmail: SPF, DKIM and DMARC should all say `PASS`.

A dedicated e-mail provider (Resend or SendGrid) replaces Gmail in a later phase (see the [roadmap](ROADMAP.md)). It will need its own SPF and DKIM records.

## 4. Share image, favicon and analytics

- **Share image.** Upload a 1200 × 630 image under Branding. It's used for every page that doesn't have its own image (product pages use the product photo).
- **Favicon.** A square PNG, SVG or ICO under Branding. Browsers cache favicons, so a change can take a while to show.
- **Analytics.** Pick Google Analytics 4 (with its `G-…` measurement ID) or Plausible (with your site's domain) under General. Visitors see a consent banner, and no analytics script loads until they accept. Mention the provider in your privacy policy.

## 5. Moving an existing store to a new version

Stores set up before the white-label settings existed have no `Settings/Localization` document, so they start with the defaults: English, euros and the Berlin time zone. To avoid showing the wrong currency, create the document in the Firebase console (Firestore → `Settings` → add document `Localization`) before deploying, with these fields:

| Field | Type | Example for a Romanian store |
| --- | --- | --- |
| `default_locale` | string | `ro` |
| `enabled_locales` | array of strings | `ro`, `en` |
| `currency` | string | `RON` |
| `time_zone` | string | `Europe/Bucharest` |

After deploying, the same values can be changed under **Languages & currency**. Orders placed before the currency setting existed have no currency saved and are treated as RON.
