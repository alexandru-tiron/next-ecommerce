import { auth } from "@/lib/firebaseInit";
import type { StoreTag } from "@/lib/storeTags";

// Call after an admin saves catalogue or settings changes: the server drops its cached copy, so the store shows them at once.
// Failing only delays the change until the cache expires (a few minutes), so errors are logged, not shown.
export async function refreshStore(...tags: StoreTag[]) {
   try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch("/api/revalidate", {
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ tags }),
      });
      if (!response.ok) console.error("Couldn't refresh the store pages:", response.status);
   } catch (error) {
      console.error("Couldn't refresh the store pages:", error);
   }
}
