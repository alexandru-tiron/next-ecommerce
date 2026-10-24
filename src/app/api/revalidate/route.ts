import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminToken } from "@/lib/server/auth";
import { isStoreTag } from "@/lib/storeTags";

// Admin pages call this after saving, so server-rendered pages show the change at once instead of when the cache expires.
// Body: { tags: ["catalog" | "settings"] }, with the admin's Firebase ID token as a bearer token.
export async function POST(request: NextRequest) {
   const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
   if (!token || !(await isAdminToken(token))) return NextResponse.json({ error: "Admins only" }, { status: 403 });

   const body = await request.json().catch(() => null);
   const tags = Array.isArray(body?.tags) ? body.tags.filter(isStoreTag) : [];
   if (tags.length === 0) return NextResponse.json({ error: "No known tags" }, { status: 400 });

   for (const tag of tags) revalidateTag(tag);
   return NextResponse.json({ revalidated: tags });
}
