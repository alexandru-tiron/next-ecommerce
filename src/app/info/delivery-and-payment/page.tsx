import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("delivery-and-payment");

export default function DeliveryAndPaymentPage() {
   return <InfoPage id="delivery-and-payment" />;
}
