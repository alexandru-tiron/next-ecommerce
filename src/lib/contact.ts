import app from "@/lib/firebaseInit";
import { getFunctions, httpsCallable } from "firebase/functions";

export type ContactMessage = {
   type: "contact" | "consent";
   first_name: string;
   last_name: string;
   email: string;
   phone?: string;
   message: string;
   // Hidden form field that only bots fill in
   website?: string;
};

// Sends a contact form or data-protection request to the store (the sendContactMessage Cloud Function)
export async function sendContactMessage(message: ContactMessage) {
   await httpsCallable<ContactMessage, { success: boolean }>(getFunctions(app, "europe-west3"), "sendContactMessage")(message);
}
