import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PaymentGateway } from '@/app/hooks/api/tenant-admin/usePaymentGateways';

interface GatewaySelectorProps {
  value: number | undefined;
  onChange: (gatewayId: number | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  gateways: PaymentGateway[];
  loading?: boolean;
}

export const GatewaySelector = ({
  value,
  onChange,
  disabled = false,
  required = false,
  gateways = [],
  loading = false,
}: GatewaySelectorProps) => {
  const { t } = useTranslation();

  return (
    <Autocomplete
      id="gateway-select"
      options={gateways}
      getOptionLabel={(option: PaymentGateway) => option.gateway_name}
      value={gateways.find((g) => g.id === value) || null}
      onChange={(_, newValue: PaymentGateway | null) => {
        onChange(newValue?.id);
      }}
      disabled={disabled}
      loading={loading}
      loadingText={t('common.loading')}
      size="small"
      renderInput={(params) => (
        <TextField
          {...params}
          label={t("paymentMethod.gateway")}
          variant="outlined"
          required={required}
          size="small"
        />
      )}
      renderOption={(props, option: PaymentGateway) => (
        <li {...props}>
          <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" fontWeight={500}>
                {option.gateway_name}
              </Typography>
            {option.settlement_bank_account && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {option.settlement_bank_account.bank_name} • {option.settlement_bank_account.account_holder_name} • {option.settlement_bank_account.masked_account_number}
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
  );
};

export default GatewaySelector;
