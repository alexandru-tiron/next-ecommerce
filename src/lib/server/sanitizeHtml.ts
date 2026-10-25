import "server-only";
import sanitize from "sanitize-html";

// Rich text written in the admin panel, cleaned before it's shown to visitors: basic formatting and links only,
// no scripts, styles or other attributes. Links to other sites open in a new tab without access to this one.
export function sanitizeRichText(html: string) {
   return sanitize(html, {
      allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "hr"],
      allowedAttributes: { a: ["href", "target", "rel"] },
      allowedSchemes: ["https", "mailto", "tel"],
      allowProtocolRelative: false,
      transformTags: {
         a: (tagName, attribs) => {
            const href = attribs.href ?? "";
            const result: Record<string, string> = /^https:\/\//i.test(href) ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };
            return { tagName, attribs: result };
         },
      },
   });
}
