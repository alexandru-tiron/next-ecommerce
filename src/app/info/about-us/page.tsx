import InfoPage, { infoPageMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoPageMetadata("about-us");

export default function AboutUsPage() {
   return <InfoPage id="about-us" />;
}
