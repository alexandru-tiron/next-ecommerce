import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("how-to-buy");

export default function HowToBuyPage() {
   return <InfoPage id="how-to-buy" />;
}
