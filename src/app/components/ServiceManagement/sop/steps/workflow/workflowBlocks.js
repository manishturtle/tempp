// Block types and definitions for workflow editor

export const BLOCK_TYPES = {
  FORM: 'form',
  SEND_EMAIL: 'email',
};

export const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail' },
  { id: 'outlook', name: 'Microsoft Outlook' },
  { id: 'yahoo', name: 'Yahoo Mail' },
  { id: 'mailchimp', name: 'Mailchimp' },
  { id: 'smtp', name: 'Custom SMTP' },
];

// Base validation for workflow blocks
export const validateBlock = (block) => {
  switch (block.type) {
    case BLOCK_TYPES.FORM:
      return validateFormBlock(block);
    case BLOCK_TYPES.SEND_EMAIL:
      return validateEmailBlock(block);
    default:
      return { isValid: false, message: 'Unknown block type' };
  }
};

// Validate form block
const validateFormBlock = (block) => {
  if (!block.data.objectName || block.data.objectName.trim() === '') {
    return { isValid: false, message: 'Form name is required' };
  }
  
  if (!block.data.fields || block.data.fields.length === 0) {
    return { isValid: false, message: 'At least one field is required' };
  }
  
  return { isValid: true, message: '' };
};

// Validate email block
const validateEmailBlock = (block) => {
  if (!block.data.emailProvider) {
    return { isValid: false, message: 'Email provider is required' };
  }
  
  return { isValid: true, message: '' };
};
