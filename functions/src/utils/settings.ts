import { getFirestore } from "firebase-admin/firestore";
import { brandingFrom, localizationFrom, notificationsFrom, storeInfoFrom } from "@core/settings";

// The store settings documents, read with the Admin SDK and completed with the defaults (packages/core/src/settings.ts)
const read = async (name: string) => (await getFirestore().collection("Settings").doc(name).get()).data();

export const loadStoreInfo = async () => storeInfoFrom(await read("Info"));
export const loadLocalization = async () => localizationFrom(await read("Localization"));
export const loadBranding = async () => brandingFrom(await read("Branding"));
export const loadNotifications = async () => notificationsFrom(await read("Notifications"));
