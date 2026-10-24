import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

const directive = (policy: string, name: string) =>
   policy
      .split("; ")
      .find((part) => part.startsWith(`${name} `))
      ?.split(" ")
      .slice(1);

describe("buildContentSecurityPolicy", () => {
   it("only allows scripts with the request's nonce", () => {
      const policy = buildContentSecurityPolicy({ nonce: "abc123" });
      expect(directive(policy, "script-src")).toEqual(expect.arrayContaining(["'nonce-abc123'", "'strict-dynamic'"]));
      expect(directive(policy, "script-src")).not.toContain("'unsafe-inline'");
      expect(directive(policy, "script-src")).not.toContain("'unsafe-eval'");
   });

   it("blocks framing, plugins and base tag hijacking", () => {
      const policy = buildContentSecurityPolicy({ nonce: "n" });
      expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
      expect(directive(policy, "object-src")).toEqual(["'none'"]);
      expect(directive(policy, "base-uri")).toEqual(["'self'"]);
      expect(policy).toContain("upgrade-insecure-requests");
   });

   it("lets reCAPTCHA load and report back, so App Check gets its tokens", () => {
      const policy = buildContentSecurityPolicy({ nonce: "n" });
      expect(directive(policy, "script-src")).toEqual(expect.arrayContaining(["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"]));
      expect(directive(policy, "connect-src")).toContain("https://www.google.com/recaptcha/");
      expect(directive(policy, "frame-src")).toContain("https://www.google.com");
   });

   it("allows the Firebase sign-in frame from the auth domain", () => {
      const policy = buildContentSecurityPolicy({ nonce: "n", authDomain: "shop.firebaseapp.com" });
      expect(directive(policy, "frame-src")).toContain("https://shop.firebaseapp.com");
   });

   it("allows eval and plain HTTP in development only", () => {
      const policy = buildContentSecurityPolicy({ nonce: "n", isDev: true });
      expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
      expect(policy).not.toContain("upgrade-insecure-requests");
   });
});
