/**
 * Form Components Index
 * 
 * Export all form components for easier importing
 */

export { default as AddressForm } from './AddressForm';
export { default as ContactForm } from './ContactForm';

// Export types and schemas
export type { AddressFormData, AddressFormProps } from './AddressForm';
export type { ContactFormData, ContactFormProps } from './ContactForm';
export { addressSchema } from './AddressForm';
export { contactSchema } from './ContactForm';
