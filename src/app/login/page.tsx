"use client";

import GoogleButton from "@/components/common/Google/google-button";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { validateEmail, validatePassword, validatePhone, validateName } from "@/components/common/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";
enum MODE {
   LOGIN = "LOGIN",
   REGISTER = "REGISTER",
   RESET_PASSWORD = "RESET_PASSWORD",
   EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
}

const LoginPage = () => {
   const router = useRouter();
   const t = useTranslations("Login");
   const { user, handleLogin, handleSignup, handleResetPassword, handleGoogleSignIn } = useAuthContext();

   useEffect(() => {
      if (user) {
         router.push("/");
      }
   }, [user, router]);

   const [mode, setMode] = useState(MODE.LOGIN);

   const [firstName, setFirstName] = useState("");
   const [lastName, setLastName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [phoneNumber, setPhoneNumber] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState("");
   const [fieldErrors, setFieldErrors] = useState({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
   });

   const formTitle = mode === MODE.LOGIN ? t("login") : mode === MODE.REGISTER ? t("register") : mode === MODE.RESET_PASSWORD ? t("resetPassword") : t("emailVerification");

   const buttonTitle = mode === MODE.LOGIN ? t("loginButton") : mode === MODE.REGISTER ? t("registerButton") : mode === MODE.RESET_PASSWORD ? t("resetPasswordButton") : t("verifyButton");

   const validateForm = () => {
      let isValid = true;
      const errors = {
         firstName: "",
         lastName: "",
         email: "",
         password: "",
         confirmPassword: "",
         phoneNumber: "",
      };

      // Reset error message
      setError("");

      // MODE.LOGIN validation
      if (mode === MODE.LOGIN) {
         if (!email) {
            errors.email = t("emailRequired");
            isValid = false;
         } else if (!validateEmail(email)) {
            errors.email = t("emailInvalid");
            isValid = false;
         } else if (!password) {
            errors.password = t("passwordRequired");
            isValid = false;
         }
      }

      // MODE.REGISTER validation
      if (mode === MODE.REGISTER) {
         if (!firstName || !validateName(firstName)) {
            errors.firstName = t("firstNameTwoCharacters");
            isValid = false;
         }

         if (!lastName || !validateName(lastName)) {
            errors.lastName = t("lastNameTwoCharacters");
            isValid = false;
         }

         if (!email) {
            errors.email = t("emailRequired");
            isValid = false;
         } else if (!validateEmail(email)) {
            errors.email = t("emailInvalid");
            isValid = false;
         }

         if (!password) {
            errors.password = t("passwordRequired");
            isValid = false;
         } else if (!validatePassword(password)) {
            errors.password = t("passwordInvalid");
            isValid = false;
         }

         if (password !== confirmPassword) {
            errors.confirmPassword = t("passwordsDontMatch");
            isValid = false;
         }

         if (!phoneNumber) {
            errors.phoneNumber = t("phoneRequired");
            isValid = false;
         } else if (!validatePhone(phoneNumber)) {
            errors.phoneNumber = t("phoneInvalid");
            isValid = false;
         }
      }

      // MODE.RESET_PASSWORD validation
      if (mode === MODE.RESET_PASSWORD) {
         if (!email) {
            errors.email = t("emailRequired");
            isValid = false;
         } else if (!validateEmail(email)) {
            errors.email = t("emailInvalid");
            isValid = false;
         }
      }

      setFieldErrors(errors);
      return isValid;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
         return;
      }

      setIsLoading(true);
      setError("");
      try {
         switch (mode) {
            case MODE.LOGIN:
               await handleLogin(email, password);
               break;
            case MODE.REGISTER:
               await handleSignup(email, password, firstName, lastName, phoneNumber);
               break;
            case MODE.RESET_PASSWORD:
               await handleResetPassword(email);
               break;
            default:
               break;
         }
      } catch (err) {
         console.log(err);
         setError(t("somethingWentWrong"));
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="min-h-[calc(100vh-64px)] px-8  lg:px-16 xl:px-32 2xl:px-64 flex items-center justify-center">
         <div className="flex flex-col gap-4 relative md:-top-16 py-12">
            <form
               className="flex flex-col gap-4 "
               onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
               }}
               onKeyDown={(e) => {
                  if (e.key === "Enter") {
                     handleSubmit(e);
                  }
               }}
            >
               <h1 className="text-2xl font-semibold mb-2">{formTitle}</h1>
               {mode === MODE.REGISTER ? (
                  <>
                     <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex flex-col gap-2 ">
                           <label className="text-sm text-gray-700">{t("name")} *</label>
                           <input type="text" name="username" placeholder={t("placeholderLastName")} className={`ring-2 ${fieldErrors.lastName ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setLastName(e.target.value)} />
                           {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
                        </div>
                        <div className="flex flex-col gap-2 ">
                           <label className="text-sm text-gray-700">{t("firstName")} *</label>
                           <input type="text" name="username" placeholder={t("placeholderFirstName")} className={`ring-2 ${fieldErrors.firstName ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setFirstName(e.target.value)} />
                           {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
                        </div>
                     </div>

                     <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-700">{t("email")} *</label>
                           <input type="email" name="email" placeholder={t("placeholderEmail")} className={`ring-2 ${fieldErrors.email ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setEmail(e.target.value)} />
                           {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                        </div>
                        <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-700">{t("phoneNumber")} *</label>
                           <input type="tel" name="phone" placeholder={t("placeholderPhoneNumber")} className={`ring-2 ${fieldErrors.phoneNumber ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setPhoneNumber(e.target.value)} />
                           {fieldErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>}
                        </div>
                     </div>
                  </>
               ) : null}

               {mode !== MODE.REGISTER && (
                  <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-700">{t("email")} *</label>
                     <input type="email" name="email" placeholder={t("placeholderEmail")} className={`ring-2 ${fieldErrors.email ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setEmail(e.target.value)} />
                     {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                  </div>
               )}

               {mode === MODE.LOGIN || mode === MODE.REGISTER ? (
                  <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-700">{t("password")} *</label>
                     <input type="password" name="password" placeholder={t("placeholderPassword")} className={`ring-2 ${fieldErrors.password ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setPassword(e.target.value)} />
                     {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>
               ) : null}

               {mode === MODE.REGISTER ? (
                  <>
                     <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-700">{t("confirmPassword")} *</label>
                        <input type="password" name="confirmPassword" placeholder={t("placeholderConfirmPassword")} className={`ring-2 ${fieldErrors.confirmPassword ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setConfirmPassword(e.target.value)} />
                        {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                     </div>
                     <div className="flex flex-col gap-2 max-w-sm">
                        <p className="text-sm text-gray-700">
                           {t("approuved")}
                           <Link href="/info/terms-and-conditions" className="text-pink-700">
                              {t("termsAndConditions")}
                           </Link>{" "}
                           {t("and")}
                           <Link href="/info/privacy-policy" className="text-pink-700">
                              {t("privacyPolicy")}
                           </Link>
                        </p>
                     </div>
                  </>
               ) : null}
               {mode === MODE.LOGIN && (
                  <div className="text-sm underline cursor-pointer" onClick={() => setMode(MODE.RESET_PASSWORD)}>
                     {t("forgotPassword")}
                  </div>
               )}
               <button type="button" className={twMerge("bg-black text-white p-2 rounded-md disabled:bg-pink-200 disabled:cursor-not-allowed", mode === MODE.REGISTER && " md:w-2/4 md:self-center")} disabled={isLoading} onClick={handleSubmit}>
                  {isLoading ? t("loading") : buttonTitle}
               </button>

               {/* {message && <div className="text-green-600 text-sm">{message}</div>} */}
            </form>
            {mode !== MODE.RESET_PASSWORD && <GoogleButton text={t("continueWithGoogle")} onclick={handleGoogleSignIn} className={mode === MODE.REGISTER ? " md:w-2/4 md:self-center" : ""} />}
            {error && <div className="text-red-600">{error}</div>}
            {mode === MODE.LOGIN && (
               <div className="text-sm underline cursor-pointer" onClick={() => setMode(MODE.REGISTER)}>
                  {t("noAccount")}
               </div>
            )}
            {mode === MODE.REGISTER && (
               <div className="text-sm underline cursor-pointer" onClick={() => setMode(MODE.LOGIN)}>
                  {t("haveAccount")}
               </div>
            )}
            {mode === MODE.RESET_PASSWORD && (
               <div className="text-sm underline cursor-pointer" onClick={() => setMode(MODE.LOGIN)}>
                  {t("backToLogin")}
               </div>
            )}
         </div>
      </div>
   );
};

export default LoginPage;
