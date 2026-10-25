import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("terms-and-conditions");

export default function TermsAndConditionsPage() {
   return <InfoPage id="terms-and-conditions" />;
}
