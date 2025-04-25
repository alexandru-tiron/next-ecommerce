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

Create a `.env.local` file in the root directory and add your Firebase and Algolia credentials.

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_API_KEY=your-api-key
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
-  [ ] Enhanced product filtering
-  [ ] Wishlist functionality
-  [ ] Product reviews and ratings
-  [ ] Related products recommendations
-  [ ] Recently viewed products
-  [ ] Social sharing integration
-  [ ] Email notifications for order status update

### Admin Dashboard

-  [x] Product management
-  [x] Order management
-  [x] User management
-  [ ] Analytics dashboard
-  [ ] Inventory management
-  [ ] Voucher and promo code management

### Technical Improvements

-  [x] Next.js App Router implementation
-  [x] Tailwind CSS styling
-  [x] Firestore integration
-  [x] Firebase Auth
-  [x] Firebase Cloud Functions implementation
-  [x] Algolia search implementation
-  [ ] Performance optimization
-  [ ] More server components implementation
-  [ ] Image optimization
-  [ ] SEO enhancements
-  [ ] PWA support
-  [ ] Testing implementation
-  [ ] CI/CD pipeline setup

### Payment & Shipping

-  [ ] Multiple payment gateway integration
-  [ ] Shipping provider integration
-  [ ] Order tracking
-  [ ] Address verification
-  [ ] Tax calculation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

-  GitHub: [@AlexT](https://github.com/alexandru-tiron)
-  Linkedin: [@AlexT](https://www.linkedin.com/in/alextiron)

## Firebase Cloud Functions

This project uses Firebase Cloud Functions for critical backend operations:

-  User management (creating user documents when new accounts are registered)
-  Algolia search synchronization (keeping product data in sync with Algolia)
-  Order processing and validation
-  Transactional emails (order confirmations, shipping updates)
-  Admin privilege management

**Note:** The Firebase Functions code is not included in this repository. These functions represent significant development effort and contain proprietary business logic that adds substantial value to the overall solution.

If you're interested in the full solution including all backend components, please contact me for licensing information.

## Firestore Database

This project uses Firestore as its primary database, storing:

-  Product data (including variants, categories, pricing)
-  User profiles and preferences
-  Order information and history
-  Application settings and configurations
-  Analytics and operational metadata

**Note:** The Firestore database structure, security rules, and indexing configurations are not included in this repository. The database design represents considerable intellectual property with optimized data relationships, efficient querying patterns, and robust security rules developed through extensive iteration and testing.
