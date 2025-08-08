import React from 'react';
import { TextField, Grid, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface BankTransferDetailsValues {
  beneficiary_bank_name: string;
  beneficiary_account_no: string;
  beneficiary_ifsc_code: string;
  beneficiary_account_holder_name: string;
  instructions_for_customer?: string;
}

interface BankTransferDetailsFormProps {
  values: BankTransferDetailsValues;
  onChange: (field: keyof BankTransferDetailsValues, value: string) => void;
  disabled?: boolean;
}

export const BankTransferDetailsForm = ({
  values,
  onChange,
  disabled = false
}: BankTransferDetailsFormProps) => {
  const { t } = useTranslation();

  const handleChange = (field: keyof BankTransferDetailsValues) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(field, event.target.value);
  };

  return (
    <>
      {/* Bank Name */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label={t('paymentMethod.beneficiaryBankName')}
          value={values.beneficiary_bank_name || ''}
          onChange={handleChange('beneficiary_bank_name')}
          fullWidth
          required
          disabled={disabled}
          size="small"
          placeholder={t('paymentMethod.bankNamePlaceholder')}
        />
      </Grid>
      
      {/* Account Number */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label={t('paymentMethod.beneficiaryAccountNo')}
          value={values.beneficiary_account_no || ''}
          onChange={handleChange('beneficiary_account_no')}
          fullWidth
          required
          disabled={disabled}
          size="small"
          placeholder={t('paymentMethod.accountNumberPlaceholder')}
        />
      </Grid>
      
      {/* IFSC Code */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label={t('paymentMethod.beneficiaryIFSCCode')}
          value={values.beneficiary_ifsc_code || ''}
          onChange={handleChange('beneficiary_ifsc_code')}
          fullWidth
          required
          disabled={disabled}
          size="small"
          placeholder={t('paymentMethod.ifscCodePlaceholder')}
        />
      </Grid>
      
      {/* Account Holder Name */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label={t('paymentMethod.accountHolderName')}
          value={values.beneficiary_account_holder_name || ''}
          onChange={handleChange('beneficiary_account_holder_name')}
          fullWidth
          required
          disabled={disabled}
          size="small"
          placeholder={t('paymentMethod.accountHolderNamePlaceholder')}
        />
      </Grid>
      
      {/* Instructions for Customer - Full Width */}
      <Grid size={{ xs: 12 }}>
        <TextField
          label={t('paymentMethod.instructionsForCustomer')}
          value={values.instructions_for_customer || ''}
          onChange={handleChange('instructions_for_customer')}
          fullWidth
          multiline
          rows={3}
          disabled={disabled}
          size="small"
          required
          placeholder={t('paymentMethod.instructionsPlaceholder')}
          helperText={t('paymentMethod.instructionsHelperText')}
        />
      </Grid>
    </>
  );
};

export default BankTransferDetailsForm;
