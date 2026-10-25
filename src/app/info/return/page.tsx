import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("return");

export default function ReturnPage() {
   return <InfoPage id="return" />;
}
