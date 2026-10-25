import { Column, Row, Section, Text } from "@react-email/components";
import { plainTextSelectors, render } from "@react-email/components";
import { ReactElement } from "react";
import { orderPaymentMethod } from "@core/payments";
import { EmailContext } from "./context";
import { ActionButton, Layout, Paragraph, SupportNote } from "./Layout";
import { fill } from "./messages";

// The store's e-mails. Each function returns the subject and the rendered HTML and plain text.
export type RenderedEmail = { subject: string; html: string; text: string };

// In the plain-text version, table cells (e.g. product, quantity, price) are separated by spaces instead of running together
const htmlToTextOptions = { selectors: [...plainTextSelectors, { selector: "td", format: "inlineSurround", options: { suffix: "  " } }] };

async function rendered(subject: string, element: ReactElement): Promise<RenderedEmail> {
   return { subject, html: await render(element), text: await render(element, { plainText: true, htmlToTextOptions }) };
}

export type EmailOrderLine = { product_name: string; variant_name?: string; sku_variant_name?: string; quantity: number; product_price: number; discount?: boolean; discount_price?: number };
export type EmailOrder = {
   first_name?: string;
   last_name?: string;
   email?: string;
   phone_no?: string;
   products: EmailOrderLine[];
   shipping_price: number;
   total: number;
   voucher_id?: string;
   voucher_discount?: number;
   vat_rate?: number;
   vat_amount?: number;
   payment_method?: "cod" | "stripe" | "netopia";
   is_business?: boolean;
};

const linePrice = (line: EmailOrderLine) => (line.discount && line.discount_price ? line.discount_price : line.product_price);
const lineName = (line: EmailOrderLine) => [line.product_name, line.variant_name, line.sku_variant_name].filter(Boolean).join(" · ");
const orderUrl = (ctx: EmailContext, orderId: string) => `${ctx.site}/profile/orders/${encodeURIComponent(orderId)}`;
const muted = { color: "#666666", fontSize: "14px", margin: "4px 0" };
const cell = { color: "#333333", fontSize: "14px", margin: "6px 0" };

function Greeting({ ctx, name }: { ctx: EmailContext; name?: string }) {
   return <Paragraph>{name ? fill(ctx.t.greeting, { name }) : ctx.t.greetingNoName}</Paragraph>;
}

function Totals({ ctx, order }: { ctx: EmailContext; order: EmailOrder }) {
   const t = ctx.t.confirmation;
   const subtotal = order.products.reduce((sum, line) => sum + linePrice(line) * line.quantity, 0);
   const rows: [string, string, boolean?][] = [[t.subtotal, ctx.money(subtotal)]];
   if (order.voucher_id && order.voucher_discount) rows.push([fill(t.voucher, { code: order.voucher_id }), `-${ctx.money(order.voucher_discount)}`]);
   rows.push([t.shipping, order.shipping_price === 0 ? t.free : ctx.money(order.shipping_price)]);
   rows.push([t.total, ctx.money(order.total), true]);
   return (
      <Section style={{ marginTop: "8px" }}>
         {rows.map(([label, value, bold]) => (
            <Row key={label}>
               <Column style={{ ...cell, textAlign: "right", fontWeight: bold ? 700 : 400 }}>{label}</Column>
               <Column style={{ ...cell, textAlign: "right", width: "120px", fontWeight: bold ? 700 : 400 }}>{value}</Column>
            </Row>
         ))}
         {order.vat_rate !== undefined && order.vat_amount !== undefined && (
            <Text style={{ ...muted, textAlign: "right", fontSize: "12px" }}>
               {fill(t.vat, { rate: order.vat_rate })}: {ctx.money(order.vat_amount)}
            </Text>
         )}
      </Section>
   );
}

function OrderConfirmation({ ctx, orderId, order, date }: { ctx: EmailContext; orderId: string; order: EmailOrder; date: Date }) {
   const t = ctx.t.confirmation;
   const method = orderPaymentMethod(order);
   return (
      <Layout ctx={ctx} preview={fill(t.preview, { store: ctx.info.store_name })} title={t.title}>
         <Greeting ctx={ctx} name={order.first_name} />
         <Paragraph>{fill(t.intro, { id: orderId })}</Paragraph>
         <Text style={muted}>
            {t.date}: {ctx.date(date)}
         </Text>
         <Text style={muted}>
            {t.payment}: {ctx.t.payment[method]}
         </Text>
         {method !== "cod" && <Paragraph>{t.payByCard}</Paragraph>}

         <Section style={{ marginTop: "16px", borderTop: "1px solid #eeeeee" }}>
            <Row>
               <Column style={{ ...muted, fontWeight: 600 }}>{t.product}</Column>
               <Column style={{ ...muted, fontWeight: 600, textAlign: "center", width: "60px" }}>{t.quantity}</Column>
               <Column style={{ ...muted, fontWeight: 600, textAlign: "right", width: "120px" }}>{t.total}</Column>
            </Row>
            {order.products.map((line, index) => (
               <Row key={index} style={{ borderTop: "1px solid #f3f3f3" }}>
                  <Column style={cell}>{lineName(line)}</Column>
                  <Column style={{ ...cell, textAlign: "center", width: "60px" }}>{line.quantity}</Column>
                  <Column style={{ ...cell, textAlign: "right", width: "120px" }}>{ctx.money(linePrice(line) * line.quantity)}</Column>
               </Row>
            ))}
         </Section>
         <Totals ctx={ctx} order={order} />

         <Text style={{ ...cell, fontWeight: 600, marginTop: "24px" }}>{t.nextSteps}</Text>
         <Text style={muted}>• {t.stepProcessing}</Text>
         <Text style={muted}>• {t.stepShipping}</Text>
         <Text style={muted}>• {t.stepTracking}</Text>
         <ActionButton ctx={ctx} href={orderUrl(ctx, orderId)}>
            {ctx.t.viewOrder}
         </ActionButton>
         <SupportNote ctx={ctx} />
      </Layout>
   );
}

export const orderConfirmationEmail = (ctx: EmailContext, orderId: string, order: EmailOrder, date = new Date()) => rendered(fill(ctx.t.confirmation.subject, { id: orderId }), <OrderConfirmation ctx={ctx} orderId={orderId} order={order} date={date} />);

export type NotifiedStatus = "accepted" | "rejected" | "shipped" | "delivered";

function OrderStatus({ ctx, orderId, status, firstName, trackingNumber }: { ctx: EmailContext; orderId: string; status: NotifiedStatus; firstName?: string; trackingNumber?: string }) {
   const message = ctx.t.status[status];
   return (
      <Layout ctx={ctx} preview={message.body} title={message.title}>
         <Text style={muted}>{fill(ctx.t.orderNumber, { id: orderId })}</Text>
         <Greeting ctx={ctx} name={firstName} />
         <Paragraph>{message.body}</Paragraph>
         {trackingNumber && status !== "rejected" && (
            <Paragraph>
               {ctx.t.status.tracking}: <strong>{trackingNumber}</strong>
            </Paragraph>
         )}
         <ActionButton ctx={ctx} href={orderUrl(ctx, orderId)}>
            {ctx.t.viewOrder}
         </ActionButton>
         <SupportNote ctx={ctx} />
      </Layout>
   );
}

export const orderStatusEmail = (ctx: EmailContext, orderId: string, status: NotifiedStatus, firstName?: string, trackingNumber?: string) =>
   rendered(fill(ctx.t.status[status].subject, { id: orderId }), <OrderStatus ctx={ctx} orderId={orderId} status={status} firstName={firstName} trackingNumber={trackingNumber} />);

function NewOrderAdmin({ ctx, orderId, order }: { ctx: EmailContext; orderId: string; order: EmailOrder }) {
   const t = ctx.t.admin;
   const name = [order.first_name, order.last_name].filter(Boolean).join(" ");
   const items = order.products.reduce((sum, line) => sum + line.quantity, 0);
   return (
      <Layout ctx={ctx} preview={fill(t.preview, { name, total: ctx.money(order.total) })} title={t.title}>
         <Text style={muted}>{fill(ctx.t.orderNumber, { id: orderId })}</Text>
         <Text style={{ ...cell, fontWeight: 600, marginTop: "16px" }}>{t.customer}</Text>
         <Text style={muted}>
            {t.name}: {name}
         </Text>
         <Text style={muted}>
            {t.email}: {order.email}
         </Text>
         {order.phone_no && (
            <Text style={muted}>
               {t.phone}: {order.phone_no}
            </Text>
         )}
         <Text style={muted}>
            {t.business}: {order.is_business ? t.yes : t.no}
         </Text>
         <Text style={{ ...cell, fontWeight: 600, marginTop: "16px" }}>{t.summary}</Text>
         <Text style={muted}>
            {t.items}: {items} · {ctx.t.confirmation.payment}: {ctx.t.payment[orderPaymentMethod(order)]}
         </Text>
         <Totals ctx={ctx} order={order} />
         <ActionButton ctx={ctx} href={`${ctx.site}/admin/orders/${encodeURIComponent(orderId)}`}>
            {t.open}
         </ActionButton>
         <Text style={{ ...muted, fontSize: "12px" }}>{t.automatic}</Text>
      </Layout>
   );
}

export const newOrderAdminEmail = (ctx: EmailContext, orderId: string, order: EmailOrder) => rendered(fill(ctx.t.admin.subject, { id: orderId }), <NewOrderAdmin ctx={ctx} orderId={orderId} order={order} />);

export type EmailContactMessage = { type: "contact" | "consent"; first_name: string; last_name: string; email: string; phone?: string | null; message: string };

function ContactMessage({ ctx, messageId, message }: { ctx: EmailContext; messageId: string; message: EmailContactMessage }) {
   const t = ctx.t.contact;
   const name = `${message.first_name} ${message.last_name}`;
   const title = message.type === "consent" ? t.subjectConsent : t.subjectContact;
   return (
      <Layout ctx={ctx} preview={message.message.slice(0, 120)} title={title}>
         <Text style={{ ...cell, fontWeight: 600 }}>
            {name} &lt;{message.email}&gt;{message.phone ? `, ${message.phone}` : ""}
         </Text>
         <Text style={{ ...cell, whiteSpace: "pre-wrap", lineHeight: "22px" }}>{message.message}</Text>
         <Text style={{ ...muted, fontSize: "12px", marginTop: "24px" }}>{fill(t.replyHint, { name, id: messageId })}</Text>
      </Layout>
   );
}

export const contactMessageEmail = (ctx: EmailContext, messageId: string, message: EmailContactMessage) =>
   rendered(`${message.type === "consent" ? ctx.t.contact.subjectConsent : ctx.t.contact.subjectContact} – ${message.first_name} ${message.last_name}`, <ContactMessage ctx={ctx} messageId={messageId} message={message} />);
