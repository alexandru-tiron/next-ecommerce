type CspOptions = {
   nonce: string;
   isDev?: boolean;
   // Firebase Auth's sign-in helper page is framed from this domain
   authDomain?: string;
};

// Content-Security-Policy for every page. Add an origin here when the store starts loading something new
// (an analytics or chat script, for example), or the browser will block it.
export function buildContentSecurityPolicy({ nonce, isDev = false, authDomain }: CspOptions): string {
   const directives: Record<string, string[]> = {
      "default-src": ["'self'"],
      // Only scripts carrying this request's nonce run. 'strict-dynamic' lets them load their own chunks and the
      // Google sign-in and reCAPTCHA scripts; the host list is the fallback for browsers without 'strict-dynamic'.
      // React needs eval() in development only.
      "script-src": [
         "'self'",
         `'nonce-${nonce}'`,
         "'strict-dynamic'",
         "https://apis.google.com",
         "https://www.google.com/recaptcha/",
         "https://www.gstatic.com/recaptcha/",
         ...(isDev ? ["'unsafe-eval'"] : []),
      ],
      // React style props set inline styles, which a nonce can't cover
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:", "https://firebasestorage.googleapis.com"],
      "font-src": ["'self'", "data:"],
      // Firebase (Auth, Firestore, Storage, App Check), Cloud Functions and Algolia search
      "connect-src": ["'self'", "https://*.googleapis.com", "https://*.cloudfunctions.net", "https://*.algolia.net", "https://*.algolianet.com", "https://*.algolia.io"],
      // Firebase sign-in helper, reCAPTCHA and the Google Maps embed on the contact page
      "frame-src": ["'self'", ...(authDomain ? [`https://${authDomain}`] : []), "https://www.google.com", "https://recaptcha.google.com"],
      "worker-src": ["'self'"],
      "manifest-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
   };

   const policy = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(" ")}`);
   if (!isDev) policy.push("upgrade-insecure-requests");
   return policy.join("; ");
}
