import React, { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Chip,
  Box,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {Visibility,
  VisibilityOff} from "@mui/icons-material";

// Collection mechanism types
export enum CollectionMechanism {
  LOGISTICS_PARTNER = "logistics_partner",
  IN_STORE_POS = "in_store_pos",
  DIRECT_BANK_DEPOSIT = "direct_bank_deposit",
  CHEQUE_DD = "cheque_dd",
  MANUAL_CAPTURE = "manual_capture",
}

// Common interface for all collection mechanisms
export interface CashOfflineDetailsValues {
  collection_mechanism: CollectionMechanism;
  // Fields will be added based on mechanism
  [key: string]: any;
}

// Type for the component props
interface CashOfflineDetailsFormProps {
  values: CashOfflineDetailsValues;
  onChange: (field: string, value: any) => void;
  isViewMode: boolean;
  isSubmitting: boolean;
}

// Import bank accounts hook
import {
  useBankAccounts,
  BankAccount,
} from "@/app/hooks/api/tenant-admin/useBankAccounts";

// Still using mock data for physical locations until we have a real API
const physicalLocations = [
  { id: 1, label: "Store Location 1" },
  { id: 2, label: "Store Location 2" },
  { id: 3, label: "Warehouse Location 1" },
];

export const CashOfflineDetailsForm: FC<CashOfflineDetailsFormProps> = ({
  values,
  onChange,
  isViewMode,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const [cardNetworks, setCardNetworks] = useState<string[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch bank accounts from API
  const { data: bankAccountsResponse, isLoading: isLoadingBankAccounts } =
    useBankAccounts();
  const bankAccounts = bankAccountsResponse?.results || [];

  // Update card networks when values change
  useEffect(() => {
    if (
      values.supported_card_networks &&
      typeof values.supported_card_networks === "string"
    ) {
      setCardNetworks(
        values.supported_card_networks.split(",").filter(Boolean)
      );
    }
  }, [values.supported_card_networks]);

  // Handle card networks change
  const handleCardNetworksChange = (_event: any, newNetworks: string[]) => {
    setCardNetworks(newNetworks);
    onChange("supported_card_networks", newNetworks.join(","));
  };

  // Render fields based on collection mechanism
  const renderMechanismFields = () => {
    switch (values.collection_mechanism) {
      case CollectionMechanism.LOGISTICS_PARTNER:
        return (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.logistics_partner_name")}
                value={values.logistics_partner_name || ""}
                onChange={(e) =>
                  onChange("logistics_partner_name", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.merchant_id")}
                value={values.merchant_id || ""}
                onChange={(e) => onChange("merchant_id", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.api_key")}
                value={values.api_key || ""}
                onChange={(e) => onChange("api_key", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                type={showApiKey ? "text" : "password"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                        size="small"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.cod_collection_limit")}
                value={values.cod_collection_limit || ""}
                onChange={(e) =>
                  onChange("cod_collection_limit", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                type="number"
                helperText={t("paymentMethod.cod_collection_limit_help")}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.partner_settlement_cycle_days")}
                value={values.partner_settlement_cycle_days || ""}
                onChange={(e) =>
                  onChange("partner_settlement_cycle_days", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                type="number"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                id="settlement-bank-account"
                options={bankAccounts}
                getOptionLabel={(option: BankAccount) =>
                  `${option.bank_name} - ${option.account_holder_name} (${option.account_number})`
                }
                isOptionEqualToValue={(
                  option: BankAccount,
                  value: BankAccount
                ) => option.id === value.id}
                value={
                  bankAccounts.find(
                    (account) => account.id === values.settlement_bank_account
                  ) || null
                }
                onChange={(_, newValue: BankAccount | null) => {
                  onChange("settlement_bank_account", newValue?.id || "");
                }}
                disabled={isViewMode || isSubmitting}
                loading={isLoadingBankAccounts}
                loadingText={t("common.loadingData")}
                noOptionsText={t("common.noDataAvailable")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("paymentMethod.settlement_bank_account")}
                    size="small"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
          </>
        );

      case CollectionMechanism.IN_STORE_POS:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                id="physical-location"
                options={physicalLocations}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  physicalLocations.find(
                    (loc) => loc.id === values.physical_location_id
                  ) || null
                }
                onChange={(_, newValue) => {
                  onChange("physical_location_id", newValue?.id || "");
                }}
                disabled={isViewMode || isSubmitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("paymentMethod.physical_location_id")}
                    size="small"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.pos_device_provider")}
                value={values.pos_device_provider || ""}
                onChange={(e) =>
                  onChange("pos_device_provider", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.terminal_id")}
                value={values.terminal_id || ""}
                onChange={(e) => onChange("terminal_id", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.merchant_id")}
                value={values.merchant_id || ""}
                onChange={(e) => onChange("merchant_id", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
  <TextField
    fullWidth
    required
    label={t("paymentMethod.api_key")}
    value={values.api_key || ""}
    onChange={(e) => onChange("api_key", e.target.value)}
    disabled={isViewMode || isSubmitting}
    variant="outlined"
    size="small"
    type={showApiKey ? "text" : "password"}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            aria-label="toggle password visibility"
            onClick={() => setShowApiKey(!showApiKey)}
            edge="end"
            size="small"
          >
            {showApiKey ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      ),
    }}
  />
</Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                id="card-networks"
                options={[
                  "VISA",
                  "MASTERCARD",
                  "AMEX",
                  "RUPAY",
                  "DINERSCLUB",
                  "DISCOVER",
                ]}
                value={cardNetworks}
                onChange={handleCardNetworksChange}
                disabled={isViewMode || isSubmitting}
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label={t("paymentMethod.supported_card_networks")}
                    placeholder={t("paymentMethod.select_card_networks")}
                    size="small"
                    fullWidth
                  />
                )}
              />
              <FormHelperText>
                {t("paymentMethod.supported_card_networks_help")}
              </FormHelperText>
            </Grid>
          </>
        );

      case CollectionMechanism.DIRECT_BANK_DEPOSIT:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                id="beneficiary-bank-account"
                options={bankAccounts}
                getOptionLabel={(option: BankAccount) =>
                  `${option.bank_name} - ${option.account_holder_name} (${option.account_number})`
                }
                isOptionEqualToValue={(
                  option: BankAccount,
                  value: BankAccount
                ) => option.id === value.id}
                value={
                  bankAccounts.find(
                    (account) => account.id === values.beneficiary_bank_account
                  ) || null
                }
                onChange={(_, newValue: BankAccount | null) => {
                  onChange("beneficiary_bank_account", newValue?.id || "");
                }}
                disabled={isViewMode || isSubmitting}
                loading={isLoadingBankAccounts}
                loadingText={t("common.loadingData")}
                noOptionsText={t("common.noDataAvailable")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("paymentMethod.beneficiary_bank_account")}
                    size="small"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                multiline
                rows={2}
                label={t("paymentMethod.customer_instructions")}
                value={values.customer_instructions || ""}
                onChange={(e) =>
                  onChange("customer_instructions", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                helperText={t("paymentMethod.customer_instructions_help")}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.required_proof_details")}
                value={values.required_proof_details || ""}
                onChange={(e) =>
                  onChange("required_proof_details", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                helperText={t("paymentMethod.required_proof_details_help")}
              />
            </Grid>
          </>
        );

      case CollectionMechanism.CHEQUE_DD:
        return (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.payee_name")}
                value={values.payee_name || ""}
                onChange={(e) => onChange("payee_name", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                id="deposit-bank-account"
                options={bankAccounts}
                getOptionLabel={(option: BankAccount) =>
                  `${option.bank_name} - ${option.account_holder_name} (${option.account_number})`
                }
                isOptionEqualToValue={(
                  option: BankAccount,
                  value: BankAccount
                ) => option.id === value.id}
                value={
                  bankAccounts.find(
                    (account) => account.id === values.deposit_bank_account
                  ) || null
                }
                onChange={(_, newValue: BankAccount | null) => {
                  onChange("deposit_bank_account", newValue?.id || "");
                }}
                disabled={isViewMode || isSubmitting}
                loading={isLoadingBankAccounts}
                loadingText={t("common.loadingData")}
                noOptionsText={t("common.noDataAvailable")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("paymentMethod.deposit_bank_account")}
                    size="small"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                multiline
                rows={2}
                label={t("paymentMethod.collection_address")}
                value={values.collection_address || ""}
                onChange={(e) => onChange("collection_address", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.clearing_time_days")}
                value={values.clearing_time_days || ""}
                onChange={(e) => onChange("clearing_time_days", e.target.value)}
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={t("paymentMethod.bounced_cheque_charges")}
                value={values.bounced_cheque_charges || ""}
                onChange={(e) =>
                  onChange("bounced_cheque_charges", e.target.value)
                }
                disabled={isViewMode || isSubmitting}
                variant="outlined"
                size="small"
                type="number"
              />
            </Grid>
          </>
        );

      case CollectionMechanism.MANUAL_CAPTURE:
        return (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
              {t("paymentMethod.manual_capture_note")}
            </Box>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Grid container spacing={1}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Autocomplete
          id="collection-mechanism-autocomplete"
          options={Object.values(CollectionMechanism)}
          getOptionLabel={(option) => {
            switch (option) {
              case CollectionMechanism.LOGISTICS_PARTNER:
                return t("paymentMethod.logistics_partner");
              case CollectionMechanism.IN_STORE_POS:
                return t("paymentMethod.in_store_pos");
              case CollectionMechanism.DIRECT_BANK_DEPOSIT:
                return t("paymentMethod.direct_bank_deposit");
              case CollectionMechanism.CHEQUE_DD:
                return t("paymentMethod.cheque_dd");
              case CollectionMechanism.MANUAL_CAPTURE:
                return t("paymentMethod.manual_capture");
              default:
                return option;
            }
          }}
          value={values.collection_mechanism || null}
          onChange={(_, newValue) => {
            onChange("collection_mechanism", newValue);
          }}
          disabled={isViewMode || isSubmitting}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("paymentMethod.collection_mechanism")}
              variant="outlined"
              size="small"
              required
            />
          )}
        />
      </Grid>

      {values.collection_mechanism && renderMechanismFields()}
    </Grid>
  );
};

export default CashOfflineDetailsForm;
