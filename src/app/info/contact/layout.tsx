import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

// The page itself is a client component, so its metadata lives here
export async function generateMetadata(): Promise<Metadata> {
   const t = await getTranslations("Contact");
   return { title: t("contact") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
   return children;
}
