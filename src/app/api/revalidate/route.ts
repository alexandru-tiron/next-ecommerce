import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { tokenRole } from "@/lib/server/auth";
import { can } from "@core/roles";
import { isStoreTag, StoreTag } from "@/lib/storeTags";

// Admin pages call this after saving, so server-rendered pages show the change at once instead of when the cache expires.
// Body: { tags: ["catalog" | "settings"] }, with the team member's Firebase ID token as a bearer token.
// Staff may refresh the catalogue (stock changes); only owners and admins the settings.
export async function POST(request: NextRequest) {
   const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
   const role = token ? await tokenRole(token) : null;
   if (!role) return NextResponse.json({ error: "Team members only" }, { status: 403 });

   const body = await request.json().catch(() => null);
   const tags = Array.isArray(body?.tags) ? body.tags.filter(isStoreTag) : [];
   if (tags.length === 0) return NextResponse.json({ error: "No known tags" }, { status: 400 });
   if (tags.some((tag: StoreTag) => !can(role, tag === "catalog" ? "manageInventory" : "manageStore"))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

   for (const tag of tags) revalidateTag(tag);
   return NextResponse.json({ revalidated: tags });
}
