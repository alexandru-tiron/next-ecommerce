import { phone } from "phone";

export const emailRegex = new RegExp("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$");

// Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Romanian phone number validation
export const phoneRegex = /^(\+4|)?(07[0-8]{1}[0-9]{1}|02[0-9]{2}|03[0-9]{2}){1}?(\s|\.|\-)?([0-9]{3}(\s|\.|\-|)){2}$/;

// Validation functions
export const validateEmail = (email: string): boolean => {
   return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
   return passwordRegex.test(password);
};

// Romanian numbers in any common format, or any number written with its country code (+49 30 1234567).
// The phone library knows mobile numbers well but rejects many valid landlines, so numbers starting with +
// are also accepted when they have 8 to 15 digits (the international maximum).
export const validatePhone = (phoneNumber: string): boolean => {
   if (phoneRegex.test(phoneNumber) || phone(phoneNumber, { validateMobilePrefix: false }).isValid) return true;
   const digits = phoneNumber.replace(/\D/g, "").length;
   return /^\+[1-9][0-9 .()-]+$/.test(phoneNumber.trim()) && digits >= 8 && digits <= 15;
};

export const validateName = (name: string): boolean => {
   return name?.trim()?.length >= 2;
};
