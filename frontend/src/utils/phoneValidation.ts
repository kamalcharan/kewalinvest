// frontend/src/utils/phoneValidation.ts
export interface PhoneValidationResult {
  isValid: boolean;
  errorMessage?: string;
  formattedValue?: string;
}

export const validatePhoneNumber = (value: string): PhoneValidationResult => {
  if (!value.trim()) {
    return { isValid: false, errorMessage: 'Phone number is required' };
  }

  // Remove all spaces, dashes, parentheses
  const cleaned = value.replace(/[\s\-()]/g, '');
  
  // Must start with + followed by country code and number
  if (!cleaned.startsWith('+')) {
    return { 
      isValid: false, 
      errorMessage: 'Must start with + and country code (e.g., +91 for India)' 
    };
  }

  // Remove the + and check if remaining are all digits
  const withoutPlus = cleaned.substring(1);
  if (!/^\d+$/.test(withoutPlus)) {
    return { 
      isValid: false, 
      errorMessage: 'Only numbers allowed after country code' 
    };
  }

  // Check total length (8-15 digits is standard international range)
  if (withoutPlus.length < 8 || withoutPlus.length > 15) {
    return { 
      isValid: false, 
      errorMessage: 'Must be 8-15 digits including country code' 
    };
  }

  return { 
    isValid: true, 
    formattedValue: cleaned 
  };
};

export const formatPhoneInput = (value: string): string => {
  if (!value) return '';
  if (value === '+') return '+';
  
  // Remove everything except digits and +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // If no + and has digits, add + at start
  if (!cleaned.includes('+') && /\d/.test(cleaned)) {
    return '+' + cleaned;
  }
  
  // If has +, ensure it's only at the start
  if (cleaned.includes('+')) {
    const digitsOnly = cleaned.replace(/\+/g, '');
    return '+' + digitsOnly;
  }
  
  return cleaned;
};