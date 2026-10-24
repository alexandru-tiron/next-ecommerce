import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp();

// Set global options for all functions
setGlobalOptions({ region: "europe-west3" });

// Export functions from their individual files
export { setAdminPrivilege } from "./apis/setAdminPrivilege";
export { syncProductToAlgolia } from "./listeners/syncProductToAlgolia";
export { syncVariantsToAlgolia } from "./listeners/syncVariantsToAlgolia";
export { syncSkuVariantsToAlgolia } from "./listeners/syncSkuVariantsToAlgolia";
export { syncAllProductsToAlgolia } from "./apis/syncAllProductsToAlgolia";
export { validateAndCreateOrder } from "./apis/validateOrder";
export { onUserCreate, onUserDelete } from "./listeners/userCreationListener";
export { onOrderStatusChange } from "./listeners/orderStatusListener";
export { checkVoucher } from "./apis/checkVoucher";
export { cancelUnpaidOrders } from "./apis/payments/shared";

// Card payment providers declare Secret Manager secrets, which every functions deploy then asks for.
// Each provider is loaded only once switched on in functions/.env (after setting its secrets): ENABLE_STRIPE=true, ENABLE_NETOPIA=true
if (process.env.ENABLE_STRIPE === "true") Object.assign(exports, require("./apis/payments/stripe"));
if (process.env.ENABLE_NETOPIA === "true") Object.assign(exports, require("./apis/payments/netopia"));
