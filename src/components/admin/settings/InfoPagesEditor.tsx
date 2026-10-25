"use client";

import { useEffect, useRef, useState } from "react";
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { EditorContent, useEditor, useEditorState, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, FileText, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Minus, Quote, Redo, RefreshCw, RotateCcw, Save, Underline, Undo } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@core/format";
import { INFO_PAGES, InfoPage, infoPageFrom, InfoPageId, LOCALE_NAMES, Locale, ShippingSettings, StoreInfo } from "@core/settings";
import { db } from "@/lib/firebaseInit";
import { infoPageTemplate } from "@/lib/infoPageTemplates";
import { refreshStore } from "@/lib/refreshStore";

// Unsaved text, per page and language, kept by the settings page so it survives switching tabs
export type PageDrafts = Record<string, string>;
const draftKey = (page: InfoPageId, locale: Locale) => `${page}:${locale}`;

const SAFE_LINK = /^(https:\/\/|\/|mailto:|tel:)/;

type Props = {
   info: StoreInfo;
   shipping: ShippingSettings;
   vatRate: number;
   currency: string;
   locales: Locale[];
   defaultLocale: Locale;
   drafts: PageDrafts;
   onDraftsChange: (update: (drafts: PageDrafts) => PageDrafts) => void;
};

// Pages tab of Admin → Settings: the information pages (Settings/Legal/Pages/{page}), one rich text per language.
// Saved on its own, separately from the other settings.
export default function InfoPagesEditor({ info, shipping, vatRate, currency, locales, defaultLocale, drafts, onDraftsChange }: Props) {
   const t = useTranslations("StoreSettings");
   const tPages = useTranslations("InfoPages");
   const [page, setPage] = useState<InfoPageId>(INFO_PAGES[0]);
   const [locale, setLocale] = useState<Locale>(defaultLocale);
   const [saved, setSaved] = useState<Partial<Record<InfoPageId, InfoPage>> | null>(null);
   const [busy, setBusy] = useState(false);
   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

   const key = draftKey(page, locale);
   const keyRef = useRef(key);
   keyRef.current = key;
   const savedHtml = saved?.[page]?.content[locale];
   const template = () => infoPageTemplate(page, locale, { info, shipping, vatRate, money: (amount) => formatMoney(amount, currency, locale) });

   const editor = useEditor({
      extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto", "tel"] } })],
      immediatelyRender: false,
      editorProps: { attributes: { class: "store-prose min-h-[420px] max-w-none p-4 focus:outline-none", "aria-label": t("editorLabel") } },
      onUpdate: ({ editor }) => onDraftsChange((current) => ({ ...current, [keyRef.current]: editor.getHTML() })),
   });

   useEffect(() => {
      Promise.all(INFO_PAGES.map(async (id) => [id, infoPageFrom((await getDoc(doc(db, "Settings", "Legal", "Pages", id))).data())] as const))
         .then((pages) => setSaved(Object.fromEntries(pages)))
         .catch((error) => {
            console.error("Error loading pages:", error);
            setSaved({});
            setMessage({ type: "error", text: t("pagesLoadFailed") });
         });
   }, [t]);

   // Show the draft, the saved text or the template whenever the page or language changes
   useEffect(() => {
      if (!editor || !saved) return;
      editor.commands.setContent(drafts[key] ?? savedHtml ?? template(), { emitUpdate: false });
      // Only on a change of page or language, or once the saved pages arrive; not while typing
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [editor, saved, key]);

   const flash = (type: "success" | "error", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
   };
   const clearDraft = () =>
      onDraftsChange((current) => {
         const next = { ...current };
         delete next[key];
         return next;
      });

   const save = async () => {
      if (!editor) return;
      const html = editor.getHTML();
      try {
         setBusy(true);
         await setDoc(doc(db, "Settings", "Legal", "Pages", page), { content: { [locale]: html } }, { merge: true });
         setSaved((current) => ({ ...current, [page]: { content: { ...current?.[page]?.content, [locale]: html } } }));
         clearDraft();
         await refreshStore("settings");
         flash("success", t("pageSaved"));
      } catch (error) {
         console.error("Error saving page:", error);
         flash("error", t("pageSaveFailed"));
      } finally {
         setBusy(false);
      }
   };

   // Delete this language's text, so the page shows the template again
   const resetToTemplate = async () => {
      if (!editor || !confirm(t("resetPageConfirm"))) return;
      try {
         setBusy(true);
         if (savedHtml !== undefined) await updateDoc(doc(db, "Settings", "Legal", "Pages", page), { [`content.${locale}`]: deleteField() });
         setSaved((current) => {
            const content = { ...current?.[page]?.content };
            delete content[locale];
            return { ...current, [page]: { content } };
         });
         clearDraft();
         editor.commands.setContent(template(), { emitUpdate: false });
         await refreshStore("settings");
         flash("success", t("pageReset"));
      } catch (error) {
         console.error("Error resetting page:", error);
         flash("error", t("pageSaveFailed"));
      } finally {
         setBusy(false);
      }
   };

   const loadTemplate = () => {
      if (editor && confirm(t("loadTemplateConfirm"))) editor.commands.setContent(template(), { emitUpdate: true });
   };

   const isDirty = key in drafts;
   const status = isDirty ? t("unsavedChanges") : savedHtml !== undefined ? t("customText") : t("usingTemplate");

   return (
      <div className="space-y-4">
         <p className="text-sm text-gray-500">{t("pagesHint")}</p>

         <div className="flex flex-wrap items-end gap-4">
            <div>
               <label htmlFor="infoPage" className="block text-sm font-medium text-gray-700">
                  {t("page")}
               </label>
               <select id="infoPage" value={page} onChange={(e) => setPage(e.target.value as InfoPageId)} className="mt-1 px-3 py-2 rounded-md border border-gray-300 shadow-sm sm:text-sm">
                  {INFO_PAGES.map((id) => (
                     <option key={id} value={id}>
                        {tPages(id)}
                        {Object.keys(drafts).some((draft) => draft.startsWith(`${id}:`)) ? " •" : ""}
                     </option>
                  ))}
               </select>
            </div>
            {locales.length > 1 && (
               <div>
                  <label htmlFor="infoPageLocale" className="block text-sm font-medium text-gray-700">
                     {t("language")}
                  </label>
                  <select id="infoPageLocale" value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="mt-1 px-3 py-2 rounded-md border border-gray-300 shadow-sm sm:text-sm">
                     {locales.map((item) => (
                        <option key={item} value={item}>
                           {LOCALE_NAMES[item]}
                           {draftKey(page, item) in drafts ? " •" : ""}
                        </option>
                     ))}
                  </select>
               </div>
            )}
            <span className={`pb-2 text-sm ${isDirty ? "text-amber-700" : "text-gray-500"}`}>{status}</span>
            <div className="ml-auto flex flex-wrap gap-2">
               <button type="button" onClick={loadTemplate} disabled={!editor || busy} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                  <FileText className="h-4 w-4 mr-1.5" />
                  {t("loadTemplate")}
               </button>
               {(savedHtml !== undefined || isDirty) && (
                  <button type="button" onClick={resetToTemplate} disabled={!editor || busy} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                     <RotateCcw className="h-4 w-4 mr-1.5" />
                     {t("resetPage")}
                  </button>
               )}
               <button type="button" onClick={save} disabled={!editor || busy || !saved} className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50">
                  {busy ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  {t("savePage")}
               </button>
            </div>
         </div>

         {message && <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.text}</div>}

         <div className="rounded-md border border-gray-300 overflow-hidden">
            {editor && <Toolbar editor={editor} />}
            {saved ? (
               <EditorContent editor={editor} />
            ) : (
               <div className="flex min-h-[420px] items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
               </div>
            )}
         </div>
      </div>
   );
}

function Toolbar({ editor }: { editor: Editor }) {
   const t = useTranslations("StoreSettings");
   const state = useEditorState({
      editor,
      selector: ({ editor }) => ({
         bold: editor.isActive("bold"),
         italic: editor.isActive("italic"),
         underline: editor.isActive("underline"),
         h2: editor.isActive("heading", { level: 2 }),
         h3: editor.isActive("heading", { level: 3 }),
         bulletList: editor.isActive("bulletList"),
         orderedList: editor.isActive("orderedList"),
         blockquote: editor.isActive("blockquote"),
         link: editor.isActive("link"),
         canUndo: editor.can().undo(),
         canRedo: editor.can().redo(),
      }),
   });

   const setLink = () => {
      const current = editor.getAttributes("link").href as string | undefined;
      const href = prompt(t("linkPrompt"), current ?? "https://");
      if (href === null) return;
      if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else if (SAFE_LINK.test(href.trim())) editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
      else alert(t("linkInvalid"));
   };

   const button = (label: string, icon: React.ReactNode, onClick: () => void, active = false, disabled = false) => (
      <button type="button" title={label} aria-label={label} aria-pressed={active} onClick={onClick} disabled={disabled} className={`p-2 rounded hover:bg-gray-200 disabled:opacity-30 ${active ? "bg-gray-200 text-black" : "text-gray-600"}`}>
         {icon}
      </button>
   );
   const icon = "h-4 w-4";

   return (
      <div className="flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 p-1">
         {button(t("toolbar.bold"), <Bold className={icon} />, () => editor.chain().focus().toggleBold().run(), state.bold)}
         {button(t("toolbar.italic"), <Italic className={icon} />, () => editor.chain().focus().toggleItalic().run(), state.italic)}
         {button(t("toolbar.underline"), <Underline className={icon} />, () => editor.chain().focus().toggleUnderline().run(), state.underline)}
         <span className="mx-1 w-px bg-gray-200" />
         {button(t("toolbar.heading"), <Heading2 className={icon} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), state.h2)}
         {button(t("toolbar.subheading"), <Heading3 className={icon} />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), state.h3)}
         {button(t("toolbar.bulletList"), <List className={icon} />, () => editor.chain().focus().toggleBulletList().run(), state.bulletList)}
         {button(t("toolbar.orderedList"), <ListOrdered className={icon} />, () => editor.chain().focus().toggleOrderedList().run(), state.orderedList)}
         {button(t("toolbar.quote"), <Quote className={icon} />, () => editor.chain().focus().toggleBlockquote().run(), state.blockquote)}
         {button(t("toolbar.link"), <LinkIcon className={icon} />, setLink, state.link)}
         {button(t("toolbar.divider"), <Minus className={icon} />, () => editor.chain().focus().setHorizontalRule().run())}
         <span className="mx-1 w-px bg-gray-200" />
         {button(t("toolbar.undo"), <Undo className={icon} />, () => editor.chain().focus().undo().run(), false, !state.canUndo)}
         {button(t("toolbar.redo"), <Redo className={icon} />, () => editor.chain().focus().redo().run(), false, !state.canRedo)}
      </div>
   );
}
