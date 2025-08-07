import React, { useState } from 'react';
import { 
  Grid, 
  TextField, 
  FormControlLabel, 
  Switch
} from '@mui/material';
import { BankAccount } from '../../../services/bankAccountService';

interface BankAccountFormProps {
  initialValues?: Partial<BankAccount>;
  onFormChange: (data: Partial<BankAccount>) => void;
  readOnly?: boolean;
}

const BankAccountForm = ({ initialValues, onFormChange, readOnly = false }: BankAccountFormProps) => {
  const [formData, setFormData] = useState<Partial<BankAccount>>(initialValues || {
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    is_active: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    const newValue = type === 'checkbox' ? checked : value;
    const updatedFormData = { ...formData, [name]: newValue };
    
    setFormData(updatedFormData);
    onFormChange(updatedFormData);
  };

  return (
    <Grid container spacing={1}>
      {/* Bank Information */}
      <Grid size={{xs: 12}} component="div">
        <TextField
          fullWidth
          required
          label="Bank Name"
          size='small'
          name="bank_name"
          value={formData.bank_name || ''}
          onChange={handleInputChange}
          placeholder="Enter bank name"
          InputProps={{
            readOnly: readOnly
          }}
        />
      </Grid>

      <Grid size={{xs: 12}} component="div">
        <TextField
          fullWidth
          required
          label="Account Holder Name"
          name="account_holder_name"
          size='small'
          value={formData.account_holder_name || ''}
          onChange={handleInputChange}
          placeholder="Enter account holder name"
          InputProps={{
            readOnly: readOnly
          }}
        />
      </Grid>

      <Grid size={{xs: 12}} component="div">
        <TextField
          fullWidth
          required
          label="Account Number"
          name="account_number"
          size='small'
          value={formData.account_number || ''}
          onChange={handleInputChange}
          placeholder="Enter account number"
          InputProps={{
            readOnly: readOnly
          }}
        />
      </Grid>

      <Grid size={{xs: 12}} component="div">
        <TextField
          fullWidth
          required
          label="IFSC Code"
          name="ifsc_code"
          size='small'
          value={formData.ifsc_code || ''}
          onChange={handleInputChange}
          placeholder="Enter IFSC code"
          InputProps={{
            readOnly: readOnly
          }}
        />
      </Grid>

      {/* Status */}
      <Grid size={{xs: 12}} component="div">
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active || true}
              onChange={handleInputChange}
              name="is_active"
              color="primary"
              disabled={readOnly}
            />
          }
          label="Active"
        />
      </Grid>
    </Grid>
  );
};

export default BankAccountForm;
