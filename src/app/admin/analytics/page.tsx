"use client";

import { db } from "@/lib/firebaseInit";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import { AnalyticsOrder, inRange, kpis, percentChange, revenueBuckets, revenueByCategory, startOfDay, statusCounts, topProducts } from "@/components/admin/analytics/aggregate";
import ColumnChart from "@/components/admin/analytics/ColumnChart";
import BarList from "@/components/admin/analytics/BarList";
import StatTile from "@/components/admin/analytics/StatTile";
import { useFormatDate } from "@/components/common/useFormatDate";
import { useFormatMoney } from "@/components/common/Price";

const PERIODS = [30, 90, 180] as const;
const DAY = 24 * 60 * 60 * 1000;
const toMillis = (value: unknown) =>
   value instanceof Timestamp ? value.toMillis() : value && typeof value === "object" && "_seconds" in value ? Number((value as { _seconds: number })._seconds) * 1000 : 0;

export default function AnalyticsPage() {
   const t = useTranslations("Admin");
   const locale = useLocale();
   const money = useFormatMoney();
   const formatStoreDate = useFormatDate();
   const tOrders = useTranslations("Orders");
   const [period, setPeriod] = useState<(typeof PERIODS)[number]>(30);
   const [orders, setOrders] = useState<AnalyticsOrder[]>([]);
   const [userCreatedAt, setUserCreatedAt] = useState<number[]>([]);
   const [categories, setCategories] = useState<Record<string, string>>({});
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);

   useEffect(() => {
      Promise.all([getDocs(collection(db, "Orders")), getDocs(collection(db, "Users")), getDocs(collection(db, "Products"))])
         .then(([ordersSnap, usersSnap, productsSnap]) => {
            setOrders(
               ordersSnap.docs.map((order) => ({
                  id: order.id,
                  date: toMillis(order.data().date),
                  status: order.data().status,
                  total: Number(order.data().total) || 0,
                  user_id: order.data().user_id,
                  products: order.data().products || [],
               }))
            );
            setUserCreatedAt(usersSnap.docs.map((user) => toMillis(user.data().created_at)).filter(Boolean));
            setCategories(Object.fromEntries(productsSnap.docs.map((product) => [product.id, product.data().category_name])));
         })
         .catch((err) => {
            console.error("Error loading analytics:", err);
            setError(true);
         })
         .finally(() => setLoading(false));
   }, []);

   const view = useMemo(() => {
      const now = Date.now();
      const from = startOfDay(now) - (period - 1) * DAY;
      const previousFrom = from - period * DAY;
      const current = inRange(orders, from, now + 1);
      const previous = inRange(orders, previousFrom, from);
      const newCustomers = (start: number, end: number) => userCreatedAt.filter((createdAt) => createdAt >= start && createdAt < end).length;
      const bucket = period === 30 ? "day" : "week";
      const dateLabel = (ms: number) => formatStoreDate(ms, { day: "numeric", month: "short" });
      return {
         current: kpis(current),
         previous: kpis(previous),
         customers: newCustomers(from, now + 1),
         previousCustomers: newCustomers(previousFrom, from),
         columns: revenueBuckets(current, from, now + 1, bucket).map((entry) => ({
            key: String(entry.start),
            label: dateLabel(entry.start),
            value: entry.revenue,
            detail: t("analyticsOrdersCount", { count: entry.orders }),
         })),
         statuses: statusCounts(current).map((entry) => ({ label: tOrders(entry.status), value: entry.count })),
         categories: revenueByCategory(current, (id) => categories[id]).map((entry) => ({ label: entry.category, value: entry.revenue })),
         products: topProducts(current, 10),
      };
   }, [orders, userCreatedAt, categories, period, t, tOrders, formatStoreDate]);

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   const comparison = t("analyticsVsPrevious", { days: period });

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
               <h1 className="text-2xl font-semibold text-gray-900">{t("analytics")}</h1>
               <p className="mt-1 text-sm text-gray-500">{t("analyticsDescription")}</p>
            </div>
            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5" role="group" aria-label={t("analyticsPeriod")}>
               {PERIODS.map((days) => (
                  <button key={days} onClick={() => setPeriod(days)} aria-pressed={period === days} className={twMerge("px-3 py-1.5 text-sm rounded", period === days ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50")}>
                     {t("analyticsLastDays", { days })}
                  </button>
               ))}
            </div>
         </div>

         {error && <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">{t("analyticsLoadError")}</div>}

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label={t("revenue")} value={money(view.current.revenue)} change={percentChange(view.current.revenue, view.previous.revenue)} comparisonLabel={comparison} />
            <StatTile label={t("orders")} value={view.current.orders.toLocaleString(locale)} change={percentChange(view.current.orders, view.previous.orders)} comparisonLabel={comparison} />
            <StatTile label={t("analyticsAverageOrder")} value={money(view.current.averageOrder)} change={percentChange(view.current.averageOrder, view.previous.averageOrder)} comparisonLabel={comparison} />
            <StatTile label={t("analyticsNewCustomers")} value={view.customers.toLocaleString(locale)} change={percentChange(view.customers, view.previousCustomers)} comparisonLabel={comparison} />
         </div>

         <section className="bg-white rounded-lg border border-gray-100 p-4">
            <h2 className="font-medium text-gray-900">{period === 30 ? t("analyticsRevenueByDay") : t("analyticsRevenueByWeek")}</h2>
            <p className="text-xs text-gray-500 mb-4">{t("analyticsRevenueNote")}</p>
            <ColumnChart data={view.columns} formatValue={money} ariaLabel={period === 30 ? t("analyticsRevenueByDay") : t("analyticsRevenueByWeek")} />
            <details className="mt-4 text-sm">
               <summary className="cursor-pointer text-gray-600">{t("analyticsShowTable")}</summary>
               <table className="mt-2 w-full text-left">
                  <thead className="text-xs text-gray-500 uppercase">
                     <tr>
                        <th className="py-1">{t("date")}</th>
                        <th className="py-1 text-right">{t("orders")}</th>
                        <th className="py-1 text-right">{t("revenue")}</th>
                     </tr>
                  </thead>
                  <tbody className="tabular-nums">
                     {view.columns.map((column) => (
                        <tr key={column.key} className="border-t border-gray-100">
                           <td className="py-1">{column.label}</td>
                           <td className="py-1 text-right">{column.detail}</td>
                           <td className="py-1 text-right">{money(column.value)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </details>
         </section>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-100 p-4">
               <h2 className="font-medium text-gray-900 mb-4">{t("analyticsOrdersByStatus")}</h2>
               <BarList items={view.statuses} formatValue={(value) => value.toLocaleString(locale)} emptyLabel={t("analyticsNoData")} />
            </section>
            <section className="bg-white rounded-lg border border-gray-100 p-4">
               <h2 className="font-medium text-gray-900 mb-4">{t("analyticsRevenueByCategory")}</h2>
               <BarList items={view.categories} formatValue={money} emptyLabel={t("analyticsNoData")} />
            </section>
         </div>

         <section className="bg-white rounded-lg border border-gray-100 overflow-x-auto">
            <h2 className="font-medium text-gray-900 p-4 pb-2">{t("topProducts")}</h2>
            <table className="min-w-full text-sm">
               <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                     <th className="px-4 py-2">#</th>
                     <th className="px-4 py-2">{t("product")}</th>
                     <th className="px-4 py-2 text-right">{t("analyticsUnits")}</th>
                     <th className="px-4 py-2 text-right">{t("revenue")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 tabular-nums">
                  {view.products.map((product, index) => (
                     <tr key={product.productId}>
                        <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-2 text-right">{product.units}</td>
                        <td className="px-4 py-2 text-right">{money(product.revenue)}</td>
                     </tr>
                  ))}
                  {view.products.length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                           {t("analyticsNoData")}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </section>
      </div>
   );
}
