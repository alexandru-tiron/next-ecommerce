"use client";

import { FormEvent, useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { can, Role, ROLES } from "@core/roles";
import app, { auth, db } from "@/lib/firebaseInit";
import { useAppSelector } from "@/state/hooks";
import { storeErrorOf, useStoreErrorMessage } from "@/components/common/useStoreError";
import { useFormatDate } from "@/components/common/useFormatDate";

type Member = { uid: string; email: string; name: string | null; role: Role };
type AuditEntry = { id: string; by_email?: string; by?: string; target_email?: string; from?: Role | null; to?: Role | null; action: string; created_at?: Timestamp };

const setUserRole = (data: { email: string; role: Role | null }) => httpsCallable<typeof data, { uid: string; email: string; role: Role | null }>(getFunctions(app, "europe-west3"), "setUserRole")(data);
const inputClass = "px-3 py-2 rounded-md border border-gray-300 shadow-sm sm:text-sm";

// Admin → Team: who can open the admin panel and with which role (packages/core/src/roles.ts).
// Owners change roles through the setUserRole function; the Team collection mirrors the roles for this list.
export default function TeamPage() {
   const t = useTranslations("Team");
   const errorMessage = useStoreErrorMessage();
   const formatDate = useFormatDate();
   const { user, role } = useAppSelector((state) => state.auth);
   const isOwner = can(role, "manageTeam");
   const [members, setMembers] = useState<Member[] | null>(null);
   const [log, setLog] = useState<AuditEntry[]>([]);
   const [email, setEmail] = useState("");
   const [newRole, setNewRole] = useState<Role>("staff");
   const [busy, setBusy] = useState<string | null>(null);
   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
   // Accounts given admin rights before roles existed have isAdmin and no role claim
   const [legacy, setLegacy] = useState(false);

   useEffect(() => {
      const unsubscribeTeam = onSnapshot(
         collection(db, "Team"),
         (snapshot) => setMembers(snapshot.docs.map((member) => ({ uid: member.id, ...(member.data() as Omit<Member, "uid">) })).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.email.localeCompare(b.email))),
         (error) => {
            console.error("Error loading the team:", error);
            setMembers([]);
         }
      );
      const unsubscribeLog = onSnapshot(query(collection(db, "AuditLog"), orderBy("created_at", "desc"), limit(10)), (snapshot) => setLog(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<AuditEntry, "id">) }))), () => setLog([]));
      auth.currentUser?.getIdTokenResult().then((token) => setLegacy(token.claims.role === undefined && token.claims.isAdmin === true));
      return () => {
         unsubscribeTeam();
         unsubscribeLog();
      };
   }, []);

   const run = async (key: string, data: { email: string; role: Role | null }, success: string) => {
      setBusy(key);
      setMessage(null);
      try {
         await setUserRole(data);
         setMessage({ type: "success", text: success });
         return true;
      } catch (error) {
         const storeError = storeErrorOf(error);
         setMessage({ type: "error", text: storeError ? errorMessage(storeError.code, storeError.params) : t("failed") });
         return false;
      } finally {
         setBusy(null);
      }
   };

   const add = async (event: FormEvent) => {
      event.preventDefault();
      const address = email.trim();
      if (address && (await run("add", { email: address, role: newRole }, t("changed", { email: address, role: t(`roles.${newRole}`) })))) setEmail("");
   };

   const convert = async () => {
      if (!user?.email) return;
      if (await run("convert", { email: user.email, role: "owner" }, t("converted"))) {
         // The new claim shows after refreshing the ID token
         await auth.currentUser?.getIdToken(true);
         setLegacy(false);
      }
   };

   const roleLabel = (value: Role | null | undefined) => (value ? t(`roles.${value}`) : t("none"));

   return (
      <div className="space-y-6 max-w-4xl">
         <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("description")}</p>
         </div>

         <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLES.map((item) => (
               <li key={item} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-medium text-gray-900">{t(`roles.${item}`)}</p>
                  <p className="mt-1 text-sm text-gray-500">{t(`roleHints.${item}`)}</p>
               </li>
            ))}
         </ul>

         {message && <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.text}</div>}

         {legacy && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p className="font-medium text-amber-900">{t("legacyTitle")}</p>
                  <p className="text-sm text-amber-800">{t("legacyText")}</p>
               </div>
               <button type="button" onClick={convert} disabled={busy !== null} className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 flex-shrink-0">
                  {busy === "convert" ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                  {t("convert")}
               </button>
            </div>
         )}

         {isOwner ? (
            <form onSubmit={add} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
               <h2 className="font-medium text-gray-900">{t("addMember")}</h2>
               <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="flex-1">
                     <span className="sr-only">{t("email")}</span>
                     <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className={`${inputClass} w-full`} />
                  </label>
                  <label>
                     <span className="sr-only">{t("role")}</span>
                     <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className={`${inputClass} w-full sm:w-auto`}>
                        {ROLES.map((item) => (
                           <option key={item} value={item}>
                              {t(`roles.${item}`)}
                           </option>
                        ))}
                     </select>
                  </label>
                  <button type="submit" disabled={busy !== null} className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50">
                     {busy === "add" ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                     {t("add")}
                  </button>
               </div>
               <p className="text-xs text-gray-500">{t("addHint")}</p>
            </form>
         ) : (
            <p className="text-sm text-gray-500">{t("ownerOnly")}</p>
         )}

         <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            {members === null ? (
               <div className="flex justify-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
               </div>
            ) : members.length === 0 ? (
               <p className="p-4 text-sm text-gray-500">{t("noMembers")}</p>
            ) : (
               <ul className="divide-y divide-gray-200">
                  {members.map((member) => {
                     const self = member.uid === user?.uid;
                     return (
                        <li key={member.uid} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                           <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                 {member.name || member.email}
                                 {self && <span className="ml-2 text-xs font-normal text-gray-500">({t("you")})</span>}
                              </p>
                              {member.name && <p className="text-sm text-gray-500 truncate">{member.email}</p>}
                           </div>
                           {isOwner && !self ? (
                              <div className="flex items-center gap-2">
                                 <select
                                    value={member.role}
                                    aria-label={t("role")}
                                    disabled={busy !== null}
                                    onChange={(e) => run(member.uid, { email: member.email, role: e.target.value as Role }, t("changed", { email: member.email, role: t(`roles.${e.target.value}`) }))}
                                    className={inputClass}
                                 >
                                    {ROLES.map((item) => (
                                       <option key={item} value={item}>
                                          {t(`roles.${item}`)}
                                       </option>
                                    ))}
                                 </select>
                                 <button
                                    type="button"
                                    title={t("remove")}
                                    aria-label={t("remove")}
                                    disabled={busy !== null}
                                    onClick={() => confirm(t("removeConfirm", { email: member.email })) && run(member.uid, { email: member.email, role: null }, t("removed", { email: member.email }))}
                                    className="p-2 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              </div>
                           ) : (
                              <span className="text-sm text-gray-700">{roleLabel(member.role)}</span>
                           )}
                        </li>
                     );
                  })}
               </ul>
            )}
         </div>

         {log.length > 0 && (
            <div>
               <h2 className="font-medium text-gray-900 mb-2">{t("recentChanges")}</h2>
               <ul className="space-y-1 text-sm text-gray-600">
                  {log.map((entry) => (
                     <li key={entry.id}>
                        {entry.created_at && <span className="text-gray-400 mr-2">{formatDate(entry.created_at.toDate(), { dateStyle: "short", timeStyle: "short" })}</span>}
                        {entry.action === "setup_claimed"
                           ? t("setupClaimed", { by: entry.by_email ?? "" })
                           : entry.action === "setup_token_created"
                             ? t("setupTokenCreated")
                             : t("changeEntry", { by: entry.by_email ?? entry.by ?? "", target: entry.target_email ?? "", from: roleLabel(entry.from), to: roleLabel(entry.to) })}
                     </li>
                  ))}
               </ul>
            </div>
         )}
      </div>
   );
}
