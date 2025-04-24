"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function SortProducts({ currentSort }: { currentSort?: string }) {
   const router = useRouter();
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const t = useTranslations("ProductList");
   const handleSort = (value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
         newParams.set("sort", value);
      } else {
         newParams.delete("sort");
      }
      router.push(`${pathname}?${newParams.toString()}`);
   };

   return (
      <select name="sort" className="py-2 px-4 rounded-2xl text-xs font-medium bg-white ring-1 ring-gray-400" onChange={(e) => handleSort(e.target.value)} value={currentSort}>
         <option value="">{t("sort")}</option>
         <option value="asc price">{t("sortByPriceAsc")}</option>
         <option value="desc price">{t("sortByPriceDesc")}</option>
         <option value="desc created_at">{t("sortByNewest")}</option>
         <option value="desc sold">{t("sortByPopularity")}</option>
      </select>
   );
}
