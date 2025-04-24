"use client";

import {
   browserLocalPersistence,
   createUserWithEmailAndPassword,
   deleteUser,
   onAuthStateChanged,
   sendPasswordResetEmail,
   setPersistence,
   signInWithEmailAndPassword,
   signOut,
   GoogleAuthProvider,
   signInWithPopup,
   sendEmailVerification,
   updateProfile,
   updatePassword,
   EmailAuthProvider,
   reauthenticateWithCredential,
} from "firebase/auth";
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState, FC } from "react";
import { auth, db } from "@/lib/firebaseInit";
import { useRouter } from "next/navigation";
import { usePopupContext } from "./PopupContext";
import { doc, getDoc, setDoc, collection,  updateDoc, onSnapshot } from "firebase/firestore";
import { UserData, User, Address } from "@/types/user";

// ===== TYPES =====

interface AuthContextProps {
   handleLogin: (email: string, password: string) => Promise<void>;
   handleSignup: (email: string, password: string, firstName: string, lastName: string, phoneNumber: string) => Promise<void>;
   handleLogout: () => void;
   handleResetPassword: (email: string) => Promise<void>;
   handleDeleteAccount: (password: string) => Promise<void>;
   handleGoogleSignIn: () => Promise<void>;
   handleResendVerificationEmail: () => Promise<void>;
   handleChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
   user: User | null;
   admin: boolean;
   isAuthReady: boolean;
}

interface AuthProviderProps {
   children: ReactNode;
}

// ===== CONTEXT =====

const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
   const router = useRouter();
   const { setPopup, setLoadPop } = usePopupContext();

   // State management
   const [user, setUser] = useState<User | null>(null);
   const [admin, setAdmin] = useState<boolean>(false);
   const [isAuthReady, setIsAuthReady] = useState(false);
   const [isInitialized, setIsInitialized] = useState(false);
   const [listeners, setListeners] = useState<(() => void)[]>([]);

   // ===== ERROR HANDLING =====

   const handleFirebaseError = useCallback(
      (error: undefined | { code: string; message: string }) => {
         if (!error || typeof error === undefined) return;

         const errorCode = error.code;
         const errorMessage = error.message;
         const errorTitle = "Eroare";
         let errorDescription = errorMessage;

         // Map error codes to user-friendly messages
         switch (errorCode) {
            case "auth/user-not-found":
               errorDescription = "Utilizatorul nu a fost găsit";
               break;
            case "auth/internal-error":
               errorDescription = "Eroare internă";
               break;
            case "auth/invalid-credential":
               errorDescription = "Credențiale invalide";
               break;
            case "auth/invalid-email":
               errorDescription = "Email invalid";
               break;
            case "auth/wrong-password":
               errorDescription = "Parola greșită";
               break;
         }

         setPopup({
            title: errorTitle,
            description: [<p key="error">{errorDescription}</p>],
            buttons: [{ label: "OK", onClick: () => setPopup(null),className: "primary", }],
         });
      },
      [setPopup]
   );

   // ===== SESSION MANAGEMENT =====

   // Store minimal user data in session storage
   const persistUserSession = useCallback((currentUser: { uid: string; email: string | null; displayName: string | null; emailVerified: boolean }) => {
      const minimalUserData = {
         uid: currentUser.uid,
         email: currentUser.email,
         displayName: currentUser.displayName,
         emailVerified: currentUser.emailVerified,
      };
      sessionStorage.setItem("authUser", JSON.stringify(minimalUserData));
   }, []);

   // Clear session data
   const clearUserSession = useCallback(() => {
      sessionStorage.removeItem("authUser");
   }, []);

   // ===== USER DATA FETCHING =====

   // Fetch user collections (addresses & orders)
   const fetchUserSubcollections = useCallback(
      async (userId: string) => {
         try {
            // Set up a listener for addresses subcollection
            const addressesCollection = collection(db, "Users", userId, "Addresses");
            const addressesUnsubscribe = onSnapshot(
               addressesCollection,
               (snapshot) => {
                  const addresses: Address[] = snapshot.docs.map((doc) => ({
                     id: doc.id,
                     ...(doc.data() as Omit<Address, "id">),
                  }));

                  // Update the user object with new addresses
                  setUser((currentUser) => {
                     if (!currentUser || !currentUser.db) return currentUser;

                     return {
                        ...currentUser,
                        db: {
                           ...currentUser.db,
                           addresses,
                        },
                     } as User;
                  });
               },
               (error) => {
                  console.error("Error listening to addresses collection:", error);
               }
            );

            // Add the unsubscribe function to our listeners array
            setListeners((prevListeners) => [...prevListeners, addressesUnsubscribe]);

            // Return empty collections since they'll be updated by the listeners
            return { addresses: [],  };
         } catch (error) {
            console.error("Error setting up subcollection listeners:", error);
            return { addresses: [],  };
         }
      },
      [setListeners]
   );

   // ===== USER DOCUMENT LISTENER =====

   // Setup a Firestore listener for the user document
   const setupUserDocumentListener = useCallback(
      (currentUser: { uid: string; email: string | null; displayName: string | null; emailVerified: boolean }) => {
         setIsAuthReady(false);

         // Set up real-time listener for the user document
         const userRef = doc(db, "Users", currentUser.uid);

         // Return the unsubscribe function for cleanup
         return onSnapshot(
            userRef,
            async (docSnapshot) => {
               try {
                  if (docSnapshot.exists()) {
                     const userData = docSnapshot.data() as UserData;
                     // Construct full user object
                     const userInfo = {
                        ...(currentUser as User),
                        emailVerified: currentUser.emailVerified,
                        db: {
                           ...userData,
                           email: userData.email,
                           first_name: userData.first_name,
                           last_name: userData.last_name,
                           addresses: userData.addresses || [],
                        },
                     } as User;
                     console.log(userInfo);
                     // Persist mi nimal user data
                     persistUserSession(currentUser);
                     setUser(userInfo);
                  } else {
                     console.log("User document does not exist yet in Firestore");
                     // Create the document if we know it should exist
                     if (currentUser.email) {
                        await setDoc(userRef, {
                           email: currentUser.email,
                           created_at: new Date(),
                        });
                        // The listener will fire again once the document is created
                        return;
                     } else {
                        clearUserSession();
                        setUser(null);
                     }
                  }
               } catch (error) {
                  console.error("Error processing user document:", error);
                  clearUserSession();
                  setUser(null);
               } finally {
                  setIsAuthReady(true);
               }
            },
            (error) => {
               console.error("Error listening to user document:", error);
               clearUserSession();
               setUser(null);
               setIsAuthReady(true);
            }
         );
      },
      [clearUserSession, fetchUserSubcollections, persistUserSession]
   );

   // ===== MAIN AUTH STATE INITIALIZATION =====

   useEffect(() => {
      if (isInitialized) return;

      const initializeAuth = async () => {
         try {
            // Try to restore user from session storage
            const persistedUser = sessionStorage.getItem("authUser");
            if (persistedUser) {
               try {
                  const parsedUser = JSON.parse(persistedUser);
                  setUser(parsedUser); // Set temporary user to avoid flashing login screen
               } catch (e) {
                  console.error("Error parsing persisted user:", e);
               }
            }

            // Set persistence
            await setPersistence(auth, browserLocalPersistence);

            // Listen for auth state changes
            const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
               // Clean up any existing Firestore listeners
               listeners.forEach((unsubscribe) => unsubscribe());
               setListeners([]);

               if (currentUser) {
                  // Check admin status
                  const token = await currentUser.getIdTokenResult();
                  console.log(token);
                  if (token.claims.isAdmin) {
                     setAdmin(true);
                  }

                  // Set up real-time listener for user document
                  const unsubscribe = setupUserDocumentListener(currentUser);
                  setListeners((prev) => [...prev, unsubscribe]);
               } else {
                  clearUserSession();
                  setUser(null);
                  setIsAuthReady(true);
               }
            });

            return () => {
               // Clean up all listeners on unmount
               authUnsubscribe();
               listeners.forEach((unsubscribe) => unsubscribe());
            };
         } catch (error) {
            console.error("Error initializing auth:", error);
            setIsAuthReady(true);
         }
      };

      initializeAuth();
      setIsInitialized(true);
   }, [isInitialized, listeners, clearUserSession, setupUserDocumentListener]);

   // Clean up listeners when component unmounts
   useEffect(() => {
      return () => {
         listeners.forEach((unsubscribe) => unsubscribe());
      };
   }, [listeners]);

   // ===== AUTH ACTIONS =====

   // Update user profile
   const updateUserProfile = useCallback(
      async (
         userId: string,
         data: {
            first_name?: string;
            last_name?: string;
            phone_no?: string;
         }
      ) => {
         const userRef = doc(db, "Users", userId);

         try {
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
               // Update existing document
               await updateDoc(userRef, data);
            } else {
               // Create new document
               await setDoc(
                  userRef,
                  {
                     ...data,
                  },
                  { merge: true }
               );
               if (auth.currentUser && data.first_name && data.last_name) {
                  await updateProfile(auth.currentUser, {
                     displayName: `${data.first_name} ${data.last_name}`,
                  });
               }
            }
         } catch (error) {
            console.error("Error creating/updating user document:", error);
            throw error;
         }
      },
      []
   );

   // Register new user
   const handleSignup = useCallback(
      async (email: string, password: string, firstName: string, lastName: string, phoneNumber: string) => {
         try {
            setLoadPop(true);

            // Create user account in Firebase Auth
            const { user: currentUser } = await createUserWithEmailAndPassword(auth, email, password);

            // Send email verification
            await sendEmailVerification(currentUser);

            // Create Firestore document
            await updateUserProfile(currentUser.uid, {
               first_name: firstName,
               last_name: lastName,
               phone_no: phoneNumber,
            });
            // Show success message with verification info
            setPopup({
               title: "Cont creat cu succes",
               description: [<p key="verify">Un email de verificare a fost trimis la adresa {email}. Vă rugăm să verificați căsuța de email și să urmați instrucțiunile pentru a vă activa contul.</p>],
               buttons: [
                  {
                     label: "OK",
                     onClick: () => {
                        setPopup(null);
                        router.push("/");
                     },
                     className: "primary",
                  },
               ],
            });

            // We don't need to set the user here as it will be set by the listener
         } catch (error) {
            handleFirebaseError(error as { code: string; message: string });
         } finally {
            setLoadPop(false);
         }
      },
      [handleFirebaseError, router, setLoadPop, updateUserProfile, setPopup]
   );

   // Login existing user
   const handleLogin = useCallback(
      async (email: string, password: string) => {
         try {
            setLoadPop(true);

            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
         } catch (error) {
            handleFirebaseError(error as { code: string; message: string });
         } finally {
            setLoadPop(false);
         }
      },
      [handleFirebaseError, router, setLoadPop]
   );

   // Logout current user
   const handleLogout = useCallback(() => {
      setPopup({
         title: "Deconectare",
         description: [<p key="sign_out">Sunteți sigur că doriți să vă deconectați?</p>],
         buttons: [
            {
               label: "Da",
               onClick: async () => {
                  try {
                     await signOut(auth);
                     clearUserSession();
                     setUser(null);
                     router.push("/");
                     window.location.reload();
                  } catch (error) {
                     console.error("Error signing out:", error);
                  }
               },
               className: "primary",
            },
            { label: "Nu", onClick: () => setPopup(null) },
         ],
      });
   }, [router, setPopup, clearUserSession]);

   // Reset password for email
   const handleResetPassword = useCallback(
      async (email: string) => {
         try {
            setLoadPop(true);
            await sendPasswordResetEmail(auth, email);

            setPopup({
               title: "Succes",
               description: [<p key="success">Un email pentru resetare a parolei a fost trimis la adresa {email}.</p>],
               buttons: [
                  {
                     label: "OK",
                     onClick: () => {
                        setLoadPop(false);
                        router.push("/");
                     },
                     className: "primary",
                  },
               ],
            });
         } catch (error) {
            setLoadPop(false);
            handleFirebaseError(error as { code: string; message: string });
         }
      },
      [handleFirebaseError, router, setLoadPop, setPopup,]
   );

   // Resend verification email
   const handleResendVerificationEmail = useCallback(async () => {
      try {
         if (!auth.currentUser) {
            throw new Error("User not logged in");
         }

         setLoadPop(true);
         await sendEmailVerification(auth.currentUser);

         setPopup({
            title: "Email trimis",
            description: [<p key="verify">Un nou email de verificare a fost trimis. Vă rugăm să verificați căsuța de email și să urmați instrucțiunile pentru a vă activa contul.</p>],
            buttons: [{ label: "OK", onClick: () => setPopup(null),className: "primary" }],
         });
      } catch (error) {
         console.error("Error sending verification email:", error);
         handleFirebaseError(error as { code: string; message: string });
      } finally {
         setLoadPop(false);
      }
   }, [handleFirebaseError, setLoadPop, setPopup]);

   // Delete current user account
   const handleDeleteAccount = useCallback(
      async (password: string) => {
         if (!user || !user.db) return;

         try {
            setLoadPop(true);

            // Check authentication method
            const isGoogleAccount = user.providerData?.[0]?.providerId === "google.com";

            if (isGoogleAccount) {
               // For Google accounts, we can't reauthenticate with password
               // We'll assume they're recently authenticated
               await deleteUser(user);
            } else {
               // For email/password accounts, re-authenticate first
               if (password === "google-auth") {
                  throw new Error("Invalid password for email/password account");
               }
               const userCredential = await signInWithEmailAndPassword(auth, user.db.email, password);
               await deleteUser(userCredential.user);
            }

            clearUserSession();
            router.push("/");
         } catch (error) {
            handleFirebaseError(error as { code: string; message: string });
         } finally {
            setLoadPop(false);
         }
      },
      [user, router, clearUserSession, handleFirebaseError, setLoadPop]
   );

   // Change password for current user
   const handleChangePassword = useCallback(
      async (currentPassword: string, newPassword: string) => {
         if (!user || !user.db) return;

         try {
            setLoadPop(true);

            // Re-authenticate user before changing password
            const credential = EmailAuthProvider.credential(user.db.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setPopup({
               title: "Parolă actualizată",
               description: [<p key="success">Parola a fost schimbată cu succes.</p>],
               buttons: [{ label: "OK", onClick: () => setPopup(null),className: "primary", }],
            });
         } catch (error) {
            handleFirebaseError(error as { code: string; message: string });
         } finally {
            setLoadPop(false);
         }
      },
      [user, handleFirebaseError, setLoadPop, setPopup]
   );

   // Sign in with Google
   const handleGoogleSignIn = useCallback(async () => {
      try {
         setLoadPop(true);

         // Authenticate with Google
         const provider = new GoogleAuthProvider();
         const { user: currentUser } = await signInWithPopup(auth, provider);

         // Extract name parts from display name
         const fullName = currentUser.displayName || "";
         const nameParts = fullName.split(" ");
         const firstName = nameParts[0] || "";
         const lastName = nameParts.slice(1).join(" ") || "";

         // Update user document with name information
         await updateUserProfile(currentUser.uid, {
            first_name: firstName,
            last_name: lastName,
         });

         // We don't need to set the user here as it will be set by the listener
         router.push("/");
      } catch (error) {
         console.error("Google Sign-In error:", error);
         handleFirebaseError(error as { code: string; message: string });
      } finally {
         setLoadPop(false);
      }
   }, [handleFirebaseError, router, setLoadPop, updateUserProfile]);

   // Create the context value
   const authState = useMemo(
      () => ({
         handleLogin,
         handleSignup,
         handleLogout,
         handleResetPassword,
         handleDeleteAccount,
         handleGoogleSignIn,
         handleResendVerificationEmail,
         handleChangePassword,
         user,
         admin,
         isAuthReady,
      }),
      [handleLogin, handleSignup, handleLogout, handleResetPassword, handleDeleteAccount, handleGoogleSignIn, handleResendVerificationEmail, handleChangePassword, user, admin, isAuthReady]
   );

   // For debugging
   useEffect(() => {
      if (process.env.NODE_ENV === "development") {
         console.log("Auth state update:", { user: !!user, isAuthReady });
      }
   }, [user, isAuthReady]);

   return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access the auth context
 * @returns The auth context
 * @throws Error if used outside AuthProvider
 */
export const useAuthContext = () => {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error("useAuthContext must be used within an AuthProvider");
   }
   return context;
};
