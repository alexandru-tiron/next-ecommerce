// Serializable copy of a Firebase error, used as the rejected value of the auth thunks
export interface AuthError {
   code: string;
   message: string;
}

export function toAuthError(error: unknown): AuthError {
   const { code, message } = error as { code?: string; message?: string };
   return { code: code ?? "auth/unknown", message: message ?? String(error) };
}
