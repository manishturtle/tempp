"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Timer, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  useSignup,
  useVerifyOTP,
  useResendOTP,
  createAccountAndContact,
} from "@/app/auth/hooks/useAuth";
import TenantService from "@/app/auth/services/tenantService";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/app/auth/store/authStore";
import { useLocation, Country } from "@/app/hooks/api/tenant-admin/useLocation";
import { PhoneInputField } from "@/app/components/ui/PhoneInputField";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
  Tooltip,
  InputAdornment,
  IconButton,
} from "@mui/material";
// Define account type constants
const ACCOUNT_TYPES = {
  INDIVIDUAL: "INDIVIDUAL",
  BUSINESS: "BUSINESS",
} as const;

type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

// Base schema for common fields
const baseSchema = z.object({
  account_type: z.enum([ACCOUNT_TYPES.INDIVIDUAL, ACCOUNT_TYPES.BUSINESS]),
  first_name: z.string().min(1, "firstNameRequired"),
  last_name: z.string().min(1, "lastNameRequired"),
  email: z.string().email("emailInvalid"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(6, "passwordTooShort"),
  password_confirm: z.string().min(6, "passwordConfirmRequired"),
  country: z.string().min(1, "Country is required"),
});

// Business-specific schema (will be used conditionally)
const businessSchema = z.object({
  business_name: z.string().min(1, "businessNameRequired"),
  legal_name: z.string().optional(),
  company_size: z.string().optional(),
  website: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || val.match(/^https?:\/\/.+/), {
      message: "websiteInvalid",
      path: ["website"],
    }),
  industry: z.string().optional(),
  tax_id: z.string().optional(),
  mobile: z.string().optional(),
});

// Dynamic schema based on account type
const signupSchema = z
  .discriminatedUnion("account_type", [
    baseSchema.extend({
      account_type: z.literal(ACCOUNT_TYPES.INDIVIDUAL),
    }),
    baseSchema.extend({
      account_type: z.literal(ACCOUNT_TYPES.BUSINESS),
      ...businessSchema.shape,
    }),
  ])
  .refine((data) => data.password === data.password_confirm, {
    message: "passwordsDoNotMatch",
    path: ["password_confirm"],
  });

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  email?: string;
}

// Type for the form values
type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Signup form component
 */
const SignupFormComponent = ({
  onSuccess,
  onSwitchToLogin,
  email,
}: SignupFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const router = useRouter();
  const signup = useSignup();
  const createAccountAndContactMutation = createAccountAndContact();
  const verifyOTP = useVerifyOTP();
  const resendOTP = useResendOTP();
  const { login: setAuthData } = useAuthStore();

  // Get tenant slug from session storage
  const getTenantSlug = (): string => {
    if (typeof window === "undefined") return "";
    const tenantData = sessionStorage.getItem("tenantInfo");
    if (!tenantData) return "";
    try {
      const parsedData = JSON.parse(tenantData);
      // Extract from tenant_schema or parse from default_url
      return (
        parsedData.tenant_schema || parsedData.default_url?.split("/")[3] || ""
      ); // Extract from URL like /erp_turtle/store/
    } catch (error) {
      console.error("Error parsing tenant data:", error);
      return "";
    }
  };

  const tenantSlug = getTenantSlug();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [accountType, setAccountType] = useState<AccountType>(
    ACCOUNT_TYPES.INDIVIDUAL
  );

  // OTP verification states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  // OTP resend timer states
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [resendCountdown, setResendCountdown] = useState<number>(60); // 60 seconds countdown
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // We still keep selectedCountry for UI display purposes
  // but the actual value will be in the form state
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // State to control country dropdown visibility with smooth transition
  const [showCountryDropdown, setShowCountryDropdown] =
    useState<boolean>(false);

  // Show country dropdown after a short delay for a smoother experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCountryDropdown(true);
    }, 300); // Short delay for better UX

    return () => clearTimeout(timer);
  }, []);

  // Initialize location hooks at the top level
  const location = useLocation();
  const { data: countries = [], isLoading: isLoadingCountries } =
    location.useCountries();

  // React Hook Form with discriminated union type support
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      account_type: ACCOUNT_TYPES.INDIVIDUAL,
      first_name: "",
      last_name: "",
      email: email || "",
      phone: "",
      password: "",
      password_confirm: "",
      country: "",
      // Business fields will be added conditionally when account type changes
    },
  });

  // Watch the account type to update the form accordingly
  const currentAccountType = watch("account_type");

  useEffect(() => {
    if (currentAccountType !== accountType) {
      setAccountType(currentAccountType as AccountType);
    }
  }, [currentAccountType, accountType]);

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef) {
        clearInterval(timerRef);
      }
    };
  }, [timerRef]);

  /**
   * Handle OTP verification
   */
  const handleVerifyOtp = async (): Promise<void> => {
    try {
      setIsVerifying(true);
      setOtpError("");

      // Call the verify OTP API
      const response = await verifyOTP.mutateAsync({
        email: submittedEmail,
        otp: otp || "", // Add fallback to prevent undefined error
      });

      if (response.success) {
        const user_id = response?.user?.user_id || null;

        // Get form values using getValues() from react-hook-form
        const formValues = getValues();

        const submitData = {
          account_type: formValues.account_type,
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          email: formValues.email,
          phone: formValues.phone,
          user_id: user_id,
          country: formValues.country,
          // Business fields (if applicable)
          ...(formValues.account_type === ACCOUNT_TYPES.BUSINESS && {
            business_name: formValues.business_name,
            legal_name: formValues.legal_name,
            company_size: formValues.company_size,
            website: formValues.website,
            industry: formValues.industry,
            tax_id: formValues.tax_id,
          }),
        };

        const signupResponse =
          await createAccountAndContactMutation.mutateAsync(submitData);

        console.log("Account creation response:", signupResponse);
      }

      if (response.access_token) {
        TenantService.setToken(response.access_token);
      }

      if (response.refresh_token) {
        TenantService.setRefreshToken(response.refresh_token);
      }

      // Update auth store with user data
      if (response.user && response.access_token && response.refresh_token) {
        setAuthData(
          response.access_token,
          response.refresh_token,
          response.user
        );

        // Redirect user based on their role if needed
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/");
        }
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      setOtpError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          t("auth.verificationFailed") ||
          "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Start the resend timer countdown
   */
  const startResendTimer = (): void => {
    setResendDisabled(true);
    setResendCountdown(60); // Reset to 60 seconds

    // Clear any existing timer
    if (timerRef) {
      clearInterval(timerRef);
    }

    // Create a new timer that decrements the countdown every second
    const newTimerRef = setInterval(() => {
      setResendCountdown((prevCount) => {
        if (prevCount <= 1) {
          // When countdown reaches zero, clear the interval and enable the button
          clearInterval(newTimerRef);
          setResendDisabled(false);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    setTimerRef(newTimerRef);
  };

  /**
   * Handle OTP resend with timer
   */
  const handleResendOtp = async (): Promise<void> => {
    if (resendDisabled) return; // Prevent multiple rapid resend attempts

    try {
      setIsResending(true);
      setOtpError("");

      await resendOTP.mutateAsync({ email: submittedEmail });

      // Start the countdown timer after successful resend
      startResendTimer();
    } catch (error: any) {
      console.error("OTP resend error:", error);
      setOtpError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          t("auth.resendFailed")
      );
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (formData: SignupFormValues): Promise<void> => {
    console.log("Form data submitted:", formData);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const submitData = {
        app_id: 1,
        email: formData.email,
        mobile_phone: formData.phone,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      // With OTP verification now being required, we need to capture the email and show OTP input
      try {
        const response = await signup.mutateAsync(submitData);

        setSubmittedEmail(formData.email);
        setShowOtpVerification(true);
        // Start the resend timer after showing OTP input
        startResendTimer();
        // Clear form errors to prevent confusion
        setErrorMessage(null);
        setFieldErrors({});
      } catch (error: any) {
        setErrorMessage(error.message || t("auth.registrationFailed"));
        throw error; // Re-throw to let react-hook-form handle it
      }
    } catch (error: any) {
      console.error("Signup error:", error);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {/* <Box sx={{ mb: 1}}>
          <Image src="/images/turtlelogo.png" alt="Company Logo" width={48} height={48} />
      </Box> */}
        <Typography component="h1" variant="h4" sx={{ fontWeight: "bold" }}>
          Sign up
        </Typography>
        <Typography
          component="p"
          sx={{ color: "text.secondary", fontSize: "14px" }}
        >
          Enter your details below to create your account and get started.
        </Typography>
      </Box>

      {/* Display field-specific errors */}
      {Object.entries(fieldErrors).map(([field, messages]) => (
        <Alert key={field} severity="error" sx={{ mb: 2 }}>
          <strong>
            {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
          </strong>{" "}
          {Array.isArray(messages) ? messages.join(" ") : messages}
        </Alert>
      ))}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ mt: 3, width: "100%" }}
      >
        {showOtpVerification ? (
          /* OTP Verification Form */
          <Box sx={{ width: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t("auth.verifyYourEmail") || "Verify Your Email"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {t("auth.otpSentTo") || "Verification code sent to"}{" "}
              <strong>{submittedEmail}</strong>
            </Typography>

            {otpError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {otpError}
              </Alert>
            )}

            <TextField
              fullWidth
              label={t("auth.verificationCode") || "Verification Code"}
              value={otp}
              onChange={(e) => {
                // Only allow numeric inputs
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                setOtp(numericValue);
              }}
              error={!!otpError}
              placeholder="Enter 6-digit verification code"
              inputProps={{
                maxLength: 6,
                inputMode: "numeric", // Shows numeric keyboard on mobile devices
                pattern: "[0-9]*", // Further ensures only numbers are entered
              }}
              sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
              <Grid size={{xs:12, sm:6}}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={onSwitchToLogin}
                  disabled={isVerifying || isResending}
                  sx={{ textTransform: "none" }}
                >
                  {t("auth.cancel") || "Cancel"}
                </Button>
              </Grid>
              <Grid size={{xs:12, sm:6}}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={isVerifying}
                  sx={{
                    textTransform: "none",
                    position: "relative",
                    "&.Mui-disabled": {
                      backgroundColor: (theme) => theme.palette.primary.main,
                      color: "white",
                      opacity: 0.7,
                    },
                  }}
                >
                  {isVerifying ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={20} color="inherit" />
                      <span>{t("auth.verifying") || "Verifying..."}</span>
                    </Box>
                  ) : (
                    t("auth.verify") || "Verify"
                  )}
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Tooltip title={resendDisabled ? t("Wait before resending") : t("Resend verification code")}>
                <span> {/* Wrapper needed for tooltip to work with disabled button */}
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    disabled={isResending || resendDisabled}
                    onClick={handleResendOtp}
                    sx={{ 
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5
                    }}
                    startIcon={<Timer fontSize="small" />}
                  >
                    {isResending ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={20} color="inherit" />
                        <span>{t("Sending...")}</span>
                      </Box>
                    ) : resendDisabled ? (
                      `${t("auth.resendOTP")} (${resendCountdown}s)`
                    ) : (
                      t("auth.resendOTP")
                    )}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <>
            {/* Account Type Selection */}
            <FormControl component="fieldset" sx={{ width: "100%" }}>
              <FormLabel component="legend">{t("auth.accountType")}</FormLabel>
              <Controller
                name="account_type"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row aria-label="account type">
                    <FormControlLabel
                      value={ACCOUNT_TYPES.INDIVIDUAL}
                      control={<Radio />}
                      label={t("auth.individual")}
                    />
                    <FormControlLabel
                      value={ACCOUNT_TYPES.BUSINESS}
                      control={<Radio />}
                      label={t("auth.business")}
                    />
                  </RadioGroup>
                )}
              />
            </FormControl>

            {/* Personal Information Fields (for both account types) */}
            <Collapse in={true} appear timeout={500}>
              <Box>
                <Grid container spacing={2}>
                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="first_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          fullWidth
                          size="small"
                          id="first_name"
                          label={t("auth.firstName")}
                          autoComplete="given-name"
                          error={!!errors.first_name}
                          helperText={
                            errors.first_name
                              ? t(`auth.${errors.first_name.message}`)
                              : ""
                          }
                          autoFocus
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="last_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          size="small"
                          fullWidth
                          id="last_name"
                          label={t("auth.lastName")}
                          autoComplete="family-name"
                          error={!!errors.last_name}
                          helperText={
                            errors.last_name
                              ? t(`auth.${errors.last_name.message}`)
                              : ""
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          fullWidth
                          id="email"
                          size="small"
                          label={t("auth.email")}
                          autoComplete="email"
                          error={!!errors.email}
                          helperText={
                            errors.email
                              ? t(`auth.${errors.email.message}`)
                              : ""
                          }
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{xs:12, sm:6}}>
                    <PhoneInputField
                      name="phone"
                      label={t("auth.phone")}
                      control={control}
                      error={!!errors.phone}
                      helperText={errors.phone ? t(`auth.${errors.phone.message}`) : ""}
                      required
                      margin="none"
                      size="medium"
                    />
                  </Grid>
                  {/* Country Dropdown with smooth animation */}
                  <Grid size={{xs:12}}>
                    <Collapse in={showCountryDropdown} timeout={500}>
                      <Autocomplete
                        id="country-select"
                        options={countries}
                        loading={isLoadingCountries}
                        getOptionLabel={(option: Country) => option.name || ""}
                        isOptionEqualToValue={(
                          option: Country,
                          value: Country
                        ) => option.id === value.id}
                        onChange={(_, newValue: Country | null) => {
                          setValue('country', newValue ? newValue.name : '', { shouldValidate: true });
                          // Still update the selectedCountry for backward compatibility if needed
                          setSelectedCountry(newValue ? newValue.name : null);
                        }}
                        value={countries.find(country => country.name === selectedCountry) || null}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t("auth.country")}
                            fullWidth
                            size="small"
                            error={!!errors.country}
                            helperText={errors.country?.message}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <React.Fragment>
                                  {isLoadingCountries ? (
                                    <CircularProgress
                                      color="inherit"
                                      size={20}
                                    />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </React.Fragment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Collapse>
                  </Grid>
                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          fullWidth
                          size="small"
                          name="password"
                          label={t("auth.password")}
                          type={showPassword ? "text" : "password"}
                          id="password"
                          autoComplete="new-password"
                          error={!!errors.password}
                          helperText={
                            errors.password
                              ? t(`auth.${errors.password.message}`)
                              : ""
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "transparent",
                                      color: "primary.main",
                                    },
                                  }}
                                >
                                  {showPassword ? (
                                    <VisibilityOff fontSize="small" />
                                  ) : (
                                    <Visibility fontSize="small" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="password_confirm"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          fullWidth
                          size="small"
                          name="password_confirm"
                          label={t("auth.confirmPassword")}
                          type={showConfirmPassword ? "text" : "password"}
                          id="password_confirm"
                          autoComplete="new-password"
                          error={!!errors.password_confirm}
                          helperText={
                            errors.password_confirm
                              ? t(`auth.${errors.password_confirm.message}`)
                              : ""
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle confirm password visibility"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "transparent",
                                      color: "primary.main",
                                    },
                                  }}
                                >
                                  {showConfirmPassword ? (
                                    <VisibilityOff fontSize="small" />
                                  ) : (
                                    <Visibility fontSize="small" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>

            {/* Business-specific Fields - with smooth animation */}
            <Collapse
              in={currentAccountType === ACCOUNT_TYPES.BUSINESS}
              timeout={500}
              unmountOnExit
            >
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t("auth.businessInformation")}
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="business_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          required
                          fullWidth
                          size="small"
                          id="business_name"
                          label={t("auth.businessName")}
                          error={!!(errors as any)?.business_name}
                          helperText={
                            (errors as any)?.business_name
                              ? t(
                                  `auth.${
                                    (errors as any)?.business_name.message
                                  }`
                                )
                              : ""
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="legal_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          id="legal_name"
                          label={t("auth.legalName")}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="company_size"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          fullWidth
                          size="small"
                          id="company_size"
                          label={t("auth.companySize")}
                        >
                          <MenuItem value="1-10">
                            {t("auth.companySize1_10")}
                          </MenuItem>
                          <MenuItem value="11-50">
                            {t("auth.companySize11_50")}
                          </MenuItem>
                          <MenuItem value="51-200">
                            {t("auth.companySize51_200")}
                          </MenuItem>
                          <MenuItem value="201-500">
                            {t("auth.companySize201_500")}
                          </MenuItem>
                          <MenuItem value="501-1000">
                            {t("auth.companySize501_1000")}
                          </MenuItem>
                          <MenuItem value="1000+">
                            {t("auth.companySize1000plus")}
                          </MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="industry"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          id="industry"
                          label={t("auth.industry")}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="tax_id"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          id="tax_id"
                          label={
                            selectedCountry === "India"
                              ? t("auth.panCard")
                              : t("auth.taxId")
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{xs:12, sm:6}}>
                    <Controller
                      name="website"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          id="website"
                          label={t("auth.website")}
                          error={!!(errors as any)?.website}
                          helperText={
                            (errors as any)?.website
                              ? t(`auth.${(errors as any)?.website.message}`)
                              : ""
                          }
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{xs:12, sm:6}}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={onSwitchToLogin}
                  sx={{ textTransform: "none" }}
                >
                  Cancel
                </Button>
              </Grid>
              <Grid size={{xs:12, sm:6}}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  color="primary"
                  disabled={signup.isPending}
                  sx={{
                    textTransform: "none",
                    position: "relative",
                    "&.Mui-disabled": {
                      backgroundColor: (theme) => theme.palette.primary.main,
                      color: "white",
                      opacity: 0.7,
                    },
                  }}
                >
                  {signup.isPending ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={20} color="primary" />
                      <span>Creating your account...</span>
                    </Box>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </>
  );
};

// Export with no SSR to avoid hydration issues
export default dynamic(() => Promise.resolve(SignupFormComponent), {
  ssr: false,
});

// Also export the named component for direct imports
export { SignupFormComponent as signup };
