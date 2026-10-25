// Store prices include VAT. Romania's standard rate is 21% (since 1 August 2025); admins can change it in Settings → Shipping & taxes.
export const DEFAULT_VAT_RATE = 21;

const round2 = (value: number) => Math.round(value * 100) / 100;

// The VAT contained in a VAT-inclusive amount, e.g. 121.00 at 21% contains 21.00 of VAT
export function vatIncluded(gross: number, rate: number) {
   if (!Number.isFinite(gross) || !Number.isFinite(rate) || rate <= 0) return 0;
   return round2((gross * rate) / (100 + rate));
}

export function netOfVat(gross: number, rate: number) {
   return round2(gross - vatIncluded(gross, rate));
}

export function isValidVatRate(value: unknown): value is number {
   return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
