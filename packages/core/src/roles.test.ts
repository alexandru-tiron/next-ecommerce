import { describe, expect, it } from "vitest";
import { adminHome, can, canAssignRole, canOpenAdminPath, roleFromClaims } from "./roles";

describe("roles", () => {
   it("reads the role claim, and treats the old admin right as owner", () => {
      expect(roleFromClaims({ role: "staff" })).toBe("staff");
      expect(roleFromClaims({ isAdmin: true })).toBe("owner");
      // A role claim wins over the old flag, and an unknown role gives no access
      expect(roleFromClaims({ role: "staff", isAdmin: true })).toBe("staff");
      expect(roleFromClaims({ role: "superuser", isAdmin: true })).toBeNull();
      expect(roleFromClaims({})).toBeNull();
      expect(roleFromClaims(null)).toBeNull();
   });

   it("gives staff orders and stock only, and only owners the team", () => {
      expect(can("staff", "manageOrders")).toBe(true);
      expect(can("staff", "manageInventory")).toBe(true);
      expect(can("staff", "manageStore")).toBe(false);
      expect(can("admin", "manageStore")).toBe(true);
      expect(can("admin", "manageTeam")).toBe(false);
      expect(can("owner", "manageTeam")).toBe(true);
      expect(can(null, "manageOrders")).toBe(false);
   });

   it("decides which admin pages a role can open", () => {
      expect(canOpenAdminPath("staff", "/admin/orders/abc")).toBe(true);
      expect(canOpenAdminPath("staff", "/admin/inventory")).toBe(true);
      expect(canOpenAdminPath("staff", "/admin")).toBe(false);
      expect(canOpenAdminPath("staff", "/admin/settings")).toBe(false);
      expect(canOpenAdminPath("admin", "/admin/products/123")).toBe(true);
      expect(canOpenAdminPath("admin", "/admin/unknown")).toBe(true);
      expect(canOpenAdminPath("staff", "/admin/unknown")).toBe(false);
      expect(adminHome("staff")).toBe("/admin/orders");
      expect(adminHome("admin")).toBe("/admin");
      expect(adminHome(null)).toBeNull();
   });

   it("lets owners manage others but nobody change their own role", () => {
      const owner = { uid: "o", role: "owner" as const };
      expect(canAssignRole(owner, { uid: "a", role: "admin" }, "staff")).toBe(true);
      expect(canAssignRole(owner, { uid: "a", role: "admin" }, null)).toBe(true);
      expect(canAssignRole(owner, owner, "admin")).toBe(false);
      expect(canAssignRole(owner, owner, null)).toBe(false);
      // Converting the old admin right (read as owner) to the owner role changes nothing, so it's allowed
      expect(canAssignRole(owner, owner, "owner")).toBe(true);
      expect(canAssignRole({ uid: "a", role: "admin" }, { uid: "s", role: "staff" }, "admin")).toBe(false);
   });
});
