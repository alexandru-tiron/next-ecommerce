// Team roles, kept in the `role` custom claim of each account and set only by Cloud Functions or the CLI.
// The Firestore and Storage rules check the same roles (firestore.rules, storage.rules).
export const ROLES = ["owner", "admin", "staff"] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);

// Accounts made admins before roles existed have `isAdmin: true` and no role. They count as owners until converted.
export function roleFromClaims(claims: Readonly<Record<string, unknown>> | null | undefined): Role | null {
   if (!claims) return null;
   if ("role" in claims && claims.role !== undefined) return isRole(claims.role) ? claims.role : null;
   return claims.isAdmin === true ? "owner" : null;
}

// What each role may do. Staff handle orders and stock; admins run the store; only owners manage the team.
export const PERMISSIONS = {
   manageTeam: ["owner"],
   manageStore: ["owner", "admin"],
   manageOrders: ["owner", "admin", "staff"],
   manageInventory: ["owner", "admin", "staff"],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role | null | undefined, permission: Permission) => role !== null && role !== undefined && (PERMISSIONS[permission] as readonly Role[]).includes(role);

// The admin panel sections and the permission each needs. The first section a role may open is its start page.
export const ADMIN_SECTIONS = [
   { path: "/admin", permission: "manageStore" },
   { path: "/admin/products", permission: "manageStore" },
   { path: "/admin/orders", permission: "manageOrders" },
   { path: "/admin/customers", permission: "manageStore" },
   { path: "/admin/inventory", permission: "manageInventory" },
   { path: "/admin/vouchers", permission: "manageStore" },
   { path: "/admin/analytics", permission: "manageStore" },
   { path: "/admin/settings", permission: "manageStore" },
   { path: "/admin/team", permission: "manageStore" },
] as const satisfies readonly { path: string; permission: Permission }[];

// The section a path belongs to: the longest matching prefix, e.g. /admin/orders/123 -> /admin/orders
export function adminSection(pathname: string) {
   return [...ADMIN_SECTIONS].sort((a, b) => b.path.length - a.path.length).find((section) => pathname === section.path || pathname.startsWith(`${section.path}/`));
}

export const canOpenAdminPath = (role: Role | null | undefined, pathname: string) => {
   const section = adminSection(pathname);
   return section ? can(role, section.permission) : can(role, "manageStore");
};

export const adminHome = (role: Role | null | undefined) => ADMIN_SECTIONS.find((section) => can(role, section.permission))?.path ?? null;

// Whether `actor` may give `target` a role (or remove it, when role is null). Owners manage everyone;
// nobody changes their own role, except an account with the old admin right converting itself to owner.
export function canAssignRole(actor: { uid: string; role: Role | null }, target: { uid: string; role: Role | null }, role: Role | null) {
   if (!can(actor.role, "manageTeam")) return false;
   if (actor.uid === target.uid) return role === actor.role;
   return true;
}
