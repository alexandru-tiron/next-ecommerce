import { InfoPageId, Locale, ShippingSettings, StoreInfo } from "@core/settings";

// Built-in texts for the information pages, shown until the store writes its own in Admin → Settings → Pages
// (where they can also be loaded as a starting point). They are general EU templates, not legal advice.

export type TemplateContext = {
   info: StoreInfo;
   shipping: ShippingSettings;
   vatRate: number;
   money: (amount: number) => string;
};

const esc = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
const mail = (address: string) => (address ? `<a href="mailto:${esc(address)}">${esc(address)}</a>` : "");
const p = (...lines: (string | false | undefined)[]) => lines.filter(Boolean).map((line) => `<p>${line}</p>`).join("");
const list = (...items: (string | false | undefined)[]) => `<ul>${items.filter(Boolean).map((item) => `<li>${item}</li>`).join("")}</ul>`;
const h2 = (title: string) => `<h2>${title}</h2>`;
const ANPC = '<a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">anpc.ro</a>';

function details(ctx: TemplateContext) {
   const { info } = ctx;
   return {
      name: esc(info.store_name),
      company: esc(info.legal_name || info.store_name),
      taxId: esc(info.tax_id),
      regNo: esc(info.reg_no),
      address: esc(info.store_address),
      phone: esc(info.phone_no),
      contact: mail(info.contact_mail || info.support_mail),
      orders: mail(info.orders_mail || info.contact_mail),
      support: mail(info.support_mail || info.contact_mail),
      shippingPrice: ctx.money(ctx.shipping.default_price),
      freeShipping: ctx.shipping.enable_threshold ? ctx.money(ctx.shipping.free_shipping_threshold) : "",
      vat: `${ctx.vatRate}%`,
      romania: info.country.toUpperCase() === "RO",
   };
}

type Template = (ctx: TemplateContext) => string;

const en: Record<InfoPageId, Template> = {
   "about-us": (ctx) => {
      const d = details(ctx);
      return (
         p(`${d.name} is an online store run by ${d.company}${d.address ? `, ${d.address}` : ""}.`, "We choose our products carefully, describe them honestly and ship them quickly.") +
         h2("Why order from us") +
         list("Secure checkout and clear prices, VAT included.", `Shipping costs ${d.shippingPrice}${d.freeShipping ? ` and is free for orders over ${d.freeShipping}` : ""}.`, "14 days to change your mind, as EU law provides.", "Real people answer your questions.") +
         h2("Contact") +
         p([d.contact && `E-mail: ${d.contact}`, d.phone && `Phone: ${d.phone}`].filter(Boolean).join("<br>"))
      );
   },
   "how-to-buy": (ctx) => {
      const d = details(ctx);
      return (
         h2("Placing an order") +
         `<ol><li>Find the product you want with the search or the categories.</li><li>Choose any options (colour, size) and the quantity, then press Add to cart.</li><li>Open the cart and press Finalize order.</li><li>Sign in or create an account, add your delivery and billing addresses and choose how to pay.</li><li>Check the order and press Place order.</li></ol>` +
         p(`You get a confirmation e-mail straight away. You can follow your order in Profile → My orders.`, d.orders && `Questions about an order? Write to ${d.orders}.`)
      );
   },
   "delivery-and-payment": (ctx) => {
      const d = details(ctx);
      return (
         h2("Delivery") +
         p(`Delivery costs ${d.shippingPrice}${d.freeShipping ? `. Orders over ${d.freeShipping} ship free` : ""}.`, "We prepare orders on working days and send you the tracking number when the parcel leaves.") +
         h2("Payment") +
         p("You can pay with the methods shown at checkout: by card on the secure page of our payment provider, or on delivery where offered. Your card details never reach our store.", `Prices include VAT (${d.vat}). You receive an invoice for every order.`)
      );
   },
   return: (ctx) => {
      const d = details(ctx);
      return (
         h2("Your right to withdraw") +
         p("You can cancel your order within 14 days of receiving it, without giving a reason.", `To do so, tell us before the 14 days are over${d.support ? ` at ${d.support}` : ""}, with your order number.`) +
         h2("Returning the products") +
         p("Send the products back within 14 days of telling us, unused and in their original packaging where possible. You pay the cost of returning them unless we sent the wrong item or it was faulty.", "We refund the price and the standard delivery cost within 14 days of receiving the products, using the same payment method unless we agree otherwise.") +
         h2("Exceptions") +
         list("Sealed products that can't be returned for health or hygiene reasons once unsealed.", "Products made or personalised to your specifications.")
      );
   },
   "terms-and-conditions": (ctx) => {
      const d = details(ctx);
      return (
         h2("Who we are") +
         p(`This store is run by ${d.company}${d.taxId ? `, tax ID ${d.taxId}` : ""}${d.regNo ? `, registration number ${d.regNo}` : ""}${d.address ? `, ${d.address}` : ""}.`, [d.contact && `E-mail: ${d.contact}`, d.phone && `phone: ${d.phone}`].filter(Boolean).join(", ")) +
         h2("Orders and contract") +
         p("An order is a request to buy. The contract is formed when we confirm the order by e-mail. We may cancel an order if a product is no longer available or its price was clearly wrong; you then get a full refund.") +
         h2("Prices") +
         p(`Prices are shown with VAT (${d.vat}) included. Delivery costs are shown before you place the order.`) +
         h2("Delivery, withdrawal and warranty") +
         p("Delivery and returns work as described on the Delivery and payment and Returns pages. Products come with the legal guarantee of conformity for consumers.") +
         h2("Complaints") +
         p(`Write to us${d.support ? ` at ${d.support}` : ""} and we'll answer within 14 days.`, d.romania && `Consumers in Romania can also contact the National Authority for Consumer Protection (ANPC): ${ANPC}.`)
      );
   },
   "privacy-policy": (ctx) => {
      const d = details(ctx);
      return (
         p(`${d.company} is responsible for the personal data you give us when you shop at ${d.name}.`) +
         h2("What we collect and why") +
         list("Account and order details (name, e-mail, phone, addresses), to deliver your orders and invoice them.", "Messages you send us, to answer them.", "Technical data needed to keep the store secure (for example to stop automated abuse).", "If you agree to it, statistics about how the store is used.") +
         h2("Who we share it with") +
         p("Only with the services that run the store and deliver your order: hosting and database providers, the payment provider, couriers and our invoicing service. We don't sell your data.") +
         h2("How long we keep it") +
         p("Order and invoice data for as long as the law requires; account data until you delete your account.") +
         h2("Your rights") +
         p(`You can ask to see, correct, export or delete your data, or object to how we use it, at ${d.contact || "our contact address"}. You can also complain to your data protection authority.`)
      );
   },
};

const ro: Record<InfoPageId, Template> = {
   "about-us": (ctx) => {
      const d = details(ctx);
      return (
         p(`${d.name} este un magazin online administrat de ${d.company}${d.address ? `, ${d.address}` : ""}.`, "Alegem produsele cu grijă, le descriem corect și le livrăm repede.") +
         h2("De ce să comanzi de la noi") +
         list("Plată sigură și prețuri clare, cu TVA inclus.", `Livrarea costă ${d.shippingPrice}${d.freeShipping ? ` și este gratuită pentru comenzile de peste ${d.freeShipping}` : ""}.`, "14 zile în care te poți răzgândi, conform legislației UE.", "Îți răspund oameni reali la întrebări.") +
         h2("Contact") +
         p([d.contact && `E-mail: ${d.contact}`, d.phone && `Telefon: ${d.phone}`].filter(Boolean).join("<br>"))
      );
   },
   "how-to-buy": (ctx) => {
      const d = details(ctx);
      return (
         h2("Cum plasezi o comandă") +
         `<ol><li>Găsește produsul dorit cu ajutorul căutării sau al categoriilor.</li><li>Alege opțiunile (culoare, mărime) și cantitatea, apoi apasă Adaugă în coș.</li><li>Deschide coșul și apasă Finalizează comanda.</li><li>Autentifică-te sau creează un cont, adaugă adresele de livrare și facturare și alege modul de plată.</li><li>Verifică comanda și apasă Plasează comanda.</li></ol>` +
         p("Primești imediat un e-mail de confirmare. Poți urmări comanda în Profil → Comenzile mele.", d.orders && `Ai întrebări despre o comandă? Scrie-ne la ${d.orders}.`)
      );
   },
   "delivery-and-payment": (ctx) => {
      const d = details(ctx);
      return (
         h2("Livrare") +
         p(`Livrarea costă ${d.shippingPrice}${d.freeShipping ? `. Comenzile de peste ${d.freeShipping} se livrează gratuit` : ""}.`, "Pregătim comenzile în zilele lucrătoare și îți trimitem numărul de urmărire când coletul pleacă.") +
         h2("Plată") +
         p("Poți plăti prin metodele afișate la finalizarea comenzii: cu cardul, pe pagina securizată a procesatorului de plăți, sau ramburs, unde este disponibil. Datele cardului nu ajung niciodată la magazinul nostru.", `Prețurile includ TVA (${d.vat}). Primești factură pentru fiecare comandă.`)
      );
   },
   return: (ctx) => {
      const d = details(ctx);
      return (
         h2("Dreptul de retragere") +
         p("Poți renunța la comandă în 14 zile de la primire, fără să oferi un motiv.", `Pentru aceasta, anunță-ne înainte de încheierea celor 14 zile${d.support ? ` la ${d.support}` : ""}, menționând numărul comenzii.`) +
         h2("Returnarea produselor") +
         p("Trimite produsele înapoi în 14 zile de la anunțare, nefolosite și, pe cât posibil, în ambalajul original. Costul returului este al tău, cu excepția cazului în care am trimis alt produs sau produsul era defect.", "Rambursăm prețul și costul livrării standard în 14 zile de la primirea produselor, prin aceeași metodă de plată, dacă nu stabilim altfel.") +
         h2("Excepții") +
         list("Produsele sigilate care nu pot fi returnate din motive de igienă sau sănătate după desigilare.", "Produsele realizate sau personalizate după specificațiile tale.")
      );
   },
   "terms-and-conditions": (ctx) => {
      const d = details(ctx);
      return (
         h2("Cine suntem") +
         p(`Magazinul este administrat de ${d.company}${d.taxId ? `, CUI ${d.taxId}` : ""}${d.regNo ? `, nr. de înregistrare ${d.regNo}` : ""}${d.address ? `, ${d.address}` : ""}.`, [d.contact && `E-mail: ${d.contact}`, d.phone && `telefon: ${d.phone}`].filter(Boolean).join(", ")) +
         h2("Comenzi și contract") +
         p("O comandă este o solicitare de cumpărare. Contractul se încheie când confirmăm comanda prin e-mail. Putem anula o comandă dacă un produs nu mai este disponibil sau prețul său era vădit greșit; în acest caz primești banii înapoi integral.") +
         h2("Prețuri") +
         p(`Prețurile sunt afișate cu TVA (${d.vat}) inclus. Costul livrării este afișat înainte de plasarea comenzii.`) +
         h2("Livrare, retragere și garanție") +
         p("Livrarea și retururile funcționează așa cum sunt descrise în paginile Livrare și plată și Retur. Produsele beneficiază de garanția legală de conformitate pentru consumatori.") +
         h2("Reclamații") +
         p(`Scrie-ne${d.support ? ` la ${d.support}` : ""} și îți răspundem în 14 zile.`, d.romania && `Consumatorii din România se pot adresa și Autorității Naționale pentru Protecția Consumatorilor (ANPC): ${ANPC}.`)
      );
   },
   "privacy-policy": (ctx) => {
      const d = details(ctx);
      return (
         p(`${d.company} este operatorul datelor personale pe care ni le oferi când cumperi de la ${d.name}.`) +
         h2("Ce date colectăm și de ce") +
         list("Datele contului și ale comenzilor (nume, e-mail, telefon, adrese), pentru a livra și factura comenzile.", "Mesajele pe care ni le trimiți, pentru a le răspunde.", "Date tehnice necesare pentru securitatea magazinului (de exemplu, pentru a opri abuzurile automate).", "Dacă ești de acord, statistici despre folosirea magazinului.") +
         h2("Cu cine le împărtășim") +
         p("Doar cu serviciile care fac magazinul să funcționeze și îți livrează comanda: furnizorii de găzduire și bază de date, procesatorul de plăți, firmele de curierat și serviciul de facturare. Nu vindem datele tale.") +
         h2("Cât timp le păstrăm") +
         p("Datele comenzilor și facturilor cât timp cere legea; datele contului până când îți ștergi contul.") +
         h2("Drepturile tale") +
         p(`Poți cere acces, rectificare, portabilitate sau ștergerea datelor ori te poți opune prelucrării lor, scriind la ${d.contact || "adresa noastră de contact"}. Te poți adresa și autorității pentru protecția datelor${d.romania ? " (ANSPDCP)" : ""}.`)
      );
   },
};

const de: Record<InfoPageId, Template> = {
   "about-us": (ctx) => {
      const d = details(ctx);
      return (
         p(`${d.name} ist ein Onlineshop von ${d.company}${d.address ? `, ${d.address}` : ""}.`, "Wir wählen unsere Produkte sorgfältig aus, beschreiben sie ehrlich und versenden sie schnell.") +
         h2("Warum bei uns bestellen") +
         list("Sicherer Bezahlvorgang und klare Preise inklusive Mehrwertsteuer.", `Der Versand kostet ${d.shippingPrice}${d.freeShipping ? ` und ist ab ${d.freeShipping} kostenlos` : ""}.`, "14 Tage Widerrufsrecht nach EU-Recht.", "Echte Menschen beantworten Ihre Fragen.") +
         h2("Kontakt") +
         p([d.contact && `E-Mail: ${d.contact}`, d.phone && `Telefon: ${d.phone}`].filter(Boolean).join("<br>"))
      );
   },
   "how-to-buy": (ctx) => {
      const d = details(ctx);
      return (
         h2("So bestellen Sie") +
         `<ol><li>Finden Sie das gewünschte Produkt über die Suche oder die Kategorien.</li><li>Wählen Sie Optionen (Farbe, Größe) und die Menge und klicken Sie auf In den Warenkorb.</li><li>Öffnen Sie den Warenkorb und klicken Sie auf Bestellung abschließen.</li><li>Melden Sie sich an oder erstellen Sie ein Konto, geben Sie Liefer- und Rechnungsadresse an und wählen Sie die Zahlungsart.</li><li>Prüfen Sie die Bestellung und klicken Sie auf Bestellung aufgeben.</li></ol>` +
         p("Sie erhalten sofort eine Bestätigung per E-Mail. Ihre Bestellung verfolgen Sie unter Profil → Meine Bestellungen.", d.orders && `Fragen zu einer Bestellung? Schreiben Sie an ${d.orders}.`)
      );
   },
   "delivery-and-payment": (ctx) => {
      const d = details(ctx);
      return (
         h2("Versand") +
         p(`Der Versand kostet ${d.shippingPrice}${d.freeShipping ? `. Ab ${d.freeShipping} liefern wir kostenlos` : ""}.`, "Wir bearbeiten Bestellungen an Werktagen und schicken Ihnen die Sendungsnummer, sobald das Paket unterwegs ist.") +
         h2("Zahlung") +
         p("Sie können mit den an der Kasse angezeigten Zahlungsarten bezahlen: per Karte auf der sicheren Seite unseres Zahlungsanbieters oder, wo angeboten, per Nachnahme. Ihre Kartendaten erreichen unseren Shop nie.", `Die Preise enthalten die Mehrwertsteuer (${d.vat}). Zu jeder Bestellung erhalten Sie eine Rechnung.`)
      );
   },
   return: (ctx) => {
      const d = details(ctx);
      return (
         h2("Widerrufsrecht") +
         p("Sie können Ihre Bestellung innerhalb von 14 Tagen nach Erhalt ohne Angabe von Gründen widerrufen.", `Teilen Sie uns den Widerruf vor Ablauf der 14 Tage${d.support ? ` an ${d.support}` : ""} mit und nennen Sie Ihre Bestellnummer.`) +
         h2("Rücksendung") +
         p("Senden Sie die Produkte innerhalb von 14 Tagen nach Ihrer Mitteilung zurück, unbenutzt und möglichst in der Originalverpackung. Die Kosten der Rücksendung tragen Sie, außer wir haben einen falschen oder fehlerhaften Artikel geschickt.", "Wir erstatten den Preis und die Standardversandkosten innerhalb von 14 Tagen nach Eingang der Rücksendung über dieselbe Zahlungsart, sofern nichts anderes vereinbart ist.") +
         h2("Ausnahmen") +
         list("Versiegelte Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nach dem Öffnen nicht zurückgegeben werden können.", "Waren, die nach Ihren Vorgaben angefertigt oder personalisiert wurden.")
      );
   },
   "terms-and-conditions": (ctx) => {
      const d = details(ctx);
      return (
         h2("Wer wir sind") +
         p(`Dieser Shop wird betrieben von ${d.company}${d.taxId ? `, USt-IdNr. ${d.taxId}` : ""}${d.regNo ? `, Registernummer ${d.regNo}` : ""}${d.address ? `, ${d.address}` : ""}.`, [d.contact && `E-Mail: ${d.contact}`, d.phone && `Telefon: ${d.phone}`].filter(Boolean).join(", ")) +
         h2("Bestellung und Vertrag") +
         p("Eine Bestellung ist ein Angebot zum Kauf. Der Vertrag kommt zustande, wenn wir die Bestellung per E-Mail bestätigen. Wir können eine Bestellung stornieren, wenn ein Produkt nicht mehr verfügbar ist oder der Preis offensichtlich falsch war; Sie erhalten dann den vollen Betrag zurück.") +
         h2("Preise") +
         p(`Alle Preise enthalten die Mehrwertsteuer (${d.vat}). Die Versandkosten werden vor Abschluss der Bestellung angezeigt.`) +
         h2("Versand, Widerruf und Gewährleistung") +
         p("Versand und Rücksendungen erfolgen wie auf den Seiten Versand und Zahlung sowie Rückgabe beschrieben. Es gilt die gesetzliche Gewährleistung für Verbraucher.") +
         h2("Beschwerden") +
         p(`Schreiben Sie uns${d.support ? ` an ${d.support}` : ""}; wir antworten innerhalb von 14 Tagen.`)
      );
   },
   "privacy-policy": (ctx) => {
      const d = details(ctx);
      return (
         p(`Verantwortlich für die personenbezogenen Daten, die Sie beim Einkauf bei ${d.name} angeben, ist ${d.company}.`) +
         h2("Welche Daten wir erheben und warum") +
         list("Konto- und Bestelldaten (Name, E-Mail, Telefon, Adressen), um Bestellungen zu liefern und abzurechnen.", "Nachrichten, die Sie uns senden, um sie zu beantworten.", "Technische Daten, die für die Sicherheit des Shops nötig sind (zum Beispiel gegen automatisierten Missbrauch).", "Mit Ihrer Einwilligung Statistiken zur Nutzung des Shops.") +
         h2("An wen wir Daten weitergeben") +
         p("Nur an die Dienste, die den Shop betreiben und Ihre Bestellung liefern: Hosting- und Datenbankanbieter, Zahlungsanbieter, Versanddienstleister und unseren Rechnungsdienst. Wir verkaufen Ihre Daten nicht.") +
         h2("Wie lange wir Daten speichern") +
         p("Bestell- und Rechnungsdaten so lange, wie es das Gesetz verlangt; Kontodaten, bis Sie Ihr Konto löschen.") +
         h2("Ihre Rechte") +
         p(`Sie können Auskunft, Berichtigung, Datenübertragbarkeit oder Löschung verlangen oder der Verarbeitung widersprechen, unter ${d.contact || "unserer Kontaktadresse"}. Sie können sich auch bei Ihrer Datenschutzaufsichtsbehörde beschweren.`)
      );
   },
};

const TEMPLATES: Record<Locale, Record<InfoPageId, Template>> = { en, ro, de };

export function infoPageTemplate(page: InfoPageId, locale: Locale, ctx: TemplateContext) {
   return TEMPLATES[locale][page](ctx);
}
