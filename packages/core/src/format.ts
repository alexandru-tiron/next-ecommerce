// Prices and dates in the store's currency, language and time zone

export function formatMoney(amount: number, currency: string, locale: string) {
   return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export type MoneyParts = { whole: string; fraction: string; decimal: string; currency: string; currencyFirst: boolean };

// The pieces of a formatted price, in the locale's conventions, for layouts that show the decimals smaller
export function moneyParts(amount: number, currency: string, locale: string): MoneyParts {
   const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(amount);
   const indexOf = (type: Intl.NumberFormatPartTypes) => parts.findIndex((part) => part.type === type);
   return {
      whole: parts
         .filter((part) => part.type === "minusSign" || part.type === "integer" || part.type === "group")
         .map((part) => part.value)
         .join(""),
      fraction: parts.find((part) => part.type === "fraction")?.value ?? "",
      decimal: parts.find((part) => part.type === "decimal")?.value ?? "",
      currency: parts.find((part) => part.type === "currency")?.value ?? currency,
      currencyFirst: indexOf("currency") < indexOf("integer"),
   };
}

export function formatDate(value: Date | string | number, locale: string, timeZone: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
   const date = value instanceof Date ? value : new Date(value);
   return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
}
