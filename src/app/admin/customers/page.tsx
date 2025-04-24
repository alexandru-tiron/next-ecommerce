"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { db } from "@/lib/firebaseInit";
import { collection, getDocs, query, where, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Search, ArrowUp, ArrowDown, Eye } from "lucide-react";
import Link from "next/link";
import { UserData } from "@/types/user";
import { Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";

// Extended user type with order stats
interface ExtendedUserData {
   id: string;
   email: string;
   first_name: string;
   last_name: string;
   phone_no?: string;
   orders_count: number;
   last_order_date: Date | null;
   created_at: Date;
}

interface FirestoreTimestamp {
   _seconds: number;
   _nanoseconds: number;
}

interface Order {
   date: Timestamp | FirestoreTimestamp;
   products: Array<{
      discount_price?: number;
      price: number;
      quantity?: number;
   }>;
   shipping_price?: number;
}

// Search type options
type SearchType = "name" | "email" | "phone";

// Format date for display
const formatDate = (date: Date | null) => {
   if (!date) return "N/A";

   return date.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
   });
};

// Helper function to convert Firestore timestamp to Date
const toDate = (timestamp: Timestamp | FirestoreTimestamp): Date => {
   if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
   }
   return new Date(timestamp._seconds * 1000);
};

// Simple debounce function
const useDebounce = (value: string, delay: number) => {
   const [debouncedValue, setDebouncedValue] = useState(value);

   useEffect(() => {
      const handler = setTimeout(() => {
         setDebouncedValue(value);
      }, delay);

      return () => {
         clearTimeout(handler);
      };
   }, [value, delay]);

   return debouncedValue;
};

// Memoized customer table component
const CustomerTable = memo(
   ({
      customers,
      isLoading,
      sortField,
      sortDirection,
      toggleSort,
      hasMore,
      handleLoadMore,
      debouncedSearchTerm,
   }: {
      customers: ExtendedUserData[];
      isLoading: boolean;
      sortField: string;
      sortDirection: "asc" | "desc";
      toggleSort: (field: string) => void;
      hasMore: boolean;
      handleLoadMore: () => void;
      debouncedSearchTerm: string;
   }) => {
      const t = useTranslations();
      // Sort customers based on sort field and direction
      const sortedCustomers = useMemo(() => {
         return [...customers].sort((a, b) => {
            // Handle various sort fields
            switch (sortField) {
               case "name":
                  const aName = `${a.first_name} ${a.last_name}`;
                  const bName = `${b.first_name} ${b.last_name}`;
                  return sortDirection === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
               case "email":
                  return sortDirection === "asc" ? (a.email || "").localeCompare(b.email || "") : (b.email || "").localeCompare(a.email || "");
               case "orders_count":
                  return sortDirection === "asc" ? a.orders_count - b.orders_count : b.orders_count - a.orders_count;
               case "last_order_date":
                  if (!a.last_order_date && !b.last_order_date) return 0;
                  if (!a.last_order_date) return sortDirection === "asc" ? -1 : 1;
                  if (!b.last_order_date) return sortDirection === "asc" ? 1 : -1;
                  return sortDirection === "asc" ? a.last_order_date.getTime() - b.last_order_date.getTime() : b.last_order_date.getTime() - a.last_order_date.getTime();
               case "created_at":
                  return sortDirection === "asc" ? a.created_at.getTime() - b.created_at.getTime() : b.created_at.getTime() - a.created_at.getTime();
               default:
                  return 0;
            }
         });
      }, [customers, sortField, sortDirection]);

      return (
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none" onClick={() => toggleSort("name")}>
                              {t("Admin.client")}
                              {sortField === "name" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none" onClick={() => toggleSort("email")}>
                              {t("Login.email")}
                              {sortField === "email" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Login.phoneNumber")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none" onClick={() => toggleSort("orders_count")}>
                              {t("Admin.orders")}
                              {sortField === "orders_count" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none" onClick={() => toggleSort("last_order_date")}>
                              {t("Admin.lastOrder")}
                              {sortField === "last_order_date" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none" onClick={() => toggleSort("created_at")}>
                              {t("Admin.clientSince")}
                              {sortField === "created_at" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.actions")}
                        </th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {sortedCustomers.length > 0 ? (
                        sortedCustomers.map((customer) => (
                           <tr key={customer.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex items-center">
                                    <div className="ml-4">
                                       <div className="text-sm font-medium text-gray-900">
                                          {customer.first_name} {customer.last_name}
                                       </div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone_no || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.orders_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(customer.last_order_date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(customer.created_at)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                 <Link href={`/admin/customers/${customer.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    <Eye className="w-5 h-5 inline" />
                                 </Link>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                              {t("Admin.noCustomersFound")}
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* Load More Button */}
            {hasMore && !isLoading && !debouncedSearchTerm.trim() && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-center">
                  <button onClick={handleLoadMore} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                     {t("Admin.loadMore")}
                  </button>
               </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
               </div>
            )}
         </div>
      );
   }
);

// Add display name for memoized component (for better debugging)
CustomerTable.displayName = "CustomerTable";

// Empty results component (memoized)
const EmptyResults = memo(() => {
   const t = useTranslations();
   return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">{t("Admin.noCustomersFound")}</p>
            <p className="text-sm text-gray-400">{t("Admin.tryOtherCriteria")}</p>
         </div>
      </div>
   );
});

EmptyResults.displayName = "EmptyResults";

// Main page component
export default function CustomersPage() {
   const t = useTranslations();
   const [isLoading, setIsLoading] = useState(true);
   const [initialLoad, setInitialLoad] = useState(true);
   const [customers, setCustomers] = useState<ExtendedUserData[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [searchType, setSearchType] = useState<SearchType>("name");
   const [currentPage, setCurrentPage] = useState(1);
   const [sortField, setSortField] = useState<string>("last_order_date");
   const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
   const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
   const [hasMore, setHasMore] = useState(true);
   const searchInputRef = useRef<HTMLInputElement>(null);

   // Debounce search term to prevent too many queries
   const debouncedSearchTerm = useDebounce(searchTerm, 1000);

   const itemsPerPage = 50;

   // Reset pagination when search changes
   useEffect(() => {
      setCurrentPage(1);
      setLastVisible(null);
   }, [debouncedSearchTerm, searchType]);

   // Keep input focused after search
   useEffect(() => {
      if (!initialLoad && searchInputRef.current) {
         searchInputRef.current.focus();
      }
   }, [customers, initialLoad]);

   // Main data fetching effect
   useEffect(() => {
      const fetchCustomers = async () => {
         try {
            setIsLoading(true);
            console.log("Fetching customers data from Firestore...");

            // Create base query for users
            const usersRef = collection(db, "Users");
            let usersQuery;

            // Apply filter if search term is provided
            if (debouncedSearchTerm.trim()) {
               // Different queries based on search type
               if (searchType === "email") {
                  usersQuery = query(usersRef, where("email", ">=", debouncedSearchTerm.toLowerCase()), where("email", "<=", debouncedSearchTerm.toLowerCase() + "\uf8ff"), limit(itemsPerPage));
               } else if (searchType === "phone") {
                  usersQuery = query(usersRef, where("phone_no", ">=", debouncedSearchTerm), where("phone_no", "<=", debouncedSearchTerm + "\uf8ff"), limit(itemsPerPage));
               } else {
                  // Name search - we'll have to query both first_name and last_name separately
                  // and then combine results
                  const firstNameQuery = query(usersRef, where("first_name", ">=", debouncedSearchTerm), where("first_name", "<=", debouncedSearchTerm + "\uf8ff"), limit(itemsPerPage));
                  const lastNameQuery = query(usersRef, where("last_name", ">=", debouncedSearchTerm), where("last_name", "<=", debouncedSearchTerm + "\uf8ff"), limit(itemsPerPage));

                  const [firstNameResults, lastNameResults] = await Promise.all([getDocs(firstNameQuery), getDocs(lastNameQuery)]);

                  // Combine and deduplicate results
                  const combinedDocs = [...firstNameResults.docs, ...lastNameResults.docs];
                  const uniqueDocs = Array.from(new Set(combinedDocs.map((doc) => doc.id)))
                     .map((id) => combinedDocs.find((doc) => doc.id === id))
                     .filter(Boolean) as QueryDocumentSnapshot<DocumentData>[];

                  // Process the retrieved users
                  await processUsers(uniqueDocs);
                  setIsLoading(false);
                  setInitialLoad(false);
                  return;
               }
            } else {
               // Default query without search
               usersQuery = query(usersRef, limit(itemsPerPage));

               // If we have a last visible document, start after it
               if (lastVisible && currentPage > 1) {
                  usersQuery = query(usersRef, startAfter(lastVisible), limit(itemsPerPage));
               }
            }

            const usersSnapshot = await getDocs(usersQuery);

            // Process the retrieved users
            await processUsers(usersSnapshot.docs);
            setIsLoading(false);
            setInitialLoad(false);
         } catch (error) {
            console.error("Error fetching customers:", error);
            setIsLoading(false);
            setInitialLoad(false);
         }
      };

      // Helper function to process user documents
      const processUsers = async (userDocs: QueryDocumentSnapshot<DocumentData>[]) => {
         // Update last visible document
         setLastVisible(userDocs[userDocs.length - 1] || null);
         setHasMore(userDocs.length === itemsPerPage);

         // Process the customers data with order information
         const customersData: ExtendedUserData[] = [];

         // Process each user
         for (const userDoc of userDocs) {
            const userData = userDoc.data() as UserData;
            const userId = userDoc.id;

            // Get orders count for this user
            const ordersRef = collection(db, "Orders");
            const ordersQuery = query(ordersRef, where("user_id", "==", userId));
            const ordersSnapshot = await getDocs(ordersQuery);
            const ordersCount = ordersSnapshot.size;

            // Get the most recent order for last order date
            let lastOrderDate: Date | null = null;

            if (ordersCount > 0) {
               const lastOrderQuery = query(ordersRef, where("user_id", "==", userId), orderBy("date", "desc"), limit(1));
               const lastOrderSnapshot = await getDocs(lastOrderQuery);
               const lastOrder = lastOrderSnapshot.docs[0].data() as Order;

               if (lastOrder.date) {
                  lastOrderDate = toDate(lastOrder.date);
               }
            }

            // Create extended user data object
            const createdAt = userData.created_at ? toDate(userData.created_at) : new Date();

            const extendedUser: ExtendedUserData = {
               id: userId,
               email: userData.email || "",
               first_name: userData.first_name || "",
               last_name: userData.last_name || "",
               phone_no: userData.phone_no,
               orders_count: ordersCount,
               last_order_date: lastOrderDate,
               created_at: createdAt,
            };

            customersData.push(extendedUser);
         }

         // Update customers state
         if (currentPage === 1 || debouncedSearchTerm.trim()) {
            setCustomers(customersData);
         } else {
            setCustomers((prev) => [...prev, ...customersData]);
         }
      };

      fetchCustomers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentPage, debouncedSearchTerm, searchType]);

   // Handle load more
   const handleLoadMore = () => {
      if (!isLoading && hasMore) {
         setCurrentPage((prev) => prev + 1);
      }
   };

   // Handle input change without losing focus
   const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
   };

   // Handle search form submission
   const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
   };

   // Handle sort toggle - memoized to prevent recreation on each render
   const toggleSort = useMemo(() => {
      return (field: string) => {
         if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
         } else {
            setSortField(field);
            setSortDirection("desc");
         }
      };
   }, [sortField, sortDirection]);

   // Show loading indicator on initial load
   if (initialLoad) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   // Determine if we should show empty results
   const showEmptyResults = !initialLoad && debouncedSearchTerm.trim() !== "" && customers.length === 0 && !isLoading;

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-semibold text-gray-900">{t("Admin.customers")}</h1>
               <p className="mt-1 text-sm text-gray-500">{t("Admin.manageCustomers")}</p>
            </div>
         </div>

         {/* Search Bar */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
               <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                     ref={searchInputRef}
                     type="text"
                     value={searchTerm}
                     onChange={handleSearchTermChange}
                     placeholder={t("Admin.searchCustomers")}
                     className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
               </div>
               <div className="sm:w-40">
                  <select value={searchType} onChange={(e) => setSearchType(e.target.value as SearchType)} className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm">
                     <option value="name">{t("Login.name")}</option>
                     <option value="email">{t("Login.email")}</option>
                     <option value="phone">{t("Login.phoneNumber")}</option>
                  </select>
               </div>
               <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {t("Admin.search")}
               </button>
            </form>
         </div>

         {/* Conditionally render based on state */}
         {showEmptyResults ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-8 text-center">
                  <p className="text-gray-500 mb-2">{t("Admin.noCustomersFound")}</p>
                  <p className="text-sm text-gray-400">{t("Admin.tryOtherCriteria")}</p>
               </div>
            </div>
         ) : (
            <CustomerTable customers={customers} isLoading={isLoading} sortField={sortField} sortDirection={sortDirection} toggleSort={toggleSort} hasMore={hasMore} handleLoadMore={handleLoadMore} debouncedSearchTerm={debouncedSearchTerm} />
         )}
      </div>
   );
}
