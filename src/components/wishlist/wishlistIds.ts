// Pure helpers for the wishlist id list (newest first), kept apart from Firebase so they can be unit-tested
export const WISHLIST_KEY = "wishlist";

export function toggleId(ids: string[], id: string): string[] {
   return ids.includes(id) ? ids.filter((current) => current !== id) : [id, ...ids];
}

export function readLocalWishlist(): string[] {
   try {
      const ids = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
   } catch {
      return [];
   }
}

export function writeLocalWishlist(ids: string[]) {
   try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
   } catch {
      // Storage can be unavailable (private mode, quota); the wishlist then only lasts for this visit
   }
}
