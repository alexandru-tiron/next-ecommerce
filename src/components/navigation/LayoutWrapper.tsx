// import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "@/components/footer/Footer";
import { headers } from "next/headers";

export default async function LayoutWrapper({ children }: { children: React.ReactNode }) {
   // const pathname = usePathname();
   const headersList = await headers();
   const domain = headersList.get("host") || "";
   const fullUrl = headersList.get("referer") || "";
   const pathname = headersList.get("x-current-path");
   console.log("pathname:", pathname);
   const isAdminRoute = pathname?.startsWith("/admin");

   return (
      <>
         <div className="flex flex-col min-h-screen">
            {!isAdminRoute && <Navbar />}
            <main className="flex-grow ">{children}</main>
            {!isAdminRoute && <Footer />}
         </div>
      </>
   );
}
