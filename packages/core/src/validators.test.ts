import { describe, expect, it } from "vitest";
import { validateEmail, validateName, validatePassword, validatePhone } from "./validators";

describe("validateEmail", () => {
   it.each(["ana@example.com", "first.last+shop@sub.example.ro"])("accepts %s", (email) => {
      expect(validateEmail(email)).toBe(true);
   });

   it.each(["", "ana", "ana@", "@example.com", "ana@-example.com"])("rejects %j", (email) => {
      expect(validateEmail(email)).toBe(false);
   });
});

describe("validatePassword", () => {
   it("accepts a password with upper and lower case letters, a digit and a symbol", () => {
      expect(validatePassword("Secret1!")).toBe(true);
   });

   it.each(["Short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoDigits!!", "NoSymbols123"])("rejects %s", (password) => {
      expect(validatePassword(password)).toBe(false);
   });
});

describe("validatePhone", () => {
   it.each(["0721123456", "+40721123456", "0721 123 456", "0212 123 456"])("accepts the Romanian number %s", (phoneNumber) => {
      expect(validatePhone(phoneNumber)).toBe(true);
   });

   it("accepts a valid international number", () => {
      expect(validatePhone("+447911123456")).toBe(true);
   });

   it.each(["+49 30 1234567", "+49 (0)89 123456", "+1 212-555-0123"])("accepts the landline %s written with its country code", (phoneNumber) => {
      expect(validatePhone(phoneNumber)).toBe(true);
   });

   it.each(["+49 12", "+0 123 456 789", "+49 30 1234 5678 9012", "+49 30 abc"])("rejects the malformed international number %j", (phoneNumber) => {
      expect(validatePhone(phoneNumber)).toBe(false);
   });

   it.each(["", "123", "07211234567890"])("rejects %j", (phoneNumber) => {
      expect(validatePhone(phoneNumber)).toBe(false);
   });
});

describe("validateName", () => {
   it("needs at least two characters after trimming", () => {
      expect(validateName("Al")).toBe(true);
      expect(validateName(" A ")).toBe(false);
   });
});
