import { describe, expect, it } from "vitest";
import { brandPalette } from "@core/brand";
import { brandingFrom, localizationFrom, storeInfoFrom } from "@core/settings";
import { emailContext } from "../src/emails/context";
import { contactMessageEmail, EmailOrder, newOrderAdminEmail, orderConfirmationEmail, orderStatusEmail } from "../src/emails/templates";

const info = storeInfoFrom({ store_name: "Nordlicht", support_mail: "help@nordlicht.example", phone_no: "+49 30 1234567", store_address: "Hauptstraße 1, Berlin" });
const localization = localizationFrom({ default_locale: "de", enabled_locales: ["de", "en"], currency: "EUR", time_zone: "Europe/Berlin" });
const context = (locale: "en" | "ro" | "de", brandColor = "#0f766e", logo = "") => emailContext(info, brandingFrom({ brand_color: brandColor, logo_url: logo }), localization, "https://shop.example", locale, "EUR");

const order: EmailOrder = {
   first_name: "Anna",
   last_name: "Schmidt",
   email: "anna@example.com",
   products: [
      { product_name: "Leinenhemd", sku_variant_name: "M", quantity: 2, product_price: 40, discount: true, discount_price: 35 },
      { product_name: "Socken <b>", quantity: 1, product_price: 9.5 },
   ],
   shipping_price: 0,
   voucher_id: "SAVE5",
   voucher_discount: 5,
   total: 74.5,
   vat_rate: 19,
   vat_amount: 11.89,
   payment_method: "cod",
};

describe("order confirmation", () => {
   it("is written in the customer's language with amounts in the store currency", async () => {
      const email = await orderConfirmationEmail(context("de"), "A1B2", order, new Date("2026-10-25T10:00:00Z"));
      expect(email.subject).toBe("Bestellbestätigung #A1B2");
      expect(email.text).toContain("Hallo Anna,");
      // Intl puts a no-break space between the amount and the currency
      expect(email.text.replace(/ /g, " ")).toContain("70,00 €");
      expect(email.text).toContain("Gutschein SAVE5");
      expect(email.text).toContain("Kostenlos");
      expect(email.text).toContain("Nachnahme");
      expect(email.text).toContain("25. Oktober 2026");
      expect(email.html).toContain('lang="de"');
   });

   it("uses the store's brand colour and links to the order", async () => {
      const email = await orderConfirmationEmail(context("en"), "A1B2", order);
      expect(email.subject).toBe("Order confirmation #A1B2");
      expect(email.html).toContain(brandPalette("#0f766e")[700]);
      expect(email.html).toContain("https://shop.example/profile/orders/A1B2");
      expect(email.html).toContain("help@nordlicht.example");
   });

   it("escapes text from the order", async () => {
      const email = await orderConfirmationEmail(context("en"), "A1B2", order);
      expect(email.html).not.toContain("Socken <b>");
      expect(email.html).toContain("Socken &lt;b&gt;");
   });

   it("shows a PNG logo but falls back to the store name for SVG logos", async () => {
      expect((await orderConfirmationEmail(context("en", "#0f766e", "https://cdn.example/logo.png"), "A", order)).html).toContain("https://cdn.example/logo.png");
      const svg = await orderConfirmationEmail(context("en", "#0f766e", "https://cdn.example/Branding%2Flogo.svg?alt=media"), "A", order);
      expect(svg.html).not.toContain("logo.svg");
      expect(svg.html).toContain("Nordlicht");
   });
});

describe("other e-mails", () => {
   it("tell the customer about status changes, with the tracking number", async () => {
      const email = await orderStatusEmail(context("ro"), "A1B2", "shipped", "Ana", "AWB123");
      expect(email.subject).toBe("Comanda #A1B2 a fost expediată");
      expect(email.text).toContain("AWB123");
      expect((await orderStatusEmail(context("en"), "A1B2", "rejected", undefined, "AWB123")).text).not.toContain("AWB123");
   });

   it("notify the store about new orders with a link to the admin panel", async () => {
      const email = await newOrderAdminEmail(context("de"), "A1B2", order);
      expect(email.subject).toBe("Neue Bestellung #A1B2");
      expect(email.html).toContain("https://shop.example/admin/orders/A1B2");
      expect(email.text).toContain("anna@example.com");
   });

   it("forward contact messages", async () => {
      const email = await contactMessageEmail(context("en"), "msg1", { type: "consent", first_name: "Anna", last_name: "Schmidt", email: "anna@example.com", message: "Please delete my data." });
      expect(email.subject).toBe("Data protection request – Anna Schmidt");
      expect(email.text).toContain("Please delete my data.");
      expect(email.text).toContain("ContactMessages/msg1");
   });
});
