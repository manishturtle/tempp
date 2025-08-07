"use client";

import React, { useState, useEffect, ReactNode } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { ServiceUser, serviceUsersApi } from "../../../services_service_management/serviceUsers";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import { Contact, serviceTicketsApi } from "../../../services_service_management/serviceTickets";
import Autocomplete from "@mui/material/Autocomplete";
import {
  serviceUserTypesApi,
  ServiceUserType,
} from "../../../services_service_management/serviceUserTypes";
import { tenantApi } from "../../../services_service_management/tenant";

interface ServiceUserDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceUser: ServiceUser | null;
  onSuccess?: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: number[];
  linked_account: number | null;
  user_id: number;
  creation_mode: "new" | "existing";
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  user_type?: string;
  linked_account?: number | null;
}

const ServiceUserDrawer: React.FC<ServiceUserDrawerProps> = ({
  open,
  onClose,
  serviceUser,
  onSuccess,
  mode = "create",
}): ReactNode => {
  // Initial form data
  const initialFormData: FormData = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    user_type: [] as number[],
    linked_account: null,
    user_id: 0,
    creation_mode: "new" as "new" | "existing",
  };

  // State for form data
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [userTypes, setUserTypes] = useState<ServiceUserType[]>([]);
  const [isLoadingUserTypes, setIsLoadingUserTypes] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // Fetch contacts when the drawer opens
  useEffect(() => {
    if (!serviceUser && open) {
      const fetchUserTypes = async () => {
        try {
          setIsLoadingUserTypes(true);
          const userTypesData =
            await serviceUserTypesApi.getAllServiceUserTypes();
          setFormData({
            ...formData,
            user_type: [userTypesData[0].id],
          });
          setUserTypes(userTypesData);
        } catch (error) {
          console.error("Error fetching user types:", error);
        } finally {
          setIsLoadingUserTypes(false);
        }
      };

      const fetchTenantUsers = async () => {
        try {
          setLoadingUsers(true);
          const response = await tenantApi.getTenantUsers();
          setTenantUsers(response);
        } catch (error) {
          console.error("Error fetching tenant users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };

      const fetchContacts = async () => {
        try {
          setIsLoadingContacts(true);
          const contactsData = await serviceTicketsApi.getAllContacts();
          setContacts(contactsData);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        } finally {
          setIsLoadingContacts(false);
        }
      };

      const fetchAllData = async () => {
        try {
          await fetchTenantUsers();
          await fetchContacts();
          await fetchUserTypes();
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      fetchAllData();
    }
  }, [open]);

  // Initialize form data with service user data when editing
  useEffect(() => {
    // Only run this effect when both serviceUser exists AND drawer is open
    if (serviceUser && open) {
      const fetchUserTypes = async () => {
        try {
          setIsLoadingUserTypes(true);
          const userTypesData =
            await serviceUserTypesApi.getAllServiceUserTypes();
          setUserTypes(userTypesData);
        } catch (error) {
          console.error("Error fetching user types:", error);
        } finally {
          setIsLoadingUserTypes(false);
        }
      };

      const fetchTenantUsers = async () => {
        try {
          setLoadingUsers(true);
          const response = await tenantApi.getTenantUsers();
          setTenantUsers(response);
        } catch (error) {
          console.error("Error fetching tenant users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };

      const fetchContacts = async () => {
        try {
          setIsLoadingContacts(true);
          const contactsData = await serviceTicketsApi.getAllContacts();
          setContacts(contactsData);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        } finally {
          setIsLoadingContacts(false);
        }
      };

      const fetchAllData = async () => {
        try {
          await fetchUserTypes();
          await fetchTenantUsers();
          await fetchContacts();
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      fetchAllData();

      let userTypeArray: number[] = [];
      if (Array.isArray(serviceUser.user_type)) {
        userTypeArray = serviceUser.user_type
          .map((type) => (typeof type === "string" ? parseInt(type, 10) : type))
          .filter((id) => !isNaN(id));
      } else if (serviceUser.user_type) {
        const typeId =
          typeof serviceUser.user_type === "string"
            ? parseInt(serviceUser.user_type, 10)
            : serviceUser.user_type;
        if (!isNaN(typeId)) {
          userTypeArray = [typeId];
        }
      }

      const formDataUpdate: FormData = {
        first_name: serviceUser.first_name || "",
        last_name: serviceUser.last_name || "",
        email: serviceUser.email || "",
        phone: serviceUser.phone || "",
        user_type: userTypeArray,
        linked_account: (serviceUser as any).linked_account || null,
        user_id: serviceUser.user_id || 0,
        creation_mode: (serviceUser as any).linked_account ? "existing" : "new",
      };

      setFormData(formDataUpdate);
      setFormErrors({});
    }
  }, [serviceUser, open]);

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear error when field is edited
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        [name]: undefined,
      }));
    }
  };

  // Handle phone input change
  const handlePhoneChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      phone: value,
    }));

    // Clear phone number error
    if (formErrors.phone) {
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        phone: undefined,
      }));
    }
  };

  // Handle contact selection
  const handleContactChange = (
    event: React.SyntheticEvent,
    contact: Contact | null
  ) => {
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        linked_account: contact.id,
      }));
      if (contact.user_id) {
        setFormData((prev) => ({
          ...prev,
          user_id: contact.user_id || 0,
        }));
      }
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
      isValid = false;
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare submission data
      const submissionData: Partial<ServiceUser> = {
        user_type: formData.user_type,
      };

      // Handle different creation modes
      if (formData.creation_mode === "new") {
        // Include all user details for new user creation
        submissionData.first_name = formData.first_name;
        submissionData.last_name = formData.last_name;
        submissionData.email = formData.email;
        submissionData.phone = formData.phone;
        (submissionData as any).linked_account = null;

        // Only include user_id if it's been selected and is not 0
        if (formData.user_id !== 0) {
          submissionData.user_id = formData.user_id;
        }
      } else {
        // For existing users, include the user_id from selected tenant user
        submissionData.user_id = formData.user_id;
        // Include linked_account for Customer type service users
        if (hasCustomerGroup() && formData.linked_account) {
          (submissionData as any).linked_account = formData.linked_account;
          const matchedContact = contacts.find(
            (contact) => contact.id === formData.linked_account
          );
          if (matchedContact) {
            submissionData.first_name = matchedContact.first_name;
            submissionData.last_name = matchedContact.last_name;
            submissionData.email = matchedContact.email_display;
          }
        }
      }

      // Create or update service user
      let result;
      if (serviceUser) {
        // Update existing service user
        result = await serviceUsersApi.updateServiceUser(
          serviceUser.id,
          submissionData
        );
      } else {
        // Create new service user
        result = await serviceUsersApi.createServiceUser(submissionData);
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close the drawer
      handleClose();
    } catch (error) {
      console.error("Error submitting service user:", error);
      // You could add error handling UI here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCustomerGroup = (): boolean => {
    if (!formData?.user_type || formData.user_type.length === 0) return false;
    // Check if any selected user type has service_user_group === "Customer"
    const selectedType = userTypes.find((type) =>
      formData.user_type.includes(type.id)
    );
    return selectedType?.service_user_group === "Customer";
  };

  const handleClose = () => {
    onClose();
    setFormData(initialFormData);
    setFormErrors({});
    setIsSubmitting(false);
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={handleClose}
      title={
        serviceUser
          ? viewMode === "edit"
            ? "Edit Service User"
            : "View Service User"
          : "Create Service User"
      }
      onSave={viewMode === "view" ? undefined : handleSubmit}
      saveDisabled={isSubmitting}
      sidebarIcons={
        serviceUser
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View User",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit User",
                onClick: () => setViewMode("edit"),
              },
            ]
          : []
      }
      defaultSidebarItem={viewMode}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}
      >
        {/* User Type Dropdown */}
        <FormControl
          fullWidth
          error={!!formErrors.user_type}
          disabled={isSubmitting || viewMode === "view"}
        >
          <InputLabel id="user-type-label">User Type</InputLabel>
          <Select
            labelId="user-type-label"
            id="user-type"
            name="user_type"
            value={formData.user_type.length > 0 ? formData.user_type[0] : ""}
            label="User Type"
            onChange={(e) => {
              const value = e.target.value as number;
              setFormData((prev) => ({
                ...prev,
                user_type: [value],
              }));
            }}
            disabled={isSubmitting || viewMode === "view"}
          >
            {isLoadingUserTypes ? (
              <MenuItem value={0} disabled>
                Loading...
              </MenuItem>
            ) : (
              userTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))
            )}
          </Select>
          {formErrors.user_type && (
            <Typography color="error" variant="caption">
              {formErrors.user_type}
            </Typography>
          )}
        </FormControl>

        {formData.user_type && (
          <>
            <FormControl
              component="fieldset"
              disabled={isSubmitting || viewMode === "view"}
            >
              <RadioGroup
                row
                name="creation_mode"
                value={formData.creation_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    creation_mode: e.target.value as "new" | "existing",
                    user_id: 0,
                    linked_account: null,
                  })
                }
              >
                <FormControlLabel
                  value="new"
                  control={<Radio />}
                  label="Create New Service User"
                />
                <FormControlLabel
                  value="existing"
                  control={<Radio />}
                  label="Select from Existing"
                />
              </RadioGroup>
            </FormControl>

            {formData.creation_mode === "existing" && hasCustomerGroup() && (
              <Autocomplete
                id="contact-select"
                options={contacts}
                loading={isLoadingContacts}
                getOptionLabel={(option) =>
                  `${option.first_name} ${option.last_name} (${option.email_display})`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={contacts.find(
                  (contact) => contact.id === formData.linked_account
                )}
                onChange={(event, contact) =>
                  handleContactChange(event, contact)
                }
                disabled={isSubmitting || viewMode === "view"}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography sx={{ fontWeight: "bold" }}>
                        {option.account_name}
                      </Typography>
                      <Typography variant="body2">
                        {option.first_name} {option.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.email_display}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Contact"
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {isLoadingContacts ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
            )}

            {formData.creation_mode === "new" && (
              <TextField
                name="first_name"
                label="First Name"
                value={formData.first_name}
                onChange={handleChange}
                fullWidth
                required
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                disabled={isSubmitting || viewMode === "view"}
              />
            )}

            {formData.creation_mode === "new" && (
              <TextField
                name="last_name"
                label="Last Name"
                value={formData.last_name}
                onChange={handleChange}
                fullWidth
                required
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                disabled={isSubmitting || viewMode === "view"}
              />
            )}

            {formData.creation_mode === "new" && (
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={isSubmitting || viewMode === "view"}
              />
            )}

            {formData.creation_mode === "new" && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Phone Number *
                </Typography>
                <PhoneInput
                  country={"in"} // Default country (India)
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  inputProps={{
                    name: "phone",
                    required: true,
                    disabled: isSubmitting || viewMode === "view",
                  }}
                  containerStyle={{
                    width: "100%",
                  }}
                  inputStyle={{
                    width: "100%",
                    height: "56px",
                    fontSize: "16px",
                    borderColor: formErrors.phone
                      ? "#d32f2f"
                      : "rgba(0, 0, 0, 0.23)",
                  }}
                />
                {formErrors.phone && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ mt: 0.5, ml: 1.75 }}
                  >
                    {formErrors.phone}
                  </Typography>
                )}
              </Box>
            )}

            <FormControl
              disabled={
                isSubmitting ||
                viewMode === "view" ||
                formData.creation_mode === "existing"
              }
            >
              <InputLabel id="user-id-label">Login Account</InputLabel>
              <Select
                labelId="user-id-label"
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                label="Login Account"
              >
                <MenuItem value={0}>
                  <em>None</em>
                </MenuItem>
                {loadingUsers ? (
                  <MenuItem value={0} disabled>
                    Loading...
                  </MenuItem>
                ) : (
                  tenantUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </>
        )}
      </Box>
    </AnimatedDrawer>
  );
};

export default ServiceUserDrawer;
