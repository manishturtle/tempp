import React from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  FormControlLabel,
  Switch,
  InputAdornment,
  Divider,
  Stack,
  useTheme,
  Collapse,
  Button,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  Control,
  Controller,
  UseFormWatch,
  useFieldArray,
} from "react-hook-form";
import { ConfigurationFormData } from "@/app/types/admin/configurationValidations";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

interface GeneralFeaturesTabProps {
  control: Control<ConfigurationFormData>;
  watch: UseFormWatch<ConfigurationFormData>;
}

interface FeatureToggleDefinition {
  name:
    | "walletSystem"
    | "loyaltyProgram"
    | "productReviews"
    | "wishlist";
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
}

// Feature toggle definitions from the original code
const featureToggles: FeatureToggleDefinition[] = [
  // {
  //   name: "walletSystem",
  //   labelKey: "configuration.featureToggles.walletSystem",
  //   defaultLabel: "Wallet System",
  //   descriptionKey: "configuration.featureToggles.walletSystemDescription",
  //   defaultDescription:
  //     "Allow customers to store and use credit in their digital wallet.",
  // },
  // {
  //   name: "loyaltyProgram",
  //   labelKey: "configuration.featureToggles.loyaltyProgram",
  //   defaultLabel: "Loyalty Program",
  //   descriptionKey: "configuration.featureToggles.loyaltyProgramDescription",
  //   defaultDescription:
  //     "Reward customers with points for purchases that can be redeemed for discounts.",
  // },
  // {
  //   name: "productReviews",
  //   labelKey: "configuration.featureToggles.productReviews",
  //   defaultLabel: "Product Reviews",
  //   descriptionKey: "configuration.featureToggles.productReviewsDescription",
  //   defaultDescription:
  //     "Enable customers to leave reviews and ratings on products.",
  // },
  {
    name: "wishlist",
    labelKey: "configuration.featureToggles.wishlist",
    defaultLabel: "Enable Wishlist Feature",
    descriptionKey: "configuration.featureToggles.wishlistDescription",
    defaultDescription:
      "Allow customers to save products to a wishlist for future reference.",
  },
];

// Extend the schema with additional fields we need for the UI based on the image
interface LoyaltyTier {
  name: string;
  minPoints: number;
  maxPoints: number;
  multiplier: number;
}

/**
 * Renders the General & Features tab of the Admin Configuration page
 * This includes store settings, feature toggles, and conditional rule sections
 */
export function GeneralFeaturesTab({
  control,
  watch,
}: GeneralFeaturesTabProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();

  const watchedToggles = {
    walletSystem: watch("generalFeatures.featureToggles.walletSystem"),
    loyaltyProgram: watch("generalFeatures.featureToggles.loyaltyProgram"),
  };

  const { fields, append, remove } = useFieldArray({
    control,
    // @ts-ignore - We're extending the schema for the UI
    name: "generalFeatures.loyaltyProgramRules.tiers",
  });

  return (
    <Box>
      <Stack spacing={4}>
        {/* General Store Settings Section */}
        {/* <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("configuration.general.title", "General Store Settings")}
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}> */}
            {/* Pending Payment Timeout */}
            {/* <Grid item xs={12}>
              <Controller
                name="generalFeatures.pendingPaymentTimeout"
                control={control}
                render={({ field, fieldState }) => (
                  <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Grid item xs={12} sm={4} md={3}>
                      <TextField
                        fullWidth
                        {...field}
                        size="small"
                        onChange={(e) => {
                          const filteredValue = e.target.value.replace(
                            /[^0-9]/g,
                            ""
                          );
                          field.onChange(
                            filteredValue === ""
                              ? undefined
                              : Number(filteredValue)
                          );
                        }}
                        value={field.value?.toString() ?? ""}
                        id="pending-payment-timeout-input"
                        type="text"
                        inputMode="numeric"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              {t("common.minutes", "Minutes")}
                            </InputAdornment>
                          ),
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message || " "}
                      />
                    </Grid>
                    {/* Right side: Contains the actual input field */}
                    {/* <Grid
                      item
                      xs={12}
                      sm={8}
                      md={9}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        mt: -2,
                      }}
                    >
                      <Typography
                        component="label"
                        htmlFor="pending-payment-timeout-input"
                        sx={{ fontWeight: 500, fontSize: 12 }}
                      >
                        {t(
                          "configuration.general.timeoutLabel",
                          "Pending Payment Timeout"
                        )}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        {t(
                          "configuration.general.timeoutHelper",
                          "Orders with pending payments will be automatically canceled after this timeout period."
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              />
            </Grid> */} 

            {/* Other Fields remain unchanged as they are text */}
            {/* <Grid item xs={12} sm={6}>
              <Controller
                name="generalFeatures.generalStoreSettings.storeName"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={t("configuration.general.storeName", "Store Name")}
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message && t(fieldState.error.message)
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="generalFeatures.generalStoreSettings.storeUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={t("configuration.general.storeUrl", "Store URL")}
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message && t(fieldState.error.message)
                    }
                  />
                )}
              />
            </Grid> */}
            {/* <Grid item xs={12} sm={6}>
                  <Controller
                  name="generalFeatures.generalStoreSettings.contactEmail"
                  control={control}
                  render={({ field, fieldState }) => (
                      <TextField {...field} label={t('configuration.general.contactEmail', 'Contact Email')} type="email" size="small" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message && t(fieldState.error.message)} />
                  )}
                  />
              </Grid>
              <Grid item xs={12} sm={6}>
                  <Controller
                  name="generalFeatures.generalStoreSettings.contactPhone"
                  control={control}
                  render={({ field, fieldState }) => (
                      <TextField {...field} label={t('configuration.general.contactPhone', 'Contact Phone')} fullWidth error={!!fieldState.error} helperText={fieldState.error?.message && t(fieldState.error.message)} />
                  )}
                  />
              </Grid> */}
          {/* </Grid>
        </Paper> */}

        {/* Feature Toggles Section */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("configuration.featureToggles.title", "Feature Toggles")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t(
              "configuration.featureToggles.description",
              "Enable or disable major store functionalities."
            )}
          </Typography>
          <Stack divider={<Divider flexItem />} spacing={2}>
            {featureToggles.map((feature) => (
              <Controller
                key={feature.name}
                name={`generalFeatures.featureToggles.${feature.name}`}
                control={control}
                render={({ field }) => (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" component="div">
                        {t(feature.labelKey, feature.defaultLabel)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(feature.descriptionKey, feature.defaultDescription)}
                      </Typography>
                    </Box>
                    <Switch
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      color="primary"
                    />
                  </Box>
                )}
              />
            ))}
          </Stack>
        </Paper>

        {/* Wallet Rules Section */}
        <Collapse in={watchedToggles.walletSystem} timeout="auto" unmountOnExit>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("configuration.walletRules.title", "Wallet Rules")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                "configuration.walletRules.description",
                "Configure rules for the customer wallet system."
              )}
            </Typography>
            <Grid container spacing={3} sx={{ my: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.walletRules.minimumBuyIn"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.walletRules.minimumRecharge",
                        "Minimum Recharge Amount"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message && t(fieldState.error.message)
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.walletRules.bonusPercentage"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.walletRules.bonusPercentage",
                        "Bonus Percentage"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  {t(
                    "configuration.walletRules.bonusHelper",
                    "Customers will receive bonus credit when they recharge their wallet above the minimum amount."
                  )}
                </Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom>
              {t("configuration.walletRules.limitsTitle", "Wallet Limits")}
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  // @ts-ignore
                  name="generalFeatures.walletRules.maxWalletBalance"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.walletRules.maxBalance",
                        "Maximum Wallet Balance"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message && t(fieldState.error.message)
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.walletRules.minimumPayout"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.walletRules.minPayment",
                        "Minimum Payment from Wallet"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message && t(fieldState.error.message)
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Loyalty Program Rules Section */}
        <Collapse
          in={watchedToggles.loyaltyProgram}
          timeout="auto"
          unmountOnExit
        >
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("configuration.loyaltyRules.title", "Loyalty Program Rules")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "configuration.loyaltyRules.description",
                "Define how customers earn and redeem loyalty points."
              )}
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.loyaltyProgramRules.pointsRate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.loyaltyRules.earnRate",
                        "Earn Rate"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {t(
                              "configuration.loyaltyRules.earnRateAdornment",
                              "points per $1 spent"
                            )}
                          </InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message && t(fieldState.error.message)
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.loyaltyProgramRules.redeemRate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.loyaltyRules.redeemRate",
                        "Redeem Rate"
                      )}
                      type="text"
                      inputMode="decimal"
                      fullWidth
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.loyaltyProgramRules.pointsValidity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      size="small"
                      label={t(
                        "configuration.loyaltyRules.pointsExpiry",
                        "Points Expiry"
                      )}
                      type="text"
                      inputMode="numeric"
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {t(
                              "configuration.loyaltyRules.expiryAdornment",
                              "months after earning"
                            )}
                          </InputAdornment>
                        ),
                      }}
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="generalFeatures.loyaltyProgramRules.minimumPoints"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      label={t(
                        "configuration.loyaltyRules.minimumPoints",
                        "Minimum Points for Redemption"
                      )}
                      size="small"
                      type="text"
                      inputMode="numeric"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message
                          ? t(fieldState.error.message)
                          : t(
                              "configuration.loyaltyRules.minimumPointsHelper",
                              "Customers must have at least this many points to redeem for a discount."
                            )
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
            {/* Loyalty Tiers Section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                {t("configuration.loyaltyRules.tiersTitle", "Loyalty Tiers")}
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Grid
                    container
                    spacing={2}
                    sx={{ color: "text.secondary", px: 2 }}
                  >
                    <Grid  size={{md:3}}>
                      <Typography variant="caption">Tier Name</Typography>
                    </Grid>
                    <Grid  size={{md:2}}>
                      <Typography variant="caption">Min Points</Typography>
                    </Grid>
                    <Grid  size={{md:2}}>
                      <Typography variant="caption">Max Points</Typography>
                    </Grid>
                    <Grid  size={{md:3}}>
                      <Typography variant="caption">
                        Points Multiplier
                      </Typography>
                    </Grid>
                    <Grid  size={{md:2}}/>
                  </Grid>
                </Box>
                {fields.map((tier, index) => (
                  <Paper variant="outlined" key={tier.id} sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Controller
                          // @ts-ignore
                          name={`generalFeatures.loyaltyProgramRules.tiers[${index}].name`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Tier Name"
                              fullWidth
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, md: 2 }}>
                        <Controller
                          // @ts-ignore
                          name={`generalFeatures.loyaltyProgramRules.tiers[${index}].minPoints`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                              label="Min Points"
                              type="text"
                              inputMode="numeric"
                              fullWidth
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, md: 2 }}>
                        <Controller
                          // @ts-ignore
                          name={`generalFeatures.loyaltyProgramRules.tiers[${index}].maxPoints`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                              label="Max Points"
                              type="text"
                              inputMode="numeric"
                              fullWidth
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 10, md: 3 }}>
                        <Controller
                          // @ts-ignore
                          name={`generalFeatures.loyaltyProgramRules.tiers[${index}].multiplier`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/[^0-9.]/g, "")
                                )
                              }
                              label="Multiplier"
                              type="text"
                              inputMode="decimal"
                              fullWidth
                              size="small"
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    x
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 2, md: 2 }} sx={{ textAlign: "right" }}>
                        <IconButton
                          onClick={() => remove(index)}
                          color="error"
                          aria-label={t("common.delete", "Delete")}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
              <Box
                sx={{ mt: 2, display: "flex", justifyContent: "flex-start" }}
              >
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    append({
                      name: "",
                      minPoints: 0,
                      maxPoints: 0,
                      multiplier: 1.0,
                    })
                  }
                >
                  {t("configuration.loyaltyRules.addTier", "Add Tier")}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Collapse>
      </Stack>
    </Box>
  );
}
