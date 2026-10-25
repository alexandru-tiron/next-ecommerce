import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./sanitizeHtml";

describe("sanitizeRichText", () => {
   it("keeps the formatting the page editor produces", () => {
      const html = "<h2>Returns</h2><p><strong>14</strong> days, <em>no</em> questions.</p><ul><li>One</li></ul><blockquote>Note</blockquote><hr>";
      expect(sanitizeRichText(html)).toBe("<h2>Returns</h2><p><strong>14</strong> days, <em>no</em> questions.</p><ul><li>One</li></ul><blockquote>Note</blockquote><hr />");
   });

   it("removes scripts, event handlers, styles and frames", () => {
      const html = '<p onclick="steal()" style="color:red">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)><iframe src="https://evil.example"></iframe><style>body{}</style>';
      expect(sanitizeRichText(html)).toBe("<p>Hi</p>");
   });

   it("allows only safe links", () => {
      expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
      expect(sanitizeRichText('<a href="data:text/html,hi">x</a>')).toBe("<a>x</a>");
      expect(sanitizeRichText('<a href="/info/contact">Contact</a>')).toBe('<a href="/info/contact">Contact</a>');
      expect(sanitizeRichText('<a href="mailto:shop@example.com">Mail</a>')).toBe('<a href="mailto:shop@example.com">Mail</a>');
   });

   it("opens links to other sites in a new tab without access to the store", () => {
      expect(sanitizeRichText('<a href="https://example.com/guide" target="_self">Guide</a>')).toBe('<a href="https://example.com/guide" target="_blank" rel="noopener noreferrer">Guide</a>');
   });
});
