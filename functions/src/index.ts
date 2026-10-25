import "./init";

// Export functions from their individual files
export { setUserRole } from "./apis/team";
export { claimSetup } from "./apis/setup";
export { getSetupStatus } from "./apis/setupStatus";
export { syncProductToAlgolia } from "./listeners/syncProductToAlgolia";
export { syncVariantsToAlgolia } from "./listeners/syncVariantsToAlgolia";
export { syncSkuVariantsToAlgolia } from "./listeners/syncSkuVariantsToAlgolia";
export { syncAllProductsToAlgolia } from "./apis/syncAllProductsToAlgolia";
export { validateAndCreateOrder } from "./apis/validateOrder";
export { onUserCreate, onUserDelete } from "./listeners/userCreationListener";
export { onOrderStatusChange } from "./listeners/orderStatusListener";
export { checkVoucher } from "./apis/checkVoucher";
export { sendContactMessage } from "./apis/sendContactMessage";
export { cancelUnpaidOrders } from "./apis/payments/shared";

// Card payment providers declare Secret Manager secrets, which every functions deploy then asks for.
// Each provider is loaded only once switched on in functions/.env (after setting its secrets): ENABLE_STRIPE=true, ENABLE_NETOPIA=true
// module.exports, not exports: the bundler replaces module.exports with the object holding the exports above
if (process.env.ENABLE_STRIPE === "true") Object.assign(module.exports, require("./apis/payments/stripe"));
if (process.env.ENABLE_NETOPIA === "true") Object.assign(module.exports, require("./apis/payments/netopia"));
