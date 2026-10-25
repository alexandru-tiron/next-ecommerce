import { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { EmailContext } from "./context";
import { fill } from "./messages";

// The frame every store e-mail shares: the logo or name in the brand colour, the content, and the store's details
export function Layout({ ctx, preview, title, children }: { ctx: EmailContext; preview: string; title: string; children: ReactNode }) {
   const { info, colors, t } = ctx;
   return (
      <Html lang={ctx.locale}>
         <Head />
         <Preview>{preview}</Preview>
         <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" }}>
            <Container style={{ backgroundColor: "#ffffff", maxWidth: "600px", borderRadius: "8px", overflow: "hidden" }}>
               <Section style={{ backgroundColor: colors.brandLight, padding: "24px", textAlign: "center" }}>
                  <Link href={ctx.site}>{ctx.logoUrl ? <Img src={ctx.logoUrl} alt={info.store_name} height="40" style={{ margin: "0 auto", maxWidth: "200px" }} /> : <Text style={{ color: colors.brandDark, fontSize: "22px", fontWeight: 600, margin: 0 }}>{info.store_name}</Text>}</Link>
               </Section>
               <Section style={{ padding: "8px 32px 24px" }}>
                  <Heading as="h1" style={{ color: colors.brandDark, fontSize: "22px", margin: "24px 0 8px" }}>
                     {title}
                  </Heading>
                  {children}
               </Section>
               <Hr style={{ borderColor: "#eeeeee", margin: 0 }} />
               <Section style={{ padding: "16px 32px", color: "#777777", fontSize: "12px", textAlign: "center" }}>
                  <Text style={{ fontSize: "12px", color: "#777777", margin: "0 0 4px" }}>{fill(t.footer, { year: new Date().getFullYear(), store: info.legal_name || info.store_name })}</Text>
                  {info.store_address && <Text style={{ fontSize: "12px", color: "#777777", margin: 0 }}>{info.store_address}</Text>}
               </Section>
            </Container>
         </Body>
      </Html>
   );
}

export function Paragraph({ children }: { children: ReactNode }) {
   return <Text style={{ color: "#333333", fontSize: "15px", lineHeight: "24px", margin: "0 0 12px" }}>{children}</Text>;
}

export function ActionButton({ ctx, href, children }: { ctx: EmailContext; href: string; children: ReactNode }) {
   return (
      <Section style={{ margin: "24px 0" }}>
         <Button href={href} style={{ backgroundColor: ctx.colors.brand, color: "#ffffff", padding: "12px 20px", borderRadius: "6px", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>
            {children}
         </Button>
      </Section>
   );
}

// "Questions? Write to us at …", when the store has a support or contact address
export function SupportNote({ ctx }: { ctx: EmailContext }) {
   const { info, t, colors } = ctx;
   const email = info.support_mail || info.contact_mail;
   if (!email) return null;
   const [before, after] = (info.phone_no ? t.questionsPhone : t.questions).split("{email}");
   return (
      <Text style={{ color: "#666666", fontSize: "13px", lineHeight: "20px", margin: "24px 0 0" }}>
         {before}
         <Link href={`mailto:${email}`} style={{ color: colors.brand }}>
            {email}
         </Link>
         {fill(after, { phone: info.phone_no })}
      </Text>
   );
}
