"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  TextField,
  Tooltip,
  Link,
  Autocomplete,
  TextField as MuiTextField,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
} from "@mui/material";
import { KillSwitchConfirmDialog } from "./KillSwitchConfirmDialog";
import { useFormState, Control, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";
import { useQuery } from "@tanstack/react-query";
import api from '@/lib/storeapi';

interface Country {
  id: number;
  name: string;
  iso_code: string;
  flag_url: string;
}

interface CountryOption {
  code: string;
  label: string;
  flag: React.ReactNode;
}

// Fetch countries for current tenant
async function fetchCountries(): Promise<Country[]> {
  const response = await api.get('/shared/country-list-raw/');
  return response.data;
}

export interface FeatureToggleFormData {
  featureToggle: {
    customer_group_selling_channel: number | null;
    wallet_enabled: boolean;
    loyalty_enabled: boolean;
    reviews_enabled: boolean;
    wishlist_enabled: boolean;
    min_recharge_amount?: string;
    max_recharge_amount?: string;
    daily_transaction_limit?: string;
    is_active?: boolean;
    kill_switch?: boolean,
    default_delivery_zone?:string,
  };
}

interface FeatureToggleTabProps {
  control: Control<any>;
  watch: any;
  setValue: any;
}

export const FeatureToggleTab = ({
  control,
  watch,
  setValue,
}: FeatureToggleTabProps) => {
  const { t } = useTranslation();
  const { errors } = useFormState({ control });

  // Fetch countries using React Query
  const { data: countries = [], isLoading: isCountriesLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
  });

  // Map API data to Autocomplete options
  const COUNTRY_OPTIONS: CountryOption[] = [
    {
      code: "ALL",
      label: t("configuration.featureToggleSettings.allOverWorld", "All over world"),
      flag: (
        <span role="img" aria-label="Globe" style={{ fontSize: 20, marginRight: 2 }}>
          🌐
        </span>
      ),
    },
    ...countries.map((country: Country) => ({
      code: country.iso_code,
      label: country.name,
      flag: (
        <img
          loading="lazy"
          width="20"
          srcSet={`https://flagcdn.com/w40/${country.iso_code.toLowerCase()}.png 2x`}
          src={`https://flagcdn.com/w20/${country.iso_code.toLowerCase()}.png`}
          alt={country.iso_code}
        />
      ),
    })),
  ];

  const { data: sellingChannels = [] } = useActiveSellingChannels();

  return (
    <Box sx={{ p: 2 }}>
      {/* Core Configuration Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1a1a1a' }}>
          Core Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="featureToggle.customer_group_selling_channel"
              control={control}
              rules={{ required: "Selling channel is required" }}
              render={({ field, fieldState }) => (
                <Autocomplete
                  options={sellingChannels}
                  value={
                    sellingChannels.find((option) => option.id === field.value) ||
                    null
                  }
                  onChange={(event, newValue: SellingChannel | null) => {
                    field.onChange(newValue?.id || null);
                  }}
                  getOptionLabel={(option: SellingChannel) => option.segment_name}
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      placeholder="All Customers"
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option: SellingChannel) => (
                    <li {...props} key={option.id}>
                      {option.segment_name}
                    </li>
                  )}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="featureToggle.default_delivery_zone"
            control={control}
            render={({ field, fieldState }) => {
              const selectedCountry = COUNTRY_OPTIONS.find(
                (option) => option.label === field.value
              );
              return (
                <Autocomplete
                  autoHighlight
                  options={COUNTRY_OPTIONS}
                  value={selectedCountry || null}
                  onChange={(_, value) => {
                    field.onChange(value ? value.label : "");
                  }}
                  loading={isCountriesLoading}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.code === value.code}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box
                        key={key}
                        component="li"
                        sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                        {...optionProps}
                      >
                        {option.flag}
                        {option.label} ({option.code})
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t(
                        "configuration.featureToggleSettings.selectDefaultDeliveryZone",
                        "Select Default Delivery Zone"
                      )}
                      variant="outlined"
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: selectedCountry ? (
                          <InputAdornment position="start">
                            {selectedCountry.flag}
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                  )}
                />
              );
            }}
          />
        </Grid>


        </Grid>
      </Paper>

      {/* Wallet Settings Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
            Wallet Settings
          </Typography>
          <Controller
            name="featureToggle.wallet_enabled"
            control={control}
            render={({ field }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color={field.value ? 'success.main' : 'text.secondary'}>
                  Enable Wallet
                </Typography>
                <Switch
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  color="primary"
                />
              </Box>
            )}
          />
        </Box>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                Minimum Recharge Amount
              </Typography>
              <Controller
                name="featureToggle.min_recharge_amount"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    placeholder="10"
                    type="number"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                Maximum Recharge Amount
              </Typography>
              <Controller
                name="featureToggle.max_recharge_amount"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    placeholder="1000"
                    type="number"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                Daily Transaction Limit
              </Typography>
              <Controller
                name="featureToggle.daily_transaction_limit"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    placeholder="500"
                    type="number"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                      }
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>

      {/* Reviews Settings Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
            Reviews Settings
          </Typography>
          <Controller
            name="featureToggle.reviews_enabled"
            control={control}
            render={({ field }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color={field.value ? 'success.main' : 'text.secondary'}>
                  Enable Reviews
                </Typography>
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  color="primary"
                />
              </Box>
            )}
          />
        </Box>
{/*         
        {watch("featureToggle.reviews_enabled") && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500, color: '#666' }}>
              Review Moderation
            </Typography>
            <RadioGroup row sx={{ mb: 3 }}>
              <FormControlLabel
                value="manual"
                control={<Radio size="small" />}
                label="Manual"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
              <FormControlLabel
                value="automatic"
                control={<Radio size="small" />}
                label="Automatic"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </RadioGroup>
            
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={<Checkbox size="small" defaultChecked />}
                label="Allow Photo/Video Uploads"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
              <FormControlLabel
                control={<Checkbox size="small" defaultChecked />}
                label="Verified Buyer Badge"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Box>
          </>
        )} */}
      </Paper>

      {/* Wishlist Settings Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
            Wishlist Settings
          </Typography>
          <Controller
            name="featureToggle.wishlist_enabled"
            control={control}
            render={({ field }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color={field.value ? 'success.main' : 'text.secondary'}>
                  Enable Wishlist
                </Typography>
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  color="primary"
                />
              </Box>
            )}
          />
        </Box>
      </Paper>

      {/* Hibernation Switch Section */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0', bgcolor: '#fff8e1' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box sx={{ color: '#ff9800', mt: 0.5 }}>⚠️</Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>
              Hibernation Switch
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enabling hibernation mode will temporarily make your store inaccessible to customers.
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: '#ff9800' }}>🌙</Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Hibernation Mode
            </Typography>
          </Box>
          <Controller
            name="featureToggle.kill_switch"
            control={control}
            render={({ field }) => {
              const [dialogOpen, setDialogOpen] = useState<boolean>(false);
              
              const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
                setDialogOpen(true);
              };
              
              const handleConfirm = (): void => {
                field.onChange(!field.value);
                setDialogOpen(false);
              };
              
              const handleCancel = (): void => {
                setDialogOpen(false);
              };
              
              return (
                <>
                  <Switch
                    checked={field.value}
                    onChange={handleCheckboxChange}
                    color="warning"
                  />
                  
                  <KillSwitchConfirmDialog
                    open={dialogOpen}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isEnabling={!field.value}
                  />
                </>
              );
            }}
          />
        </Box>
        
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
          Allowed IPs (comma separated)
        </Typography>
        <TextField
          placeholder="192.168.1.1, 10.0.0.1"
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              bgcolor: 'white'
            }
          }}
        />
      </Paper>
    </Box>
  );
};

// --- Utility functions for data transformation ---

/**
 * Transforms form data to the required API payload for save.
 */
export function transformFeatureToggleForm(formData: any): any {
  const featureToggle = formData.featureToggle || {};

  const payload: any = {
    customer_group_selling_channel:
    featureToggle.customer_group_selling_channel,
    wallet_enabled: !!featureToggle.wallet_enabled,
    loyalty_enabled: !!featureToggle.loyalty_enabled,
    reviews_enabled: !!featureToggle.reviews_enabled,
    wishlist_enabled: !!featureToggle.wishlist_enabled,
    is_active: !!featureToggle.is_active,
    kill_switch: !!featureToggle.kill_switch,
    default_delivery_zone: featureToggle.default_delivery_zone,
  };

  // Only include wallet config fields if wallet is enabled
  if (featureToggle.wallet_enabled) {
    payload.min_recharge_amount =
      parseFloat(featureToggle.min_recharge_amount) || 0;
    payload.max_recharge_amount =
      parseFloat(featureToggle.max_recharge_amount) || 0;
    payload.daily_transaction_limit =
      parseFloat(featureToggle.daily_transaction_limit) || 0;
  }

  return payload;
}

/**
 * Maps API response for edit to the form structure.
 */
export function mapFeatureToggleApiToForm(apiData: any): any {
  return {
    featureToggle: {
      customer_group_selling_channel:
        apiData.customer_group_selling_channel || null,
      wallet_enabled: !!apiData.wallet_enabled,
      loyalty_enabled: !!apiData.loyalty_enabled,
      reviews_enabled: !!apiData.reviews_enabled,
      wishlist_enabled: !!apiData.wishlist_enabled,
      min_recharge_amount: apiData.min_recharge_amount || "",
      max_recharge_amount: apiData.max_recharge_amount || "",
      daily_transaction_limit: apiData.daily_transaction_limit || "",
      is_active: !!apiData.is_active,
      kill_switch: !!apiData.kill_switch,
      default_delivery_zone: apiData.default_delivery_zone || null,
    },
  };
}

export default FeatureToggleTab;
