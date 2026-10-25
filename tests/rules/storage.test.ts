import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getMetadata, listAll, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
   env = await initializeTestEnvironment({
      projectId: "demo-store",
      storage: { rules: readFileSync("storage.rules", "utf8") },
   });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearStorage());

const anonymous = () => env.unauthenticatedContext().storage();
const customer = () => env.authenticatedContext("alice").storage();
const admin = () => env.authenticatedContext("admin", { isAdmin: true }).storage();

const KB = 1024;
const file = (size: number) => new Uint8Array(size);
const upload = (storage: ReturnType<typeof admin>, path: string, size: number, contentType: string) => uploadBytes(ref(storage, path), file(size), { contentType });
// Uploads a test file with the rules switched off
const seed = (path: string) =>
   env.withSecurityRulesDisabled(async (context) => {
      await upload(context.storage(), path, KB, "image/png");
   });

describe("storage", () => {
   it("everyone can open an image by its link, but only admins can list folders", async () => {
      await seed("Products/p1/photo.png");
      await assertSucceeds(getMetadata(ref(anonymous(), "Products/p1/photo.png")));
      await assertFails(listAll(ref(anonymous(), "Products/p1")));
      await assertFails(listAll(ref(customer(), "Products/p1")));
      await assertSucceeds(listAll(ref(admin(), "Products/p1")));
   });

   it("only admins can upload and delete", async () => {
      await assertFails(upload(anonymous(), "Products/p1/a.png", KB, "image/png"));
      await assertFails(upload(customer(), "Products/p1/a.png", KB, "image/png"));
      await assertSucceeds(upload(admin(), "Products/p1/a.png", KB, "image/png"));
      await assertFails(deleteObject(ref(customer(), "Products/p1/a.png")));
      await assertSucceeds(deleteObject(ref(admin(), "Products/p1/a.png")));
   });

   it("owners and admins can upload, staff can't", async () => {
      await assertSucceeds(upload(env.authenticatedContext("owner", { role: "owner" }).storage(), "Products/p1/b.png", KB, "image/png"));
      await assertSucceeds(upload(env.authenticatedContext("manager", { role: "admin" }).storage(), "Products/p1/c.png", KB, "image/png"));
      await assertFails(upload(env.authenticatedContext("staff", { role: "staff" }).storage(), "Products/p1/d.png", KB, "image/png"));
      await assertFails(upload(env.authenticatedContext("demoted", { role: "staff", isAdmin: true }).storage(), "Products/p1/e.png", KB, "image/png"));
   });

   it("photos are limited to 5 MB and to image formats", async () => {
      await assertSucceeds(upload(admin(), "Slides/hero.webp", 4 * KB * KB, "image/webp"));
      await assertFails(upload(admin(), "Slides/huge.jpg", 5 * KB * KB + 1, "image/jpeg"));
      await assertFails(upload(admin(), "Brands/page.html", KB, "text/html"));
   });

   it("category icons must be SVGs of at most 200 KB", async () => {
      await assertSucceeds(upload(admin(), "Categories/Icons/audio.svg", 100 * KB, "image/svg+xml"));
      await assertFails(upload(admin(), "Categories/Icons/big.svg", 201 * KB, "image/svg+xml"));
      await assertFails(upload(admin(), "Categories/Icons/audio.png", KB, "image/png"));
      await assertFails(upload(admin(), "Brands/logo.svg", 300 * KB, "image/svg+xml"));
   });

   it("brand files can be images or small .ico favicons", async () => {
      await assertSucceeds(upload(admin(), "Branding/logo.svg", 50 * KB, "image/svg+xml"));
      await assertSucceeds(upload(admin(), "Branding/share.jpg", 2 * KB * KB, "image/jpeg"));
      await assertSucceeds(upload(admin(), "Branding/favicon.ico", 20 * KB, "image/x-icon"));
      await assertFails(upload(admin(), "Branding/favicon.ico", 300 * KB, "image/x-icon"));
      await assertFails(upload(admin(), "Branding/page.html", KB, "text/html"));
      await assertFails(upload(customer(), "Branding/logo.png", KB, "image/png"));
   });

   it("folders without a rule are closed, even to admins", async () => {
      await assertFails(upload(admin(), "Backups/db.png", KB, "image/png"));
      await assertFails(getMetadata(ref(anonymous(), "Backups/db.png")));
   });
});
