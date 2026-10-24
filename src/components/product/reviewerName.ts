// Public name shown on a review: "Ana Georgescu" -> "Ana G."; falls back to the e-mail name when the profile has no name
export function reviewerName(firstName?: string | null, lastName?: string | null, displayName?: string | null, email?: string | null) {
   const [first, last] = firstName?.trim() ? [firstName, lastName ?? ""] : (displayName ?? "").trim().split(/\s+/);
   if (first?.trim()) return `${first.trim()}${last?.trim() ? ` ${last.trim()[0].toUpperCase()}.` : ""}`;
   return email?.split("@")[0] || "Customer";
}
