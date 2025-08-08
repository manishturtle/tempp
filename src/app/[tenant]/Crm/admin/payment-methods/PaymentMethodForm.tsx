import React, {
  forwardRef,
  useImperativeHandle,
  ReactNode,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";
import {
  usePaymentGateways,
  type PaymentGateway,
} from "@/app/hooks/api/tenant-admin/usePaymentGateways";

interface CustomerGroup {
  id: number; // Changed to number to match API response
  name: string;
}

interface Gateway {
  id: number;
  name: string;
}
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
} from "@mui/material";
import { GatewaySelector } from "./components/GatewaySelector";
import {
  BankTransferDetailsForm,
  BankTransferDetailsValues,
} from "./components/BankTransferDetailsForm";
import {
  CashOfflineDetailsForm,
  CashOfflineDetailsValues,
  CollectionMechanism,
} from "./components/CashOfflineDetailsForm";
import { Grid } from "@mui/material";
import { PaymentMethodType } from "@/app/types/admin/paymentMethod";

export interface PaymentMethodFormValues {
  name: string;
  payment_type: PaymentMethodType;
  is_active: boolean;
  description?: string;
  is_visible_on_store?: boolean;
  gateway_id?: number;
  customer_group_selling_channels?: number[];
  // Bank Transfer Details
  bank_transfer_details?: BankTransferDetailsValues;
  // Cash Offline Details
  collection_mechanism?: CollectionMechanism;
  // Fields for various collection mechanisms
  [key: string]: any;
}

export interface PaymentMethodFormRef {
  submitForm: () => void;
  getFormValues: () => PaymentMethodFormValues;
}

interface PaymentMethodFormProps {
  initialValues?: Partial<PaymentMethodFormValues>;
  onSubmit: (values: PaymentMethodFormValues) => void;
  onError?: (errorMessage: string) => void;
  isViewMode?: boolean;
  isSubmitting?: boolean;
  isLoading?: boolean;
  mode?: "add" | "edit";
}

const PaymentMethodForm = forwardRef<
  PaymentMethodFormRef,
  PaymentMethodFormProps
>((props, ref) => {
  const {
    initialValues,
    onSubmit,
    onError,
    isViewMode = false,
    isSubmitting = false,
    isLoading = false,
  } = props;
  const { t } = useTranslation();

  // Form values state
  const [formValues, setFormValues] = React.useState<
    Partial<PaymentMethodFormValues>
  >({
    name: "",
    payment_type: PaymentMethodType.ONLINE_GATEWAY,
    is_active: true,
    is_visible_on_store: true,
    description: "",
    gateway_id: undefined,
    customer_group_selling_channels: [],
    bank_transfer_details: {
      beneficiary_bank_name: "",
      beneficiary_account_no: "",
      beneficiary_ifsc_code: "",
      beneficiary_account_holder_name: "",
      instructions_for_customer: "",
    },
    collection_mechanism: CollectionMechanism.MANUAL_CAPTURE,
    ...initialValues,
  });

  // Fetch payment gateways from API
  const { data: gatewaysResponse } = usePaymentGateways();
  const availableGateways = gatewaysResponse?.results || [];

  // Fetch active selling channels from API
  const { data: sellingChannels = [], isLoading: isLoadingSellingChannels } =
    useActiveSellingChannels();

  // Transform selling channels to match the expected format
  const availableCustomerGroups: CustomerGroup[] = useMemo(() => {
    return (sellingChannels || []).map((channel: SellingChannel) => ({
      id: channel.id, // Keep as number to match API response
      name: channel.segment_name,
    }));
  }, [sellingChannels]);

  // Validate form values
  const validateForm = (): { isValid: boolean; errorMessage?: string } => {
    const { name, payment_type } = formValues;
    const missingFieldMessages: string[] = [];

    // Define common required fields with their display names
    const requiredFields: Array<{
      key: keyof PaymentMethodFormValues;
      label: string;
    }> = [
      { key: "name", label: t("paymentMethod.name") },
      { key: "payment_type", label: t("paymentMethod.payment_type") },
    ];

    // Payment type specific validation
    if (payment_type) {
      switch (payment_type) {
        case PaymentMethodType.ONLINE_GATEWAY:
          // For online gateway, require gateway_id
          if (!formValues.gateway_id) {
            missingFieldMessages.push(
              t("validation.fieldRequired", {
                field: t("paymentMethod.gateway_id"),
              })
            );
          }
          break;

        case PaymentMethodType.BANK_TRANSFER:
          // For bank transfer, validate required bank details
          const bankTransferDetails = formValues.bank_transfer_details || {};

          // Define required bank fields with their display names
          const requiredBankFields = [
            {
              key: "beneficiary_bank_name",
              label: t("paymentMethod.bank_name"),
            },
            {
              key: "beneficiary_account_no",
              label: t("paymentMethod.account_no"),
            },
            {
              key: "beneficiary_ifsc_code",
              label: t("paymentMethod.ifsc_code"),
            },
            {
              key: "beneficiary_account_holder_name",
              label: t("paymentMethod.account_holder_name"),
            },
            {
              key: "instructions_for_customer",
              label: t("paymentMethod.instructionsForCustomer"),
            },
          ];

          // Check each required field
          requiredBankFields.forEach(({ key, label }) => {
            const value =
              bankTransferDetails[key as keyof typeof bankTransferDetails];
            if (!value) {
              missingFieldMessages.push(
                t("validation.fieldRequired", { field: label })
              );
            }
          });
          break;

        case PaymentMethodType.CASH_OFFLINE:
          // For cash offline, first validate collection mechanism is selected
          if (!formValues.collection_mechanism) {
            missingFieldMessages.push(
              t("validation.fieldRequired", {
                field: t("paymentMethod.collection_mechanism"),
              })
            );
          } else {
            // Validate required fields based on collection mechanism
            const validateField = (
              value: any,
              fieldKey: string,
              fieldLabel: string
            ) => {
              if (!value) {
                missingFieldMessages.push(
                  t("validation.fieldRequired", {
                    field: t(`paymentMethod.${fieldKey}`) || fieldLabel,
                  })
                );
              }
            };

            switch (formValues.collection_mechanism) {
              case CollectionMechanism.LOGISTICS_PARTNER:
                validateField(
                  formValues.logistics_partner_name,
                  "logistics_partner_name",
                  "Logistics Partner Name"
                );
                validateField(
                  formValues.settlement_bank_account,
                  "settlement_bank_account",
                  "Settlement Bank Account"
                );
                break;

              case CollectionMechanism.IN_STORE_POS:
                validateField(
                  formValues.physical_location_id,
                  "physical_location_id",
                  "Physical Location ID"
                );
                validateField(
                  formValues.terminal_id,
                  "terminal_id",
                  "Terminal ID"
                );
                break;

              case CollectionMechanism.DIRECT_BANK_DEPOSIT:
                validateField(
                  formValues.beneficiary_bank_account,
                  "beneficiary_bank_account",
                  "Beneficiary Bank Account"
                );
                break;

              case CollectionMechanism.CHEQUE_DD:
                validateField(
                  formValues.deposit_bank_account,
                  "deposit_bank_account",
                  "Deposit Bank Account"
                );
                break;
            }
          }
          break;
      }
    }

    // Check for missing common required fields
    requiredFields.forEach(({ key, label }) => {
      const value = formValues[key];
      if (value === undefined || value === null || value === "") {
        missingFieldMessages.push(
          t("validation.fieldRequired", { field: label })
        );
      }
    });

    // If we have missing fields, return them in the error message
    if (missingFieldMessages.length > 0) {
      return {
        isValid: false,
        errorMessage: t("validation.missingFields", {
          fields: missingFieldMessages.map((msg) => `• ${msg}`).join("\n"),
        }),
      };
    }

    return { isValid: true };
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      // First validate the form
      const validation = validateForm();
      if (!validation.isValid) {
        if (validation.errorMessage && onError) {
          onError(validation.errorMessage);
        }
        return false;
      }

      const {
        name,
        description,
        payment_type = PaymentMethodType.ONLINE_GATEWAY,
        is_active,
        is_visible_on_store,
        customer_group_selling_channels,
      } = formValues;

      // Create payload based on payment type
      if (payment_type === PaymentMethodType.ONLINE_GATEWAY) {
        // Online Gateway Payload
        const onlinePayload = {
          name,
          description: description || "",
          payment_type,
          is_active,
          is_visible_on_store,
          gateway_id: formValues.gateway_id, // Gateway specific field
          customer_group_selling_channels:
            customer_group_selling_channels || [],
        };

        console.log("Submitting online gateway payment method:", onlinePayload);
        onSubmit(onlinePayload as PaymentMethodFormValues);
      } else if (payment_type === PaymentMethodType.BANK_TRANSFER) {
        // Bank Transfer Payload - Flatten the bank details
        // Create a properly typed bankDetails object
        const defaultBankDetails: BankTransferDetailsValues = {
          beneficiary_bank_name: "",
          beneficiary_account_no: "",
          beneficiary_ifsc_code: "",
          beneficiary_account_holder_name: "",
          instructions_for_customer: "",
        };

        // Use the actual bank details if available, otherwise use defaults
        const bankDetails =
          formValues.bank_transfer_details || defaultBankDetails;

        const bankTransferPayload = {
          name,
          description: description || "",
          payment_type: payment_type || PaymentMethodType.ONLINE_GATEWAY,
          is_active,
          is_visible_on_store,
          customer_group_selling_channels:
            customer_group_selling_channels || [],
          // Add flattened bank transfer fields
          beneficiary_bank_name: bankDetails.beneficiary_bank_name || "",
          beneficiary_account_no: bankDetails.beneficiary_account_no || "",
          beneficiary_ifsc_code: bankDetails.beneficiary_ifsc_code || "",
          beneficiary_account_holder_name:
            bankDetails.beneficiary_account_holder_name || "",
          instructions_for_customer:
            bankDetails.instructions_for_customer || "",
        };

        console.log(
          "Submitting bank transfer payment method:",
          bankTransferPayload
        );
        onSubmit(bankTransferPayload as PaymentMethodFormValues);
      } else if (payment_type === PaymentMethodType.CASH_OFFLINE) {
        // Cash Offline Payload
        const collectionMechanism =
          formValues.collection_mechanism || CollectionMechanism.MANUAL_CAPTURE;

        // Create base payload
        const cashOfflinePayload: any = {
          name,
          description: description || "",
          payment_type,
          is_active,
          is_visible_on_store,
          collection_mechanism: collectionMechanism,
          customer_group_selling_channels:
            customer_group_selling_channels || [],
        };

        // Add collection mechanism specific fields
        switch (collectionMechanism) {
          case CollectionMechanism.LOGISTICS_PARTNER:
            // Add logistics partner specific fields
            cashOfflinePayload.logistics_partner_name =
              formValues.logistics_partner_name || "";
            cashOfflinePayload.merchant_id = formValues.merchant_id || "";
            cashOfflinePayload.api_key = formValues.api_key || "";
            cashOfflinePayload.cod_collection_limit =
              formValues.cod_collection_limit || 0;
            cashOfflinePayload.partner_settlement_cycle_days =
              formValues.partner_settlement_cycle_days || 0;
            cashOfflinePayload.settlement_bank_account =
              formValues.settlement_bank_account || null;
            break;

          case CollectionMechanism.IN_STORE_POS:
            // Add in-store POS specific fields
            cashOfflinePayload.physical_location_id =
              formValues.physical_location_id || "";
            cashOfflinePayload.pos_device_provider =
              formValues.pos_device_provider || "";
            cashOfflinePayload.terminal_id = formValues.terminal_id || "";
            cashOfflinePayload.merchant_id = formValues.merchant_id || "";
            cashOfflinePayload.api_key = formValues.api_key || "";
            cashOfflinePayload.supported_card_networks =
              formValues.supported_card_networks || "";
            break;

          case CollectionMechanism.DIRECT_BANK_DEPOSIT:
            // Add direct bank deposit specific fields
            cashOfflinePayload.beneficiary_bank_account =
              formValues.beneficiary_bank_account || null;
            cashOfflinePayload.customer_instructions =
              formValues.customer_instructions || "";
            cashOfflinePayload.required_proof_details =
              formValues.required_proof_details || "";
            break;

          case CollectionMechanism.CHEQUE_DD:
            // Add cheque/DD specific fields
            cashOfflinePayload.payee_name = formValues.payee_name || "";
            cashOfflinePayload.collection_address =
              formValues.collection_address || "";
            cashOfflinePayload.clearing_time_days =
              formValues.clearing_time_days || 0;
            cashOfflinePayload.bounced_cheque_charges =
              formValues.bounced_cheque_charges || 0;
            cashOfflinePayload.deposit_bank_account =
              formValues.deposit_bank_account || null;
            break;

          case CollectionMechanism.MANUAL_CAPTURE:
            // No additional fields needed for manual capture
            break;
        }

        console.log(
          "Submitting cash offline payment method:",
          cashOfflinePayload
        );
        onSubmit(cashOfflinePayload as PaymentMethodFormValues);
      } else {
        // Other payment types
        const basePayload = {
          name,
          description: description || "",
          payment_type, // Already has a default value from destructuring
          is_active,
          is_visible_on_store,
          customer_group_selling_channels:
            customer_group_selling_channels || [],
        };

        console.log("Submitting standard payment method:", basePayload);
        onSubmit(basePayload as PaymentMethodFormValues);
      }
    },
    getFormValues: () => {
      return formValues as PaymentMethodFormValues;
    },
  }));

  // Handle form field changes
  const handleChange = (field: keyof PaymentMethodFormValues) => {
    return (
      event:
        | React.ChangeEvent<{ name?: string; value: unknown }>
        | { target: { value: unknown } },
      child?: ReactNode
    ) => {
      let newValue: unknown;

      if ("target" in event && event.target) {
        const target = event.target as HTMLInputElement;
        newValue = target.type === "checkbox" ? target.checked : target.value;
      } else if ("target" in event) {
        newValue = (event as any).target?.value;
      } else {
        newValue = event;
      }

      setFormValues((prev) => ({
        ...prev,
        [field]: newValue,
      }));
    };
  };

  // Determine payment type modes
  const isOnlineGateway =
    formValues.payment_type === PaymentMethodType.ONLINE_GATEWAY;
  const isBankTransfer =
    formValues.payment_type === PaymentMethodType.BANK_TRANSFER;
  const isCashOffline =
    formValues.payment_type === PaymentMethodType.CASH_OFFLINE;

  return (
    <Grid container spacing={1}>
      {/* Name Field - Full Width */}
      <Grid size={{ xs: 12 }}>
        <TextField
          label={t("paymentMethod.name")}
          value={formValues.name || ""}
          onChange={handleChange("name")}
          size="small"
          fullWidth
          disabled={isViewMode || isSubmitting}
          variant="outlined"
          required
        />
      </Grid>

      {/* Payment Type - Full Width on mobile, half on desktop */}
      {/* Payment Type - Full Width */}
      <Grid size={{ xs: 12 }}>
        <Autocomplete
          id="payment-type-autocomplete"
          options={Object.values(PaymentMethodType)}
          getOptionLabel={(option) => t(`paymentMethod.types.${option}`)}
          value={formValues.payment_type || PaymentMethodType.ONLINE_GATEWAY}
          onChange={(_, newValue) => {
            handleChange("payment_type")({
              target: { value: newValue },
            });
          }}
          disabled={isViewMode || isSubmitting}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("paymentMethod.paymentType")}
              variant="outlined"
              size="small"
              required
            />
          )}
        />
      </Grid>

      {/* Customer Groups - Only shown for online gateways */}
      <Grid size={{ xs: 12 }}>
        <Autocomplete<CustomerGroup, true>
          multiple
          id="customer-groups-select"
          options={availableCustomerGroups}
          getOptionLabel={(option) => option.name}
          value={availableCustomerGroups.filter((group) =>
            formValues.customer_group_selling_channels?.includes(group.id)
          )}
          onChange={(_, newValue) => {
            setFormValues({
              ...formValues,
              customer_group_selling_channels: newValue.map((v) => v.id),
            });
          }}
          disabled={isViewMode || isSubmitting}
          size="small"
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                size="small"
                variant="outlined"
                label={option.name}
              />
            ))
          }
          loading={isLoadingSellingChannels}
          loadingText={t("common.loading")}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("paymentMethod.customerGroups")}
              placeholder={t("paymentMethod.selectCustomerGroups")}
              variant="outlined"
              size="small"
            />
          )}
        />
      </Grid>
      {/* Gateway Selector - Only shown for online gateways */}
      {isOnlineGateway && (
        <Grid size={{ xs: 12 }}>
          <GatewaySelector
            value={formValues.gateway_id}
            onChange={(gatewayId) => {
              setFormValues({
                ...formValues,
                gateway_id: gatewayId,
              });
            }}
            disabled={isViewMode || isSubmitting}
            required={isOnlineGateway}
            gateways={availableGateways}
            loading={isLoadingSellingChannels}
          />
        </Grid>
      )}

      {/* Bank Transfer Details - Only shown for bank transfer payment type */}
      {isBankTransfer && (
        <BankTransferDetailsForm
          values={
            formValues.bank_transfer_details || {
              beneficiary_bank_name: "",
              beneficiary_account_no: "",
              beneficiary_ifsc_code: "",
              beneficiary_account_holder_name: "",
              instructions_for_customer: "",
            }
          }
          onChange={(field, value) => {
            setFormValues({
              ...formValues,
              bank_transfer_details: {
                ...(formValues.bank_transfer_details || {}),
                [field]: value,
              },
            });
          }}
          disabled={isViewMode || isSubmitting}
        />
      )}

      {/* Cash Offline Details - Only shown for cash offline payment type */}
      {isCashOffline && (
        <Grid size={{ xs: 12 }}>
          <CashOfflineDetailsForm
            values={{
              collection_mechanism:
                formValues.collection_mechanism ||
                CollectionMechanism.MANUAL_CAPTURE,
              ...formValues,
            }}
            onChange={(field, value) => {
              setFormValues({
                ...formValues,
                [field]: value,
              });
            }}
            isViewMode={isViewMode}
            isSubmitting={isSubmitting}
          />
        </Grid>
      )}

      {/* Description - Full Width */}
      <Grid size={{ xs: 12 }}>
        <TextField
          label={t("paymentMethod.description")}
          value={formValues.description || ""}
          onChange={handleChange("description")}
          fullWidth
          multiline
          rows={2}
          disabled={isViewMode || isSubmitting}
          variant="outlined"
          size="small"
        />
      </Grid>
      {/* Active Status */}
      <Grid size={{ xs: 6 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!formValues.is_active}
              onChange={handleChange("is_active")}
              disabled={isViewMode || isSubmitting}
              color="primary"
            />
          }
          label={t("paymentMethod.active")}
        />
      </Grid>

      {/* Store Visibility - Only shown for online gateways */}
      <Grid size={{ xs: 6 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!formValues.is_visible_on_store}
              onChange={handleChange("is_visible_on_store")}
              disabled={isViewMode || isSubmitting}
              color="primary"
            />
          }
          label={t("paymentMethod.visibleOnStore")}
        />
      </Grid>
    </Grid>
  );
});

PaymentMethodForm.displayName = "PaymentMethodForm";

export default PaymentMethodForm;
