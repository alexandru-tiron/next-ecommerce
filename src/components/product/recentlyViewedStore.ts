// Ids of the products a visitor opened, newest first, kept in localStorage
export const RECENTLY_VIEWED_KEY = "recentlyViewed";
export const RECENTLY_VIEWED_MAX = 10;

export function addRecentlyViewed(ids: string[], id: string, max = RECENTLY_VIEWED_MAX): string[] {
   return [id, ...ids.filter((item) => item !== id)].slice(0, max);
}

export function readRecentlyViewed(): string[] {
   try {
      const ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
   } catch {
      return [];
   }
}

export function saveRecentlyViewed(ids: string[]) {
   try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
   } catch {
      // Storage can be unavailable (private mode, quota); the list is only a convenience
   }
}
