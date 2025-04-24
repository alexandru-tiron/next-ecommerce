import {phone} from 'phone';

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

export const validatePhone = (phoneNumber: string): boolean => {
   return phoneRegex.test(phoneNumber) || phone(phoneNumber).isValid;
};

export const validateName = (name: string): boolean => {
   return name.trim().length >= 2;
};

