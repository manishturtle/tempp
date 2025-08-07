"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";

// MUI Components
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CircularProgress from "@mui/material/CircularProgress";

// Icons
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";

// API Hooks
import {
  useCreateOpportunity,
  useUpdateOpportunity,
  useFetchAllAccounts,
  useFetchStaffUsers,
  useFetchContactsByAccount,
  useFetchAllOpportunityStatuses,
  useFetchAllOpportunityRoles,
  useServiceSubCategories,
  useFetchOpportunityTypes,
  useFetchOpportunityLeadSources,
} from "@/app/hooks/api/opportunities";

// Types
import { Opportunity } from "@/app/types/opportunities";
import { Account } from "@/app/types/customers";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

// Staff user type definition from API
interface StaffUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  current_user: number;
  users: any[];
}

// Service subcategory definition
interface ServiceSubCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Team member assignment form schema
const teamMemberSchema = z.object({
  user_id: z.number(),
  role_id: z.number(),
  assignment_start_date: z.string(),
  assignment_end_date: z.string().optional(),
  status: z.string(),
});

// Status options for team member assignment
const TEAM_MEMBER_STATUSES = ["ASSIGNED", "UNASSIGNED"];

// Extended Opportunity type to include fields we need that might not be in the base type
interface ExtendedOpportunity
  extends Omit<Opportunity, "account" | "primary_contact" | "status"> {
  probability?: number;
  currency?: string;
  // Define team members to account for both API response format and form data format
  team_members?: Array<{
    id?: number;
    user_id: number;
    role_id?: number;
    role?: number;
    role_name?: string;
    assignment_start_date?: string;
    assignment_end_date?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    updated_by?: number;
  }>;
  // Override the base Opportunity properties to support both object and ID formats
  account: { id: number | string; name: string } | any;
  account_id?: number | string;
  primary_contact?: {
    id: number | string;
    first_name: string;
    last_name: string;
  } | null;
  primary_contact_id?: number | string;
  status?: { id: number | string; name: string; type?: string } | null;
  status_id?: number | string;
  type_id?: number | string;
  lead_source_id?: number | string;
}

// Form validation schema
const opportunitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  account_id: z.string().or(z.number()).optional(),
  primary_contact_id: z.string().or(z.number()).optional(),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  currency: z.string().default("INR"),
  probability: z.coerce
    .number()
    .min(0, "Probability must be a positive number")
    .max(100, "Probability must not exceed 100"),
  close_date: z.string(),
  status_id: z.string().or(z.number()),
  type_id: z.string().or(z.number()).optional(),
  lead_source_id: z.string().or(z.number()).optional(),
  owner: z.number(),
  description: z.string().optional(),
  team_members: z.array(teamMemberSchema).optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

export interface OpportunityFormRef {
  submitForm: () => void;
}

interface OpportunityFormProps {
  initialData: ExtendedOpportunity | null;
  onSubmit: () => void;
  isViewMode?: boolean;
  staffUsersData?: StaffUser[];
  isLoadingStaffUsers?: boolean;
}

const OpportunityForm = React.forwardRef<
  OpportunityFormRef,
  OpportunityFormProps
>(
  (
    {
      initialData,
      onSubmit,
      isViewMode = false,
      staffUsersData,
      isLoadingStaffUsers,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(
      null
    );
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
    const [selectedServiceSubCategory, setSelectedServiceSubCategory] =
      useState<ServiceSubCategory | null>(null);
    const [newTeamMember, setNewTeamMember] = useState<{
      user_id?: number;
      role_id?: number;
      status?: string;
      assignment_start_date: string;
      assignment_end_date: string;
    }>({
      assignment_start_date: format(new Date(), "yyyy-MM-dd"),
      assignment_end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    });

    // Fetch data using custom hooks
    const { data: accounts = [], isLoading: isLoadingAccounts } =
      useFetchAllAccounts();
    const { data: contactsData = [], isLoading: isLoadingContacts } =
      useFetchContactsByAccount(
        selectedAccount?.id
          ? selectedAccount.id.toString()
          : initialData?.account_id
          ? initialData.account_id.toString()
          : null
      );
    const { data: statusesData = [], isLoading: isLoadingStatuses } =
      useFetchAllOpportunityStatuses();
    const { data: rolesData = [], isLoading: isLoadingRoles } =
      useFetchAllOpportunityRoles();
    const {
      data: serviceSubCategoriesResponse,
      isLoading: isLoadingServiceSubCategories,
    } = useServiceSubCategories();

    // Fetch all opportunity types
    const { data: typesData = [], isLoading: isLoadingTypes } =
      useFetchOpportunityTypes({ all_records: true });

    // Fetch all opportunity lead sources
    const { data: leadSourcesData = [], isLoading: isLoadingLeadSources } =
      useFetchOpportunityLeadSources({ all_records: true });

    // Extract the results array from the response or provide a fallback empty array
    const serviceSubCategories = serviceSubCategoriesResponse || [];

    // Extract data from API responses
    const staffUsersList: StaffUser[] = staffUsersData?.users || [];
    const currentUserId: number = staffUsersData?.current_user || 0;

    // Set up mutations
    const createOpportunity = useCreateOpportunity();
    const updateOpportunity = useUpdateOpportunity();

    // Initialize form with react-hook-form and zod validation
    const {
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors, isDirty, isSubmitting },
      reset,
    } = useForm<OpportunityFormData>({
      resolver: zodResolver(opportunitySchema),
      defaultValues: {
        name: initialData?.name || "",
        account_id: initialData?.account_id || undefined,
        primary_contact_id: initialData?.primary_contact_id || undefined,
        amount: initialData?.amount || 0,
        currency: initialData?.currency || "INR",
        probability: initialData?.probability || 0,
        close_date: initialData?.close_date || format(new Date(), "yyyy-MM-dd"),
        status_id: initialData?.status_id || "",
        owner: initialData?.owner || currentUserId,
        description: initialData?.description || "",
        team_members: initialData?.team_members || [],
      },
    });

    // Set up field array for team members
    const { fields, append, remove, update } = useFieldArray({
      control,
      name: "team_members",
    });

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        // Handle nested properties from API response
        reset({
          name: initialData.name,
          account_id: initialData.account?.id || initialData.account_id,
          primary_contact_id:
            initialData.primary_contact?.id || initialData.primary_contact_id,
          amount: initialData.amount,
          currency: initialData.currency || "INR",
          probability: initialData.probability || 0,
          close_date: initialData.close_date,
          status_id: initialData.status?.id || initialData.status_id,
          owner: initialData.owner,
          description: initialData.description || "",
          type_id: initialData.type?.id || initialData.type_id,
          lead_source_id:
            initialData.lead_source?.id || initialData.lead_source_id,
          // Map team members to match the form structure
          team_members: initialData.team_members
            ? initialData.team_members.map((member) => {
                // Use type assertion to ensure TypeScript understands the member structure
                const typedMember = member as {
                  user_id: number;
                  role?: number;
                  role_id?: number;
                  status?: string;
                  assignment_start_date?: string;
                  assignment_end_date?: string;
                };

                return {
                  user_id: typedMember.user_id,
                  role_id:
                    typedMember.role !== undefined
                      ? typedMember.role
                      : typedMember.role_id,
                  status: typedMember.status || "ASSIGNED",
                  assignment_start_date:
                    typedMember.assignment_start_date || "",
                  assignment_end_date: typedMember.assignment_end_date || "",
                };
              })
            : [],
        });

        // If we have an account, set the selectedAccount
        if ((initialData.account?.id || initialData.account_id) && accounts) {
          const accountId = initialData.account?.id || initialData.account_id;
          const account = accounts.find((a) => a.id === accountId);
          setSelectedAccount(account || null);
        }
      } else if (currentUserId) {
        // For new opportunity, set owner to current user
        setValue("owner", currentUserId);
      }
    }, [initialData, reset, accounts, currentUserId, setValue]);

    // Handle form validation and submission
    const processSubmit = async (data: OpportunityFormData): Promise<void> => {
      try {
        if (initialData?.id) {
          // Update existing opportunity
          // Extract team_members to rename to team_members_data
          const { team_members, ...restData } = data;

          await updateOpportunity.mutateAsync({
            id: initialData.id,
            ...restData,
            team_members_data: team_members,
          });
          onSubmit();
        } else {
          if (!selectedServiceSubCategory) {
            console.error(
              "Service subcategory is required for new opportunities"
            );
            return;
          }

          // Form is validated and has a service subcategory, submit to API
          // Extract team_members to rename to team_members_data
          const { team_members, ...restData } = data;

          console.log("Submitting opportunity with payload:", {
            ...restData,
            team_members_data: team_members,
            service_sub_category_id: selectedServiceSubCategory.id,
          });

          await createOpportunity.mutateAsync({
            ...restData,
            team_members_data: team_members,
            service_sub_category_id: selectedServiceSubCategory.id,
          });
          onSubmit();
        }
      } catch (error) {
        console.error("Error processing opportunity:", error);
      }
    };

    // Expose submitForm method to parent component through ref
    React.useImperativeHandle(ref, () => ({
      submitForm: () => {
        processSubmit(watch());
      },
    }));

    // Handle account selection change
    const handleAccountChange = (account: Account | null): void => {
      setSelectedAccount(account);
      setValue("account_id", account?.id || undefined);
      // Clear contact when account changes
      setValue("primary_contact_id", undefined);
    };

    // Team member management functions
    const handleStartAddingTeamMember = (): void => {
      setIsAddingTeamMember(true);
      setNewTeamMember({
        assignment_start_date: format(new Date(), "yyyy-MM-dd"),
        assignment_end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      });
    };

    const handleCancelAddingTeamMember = (): void => {
      setIsAddingTeamMember(false);
      setNewTeamMember({
        assignment_start_date: format(new Date(), "yyyy-MM-dd"),
        assignment_end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      });
    };

    const handleConfirmAddTeamMember = (): void => {
      if (
        !newTeamMember.user_id ||
        !newTeamMember.role_id ||
        !newTeamMember.status ||
        !newTeamMember.assignment_start_date
      ) {
        return; // Don't add if required fields are missing
      }

      append({
        user_id: newTeamMember.user_id,
        role_id: newTeamMember.role_id,
        status: newTeamMember.status,
        assignment_start_date: newTeamMember.assignment_start_date,
        assignment_end_date: newTeamMember.assignment_end_date,
      });

      setIsAddingTeamMember(false);
      setNewTeamMember({
        assignment_start_date: format(new Date(), "yyyy-MM-dd"),
        assignment_end_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      });
    };

    const handleStartEditingRow = (index: number): void => {
      setEditingRowIndex(index);
    };

    const handleCancelEditingRow = (): void => {
      setEditingRowIndex(null);
    };

    const handleConfirmEditRow = (index: number): void => {
      const field = fields[index];
      // Check if required fields are present
      if (
        !field.user_id ||
        !field.role_id ||
        !field.status ||
        !field.assignment_start_date
      ) {
        return; // Don't save if required fields are missing
      }
      setEditingRowIndex(null);
    };

    // Get staff user name by ID
    const getStaffUserName = (userId: number): string => {
      const user = staffUsersList.find((u: StaffUser) => u.id === userId);
      return user ? user.full_name || user.email : `User ID: ${userId}`;
    };

    // Loading state
    const isLoading =
      isLoadingAccounts ||
      isLoadingStaffUsers ||
      isLoadingStatuses ||
      isLoadingRoles;

    if (isLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <Grid container rowSpacing={1} columnSpacing={2}>
          {/* Basic Information */}
          <Grid size={12}>
            <Typography variant="h6" gutterBottom>
              {t("opportunityForm.basicInformation", "Basic Information")}
            </Typography>
          </Grid>

          {/* Opportunity Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("opportunityForm.name", "Name")}
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Account */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="account_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={selectedAccount}
                  onChange={(_, newValue) => {
                    handleAccountChange(newValue);
                  }}
                  options={accounts}
                  getOptionLabel={(option) => option.name || ""}
                  renderOption={(props, option) => (
                    <li {...props} key={`account-${option.id}`}>
                      {option.name}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("opportunityForm.account", "Account")}
                      error={!!errors.account_id}
                      helperText={errors.account_id?.message}
                    />
                  )}
                  disabled={isViewMode || !!initialData?.id}
                />
              )}
            />
          </Grid>

          {/* Primary Contact */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="primary_contact_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    contactsData.find(
                      (contact) =>
                        field.value !== undefined &&
                        contact.id === Number(field.value)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || undefined);
                  }}
                  options={contactsData}
                  getOptionLabel={(option) =>
                    option.full_name || option.email || ""
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={`contact-${option.id}`}>
                      {option.full_name || option.email || ""}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t(
                        "opportunityForm.primaryContact",
                        "Primary Contact"
                      )}
                      error={!!errors.primary_contact_id}
                      helperText={errors.primary_contact_id?.message}
                    />
                  )}
                  disabled={
                    isViewMode ||
                    !selectedAccount ||
                    contactsData.length === 0 ||
                    !!initialData?.id
                  }
                />
              )}
            />
          </Grid>

          {/* Status */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="status_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    statusesData.find(
                      (status) =>
                        field.value !== undefined &&
                        status.id === Number(field.value)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || undefined);
                  }}
                  options={statusesData}
                  getOptionLabel={(option) => option.name || ""}
                  renderOption={(props, option) => (
                    <li {...props} key={`status-${option.id}`}>
                      {option.name || ""}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("opportunityForm.status", "Status")}
                      required
                      error={!!errors.status_id}
                      helperText={errors.status_id?.message}
                    />
                  )}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Owner */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="owner"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    staffUsersList.find(
                      (user: StaffUser) =>
                        field.value !== undefined &&
                        user.id === Number(field.value)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || undefined);
                  }}
                  options={staffUsersList}
                  getOptionLabel={(option) =>
                    option.full_name || option.email || ""
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={`owner-${option.id}`}>
                      {option.full_name || option.email || ""}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("opportunityForm.owner", "Owner")}
                      required
                      error={!!errors.owner}
                      helperText={errors.owner?.message}
                    />
                  )}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Opportunity Type */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="type_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    typesData.find(
                      (type) =>
                        field.value !== undefined &&
                        type.id === Number(field.value)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || undefined);
                  }}
                  options={typesData}
                  getOptionLabel={(option) => option.name || ""}
                  renderOption={(props, option) => (
                    <li {...props} key={`type-${option.id}`}>
                      {option.name || ""}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("opportunityForm.type", "Opportunity Type")}
                      error={!!errors.type_id}
                      helperText={errors.type_id?.message}
                    />
                  )}
                  disabled={isViewMode || isLoadingTypes}
                />
              )}
            />
          </Grid>

          {/* Lead Source */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="lead_source_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    leadSourcesData.find(
                      (source) =>
                        field.value !== undefined &&
                        source.id === Number(field.value)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || undefined);
                  }}
                  options={leadSourcesData}
                  getOptionLabel={(option) => option.name || ""}
                  renderOption={(props, option) => (
                    <li {...props} key={`lead-source-${option.id}`}>
                      {option.name || ""}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("opportunityForm.leadSource", "Lead Source")}
                      error={!!errors.lead_source_id}
                      helperText={errors.lead_source_id?.message}
                    />
                  )}
                  disabled={isViewMode || isLoadingLeadSources}
                />
              )}
            />
          </Grid>

          {/* Amount */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("opportunityForm.amount", "Amount")}
                  fullWidth
                  type="number"
                  onWheel={(e) =>
                    e.target instanceof HTMLElement && e.target.blur()
                  }
                  slotProps={{
                    htmlInput: { min: 0, step: 0.01 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {watch("currency")}
                        </InputAdornment>
                      ),
                    },
                  }}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value < 0) {
                      field.onChange(0);
                    } else {
                      field.onChange(value);
                    }
                  }}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Probability */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="probability"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("opportunityForm.probability", "Probability (%)")}
                  fullWidth
                  type="number"
                  onWheel={(e) =>
                    e.target instanceof HTMLElement && e.target.blur()
                  }
                  slotProps={{
                    htmlInput: { min: 0, max: 100 },
                  }}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > 100) {
                      field.onChange(100);
                    } else if (value < 0) {
                      field.onChange(0);
                    } else {
                      field.onChange(value);
                    }
                  }}
                  error={!!errors.probability}
                  helperText={errors.probability?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Close Date */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="close_date"
              control={control}
              render={({ field }) => (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label={t("opportunityForm.closeDate", "Close Date")}
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.close_date,
                        helperText: errors.close_date?.message,
                        disabled: isViewMode,
                      },
                    }}
                    format="dd/MM/yyyy"
                  />
                </LocalizationProvider>
              )}
            />
          </Grid>

          {/* Description */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  rows={2}
                  fullWidth
                  label={t("opportunityForm.description", "Description")}
                  variant="outlined"
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Service Subcategory dropdown - shown after validation */}
          {!initialData?.id && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth sx={{ mt: 0 }}>
                <InputLabel id="service-subcategory-label">
                  {t(
                    "opportunityForm.serviceSubCategory",
                    "Service Subcategory"
                  )}
                </InputLabel>
                <Select
                  labelId="service-subcategory-label"
                  value={selectedServiceSubCategory?.id || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selected =
                      serviceSubCategories.find(
                        (category: ServiceSubCategory) =>
                          category.id === Number(selectedId) ||
                          category.id === selectedId
                      ) || null;
                    setSelectedServiceSubCategory(selected);
                  }}
                  label={t(
                    "opportunityForm.serviceSubCategory",
                    "Service Subcategory"
                  )}
                  disabled={
                    isLoadingServiceSubCategories ||
                    !watch("close_date") ||
                    !watch("probability") ||
                    !watch("amount") ||
                    !watch("owner") ||
                    !watch("status_id") ||
                    !watch("primary_contact_id") ||
                    !watch("account_id") ||
                    !watch("name")
                  }
                >
                  {serviceSubCategories.map((category: ServiceSubCategory) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {isLoadingServiceSubCategories
                    ? t("opportunityForm.loading", "Loading...")
                    : (() => {
                        // Check which fields are not filled
                        const missingFields = [];
                        if (!watch("name")) missingFields.push("Name");
                        if (!watch("account_id")) missingFields.push("Account");
                        if (!watch("primary_contact_id"))
                          missingFields.push("Primary Contact");
                        if (!watch("status_id")) missingFields.push("Status");
                        if (!watch("owner")) missingFields.push("Owner");
                        if (!watch("amount")) missingFields.push("Amount");
                        if (!watch("probability"))
                          missingFields.push("Probability");
                        if (!watch("close_date"))
                          missingFields.push("Close Date");

                        // If all fields are filled, show the default message
                        if (missingFields.length === 0) {
                          return t(
                            "opportunityForm.selectSubCategory",
                            "Select a service subcategory"
                          );
                        }

                        // Otherwise, show which fields need to be filled
                        return t(
                          "opportunityForm.fillFieldsFirst",
                          `Please fill these fields first: ${missingFields.join(
                            ", "
                          )}`
                        );
                      })()}
                </FormHelperText>
              </FormControl>
            </Grid>
          )}

          {/* Team Members */}
          <Grid size={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                {t("opportunityForm.teamMembers", "Team Members")}
              </Typography>
              {fields.length > 0 && !isAddingTeamMember && !isViewMode && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleStartAddingTeamMember}
                  sx={{ mt: 1 }}
                >
                  {t("opportunityForm.addTeamMember", "Add Team Member")}
                </Button>
              )}
            </Box>

            {fields.length === 0 && !isAddingTeamMember ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {t(
                    "opportunityForm.noTeamMembers",
                    "No team members assigned"
                  )}
                </Typography>
                {!isViewMode && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleStartAddingTeamMember}
                  >
                    {t("opportunityForm.addTeamMember", "Add Team Member")}
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ width: "20%" }}>
                        {t("opportunityForm.name", "Name")}
                      </TableCell>
                      <TableCell sx={{ width: "15%" }}>
                        {t("opportunityForm.role", "Role")}
                      </TableCell>
                      <TableCell sx={{ width: "15%" }}>
                        {t("opportunityForm.status", "Status")}
                      </TableCell>
                      <TableCell sx={{ width: "15%" }}>
                        {t("opportunityForm.assignmentStartDate", "Start Date")}
                      </TableCell>
                      <TableCell sx={{ width: "15%" }}>
                        {t("opportunityForm.assignmentEndDate", "End Date")}
                      </TableCell>
                      {!isViewMode && (
                        <TableCell align="center" sx={{ width: "10%" }}>
                          {t("opportunityForm.actions", "Actions")}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => {
                      const isEditing = editingRowIndex === index;
                      return (
                        <TableRow key={field.id}>
                          <TableCell sx={{ width: "20%" }}>
                            {isEditing ? (
                              <Autocomplete
                                value={
                                  staffUsersList.find(
                                    (user) => user.id === field.user_id
                                  ) || null
                                }
                                onChange={(_, newValue) => {
                                  update(index, {
                                    ...field,
                                    user_id: newValue?.id || 0,
                                  });
                                }}
                                options={staffUsersList.filter(
                                  (user) =>
                                    // Filter out users already selected in other rows
                                    !fields.some(
                                      (f, i) =>
                                        i !== index && f.user_id === user.id
                                    )
                                )}
                                getOptionLabel={(option) =>
                                  option.full_name || option.email || ""
                                }
                                renderOption={(props, option) => (
                                  <li
                                    {...props}
                                    key={`team-member-${option.id}`}
                                  >
                                    {option.full_name || option.email || ""}
                                  </li>
                                )}
                                renderInput={(params) => (
                                  <TextField {...params} size="small" />
                                )}
                                disabled={isViewMode}
                                fullWidth
                              />
                            ) : (
                              getStaffUserName(field.user_id)
                            )}
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            {isEditing ? (
                              <Autocomplete
                                value={
                                  rolesData.find(
                                    (role) => role.id === field.role_id
                                  ) || null
                                }
                                onChange={(_, newValue) => {
                                  update(index, {
                                    ...field,
                                    role_id:
                                      typeof newValue === "string"
                                        ? parseInt(newValue, 10)
                                        : newValue?.id,
                                  });
                                }}
                                options={rolesData}
                                getOptionLabel={(option) => option.name || ""}
                                renderOption={(props, option) => (
                                  <li {...props} key={`role-${option.id}`}>
                                    {option.name || ""}
                                  </li>
                                )}
                                renderInput={(params) => (
                                  <TextField {...params} size="small" />
                                )}
                                disabled={isViewMode}
                                fullWidth
                              />
                            ) : (
                              rolesData.find(
                                (role) => role.id === field.role_id
                              )?.name || ""
                            )}
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            {isEditing ? (
                              <Autocomplete
                                value={field.status || ""}
                                onChange={(_, newValue) => {
                                  update(index, {
                                    ...field,
                                    status: newValue || "",
                                  });
                                }}
                                options={TEAM_MEMBER_STATUSES}
                                renderOption={(props, option) => (
                                  <li {...props} key={`status-${option}`}>
                                    {option}
                                  </li>
                                )}
                                renderInput={(params) => (
                                  <TextField {...params} size="small" />
                                )}
                                disabled={isViewMode}
                                fullWidth
                              />
                            ) : (
                              field.status
                            )}
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            {isEditing ? (
                              <LocalizationProvider
                                dateAdapter={AdapterDateFns}
                              >
                                <DatePicker
                                  value={
                                    field.assignment_start_date
                                      ? new Date(field.assignment_start_date)
                                      : null
                                  }
                                  onChange={(date) => {
                                    update(index, {
                                      ...field,
                                      assignment_start_date: date
                                        ? format(date, "yyyy-MM-dd")
                                        : "",
                                    });
                                  }}
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                    },
                                  }}
                                  format="dd/MM/yyyy"
                                />
                              </LocalizationProvider>
                            ) : (
                              field.assignment_start_date
                            )}
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            {isEditing ? (
                              <LocalizationProvider
                                dateAdapter={AdapterDateFns}
                              >
                                <DatePicker
                                  value={
                                    field.assignment_end_date
                                      ? new Date(field.assignment_end_date)
                                      : null
                                  }
                                  onChange={(date) => {
                                    update(index, {
                                      ...field,
                                      assignment_end_date: date
                                        ? format(date, "yyyy-MM-dd")
                                        : "",
                                    });
                                  }}
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                    },
                                  }}
                                  format="dd/MM/yyyy"
                                />
                              </LocalizationProvider>
                            ) : (
                              field.assignment_end_date || ""
                            )}
                          </TableCell>
                          {!isViewMode && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  width: "100%",
                                }}
                              >
                                {isEditing ? (
                                  <>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        handleConfirmEditRow(index)
                                      }
                                      title={t("common.confirm", "Confirm")}
                                    >
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="default"
                                      onClick={handleCancelEditingRow}
                                      title={t("common.cancel", "Cancel")}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        handleStartEditingRow(index)
                                      }
                                      title={t("common.edit", "Edit")}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => remove(index)}
                                      title={t("common.delete", "Delete")}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {isAddingTeamMember && !isViewMode && (
                      <TableRow>
                        <TableCell sx={{ width: "20%" }}>
                          <Autocomplete
                            value={
                              staffUsersList.find(
                                (user) => user.id === newTeamMember.user_id
                              ) || null
                            }
                            onChange={(_, newValue) => {
                              setNewTeamMember({
                                ...newTeamMember,
                                user_id: newValue?.id,
                              });
                            }}
                            options={staffUsersList.filter(
                              (user) =>
                                // Filter out users already selected in other rows
                                !fields.some((f) => f.user_id === user.id)
                            )}
                            getOptionLabel={(option) =>
                              option.full_name || option.email
                            }
                            renderInput={(params) => (
                              <TextField {...params} size="small" />
                            )}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ width: "15%" }}>
                          <Autocomplete
                            value={
                              rolesData.find(
                                (role) => role.id === newTeamMember.role_id
                              ) || null
                            }
                            onChange={(_, newValue) => {
                              setNewTeamMember({
                                ...newTeamMember,
                                role_id: newValue?.id,
                              });
                            }}
                            options={rolesData}
                            getOptionLabel={(option) => option.name || ""}
                            renderOption={(props, option) => (
                              <li {...props} key={`new-role-${option.id}`}>
                                {option.name || ""}
                              </li>
                            )}
                            renderInput={(params) => (
                              <TextField {...params} size="small" />
                            )}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ width: "15%" }}>
                          <Autocomplete
                            value={newTeamMember.status || ""}
                            onChange={(_, newValue) => {
                              setNewTeamMember({
                                ...newTeamMember,
                                status: newValue || "",
                              });
                            }}
                            options={TEAM_MEMBER_STATUSES}
                            renderOption={(props, option) => (
                              <li {...props} key={`new-status-${option}`}>
                                {option}
                              </li>
                            )}
                            renderInput={(params) => (
                              <TextField {...params} size="small" />
                            )}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ width: "15%" }}>
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              value={
                                newTeamMember.assignment_start_date
                                  ? new Date(
                                      newTeamMember.assignment_start_date
                                    )
                                  : null
                              }
                              onChange={(date) => {
                                setNewTeamMember({
                                  ...newTeamMember,
                                  assignment_start_date: date
                                    ? format(date, "yyyy-MM-dd")
                                    : format(new Date(), "yyyy-MM-dd"),
                                });
                              }}
                              slotProps={{
                                textField: { size: "small", fullWidth: true },
                              }}
                              format="dd/MM/yyyy"
                            />
                          </LocalizationProvider>
                        </TableCell>
                        <TableCell sx={{ width: "15%" }}>
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              value={
                                newTeamMember.assignment_end_date
                                  ? new Date(newTeamMember.assignment_end_date)
                                  : null
                              }
                              onChange={(date) => {
                                setNewTeamMember({
                                  ...newTeamMember,
                                  assignment_end_date: date
                                    ? format(date, "yyyy-MM-dd")
                                    : format(
                                        addDays(new Date(), 30),
                                        "yyyy-MM-dd"
                                      ),
                                });
                              }}
                              slotProps={{
                                textField: { size: "small", fullWidth: true },
                              }}
                              format="dd/MM/yyyy"
                            />
                          </LocalizationProvider>
                        </TableCell>
                        <TableCell align="center" sx={{ width: "10%" }}>
                          <Box
                            sx={{ display: "flex", justifyContent: "center" }}
                          >
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleConfirmAddTeamMember}
                              title={t("common.add", "Add")}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="default"
                              onClick={handleCancelAddingTeamMember}
                              title={t("common.cancel", "Cancel")}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Submission Status */}
            {createOpportunity.isPending && (
              <Typography color="info.main" sx={{ mt: 2 }}>
                {t("common.saving", "Saving...")}
              </Typography>
            )}

            {updateOpportunity.isPending && (
              <Typography color="info.main" sx={{ mt: 2 }}>
                {t("common.saving", "Saving...")}
              </Typography>
            )}

            {createOpportunity.isError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {t(
                  "opportunityForm.errorCreating",
                  "Error creating opportunity"
                )}
              </Typography>
            )}

            {updateOpportunity.isError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {t(
                  "opportunityForm.errorUpdating",
                  "Error updating opportunity"
                )}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box>
    );
  }
);

OpportunityForm.displayName = "OpportunityForm";

export default OpportunityForm;
