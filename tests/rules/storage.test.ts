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

   it("folders without a rule are closed, even to admins", async () => {
      await assertFails(upload(admin(), "Backups/db.png", KB, "image/png"));
      await assertFails(getMetadata(ref(anonymous(), "Backups/db.png")));
   });
});
