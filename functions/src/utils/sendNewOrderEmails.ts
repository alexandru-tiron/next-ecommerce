import { logger } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
const nodemailer = require("nodemailer");
import { defineString } from "firebase-functions/params";
import { emailPassword, inEmulator } from "./params";
// Define parameters 
const emailUser = defineString("EMAIL_USER");

// Function to send email confirmation to customer
export async function sendCustomerEmail(userEmail: string, orderId: string, orderData: any, updateOrder: boolean) {
    if (inEmulator) return logger.info(`[Email] Confirmation email for order ${orderId} skipped in the emulator`);
    try {
       logger.info(`[Order] Sending confirmation email for order ${orderId}`);
 
       // Get company settings
       // Store details (name, support e-mail, phone) are kept in Settings/Info
       const settingsSnapshot = await getFirestore().collection("Settings").doc("Info").get();
       const settingsData = settingsSnapshot.data();
 
       // Get email credentials at runtime
       const emailUserValue = emailUser.value();
       const emailPasswordValue = emailPassword.value();
 
       // Create transporter
       const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
             user: emailUserValue,
             pass: emailPasswordValue,
          },
       });
 
       // Format product list for email
       const productList = orderData.products
          .map((product: any) => {
             const price = product.discount && product.discount_price ? product.discount_price : product.product_price;
 
             return `
         <tr>
           <td style="padding: 10px; border-bottom: 1px solid #eee;">${product.product_name} ${product.variant_name ? `(${product.variant_name})` : ""} ${product.sku_variant_name ? `- ${product.sku_variant_name}` : ""}</td>
           <td style="padding: 10px; border-bottom: 1px solid #eee;">${product.quantity}</td>
           <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${price} Lei</td>
           <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(price * product.quantity)} Lei</td>
         </tr>
       `;
          })
          .join("");
 
       const mailOptions = {
          from: `"${settingsData?.store_name}" <${emailUserValue.split("@")[0] + "+orders@" + emailUserValue.split("@")[1]}>`,
          to: userEmail,
          subject: `Confirmare comandă #${orderId}`,
          html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <div style="background-color: #f8f4fc; padding: 20px; text-align: center;">
             <h1 style="color: #d63384;">Îți mulțumim pentru comandă!</h1>
             <p>Comanda ta cu numărul <strong>#${orderId}</strong> a fost înregistrată cu succes.</p>
           </div>
           
           <div style="padding: 20px;">
             <h2 style="color: #333;">Detalii comandă</h2>
             <p><strong>Data:</strong> ${new Date().toLocaleString("ro-RO")}</p>
             <p><strong>Status:</strong> În procesare</p>
             <p><strong>Metodă de plată:</strong> Ramburs (la livrare)</p>
             
             <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
               <thead>
                 <tr style="background-color: #f3f4f6;">
                   <th style="padding: 10px; text-align: left;">Produs</th>
                   <th style="padding: 10px; text-align: left;">Cantitate</th>
                   <th style="padding: 10px; text-align: right;">Preț</th>
                   <th style="padding: 10px; text-align: right;">Total</th>
                 </tr>
               </thead>
               <tbody>
                 ${productList}
               </tbody>
               <tfoot>
                 <tr>
                   <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                   <td style="padding: 10px; text-align: right;">${(orderData.total - orderData.shipping_price).toFixed(2)} Lei</td>
                 </tr>
                 <tr>
                   <td colspan="3" style="padding: 10px; text-align: right;"><strong>Cost livrare:</strong></td>
                   <td style="padding: 10px; text-align: right;">${orderData.shipping_price} Lei</td>
                 </tr>
                 <tr style="background-color: #f3f4f6;">
                   <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                   <td style="padding: 10px; text-align: right; font-weight: bold;">${orderData.total} Lei</td>
                 </tr>
               </tfoot>
             </table>
             
             <div style="margin-top: 30px;">
               <h3 style="color: #333;">Pașii următori</h3>
               <ol style="color: #555; line-height: 1.6;">
                 <li>Comanda ta va fi procesată în cel mai scurt timp.</li>
                 <li>Vei primi prin email confirmarea comenzii.</li>
                 <li>Comanda va fi expediată în 1-3 zile lucrătoare.</li>
                 ${updateOrder ? `<li>Vei primi prin email un link pentru urmărirea coletului.</li>` : ""}
               </ol>
             </div>
             
             <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #777; font-size: 14px;">
               <p>Pentru orice întrebări legate de comanda ta, te rugăm să ne contactezi la <a href="mailto:${settingsData?.support_mail}" style="color: #d63384;">${settingsData?.support_mail}</a> sau la numărul de telefon <strong>${settingsData?.phone_no}</strong>.</p>
             </div>
           </div>
           
           <div style="background-color: #f8f4fc; padding: 20px; text-align: center; color: #777; font-size: 12px;">
             <p>© ${new Date().getFullYear()} ${settingsData?.store_name}. Toate drepturile rezervate.</p>
           </div>
         </div>
       `,
       };
 
       await transporter.sendMail(mailOptions);
       logger.info(`[Email] Confirmation email sent for order ${orderId}`);
    } catch (error) {
       logger.error(`[Email] Error sending customer email:`, error);
    }
 }
 
 // Function to send notification to admin
 export async function sendAdminEmail(orderId: string, orderData: any, userData: any) {
    if (inEmulator) return logger.info(`[Email] Admin notification for order ${orderId} skipped in the emulator`);
    try {
       logger.info(`[Order] Sending admin notification for order ${orderId}`);
 
       // Get email credentials at runtime
       const emailUserValue = emailUser.value();
       const emailPasswordValue = emailPassword.value();
 
       // Create transporter for admin notification
       const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
             user: emailUserValue,
             pass: emailPasswordValue,
          },
       });
 
       // Email content for admin
       const mailOptions = {
          from: `"Sistem Comenzi" <${emailUserValue.split("@")[0] + "+orders@" + emailUserValue.split("@")[1]}>`,
          to: emailUserValue,
          subject: `Comandă nouă #${orderId}`,
          html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <div style="background-color: #f0f0f0; padding: 20px; text-align: center;">
             <h1 style="color: #333;">Comandă nouă primită</h1>
             <p>A fost înregistrată o nouă comandă cu numărul <strong>#${orderId}</strong>.</p>
           </div>
           
           <div style="padding: 20px;">
             <h2 style="color: #333;">Detalii client</h2>
             <p><strong>Nume:</strong> ${userData.first_name} ${userData.last_name}</p>
             <p><strong>Email:</strong> ${userData.email}</p>
             <p><strong>Telefon:</strong> ${userData.phone_no || "Nedisponibil"}</p>
             <p><strong>Comandă business:</strong> ${orderData.is_business ? "Da" : "Nu"}</p>
             
             <h2 style="color: #333; margin-top: 20px;">Sumar comandă</h2>
             <p><strong>Număr produse:</strong> ${orderData.products?.length}</p>
             <p><strong>Subtotal:</strong> ${(orderData.total - orderData.shipping_price).toFixed(2)} Lei</p>
             <p><strong>Cost livrare:</strong> ${orderData.shipping_price} Lei</p>  
             <p><strong>Total:</strong> ${orderData.total} Lei</p>
             
             <div style="margin-top: 20px; text-align: center;">
               <a href="https://your-admin-panel.com/admin/orders/${orderId}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                 Vezi comanda în admin panel
               </a>
             </div>
           </div>
           
           <div style="background-color: #f0f0f0; padding: 10px; text-align: center; color: #777; font-size: 12px;">
             <p>Acest email a fost generat automat. Te rugăm să nu răspunzi la acest email.</p>
           </div>
         </div>
       `,
       };
 
       await transporter.sendMail(mailOptions);
       logger.info(`[Email] Admin notification email sent for order ${orderId}`);
    } catch (error) {
       logger.error(`[Email] Error sending admin email:`, error);
    }
 }
 