"use client";

import React, { useState, useEffect } from "react";
import { Edit, AlertTriangle, Loader2, Mail, Trash2, Lock } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { useAuthContext } from "@/context/AuthContext";
import { usePopupContext } from "@/context/PopupContext";
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, User as FirebaseUser } from "firebase/auth";
import { validateEmail, validatePhone, validateName, passwordRegex } from "@/components/common/validators";
import { useTranslations } from "next-intl";

const PersonalInfoSection = () => {
   const { user, handleResendVerificationEmail, handleDeleteAccount, handleChangePassword } = useAuthContext();
   const { setPopup } = usePopupContext();
   const [isEditing, setIsEditing] = useState(false);
   const [isSendingVerification, setIsSendingVerification] = useState(false);
   const [isChangingEmail, setIsChangingEmail] = useState(false);
   const [isChangingPassword, setIsChangingPassword] = useState(false);
   const [isDeletingAccount, setIsDeletingAccount] = useState(false);
   const [emailChangeError, setEmailChangeError] = useState("");
   const [passwordChangeError, setPasswordChangeError] = useState("");
   const [deleteAccountError, setDeleteAccountError] = useState("");
   const [deletePassword, setDeletePassword] = useState("");
   const [confirmDeleteText, setConfirmDeleteText] = useState("");

   const t = useTranslations();
   const [passwordData, setPasswordData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
   });

   const [emailChangeData, setEmailChangeData] = useState({
      currentEmail: "",
      newEmail: "",
      password: "",
   });

   const [formData, setFormData] = useState({
      first_name: user?.db?.first_name || "",
      last_name: user?.db?.last_name || "",
      phone_no: user?.db?.phone_no || "",
      email: user?.db?.email || "",
   });

   // Add local display state that will update immediately
   const [displayData, setDisplayData] = useState({
      first_name: user?.db?.first_name || "",
      last_name: user?.db?.last_name || "",
      phone_no: user?.db?.phone_no || "",
      email: user?.db?.email || "",
   });

   // Form validation
   const [errors, setErrors] = useState({
      first_name: "",
      last_name: "",
      phone_no: "",
      email: "",
   });

   const [isSubmitting, setIsSubmitting] = useState(false);

   // Check if user signed in with Google
   const isGoogleAccount = user?.providerData?.[0]?.providerId === "google.com";

   useEffect(() => {
      if (user?.db) {
         const userData = {
            first_name: user.db.first_name || "",
            last_name: user.db.last_name || "",
            phone_no: user.db.phone_no || "",
            email: user.db.email || "",
         };
         setFormData(userData);
         setDisplayData(userData);

         // Pre-fill current email for email change modal
         if (user.db?.email) {
            setEmailChangeData((prev) => ({
               ...prev,
               currentEmail: user.db?.email || "",
            }));
         }
      }
   }, [user]);

   const validateForm = () => {
      const newErrors = {
         first_name: "",
         last_name: "",
         phone_no: "",
         email: "",
      };

      let isValid = true;

      // Validate first name
      if (!formData.first_name.trim()) {
         newErrors.first_name = t("Login.personalNameRequired");
         isValid = false;
      } else if (!validateName(formData.first_name)) {
         newErrors.first_name = t("Login.firstNameTwoCharacters");
         isValid = false;
      }

      // Validate last name
      if (!formData.last_name.trim()) {
         newErrors.last_name = t("Login.lastNameRequired");
         isValid = false;
      } else if (!validateName(formData.last_name)) {
         newErrors.last_name = t("Login.lastNameTwoCharacters");
         isValid = false;
      }

      // We no longer validate email in the main form as it's handled separately

      // Validate phone number (required field)
      if (!formData.phone_no) {
         newErrors.phone_no = t("Login.phoneRequired");
         isValid = false;
      } else if (!validatePhone(formData.phone_no)) {
         newErrors.phone_no = t("Login.phoneInvalid");
         isValid = false;
      }

      setErrors(newErrors);
      return isValid;
   };

   const updateUserInfo = async () => {
      if (!validateForm() || !user) {
         return;
      }

      setIsSubmitting(true);
      try {
         // Create a copy of the updated data
         const updatedData = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_no: formData.phone_no,
         };

         // Update Firestore
         await updateDoc(doc(db, "Users", user.uid), updatedData);

         // Update local display data immediately for UI
         setDisplayData((prev) => ({
            ...prev,
            first_name: updatedData.first_name,
            last_name: updatedData.last_name,
            phone_no: updatedData.phone_no,
         }));

         // Force a re-render with updated data
         setFormData((prev) => ({
            ...prev,
            first_name: updatedData.first_name,
            last_name: updatedData.last_name,
            phone_no: updatedData.phone_no,
         }));

         setIsEditing(false);
      } catch (err) {
         console.error(err);
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });

      // Clear error when user starts typing
      if (errors[name as keyof typeof errors]) {
         setErrors({ ...errors, [name]: "" });
      }
   };

   const handleResendVerification = async () => {
      try {
         setIsSendingVerification(true);
         await handleResendVerificationEmail();
      } catch (error) {
         console.error("Error sending verification email:", error);
      } finally {
         setIsSendingVerification(false);
      }
   };

   const openEmailChangePopup = () => {
      // Reset states if needed, but don't overwrite existing data
      if (!isChangingEmail) {
         setEmailChangeError("");
         if (!emailChangeData.currentEmail) {
            setEmailChangeData({
               currentEmail: user?.db?.email || "",
               newEmail: "",
               password: "",
            });
         }
      }

      // Create a standalone email change component to manage its own state
      const EmailChangeForm = () => {
         const [localEmailData, setLocalEmailData] = useState({
            currentEmail: emailChangeData.currentEmail,
            newEmail: emailChangeData.newEmail,
            password: emailChangeData.password,
         });

         // Update parent state when local state changes
         useEffect(() => {
            setEmailChangeData(localEmailData);
         }, [localEmailData]);

         const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setLocalEmailData((prev) => ({ ...prev, [name]: value }));

            // Clear error when typing
            if (emailChangeError) setEmailChangeError("");
         };

         if (isGoogleAccount) {
            return (
               <div className="text-center py-4">
                  <p className="text-gray-700 mb-2">{t("Profile.googleAccount")}</p>
                  <p className="text-gray-500 text-sm">{t("Profile.googleAccountDescription")}</p>
               </div>
            );
         }

         return (
            <div className="space-y-4">
               {emailChangeError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">{emailChangeError}</div>}

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.emailSecurityCurrentEmail")}</label>
                  <input type="email" name="currentEmail" value={localEmailData.currentEmail} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" readOnly disabled />
               </div>

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.emailSecurityNewEmail")}</label>
                  <input type="email" name="newEmail" value={localEmailData.newEmail} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.emailSecurityPassword")}</label>
                  <input type="password" name="password" value={localEmailData.password} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>

               <p className="text-xs text-gray-500 mt-2">{t("Profile.emailSecurityDescription")}</p>
            </div>
         );
      };

      if (isGoogleAccount) {
         setPopup({
            title: t("Profile.changeEmail"),
            description: [<EmailChangeForm key="email-change-form" />],
            buttons: [
               {
                  label: t("Profile.understand"),
                  onClick: () => setPopup(null),
                  className: "primary",
               },
            ],
         });
      } else {
         setPopup({
            title: t("Profile.changeEmail"),
            description: [<EmailChangeForm key="email-change-form" />],
            buttons: [
               {
                  label: t("Profile.cancel"),
                  onClick: () => {
                     setPopup(null);
                     setEmailChangeData({
                        currentEmail: user?.db?.email || "",
                        newEmail: "",
                        password: "",
                     });
                  },
                  className: "secondary",
               },
               {
                  label: isChangingEmail ? t("Profile.processing") : t("Profile.changeEmailButton"),
                  onClick: handleChangeEmail,
                  className: "primary",
               },
            ],
         });
      }
   };

   const openPasswordChangePopup = () => {
      // Reset states if needed
      if (!isChangingPassword) {
         setPasswordChangeError("");
         setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
         });
      }

      // Create a standalone password change component to manage its own state
      const PasswordChangeForm = () => {
         const [localPasswordData, setLocalPasswordData] = useState({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            confirmPassword: passwordData.confirmPassword,
         });

         // Update parent state when local state changes
         useEffect(() => {
            setPasswordData(localPasswordData);
         }, [localPasswordData]);

         const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setLocalPasswordData((prev) => ({ ...prev, [name]: value }));

            // Clear error when typing
            if (passwordChangeError) setPasswordChangeError("");
         };

         if (isGoogleAccount) {
            return (
               <div className="text-center py-4">
                  <p className="text-gray-700 mb-2">{t("Profile.googleAccount")}</p>
                  <p className="text-gray-500 text-sm">{t("Profile.googleAccountChangePassword")}</p>
               </div>
            );
         }

         return (
            <div className="space-y-4">
               {passwordChangeError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">{passwordChangeError}</div>}

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.currentPassword")}</label>
                  <input type="password" name="currentPassword" value={localPasswordData.currentPassword} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.newPassword")}</label>
                  <input type="password" name="newPassword" value={localPasswordData.newPassword} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.confirmNewPassword")}</label>
                  <input type="password" name="confirmPassword" value={localPasswordData.confirmPassword} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>

               <p className="text-xs text-gray-500 mt-2">{t("Profile.passwordRequirements")}</p>
            </div>
         );
      };

      if (isGoogleAccount) {
         setPopup({
            title: t("Profile.changePassword"),
            description: [<PasswordChangeForm key="password-change-form" />],
            buttons: [
               {
                  label: t("Profile.understand"),
                  onClick: () => setPopup(null),
                  className: "primary",
               },
            ],
         });
      } else {
         setPopup({
            title: t("Profile.changePassword"),
            description: [<PasswordChangeForm key="password-change-form" />],
            buttons: [
               {
                  label: t("Profile.cancel"),
                  onClick: () => {
                     setPopup(null);
                     setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                     });
                  },
                  className: "secondary",
               },
               {
                  label: isChangingPassword ? t("Profile.processing") : t("Profile.changePasswordButton"),
                  onClick: handlePasswordChange,
                  className: "primary",
               },
            ],
         });
      }
   };

   const openDeleteAccountPopup = () => {
      // Only reset if not in the middle of an operation
      if (!isDeletingAccount) {
         setDeleteAccountError("");
         setDeletePassword("");
         setConfirmDeleteText("");
      }

      // Create a standalone delete confirmation component to manage its own state
      const DeleteConfirmation = () => {
         const [localPassword, setLocalPassword] = useState(deletePassword);
         const [localConfirmText, setLocalConfirmText] = useState(confirmDeleteText);

         // Update parent state when local state changes
         useEffect(() => {
            setDeletePassword(localPassword);
         }, [localPassword]);

         useEffect(() => {
            setConfirmDeleteText(localConfirmText);
         }, [localConfirmText]);

         return (
            <div className="space-y-4">
               {deleteAccountError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">{deleteAccountError}</div>}

               <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium mb-1">{t("Profile.attention")}</p>
                  <p>{t("Profile.deleteAccountDescription")}</p>
               </div>

               {!isGoogleAccount && (
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("Profile.emailSecurityPassword")}</label>
                     <input type="password" value={localPassword} onChange={(e) => setLocalPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
                  </div>
               )}

               <div>
                  <label className="block text-sm text-gray-700 mb-1">{t("Profile.confirmDeleteText")}<b>{t("Profile.confirmDeleteWords")}</b></label>
                  <input type="text" value={localConfirmText} onChange={(e) => setLocalConfirmText(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500" />
               </div>
            </div>
         );
      };

      setPopup({
         title: t("Profile.deleteAccountButton"),
         description: [
            <p key="warning" className="text-red-600 text-sm mb-4">
               {t("Profile.deleteAccountWarning")}
            </p>,
            <DeleteConfirmation key="delete-confirmation" />,
         ],
         buttons: [
            {
               label: t("Profile.cancel"),
               onClick: () => {
                  setPopup(null);
                  setDeletePassword("");
                  setConfirmDeleteText("");
               },
               className: "secondary",
            },
            {
               label: isDeletingAccount ? t("Profile.processing") : t("Profile.deleteAccountButton"),
               onClick: handleAccountDeletion,
               className: "primary",
            },
         ],
      });
   };

   const handleChangeEmail = async () => {
      // Reset previous states
      setEmailChangeError("");

      // Validate inputs
      if (!emailChangeData.currentEmail || !emailChangeData.newEmail || !emailChangeData.password) {
         setEmailChangeError(t("Profile.allInputsRequired"));
         openEmailChangePopup(); // Reopen with error
         return;
      }

      if (emailChangeData.currentEmail !== user?.db?.email) {
         setEmailChangeError(t("Profile.invalidCurrentEmail"));
         openEmailChangePopup(); // Reopen with error
         return;
      }

      if (!validateEmail(emailChangeData.newEmail)) {
         setEmailChangeError(t("Profile.invalidNewEmail"));
         openEmailChangePopup(); // Reopen with error
         return;
      }

      // Start changing email
      setIsChangingEmail(true);

      try {
         if (!user) {
            throw new Error("Utilizatorul nu este autentificat");
         }

         // Get the Firebase user object
         const firebaseUser = user as unknown as FirebaseUser;

         // Reauthenticate the user
         const credential = EmailAuthProvider.credential(emailChangeData.currentEmail, emailChangeData.password);

         await reauthenticateWithCredential(firebaseUser, credential);

         // Update email in Firebase Auth
         await updateEmail(firebaseUser, emailChangeData.newEmail);

         // Update email in Firestore
         await updateDoc(doc(db, "Users", user.uid), {
            email: emailChangeData.newEmail,
         });

         // Update local state
         setDisplayData((prev) => ({ ...prev, email: emailChangeData.newEmail }));

         // Show success message
         setPopup({
            title: t("Profile.success"),
            description: [
               <div key="success-message" className="text-center py-4">
                  <p className="text-green-600 font-medium">{t("Profile.emailChangedSuccess")}</p>
               </div>,
            ],
            buttons: [
               {
                  label: t("Profile.ok"),
                  onClick: () => {},
                  className: "primary",
               },
            ],
         });

         // Reset form
         setEmailChangeData({
            currentEmail: emailChangeData.newEmail,
            newEmail: "",
            password: "",
         });
      } catch (error: unknown) {
         console.error("Error changing email:", error);

         // Handle specific errors
         const err = error as { code?: string };
         if (err.code === "auth/wrong-password") {
            setEmailChangeError(t("Profile.incorrectPassword"));
         } else if (err.code === "auth/email-already-in-use") {
            setEmailChangeError(t("Profile.emailAlreadyExists"));
         } else if (err.code === "auth/requires-recent-login") {
            setEmailChangeError(t("Profile.requireRecentLogin"));
         } else {
            setEmailChangeError(t("Profile.errorChangingEmail"));
         }

         // Reopen with error
         openEmailChangePopup();
      } finally {
         setIsChangingEmail(false);
      }
   };

   const handlePasswordChange = async () => {
      // Reset previous states
      setPasswordChangeError("");

      // Validate inputs
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
         setPasswordChangeError(t("Profile.allInputsRequired"));
         openPasswordChangePopup(); // Reopen with error
         return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
         setPasswordChangeError(t("Profile.newPasswordsDontMatch"));
         openPasswordChangePopup(); // Reopen with error
         return;
      }

      // Use the same strong password requirements as in registration
      if (!passwordRegex.test(passwordData.newPassword)) {
         setPasswordChangeError(t("Login.passwordInvalid"));
         openPasswordChangePopup(); // Reopen with error
         return;
      }

      if (passwordData.currentPassword === passwordData.newPassword) {
         setPasswordChangeError(t("Profile.newPasswordSameAsCurrent"));
         openPasswordChangePopup(); // Reopen with error
         return;
      }

      // Start changing password
      setIsChangingPassword(true);

      try {
         await handleChangePassword(passwordData.currentPassword, passwordData.newPassword);

         // Show success message
         setPopup({
            title: t("Profile.success"),
            description: [
               <div key="success-message" className="text-center py-4">
                  <p className="text-green-600 font-medium">{t("Profile.passwordChangedSuccess")}</p>
               </div>,
            ],
            buttons: [
               {
                  label: t("Profile.ok"),
                  onClick: () => {},
                  className: "primary",
               },
            ],
         });

         // Reset form
         setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
         });
      } catch (error) {
         console.error("Error changing password:", error);
         // Error handling is done by the AuthContext
      } finally {
         setIsChangingPassword(false);
      }
   };

   const handleAccountDeletion = async () => {
      // Reset previous states
      setDeleteAccountError("");

      // For Google accounts, we don't check password but require confirmation
      if (isGoogleAccount) {
         if (confirmDeleteText !== "STERGE CONT") {
            setDeleteAccountError(t("Profile.confirmDeleteText"));
            openDeleteAccountPopup(); // Reopen with error
            return;
         }
      } else {
         // For email/password accounts, check password and confirmation
         if (!deletePassword) {
            setDeleteAccountError(t("Profile.enterPassword"));
            openDeleteAccountPopup(); // Reopen with error
            return;
         }

         if (confirmDeleteText !== "STERGE CONT") {
            setDeleteAccountError(t("Profile.pleaseConfirmDeleteText"));
            openDeleteAccountPopup(); // Reopen with error
            return;
         }
      }

      // Start deleting account
      setIsDeletingAccount(true);

      try {
         // For email/password accounts, we use the handleDeleteAccount with password
         if (!isGoogleAccount) {
            await handleDeleteAccount(deletePassword);
         } else {
            // For Google accounts, we need a different approach
            // Since we can't reauthenticate with password, we'll rely on existing session
            await handleDeleteAccount("google-auth");
         }

         // Note: No need to handle redirection here as the AuthContext will handle it
      } catch (error: unknown) {
         console.error("Error deleting account:", error);

         // Handle specific errors
         const err = error as { code?: string };
         if (err.code === "auth/wrong-password") {
            setDeleteAccountError(t("Profile.incorrectPassword"));
         } else if (err.code === "auth/requires-recent-login") {
            setDeleteAccountError(t("Profile.requireRecentLogin"));
         } else {
            setDeleteAccountError(t("Profile.errorDeletingAccount"));
         }

         // Reopen with error
         openDeleteAccountPopup();
      } finally {
         setIsDeletingAccount(false);
      }
   };

   // If user is null, show a loading state
   if (!user) {
      return (
         <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="text-center py-8 text-gray-500">
               <p>{t("Profile.loadingPersonalInfo")}</p>
            </div>
         </div>
      );
   }

   return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
         {/* Email verification banner */}
         {user.emailVerified === false && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-md">
               <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                     <p className="text-amber-800 font-medium">{t("Profile.emailNotVerified")}</p>
                     <p className="text-amber-700 text-sm mt-1">{t("Profile.verifyEmail")}</p>
                     <button onClick={handleResendVerification} disabled={isSendingVerification} className="mt-3 inline-flex items-center px-3.5 py-1.5 text-sm rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSendingVerification ? (
                           <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t("Profile.sending")}
                           </>
                        ) : (
                           <>
                              <Mail className="w-4 h-4 mr-2" />
                              {t("Profile.resendVerification")}
                           </>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}

         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
            <h2 className="text-xl font-medium text-gray-900">{t("Profile.personalInfo")}</h2>
            <button onClick={() => setIsEditing(!isEditing)} className="mt-2 sm:mt-0 text-sm flex items-center text-gray-500 hover:text-gray-800 self-start sm:self-auto px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors">
               {isEditing ? (
                  <>{t("Profile.cancel")}</>
               ) : (
                  <>
                     <Edit size={16} className="mr-1.5" /> {t("Profile.edit")}
                  </>
               )}
            </button>
         </div>

         {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
               <div>
                  <label className="block text-sm text-gray-500 mb-1.5">{t("Login.firstName")} *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={`w-full p-2.5 border ${errors.first_name ? "border-red-500" : "border-gray-200"} rounded-lg focus:ring-0 focus:outline-none focus:border-gray-400`} />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1.5">{errors.first_name}</p>}
               </div>
               <div>
                  <label className="block text-sm text-gray-500 mb-1.5">{t("Login.lastName")} *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={`w-full p-2.5 border ${errors.last_name ? "border-red-500" : "border-gray-200"} rounded-lg focus:ring-0 focus:outline-none focus:border-gray-400`} />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1.5">{errors.last_name}</p>}
               </div>
               <div>
                  <label className="block text-sm text-gray-500 mb-1.5">{t("Login.email")} *</label>
                  <div className="flex items-center gap-2">
                     <input type="email" value={displayData.email} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500" readOnly />
                  </div>
               </div>
               <div>
                  <label className="block text-sm text-gray-500 mb-1.5">{t("Login.phoneNumber")} *</label>
                  <input
                     type="text"
                     name="phone_no"
                     value={formData.phone_no || ""}
                     onChange={handleInputChange}
                     className={`w-full p-2.5 border ${errors.phone_no ? "border-red-500" : "border-gray-200"} rounded-lg focus:ring-0 focus:outline-none focus:border-gray-400`}
                     placeholder={"Ex: " + t("Login.placeholderPhoneNumber")}
                  />
                  {errors.phone_no && <p className="text-red-500 text-xs mt-1.5">{errors.phone_no}</p>}
               </div>
               <div className="md:col-span-2 mt-8 pt-6 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                     <button onClick={updateUserInfo} disabled={isSubmitting} className="bg-black text-white px-6 py-2.5 rounded-full hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm">
                        {isSubmitting ? (
                           <span className="flex items-center justify-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t("Profile.saving")}
                           </span>
                        ) : (
                           <>{t("Profile.saveModified")}</>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         ) : (
            <div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="pb-4 border-b border-gray-100 sm:border-0">
                     <p className="text-sm text-gray-500 mb-1">{t("Login.firstName")}</p>
                     <p className="text-gray-900">{displayData.first_name || "-"}</p>
                  </div>
                  <div className="pb-4 border-b border-gray-100 sm:border-0">
                     <p className="text-sm text-gray-500 mb-1">{t("Login.lastName")}</p>
                     <p className="text-gray-900">{displayData.last_name || "-"}</p>
                  </div>
                  <div className="pb-4 border-b border-gray-100 sm:border-0">
                     <p className="text-sm text-gray-500 mb-1">{t("Login.email")}</p>
                     <div className="flex items-center gap-2">
                        <p className="text-gray-900">{displayData.email || "-"}</p>
                     </div>
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 mb-1">{t("Login.phoneNumber")}</p>
                     <p className="text-gray-900">{displayData.phone_no || "-"}</p>
                  </div>
               </div>

               <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-base font-medium text-gray-700 mb-4">{t("Profile.accountActions")}</h3>
                  <div className="space-y-3">
                     <button type="button" onClick={openEmailChangePopup} className="flex items-center text-sm text-gray-500 hover:text-gray-800 py-1.5 transition-colors">
                        <Mail size={14} className="mr-1.5" />
                        {t("Profile.changeEmail")}
                     </button>
                     {!isGoogleAccount && (
                        <button type="button" onClick={openPasswordChangePopup} className="flex items-center text-sm text-gray-500 hover:text-gray-800 py-1.5 transition-colors">
                           <Lock size={14} className="mr-1.5" />
                           {t("Profile.changePassword")}
                        </button>
                     )}
                     <button type="button" onClick={openDeleteAccountPopup} className="flex items-center text-sm text-red-500 hover:text-red-700 py-1.5 transition-colors">
                        <Trash2 size={14} className="mr-1.5" />
                        {t("Profile.deleteAccount")}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default PersonalInfoSection;
