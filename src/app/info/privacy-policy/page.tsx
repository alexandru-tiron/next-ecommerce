import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("privacy-policy");

export default function PrivacyPolicyPage() {
   return <InfoPage id="privacy-policy" />;
}
