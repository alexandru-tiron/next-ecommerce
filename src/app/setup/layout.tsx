import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
   const t = await getTranslations("Setup");
   return { title: t("title"), robots: { index: false, follow: false } };
}

export default function SetupLayout({ children }: { children: React.ReactNode }) {
   return <div className="min-h-screen bg-gray-50 py-10 px-4">{children}</div>;
}
