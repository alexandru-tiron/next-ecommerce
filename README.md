# Next E-commerce

<div align="center">
  <img src="/public/images/logo.svg" alt="Logo" width="100"/>
  <h3>Modern E-commerce Platform Built with Next.js</h3>
  <p>A comprehensive e-commerce solution with a simple UI, product management, cart functionality, checkout process, and user profiles.</p>
  <p><a href="https://next-ecommerce-alexandru-tirons-projects.vercel.app/">Live Demo</a></p>
</div>

## Project Overview

Next E-commerce is a modern online shopping platform built with the latest web technologies. It provides a seamless shopping experience with features like product browsing, filtering, cart management, and secure checkout.

### Key Technology Features

-  **Frontend**: Next.js 15 with App Router and React 19
-  **Styling**: Tailwind CSS for responsive design
-  **Search**: Algolia for powerful product search
-  **Authentication**: Firebase Authentication
-  **Database**: Firebase Firestore
-  **Serverless Functions**: Firebase Cloud Functions for backend operations
-  **Internationalization**: next-intl for multi-language support
-  **Form Handling**: React Hook Form
-  **Icons**: Lucide React for beautiful icons
-  **Date Handling**: date-fns for date formatting

## Features

-  🛍️ Product browsing with categories and filters
-  🔍 Fast and powerful search functionality
-  🛒 Cart management with real-time updates
-  💳 Streamlined checkout process
-  👤 User profiles and order history
-  🌙 Responsive design for all devices
-  🌐 Multi-language support
-  🔐 Secure authentication and user management
-  📱 Mobile-friendly interface
-  🎨 Modern UI with smooth animations

## Tech Stack

-  Next.js - React framework
-  TypeScript - Type safety
-  Tailwind CSS - Styling
-  Firebase - Authentication and database
-  Algolia - Search functionality
-  React Hook Form - Form handling
-  next-intl - Internationalization
-  TailwindMerge - Conditional styling
-  React Responsive Carousel - Image sliders

## Getting Started

### Prerequisites

-  Node.js 20+
-  npm, yarn, pnpm, or bun
-  Firebase account
-  Algolia account (for search functionality)

### Local Development

1. Clone the repository

```bash
git clone https://github.com/alexandru-tiron/next-ecommerce.git
cd next-ecommerce
```

2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables

Copy `.example.env` to `.env.local` in the root directory and fill in your store details, the public store URL (`NEXT_PUBLIC_SITE_URL`, used for SEO links and the sitemap) and your Firebase and Algolia credentials. The Firebase and Algolia keys are:

```
# Firebase
NEXT_PUBLIC_APIKEY=your-api-key
NEXT_PUBLIC_AUTHDOMAIN=your-auth-domain
NEXT_PUBLIC_PROJECTID=your-project-id
NEXT_PUBLIC_STORAGEBUCKET=your-storage-bucket
NEXT_PUBLIC_MESSAGINGSENDERID=your-messaging-sender-id
NEXT_PUBLIC_APPID=your-app-id
NEXT_PUBLIC_MEASUREMENTID=your-measurement-id

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-only-api-key
```

4. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The app should now be running at [http://localhost:3000](http://localhost:3000)

To try everything (sign-in, checkout, the admin panel) without a Firebase project, run the store against the local Firebase emulators with demo data: see "Run everything locally" in [CONTRIBUTING.md](CONTRIBUTING.md).

### Search index (Algolia)

The store queries an Algolia index named `products` plus sorted replicas: `products_price_asc`, `products_price_desc`, `products_created_at_desc` (`desc(created_at._seconds)`), `products_sold_desc`, `products_sold_asc`, `products_name_asc` and `products_name_desc`. Filtering uses `category_name`, `subcategory_name`, `brand`, `sku_variants.name` and `product_code` (set as filter-only facets) and the numeric `price`.

The Cloud Functions keep the index in sync when products change; they read `ALGOLIA_APP_ID` and `ALGOLIA_INDEX_NAME` from `functions/.env`, and the write key from Secret Manager (`firebase functions:secrets:set ALGOLIA_API_WRITE_KEY`). Admins can rebuild the whole index from **Admin → Settings → Reindex search**.

### Card payments (Stripe and NETOPIA Payments)

Cash on delivery works out of the box. Card payments open the provider's own secure payment page (no card details pass through the store) and are switched on in **Admin → Settings → Payments** once their keys are set:

1. Store the keys in Secret Manager (each command asks for the value):

   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   firebase functions:secrets:set NETOPIA_API_KEY
   firebase functions:secrets:set NETOPIA_PUBLIC_KEY --data-file path/to/netopia-public-certificate.cer
   ```

2. Switch the provider on in `functions/.env` (`ENABLE_STRIPE=true` and/or `ENABLE_NETOPIA=true`; a provider's functions, and the secrets they need, are only loaded once it is enabled) and deploy its functions: `firebase deploy --only functions:createStripeSession,functions:stripeWebhook` for Stripe, `functions:createNetopiaPayment,functions:netopiaIpn` for NETOPIA.
3. Stripe: add a webhook endpoint pointing at the `stripeWebhook` function URL, with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`.
4. NETOPIA: enter the POS signature in the Payments settings and keep live mode off to test in the sandbox. Payment notifications go to the `netopiaIpn` function automatically.

Paid orders are marked by the providers' webhooks. Card orders that stay unpaid for 3 hours are cancelled by the `cancelUnpaidOrders` function, which puts their items back in stock.

### Checks

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest unit tests (src/**/*.test.ts)
npm --prefix functions test   # Cloud Functions unit tests (functions/test)
npm run test:rules # Firestore and Storage rules tests on the emulators (needs Java and the Firebase CLI)
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs these checks, a dependency audit and a production build on every push to `main` and on every pull request. The build needs the `NEXT_PUBLIC_*` values from `.example.env`, so add them as repository variables (Settings → Secrets and variables → Actions → Variables).

## Deployment

The easiest way to deploy your Next.js e-commerce app is using [Vercel](https://vercel.com/), which provides optimal compatibility with Next.js features including internationalization (i18n) in server-side rendering:

1. Push your code to GitHub (or GitLab/BitBucket)

2. Connect your repository to Vercel:

   -  Sign up or log in to [Vercel](https://vercel.com/)
   -  Click "Add New" > "Project"
   -  Select your repository and click "Import"

3. Configure your project:

   -  Keep the default framework preset (Next.js)
   -  Set your environment variables in the Vercel dashboard
   -  Configure build settings if needed

4. Deploy your application:
   -  Click "Deploy"
   -  Vercel will automatically build and deploy your application

Once deployed, Vercel provides:

-  Automatic HTTPS
-  Global CDN for fast content delivery
-  Preview deployments for pull requests
-  Analytics and monitoring
-  Seamless handling of API routes and server-side rendering
-  Built-in support for Next.js i18n

You can manage your deployments, domains, and environment variables directly through the Vercel dashboard.

> **Note:** While Firebase App Hosting does support Next.js applications, I encountered compatibility issues specifically with the internationalization (i18n) features when using server-side rendering (SSR). If your project relies heavily on i18n with SSR like this one does, Vercel currently provides better out-of-the-box support for these features.

## TODO List

### User Experience

-  [x] Product browsing with categories and filters
-  [x] Fast and powerful search functionality
-  [x] Cart management with real-time updates
-  [x] Streamlined checkout process
-  [x] User profiles and order history
-  [x] Responsive design for all devices
-  [x] Multi-language support
-  [x] Secure authentication and user management
-  [x] Enhanced product filtering (facet counts, multi-select brand/size/colour, in stock, on sale, filter chips)
-  [x] Wishlist functionality (saved to the account, or in the browser for guests)
-  [x] Product reviews and ratings (one review per signed-in customer per product)
-  [x] Related products recommendations
-  [x] Recently viewed products
-  [x] Social sharing integration
-  [x] Email notifications for order status update (toggle in Admin → Settings → Notifications)

### Admin Dashboard

-  [x] Product management
-  [x] Order management
-  [x] User management
-  [x] Analytics dashboard
-  [x] Inventory management (stock reserved on order, restored on rejection, admin stock page)
-  [x] Voucher and promo code management

### Technical Improvements

-  [x] Next.js App Router implementation
-  [x] Tailwind CSS styling
-  [x] Firestore integration
-  [x] Firebase Auth
-  [x] Firebase Cloud Functions implementation
-  [x] Algolia search implementation
-  [x] Performance optimization (parallel data loading, server-rendered hero and categories, responsive images)
-  [x] More server components implementation (home page hero and categories render on the server)
-  [x] Image optimization (responsive sizes, AVIF/WebP, optimizer limited to the Storage bucket)
-  [x] SEO enhancements (metadata, Open Graph, product structured data, sitemap, robots.txt)
-  [x] PWA support (installable manifest and icons, offline page via service worker)
-  [x] Testing implementation (Vitest unit tests; component and end-to-end tests still to add)
-  [x] CI/CD pipeline setup (GitHub Actions checks; Vercel deploys on push)

### Payment & Shipping

-  [x] Multiple payment gateway integration (Stripe and NETOPIA Payments, alongside cash on delivery)
-  [ ] Shipping provider integration
-  [x] Order tracking (status timeline and tracking number on the order page; no courier integration yet)
-  [ ] Address verification
-  [x] Tax calculation (VAT included in prices, configurable rate, stored on each order)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the checks every change must pass, and the [roadmap](docs/ROADMAP.md) for where the project is heading. Please follow the [code of conduct](CODE_OF_CONDUCT.md), and report security problems privately as described in [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

-  GitHub: [@AlexT](https://github.com/alexandru-tiron)
-  Linkedin: [@AlexT](https://www.linkedin.com/in/alextiron)

## Firebase backend

Everything the store needs is in this repository:

-  `functions/`: Cloud Functions for order validation (prices, stock, vouchers, VAT), order e-mails and status updates, card payments, contact messages, search sync, account creation and deletion, and admin rights.
-  `packages/core/`: the business rules the storefront and the functions share (see [packages/core/README.md](packages/core/README.md)).
-  `firestore.rules` and `storage.rules`: deny-by-default security rules. Deploy them together with the functions, and never replace them with open "test mode" rules.
-  `firestore.indexes.json`: the Firestore indexes the queries need.
-  `scripts/`: demo data, search index setup and reindexing, and the script that creates the first admin (see [scripts/README.md](scripts/README.md)).

Copy `.firebaserc.example` to `.firebaserc` and `functions/.example.env` to `functions/.env` with your own values before deploying. Then follow [docs/SECURITY-SETUP.md](docs/SECURITY-SETUP.md) to deploy the rules, store the secrets and turn on App Check.
