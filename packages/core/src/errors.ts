// Errors the Cloud Functions return to the store. Each has a code the store translates (messages: Errors.<code>);
// the English text is for logs and for API clients that don't translate.
export const STORE_ERRORS = {
   not_signed_in: "You need to sign in.",
   email_not_verified: "Verify your e-mail address before placing an order.",
   not_admin: "Only admins can do this.",
   too_many_requests: "Too many requests. Try again later.",
   too_many_orders: "Too many orders in a short time. Try again in {minutes} minutes.",
   too_many_messages: "Too many messages. Try again later.",
   order_already_placed: "This order has already been placed.",
   duplicate_order: "An identical order was placed in the last 15 minutes.",
   invalid_first_name: "The first name is invalid.",
   invalid_last_name: "The last name is invalid.",
   invalid_email: "The e-mail address is invalid.",
   invalid_phone: "The phone number is invalid.",
   invalid_order: "The order details are invalid or missing.",
   invalid_input: "The request is invalid.",
   shipping_address_missing: "The delivery address is missing.",
   billing_address_missing: "The billing address is missing.",
   shipping_address_not_found: "The selected delivery address doesn't exist.",
   billing_address_not_found: "The selected billing address doesn't exist.",
   shipping_address_invalid: "The delivery address is incomplete or invalid.",
   billing_address_invalid: "The billing address is incomplete or invalid.",
   business_address_invalid: "The company billing address is incomplete or invalid.",
   business_address_required: "A company order needs a company billing address.",
   invalid_products: "Some products in the cart are no longer valid.",
   product_missing: "The product no longer exists.",
   product_changed: "The product details have changed.",
   variant_missing: "The product option no longer exists or has changed.",
   price_changed: "The price has changed.",
   product_check_failed: "The product couldn't be checked.",
   out_of_stock: "Not enough stock for: {products}.",
   payment_method_unavailable: "This payment method isn't available.",
   voucher_not_found: "The voucher code isn't valid.",
   voucher_expired: "The voucher has expired.",
   voucher_used_up: "The voucher has been used the maximum number of times.",
   voucher_min_order: "The voucher only applies to orders of at least {minOrder}.",
   order_not_found: "The order wasn't found.",
   order_wrong_payment_method: "The order was placed with another payment method.",
   order_cancelled: "The order has been cancelled.",
   order_already_paid: "The order has already been paid.",
   payment_start_failed: "The card payment couldn't be started. Please try again.",
   order_failed: "Something went wrong while placing the order. Please try again.",
   invoice_not_accepted: "Only accepted orders can be invoiced.",
   invoice_exists: "The order already has an invoice.",
   invoice_failed: "The invoice couldn't be created: {detail}",
} as const;

export type StoreErrorCode = keyof typeof STORE_ERRORS;
export type StoreErrorParams = Record<string, string | number>;
export const isStoreErrorCode = (value: unknown): value is StoreErrorCode => typeof value === "string" && value in STORE_ERRORS;

// The English text with its {placeholders} filled in
export function storeErrorText(code: StoreErrorCode, params: StoreErrorParams = {}) {
   return STORE_ERRORS[code].replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
