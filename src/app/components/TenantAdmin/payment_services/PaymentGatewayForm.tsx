import React, { useState, useEffect } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { 
  Grid, 
  TextField, 
  FormControlLabel, 
  Switch,
  InputAdornment,
  Autocomplete,
  IconButton,
  Chip 
} from '@mui/material';
import { PaymentGateway } from '../../../services/paymentGatewayService';
import { getBankAccounts, BankAccount } from '../../../services/bankAccountService';

interface PaymentGatewayFormProps {
  initialValues?: Partial<PaymentGateway>;
  onFormChange: (data: Partial<PaymentGateway>) => void;
  readOnly?: boolean;
  tenantSlug: string;
}

const PaymentGatewayForm = ({ initialValues, onFormChange, readOnly = false, tenantSlug }: PaymentGatewayFormProps) => {
  const [formData, setFormData] = useState<Partial<PaymentGateway>>(initialValues || {
    gateway_name: '',
    api_key: '',
    api_secret: '',
    webhook_secret: '',
    merchant_id: '',
    success_webhook_url: '',
    failure_webhook_url: '',
    supported_currencies: '',
    mdr_percentage: '',
    mdr_fixed_fee: 0,
    settlement_bank_account: undefined,
    refund_api_endpoint: '',
    supports_partial_refunds: false,
    is_active: true
  });
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [currencyInput, setCurrencyInput] = useState('');
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Common currency options
  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD'];
  
  useEffect(() => {
    // Fetch bank accounts for settlement account selection
    const fetchBankAccounts = async () => {
      try {
        const response = await getBankAccounts(tenantSlug);
        setBankAccounts(response.results);
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
      }
    };

    // Initialize currencies from initialValues if present
    if (initialValues?.supported_currencies) {
      setSelectedCurrencies(initialValues.supported_currencies.split(',').map(c => c.trim()));
    }

    fetchBankAccounts();
  }, [initialValues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    const newValue = type === 'checkbox' ? checked : value;
    const updatedFormData = { ...formData, [name]: newValue };
    
    setFormData(updatedFormData);
    onFormChange(updatedFormData);
  };

  const handleBankAccountChange = (value: BankAccount | null) => {
    const updatedFormData = { 
      ...formData, 
      settlement_bank_account: value || undefined,
      settlement_bank_account_id: value?.id || undefined
    };
    
    setFormData(updatedFormData);
    onFormChange(updatedFormData);
  };

  const handleCurrencyAdd = (currency: string) => {
    if (currency && !selectedCurrencies.includes(currency)) {
      const updatedCurrencies = [...selectedCurrencies, currency];
      setSelectedCurrencies(updatedCurrencies);
      
      const updatedFormData = { 
        ...formData, 
        supported_currencies: updatedCurrencies.join(','),
      };
      
      setFormData(updatedFormData);
      onFormChange(updatedFormData);
      setCurrencyInput('');
    }
  };

  const handleCurrencyDelete = (currencyToDelete: string) => {
    const updatedCurrencies = selectedCurrencies.filter(currency => currency !== currencyToDelete);
    setSelectedCurrencies(updatedCurrencies);
    
    const updatedFormData = { 
      ...formData, 
      supported_currencies: updatedCurrencies.join(','),
    };
    
    setFormData(updatedFormData);
    onFormChange(updatedFormData);
  };

  return (
    <Grid container spacing={1}>
      {/* Basic Information */}
      <Grid size={{xs: 12}}>
        <TextField
          fullWidth
          required
          label="Gateway Name"
          name="gateway_name"
          value={formData.gateway_name || ''}
          onChange={handleInputChange}
          disabled={readOnly}
          size="small"
        />
      </Grid>

      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          required
          label="API Key"
          name="api_key"
          value={formData.api_key || ''}
          onChange={handleInputChange}
          disabled={readOnly}
          size="small"
        />
      </Grid>
      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          required
          label="Merchant ID"
          name="merchant_id"
          value={formData.merchant_id || ''}
          onChange={handleInputChange}
          disabled={readOnly}
          size="small"
        />
      </Grid>

      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          required
          label="API Secret"
          name="api_secret"
          value={formData.api_secret || ''}
          onChange={handleInputChange}
          type={showApiSecret ? 'text' : 'password'}
          disabled={readOnly}
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  edge="end"
                  size="small"
                  disabled={readOnly}
                >
                  {showApiSecret ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Grid>

      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          label="Webhook Secret"
          name="webhook_secret"
          value={formData.webhook_secret || ''}
          onChange={handleInputChange}
          type={showWebhookSecret ? 'text' : 'password'}
          disabled={readOnly}
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  edge="end"
                  size="small"
                  disabled={readOnly}
                >
                  {showWebhookSecret ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Grid>

  

      {/* Webhook URLs */}
      <Grid size={{xs: 12}}>
        <TextField
          fullWidth
          label="Success Webhook URL"
          name="success_webhook_url"
          value={formData.success_webhook_url || ''}
          onChange={handleInputChange}
          disabled={readOnly}
          size="small"
        />
      </Grid>

      <Grid size={{xs: 12}}>
        <TextField
          fullWidth
          label="Failure Webhook URL"
          name="failure_webhook_url"
          value={formData.failure_webhook_url || ''}
          onChange={handleInputChange}
          disabled={readOnly}
          size="small"
        />
      </Grid>

      {/* Currency Support */}
      <Grid size={{xs: 12}}>
        <Autocomplete
          multiple
          id="currencies"
          options={currencyOptions}
          freeSolo
          size='small'
          disabled={readOnly}
          value={selectedCurrencies}
          onChange={(event, newValue) => {
            setSelectedCurrencies(newValue);
            const updatedFormData = { 
              ...formData, 
              supported_currencies: newValue.join(','),
            };
            setFormData(updatedFormData);
            onFormChange(updatedFormData);
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip 
                label={option} 
                {...getTagProps({ index })} 
                disabled={readOnly}
                key={index}
                onDelete={() => handleCurrencyDelete(option)}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              disabled={readOnly}
              size='small'
              variant="outlined"
              label="Supported Currencies"
              placeholder="Add currency"
            />
          )}
        />
      </Grid>

      {/* Pricing */}
      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          label="MDR Percentage"
          name="mdr_percentage"
          size='small'
          disabled={readOnly}
          value={formData.mdr_percentage || ''}
          onChange={handleInputChange}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />
      </Grid>

      <Grid size={{xs: 12, md: 6}}>
        <TextField
          fullWidth
          label="Fixed Fee"
          name="mdr_fixed_fee"
          size='small'
          type="number"
          disabled={readOnly}
          value={formData.mdr_fixed_fee || 0}
          onChange={handleInputChange}
        />
      </Grid>

      {/* Settlement */}
      <Grid size={{xs: 12}}>
        <Autocomplete
          id="settlement_bank_account"
          options={bankAccounts}
          size='small'
          disabled={readOnly}
          getOptionLabel={(option) => `${option.bank_name} - ${option.account_holder_name} (${option.account_number})`}
          value={bankAccounts.find(account => account.id === formData.settlement_bank_account?.id) || null}
          onChange={(event, newValue) => handleBankAccountChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              disabled={readOnly}
              size='small'
              label="Settlement Bank Account"
              placeholder="Select a bank account"
            />
          )}
        />
      </Grid>

      {/* Refund */}
      <Grid size={{xs: 12}}>
        <TextField
          fullWidth
          label="Refund API Endpoint"
          size='small'
          disabled={readOnly}
          name="refund_api_endpoint"
          value={formData.refund_api_endpoint || ''}
          onChange={handleInputChange}
        />
      </Grid>

      <Grid size={{xs: 12, md: 6}}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.supports_partial_refunds || false}
              onChange={handleInputChange}
              name="supports_partial_refunds"
              color="primary"
              disabled={readOnly}
            />
          }
          label="Supports Partial Refunds"
        />
      </Grid>

      {/* Status */}
      <Grid size={{xs: 12, md: 6}}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active || false}
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

export default PaymentGatewayForm;
