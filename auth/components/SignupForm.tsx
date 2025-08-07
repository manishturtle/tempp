"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SignupCredentials } from "@/app/types/auth";
import { useSignup } from "@/app/auth/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  useLocation,
  Country,
  State,
  City,
} from "@/app/hooks/api/tenant-admin/useLocation";
import { useAuthStore } from "@/app/auth/store/authStore";
import AuthService from "@/app/auth/services/authService";
import { PhoneInputField } from "@/app/components/ui/PhoneInputField";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  Link as MuiLink,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import HomeIcon from "@mui/icons-material/Home";
import Link from "next/link";
import Image from "next/image";
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
  phone: z.string().optional(),
  password: z.string().min(6, "passwordTooShort"),
  password_confirm: z.string().min(6, "passwordConfirmRequired"),
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

// Contact form schema for additional business contacts
const contactSchema = z.object({
  first_name: z.string().min(1, "firstNameRequired"),
  last_name: z.string().min(1, "lastNameRequired"),
  email: z.string().email("emailInvalid"),
  job_title: z.string().optional(),
  phone: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

// Address schema
const addressSchema = z.object({
  address_type: z.string().default("BILLING"),
  street_1: z.string().min(1, "streetRequired"),
  street_2: z.string().optional(),
  city: z.string().min(1, "cityRequired"),
  state_province: z.string().min(1, "stateProvinceRequired"),
  postal_code: z.string().min(1, "postalCodeRequired"),
  country: z.string().min(1, "countryRequired"),
  full_name: z.string().optional(),
  phone_number: z.string().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

// Define the AddressState interface that will be used in the component
interface AddressState {
  address_type: string;
  street_1: string;
  street_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  full_name?: string;
  phone_number?: string;
}

// Type for the form values
type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Signup form component
 */
const SignupFormComponent = ({
  onSuccess,
  onSwitchToLogin,
}: SignupFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const signup = useSignup();

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
  const [isMounted, setIsMounted] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(
    ACCOUNT_TYPES.INDIVIDUAL
  );
  const [contacts, setContacts] = useState<ContactFormValues[]>([]);

  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<AddressState[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // For the entire form, track a single selected country and state ID
  // This is a compromise to maintain React hooks rules
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
    null
  );
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  // We'll store selected country/state/city values for each address index
  const [addressLocationValues, setAddressLocationValues] = useState<
    Record<
      number,
      {
        countryCode: string;
        stateName: string;
        cityName: string;
      }
    >
  >({});

  // For new address form
  const [newAddressCountryId, setNewAddressCountryId] = useState<number | null>(
    null
  );
  const [newAddressStateId, setNewAddressStateId] = useState<number | null>(
    null
  );

  // Initialize location hooks at the top level
  const location = useLocation();
  const { data: countries = [], isLoading: isLoadingCountries } =
    location.useCountries();
  const { data: states = [], isLoading: isLoadingStates } = location.useStates(
    selectedCountryId || 0
  );
  const { data: cities = [], isLoading: isLoadingCities } = location.useCities(
    selectedStateId || 0
  );

  // For new address form
  const { data: newAddressStates = [], isLoading: isLoadingNewStates } =
    location.useStates(newAddressCountryId || 0);
  const { data: newAddressCities = [], isLoading: isLoadingNewCities } =
    location.useCities(newAddressStateId || 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset showAddressForm when addresses change
  useEffect(() => {
    if (addresses.length === 0) {
      setShowAddressForm(false);
    }
  }, [addresses]);

  // React Hook Form with discriminated union type support
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      account_type: ACCOUNT_TYPES.INDIVIDUAL,
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
      // Business fields will be added conditionally when account type changes
    },
  });

  // Watch the account type to update the form accordingly
  const currentAccountType = watch("account_type");

  useEffect(() => {
    if (currentAccountType !== accountType) {
      setAccountType(currentAccountType as AccountType);
      // Reset additional forms when switching account types
      if (currentAccountType === ACCOUNT_TYPES.INDIVIDUAL) {
        setContacts([]);
        setAddresses([]);
        setShowAddressForm(false);
      }
    }
  }, [currentAccountType, accountType]);

  // Additional contact form handlers
  const addContact = () => {
    setContacts([
      ...contacts,
      { first_name: "", last_name: "", email: "", job_title: "", phone: "" },
    ]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (
    index: number,
    field: keyof ContactFormValues,
    value: string
  ) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  // Address form handlers
  const toggleAddressForm = () => {
    if (!showAddressForm) {
      // Initialize a new address and add it to the array
      const newAddress: AddressState = {
        address_type: "BILLING",
        street_1: "", // Required but starts empty for user input
        street_2: "",
        city: "", // Required but starts empty for user input
        state_province: "", // Required but starts empty for user input
        postal_code: "", // Required but starts empty for user input
        country: "", // Required but starts empty for user input
        full_name: "",
        phone_number: "",
      };
      setAddresses([...addresses, newAddress]);
    }
    setShowAddressForm(!showAddressForm);
  };

  /**
   * Update a field in an address at the given index
   */
  const updateAddress = (index: number, field: string, value: string): void => {
    const updatedAddresses = [...addresses];
    updatedAddresses[index] = {
      ...updatedAddresses[index],
      [field]: value,
    };
    setAddresses(updatedAddresses);

    // Update location values tracking for this address
    if (["country", "state_province", "city"].includes(field)) {
      setAddressLocationValues((prev) => ({
        ...prev,
        [index]: {
          ...(prev[index] || { countryCode: "", stateName: "", cityName: "" }),
          ...(field === "country"
            ? { countryCode: value, stateName: "", cityName: "" }
            : {}),
          ...(field === "state_province"
            ? { stateName: value, cityName: "" }
            : {}),
          ...(field === "city" ? { cityName: value } : {}),
        },
      }));

      // Set the active selected IDs for hooks (only the most recently updated)
      if (field === "country") {
        const country = countries.find((c) => c.code === value);
        if (country) {
          setSelectedCountryId(country.id);
          setSelectedStateId(null);
        }
      } else if (field === "state_province") {
        const state = states.find((s) => s.name === value);
        if (state) {
          setSelectedStateId(state.id);
        }
      }
    }
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (formData: SignupFormValues): Promise<void> => {
    setErrorMessage(null);
    setFieldErrors({});
    console.log("Form data submitted:", formData);

    try {
      // Validate addresses if any exist
      if (addresses.length > 0) {
        const invalidAddresses = addresses.filter(
          (addr) =>
            !addr.street_1 ||
            !addr.city ||
            !addr.state_province ||
            !addr.postal_code ||
            !addr.country
        );

        if (invalidAddresses.length > 0) {
          setErrorMessage(t("auth.addressFieldsRequired"));
          return;
        }
      }

      // Prepare the final submission data
      const submitData: SignupCredentials = {
        // Common fields
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        password_confirm: formData.password_confirm,
        account_type: formData.account_type,
        // Business fields (if applicable)
        ...(formData.account_type === ACCOUNT_TYPES.BUSINESS && {
          business_name: formData.business_name,
          legal_name: formData.legal_name,
          company_size: formData.company_size,
          website: formData.website,
          industry: formData.industry,
          tax_id: formData.tax_id,
          mobile: formData.mobile,
          ...(contacts.length > 0 && { contacts }),
        }),
        // Add addresses if any exist
        ...(addresses.length > 0 && { addresses }),
      };

      // The useSignup hook already handles token storage and auth state update in its onSuccess callback
      try {
        await signup.mutateAsync(submitData);
      } catch (error: any) {
        // Handle API validation errors
        if (error.response?.data) {
          // Handle field-specific errors
          const apiErrors = error.response.data;
          const formattedErrors: Record<string, string[]> = {};

          // Process each field with errors
          Object.entries(apiErrors).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              formattedErrors[field] = messages;
            } else if (typeof messages === "string") {
              formattedErrors[field] = [messages];
            } else if (typeof messages === "object") {
              // Handle nested errors (e.g., password validation)
              Object.entries(messages as Record<string, string[]>).forEach(
                ([subField, subMessages]) => {
                  const fullField = `${field}_${subField}`;
                  formattedErrors[fullField] = Array.isArray(subMessages)
                    ? subMessages
                    : [subMessages as string];
                }
              );
            }
          });

          setFieldErrors(formattedErrors);

          // Set a general error message if no specific field errors
          if (Object.keys(formattedErrors).length === 0) {
            setErrorMessage(
              error.response.data.detail || t("auth.registrationFailed")
            );
          }
        } else {
          // Handle network or other errors
          setErrorMessage(error.message || t("auth.registrationFailed"));
        }
        throw error; // Re-throw to let react-hook-form handle it
      }

      if (isMounted && pathname?.endsWith("/signup/")) {
        // Extract tenant slug from URL path instead of using getTenantSlug()
        const urlTenantSlug = pathname?.split("/")[1] || tenantSlug;
        router.push(`/${urlTenantSlug}/store`);
      }

      // Call the onSuccess callback if provided
      onSuccess?.();
    } catch (error: any) {
      console.error("Signup error:", error);
      // Handle validation errors from the API
      if (error?.response?.data?.email) {
        // Handle email validation error specifically
        setErrorMessage(
          Array.isArray(error.response.data.email)
            ? error.response.data.email[0]
            : error.response.data.email
        );
      } else if (error?.response?.data?.contacts) {
        setErrorMessage(error.response.data.contacts);
      } else if (error?.response?.data?.business_name) {
        setErrorMessage(
          Array.isArray(error.response.data.business_name)
            ? error.response.data.business_name[0]
            : error.response.data.business_name
        );
      } else if (error?.response?.data?.website) {
        setErrorMessage(
          Array.isArray(error.response.data.website)
            ? error.response.data.website[0]
            : error.response.data.website
        );
      } else if (error?.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
      } else if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("auth.signupFailed"));
      }
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "800px", // Increased width for the two-column layout
        margin: "2rem auto",
        borderRadius: "16px",
        maxHeight: "90vh", // Sets the maximum height to 90% of the viewport height
        overflowY: "auto",
        scrollbarWidth: "none", // Firefox
        "&::-webkit-scrollbar": {
          display: "none", // Chrome, Safari
        },
      }}
    >
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
        {/* Account Type Selection */}
        <FormControl component="fieldset" sx={{ mb: 2, width: "100%" }}>
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
        <Grid container rowSpacing={0} columnSpacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
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

          <Grid item xs={12} sm={6}>
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
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

          <Grid item xs={12} sm={6}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  size="small"
                  label={t("auth.email")}
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={
                    errors.email ? t(`auth.${errors.email.message}`) : ""
                  }
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <PhoneInputField
              name="phone"
              label={t("auth.phone")}
              control={control} // Add this line
              error={!!errors.phone}
              helperText={errors.phone?.message}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  size="small"
                  name="password"
                  label={t("auth.password")}
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={
                    errors.password ? t(`auth.${errors.password.message}`) : ""
                  }
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="password_confirm"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  size="small"
                  name="password_confirm"
                  label={t("auth.confirmPassword")}
                  type="password"
                  id="password_confirm"
                  autoComplete="new-password"
                  error={!!errors.password_confirm}
                  helperText={
                    errors.password_confirm
                      ? t(`auth.${errors.password_confirm.message}`)
                      : ""
                  }
                />
              )}
            />
          </Grid>
        </Grid>

        {/* Business-specific Fields */}
        {currentAccountType === ACCOUNT_TYPES.BUSINESS && (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t("auth.businessInformation")}
            </Typography>

            <Grid container columnSpacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="business_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      required
                      fullWidth
                      size="small"
                      id="business_name"
                      label={t("auth.businessName")}
                      error={!!(errors as any)?.business_name}
                      helperText={
                        (errors as any)?.business_name
                          ? t(`auth.${(errors as any)?.business_name.message}`)
                          : ""
                      }
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="legal_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      fullWidth
                      size="small"
                      id="legal_name"
                      label={t("auth.legalName")}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="company_size"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      margin="normal"
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

              <Grid item xs={12} sm={6}>
                <Controller
                  name="industry"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      fullWidth
                      size="small"
                      id="industry"
                      label={t("auth.industry")}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="tax_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      fullWidth
                      size="small"
                      id="tax_id"
                      label={t("auth.taxId")}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="website"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
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

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t("auth.primaryContactInformation")}
            </Typography>
          </>
        )}

        {/* Additional Business Contacts */}
        {currentAccountType === ACCOUNT_TYPES.BUSINESS && (
          <Box sx={{ my: 3 }}>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                {t("auth.additionalContacts")}
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                onClick={addContact}
              >
                {t("auth.addContact")}
              </Button>
            </Box>

            {contacts.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {t("auth.noAdditionalContacts")}
              </Typography>
            )}

            {contacts.map((contact, index) => (
              <Paper key={index} elevation={0} sx={{}}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    {t("auth.contact")} #{index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeContact(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container rowSpacing={0} columnSpacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.firstName")}
                      value={contact.first_name}
                      onChange={(e) =>
                        updateContact(index, "first_name", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.lastName")}
                      value={contact.last_name}
                      onChange={(e) =>
                        updateContact(index, "last_name", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.email")}
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(index, "email", e.target.value)
                      }
                      margin="normal"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.phone")}
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(index, "phone", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.jobTitle")}
                      value={contact.job_title}
                      onChange={(e) =>
                        updateContact(index, "job_title", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        )}

        {/* Address Information */}
        {currentAccountType === ACCOUNT_TYPES.BUSINESS && (
          <Box sx={{ my: 3 }}>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                {t("auth.addressInformation")}
              </Typography>
              <Button
                startIcon={<HomeIcon />}
                variant="outlined"
                size="small"
                onClick={toggleAddressForm}
              >
                {t("auth.addAddress")}
              </Button>
            </Box>

            {addresses.length === 0 && !showAddressForm && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {t("auth.noAddressProvided")}
              </Typography>
            )}

            {addresses.map((address, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  mb: 3,
                  p: 2,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    {address.address_type === "BILLING"
                      ? t("auth.billingAddress")
                      : t("auth.shippingAddress")}{" "}
                    #{index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeAddress(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container rowSpacing={0} columnSpacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={t("auth.addressType")}
                      value={address.address_type}
                      onChange={(e) =>
                        updateAddress(index, "address_type", e.target.value)
                      }
                      margin="normal"
                    >
                      <MenuItem value="BILLING">
                        {t("auth.billingAddress")}
                      </MenuItem>
                      <MenuItem value="SHIPPING">
                        {t("auth.shippingAddress")}
                      </MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.fullName")}
                      value={address.full_name}
                      onChange={(e) =>
                        updateAddress(index, "full_name", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.streetAddress1")}
                      value={address.street_1}
                      onChange={(e) =>
                        updateAddress(index, "street_1", e.target.value)
                      }
                      margin="normal"
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.streetAddress2")}
                      value={address.street_2}
                      onChange={(e) =>
                        updateAddress(index, "street_2", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={countries}
                      getOptionLabel={(option) => option.name || ""}
                      loading={isLoadingCountries}
                      isOptionEqualToValue={(option, value) =>
                        option.code === value.code
                      }
                      onChange={(_, newValue) => {
                        updateAddress(
                          index,
                          "country",
                          newValue ? newValue.code : ""
                        );
                      }}
                      value={
                        address.country
                          ? countries.find((c) => c.code === address.country) ||
                            null
                          : null
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("auth.country")}
                          variant="outlined"
                          size="small"
                          margin="normal"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingCountries ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={states}
                      getOptionLabel={(option) => option.name || ""}
                      loading={isLoadingStates}
                      disabled={!address.country}
                      isOptionEqualToValue={(option, value) =>
                        option.name === value.name
                      }
                      onChange={(_, newValue) => {
                        updateAddress(
                          index,
                          "state_province",
                          newValue ? newValue.name : ""
                        );
                      }}
                      value={
                        address.state_province && address.country
                          ? states.find(
                              (s) => s.name === address.state_province
                            ) || null
                          : null
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("auth.stateProvince")}
                          variant="outlined"
                          size="small"
                          margin="normal"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingStates && address.country ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={cities}
                      getOptionLabel={(option) => option.name || ""}
                      loading={isLoadingCities}
                      disabled={!address.state_province}
                      isOptionEqualToValue={(option, value) =>
                        option.name === value.name
                      }
                      onChange={(_, newValue) => {
                        updateAddress(
                          index,
                          "city",
                          newValue ? newValue.name : ""
                        );
                      }}
                      value={
                        address.city && address.state_province
                          ? cities.find((c) => c.name === address.city) || null
                          : null
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("auth.city")}
                          variant="outlined"
                          size="small"
                          margin="normal"
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingCities && address.state_province ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.postalCode")}
                      value={address.postal_code}
                      onChange={(e) =>
                        updateAddress(index, "postal_code", e.target.value)
                      }
                      margin="normal"
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("auth.phoneNumber")}
                      value={address.phone_number}
                      onChange={(e) =>
                        updateAddress(index, "phone_number", e.target.value)
                      }
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        )}

        {/* <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={signup.isPending}
            sx={{ mt: 3, mb: 2 }}
          >
            {signup.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("auth.signupButton")
            )}
          </Button>
        </Box> */}

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
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
        {/* <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link href="/login" variant="body2">
            {t('auth.alreadyHaveAccount')}
          </Link>
        </Box> */}
      </Box>
      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Typography component="span" sx={{ fontSize: "0.9rem" }}>
          {t("auth.alreadyHaveAccount")}{" "}
        </Typography>
        <MuiLink
          component="button" // Render as a button
          onClick={onSwitchToLogin} // Call the passed-in function
          sx={{
            color: "primary.main",
            fontWeight: "bold",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            // Reset button styles to look like a link
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
          }}
        >
          Login
        </MuiLink>
      </Box>
    </Paper>
  );
};

// Export with no SSR to avoid hydration issues
export const SignupForm = dynamic(() => Promise.resolve(SignupFormComponent), {
  ssr: false,
});
