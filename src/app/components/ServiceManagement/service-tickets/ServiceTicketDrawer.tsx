import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Grid,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { SelectChangeEvent } from "@mui/material/Select";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import { serviceTicketsApi, Contact } from "../../../services_service_management/serviceTickets";
import { serviceSubcategoryApi } from "../../../services_service_management/serviceSubcategory";
import { useMultiTenantRouter } from "../../../hooks/service-management/useMultiTenantRouter";
import { serviceUserTypesApi } from "../../../services_service_management/serviceUserTypes";
import { tenantApi, TenantUser } from "../../../services_service_management/tenant";

interface ServiceTicketDrawerProps {
  open: boolean;
  onClose: () => void;
  ticketId?: number;
  onSuccess: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormData {
  requester_email: string;
  requester_first_name: string;
  requester_last_name: string;
  subject: string;
  body: string;
  status: string;
  service_sub_category_id: number | null;
  target_resolution_date: Date | null;
  assigned_agent_id: number | null;
  priority: string;
  user_type: number[];
  requested_by: number | null;
  creation_mode: "new" | "existing";
}

interface FormErrors {
  [key: string]: string;
}

const ServiceTicketDrawer: React.FC<ServiceTicketDrawerProps> = ({
  open,
  onClose,
  ticketId,
  onSuccess,
  mode = "create",
}) => {
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const router = useMultiTenantRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [serviceAgents, setServiceAgents] = useState<TenantUser[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    requester_email: "",
    requester_first_name: "",
    requester_last_name: "",
    subject: "",
    body: "",
    status: "New",
    service_sub_category_id: null,
    target_resolution_date: new Date(),
    assigned_agent_id: null,
    priority: "Medium",
    user_type: [] as number[],
    requested_by: null,
    creation_mode: "new",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [isLoadingUserTypes, setIsLoadingUserTypes] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch service sub-categories
      const fetchSubCategories = async () => {
        try {
          const subCats =
            await serviceSubcategoryApi.getAllServiceSubcategories();
          setSubCategories(subCats);
        } catch (error) {
          console.error("Error fetching service sub-categories:", error);
        }
      };

      // Fetch service agents
      const fetchServiceAgents = async () => {
        try {
          const agents = await tenantApi.getTenantUsers();
          setServiceAgents(agents);
        } catch (error) {
          console.error("Error fetching service agents:", error);
        }
      };

      // Fetch contacts
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

      const fetchAllData = async () => {
        try {
          setIsLoading(true);

          await fetchSubCategories();
          await fetchServiceAgents();
          await fetchContacts();
          await fetchUserTypes();
          if (open && ticketId) {
            fetchTicket(ticketId);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAllData();
    }
  }, [open, ticketId]);

  // Fetch ticket data if editing
  const fetchTicket = async (ticketId: number) => {
    try {
      const ticket = await serviceTicketsApi.getTicketById(ticketId);

      // Map ticket data to form data
      setFormData({
        requester_email: ticket.service_user?.email || "",
        requester_first_name: ticket.service_user?.first_name || "",
        requester_last_name: ticket.service_user?.last_name || "",
        subject: ticket.subject,
        body: ticket.body,
        status: ticket.status,
        service_sub_category_id: ticket.service_sub_category?.id || null,
        target_resolution_date: ticket.target_resolution_date
          ? new Date(ticket.target_resolution_date)
          : new Date(),
        assigned_agent_id: ticket.assigned_agent?.id || null,
        priority: ticket.priority,
        user_type: Array.isArray((ticket.service_user as any)?.user_type)
          ? (ticket.service_user as any)?.user_type
          : [],
        requested_by: (ticket.service_user as any)?.linked_account || null,
        creation_mode: (ticket.service_user as any)?.linked_account
          ? "existing"
          : "new",
      });
    } catch (error) {
      console.error("Error fetching ticket:", error);
    }
  };

  // Handle text input changes (TextField components)
  const handleTextInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error for the field
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Handle select changes (Select components)
  const handleSelectChange = (
    e: React.ChangeEvent<{ name?: string; value: unknown }> | SelectChangeEvent
  ) => {
    const { name, value } = e.target as { name?: string; value: unknown };
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value as string }));

      // Clear error for the field
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const handleContactChange = (
    event: React.SyntheticEvent,
    contact: Contact | null
  ) => {
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        requested_by: contact.id,
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData((prev) => ({ ...prev, target_resolution_date: date }));
    // Clear error for the field
    if (formErrors["target_resolution_date"]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors["target_resolution_date"];
        return newErrors;
      });
    }
  };

  const validateForm = (apiData: any): boolean => {
    const errors: FormErrors = {};

    // For guest type, we need manual entry of contact details
    if (!apiData.requester_email) {
      errors.requester_email = "Requester email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(apiData.requester_email)
    ) {
      errors.requester_email = "Invalid email address";
    }

    if (!apiData.requester_first_name) {
      errors.requester_first_name = "First name is required";
    }

    if (!apiData.requester_last_name) {
      errors.requester_last_name = "Last name is required";
    }

    // Always validate these fields regardless of user type
    if (!apiData.subject) {
      errors.subject = "Subject is required";
    }

    if (!apiData.target_resolution_date) {
      errors.target_resolution_date = "Target resolution date is required";
    }

    if (!apiData.service_sub_category_id) {
      errors.service_sub_category_id = "Service sub category is required";
    }

    if (!apiData.user_type.length) {
      errors.user_type = "User type is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    let apiData: any = {
      ...formData,
      target_resolution_date: formData.target_resolution_date?.toISOString(),
      user_type: formData.user_type,
    };

    // If contact was selected, add user_id
    if (formData.creation_mode === "existing" && formData.requested_by) {
      const matchedContact = contacts.find(
        (contact) => contact.id === formData.requested_by
      );
      apiData.requested_by = matchedContact?.id;
      apiData.requester_email = matchedContact?.email_display;
      apiData.requester_first_name = matchedContact?.first_name;
      apiData.requester_last_name = matchedContact?.last_name;
    } else {
      apiData.requested_by = null;
    }
    if (!validateForm(apiData)) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (ticketId) {
        // Update existing ticket
        await serviceTicketsApi.updateTicket(ticketId, apiData);
      } else {
        // Create new ticket
        const response = await serviceTicketsApi.createTicket(apiData);
        if (response.id) {
          router.push(`/Crm/service-management/service-tickets/${response.id}`);
        }
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

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
    setFormData({
      requester_email: "",
      requester_first_name: "",
      requester_last_name: "",
      subject: "",
      body: "",
      status: "New",
      service_sub_category_id: null,
      target_resolution_date: new Date(),
      assigned_agent_id: null,
      priority: "Medium",
      user_type: [],
      requested_by: null,
      creation_mode: "new",
    });
    setFormErrors({});
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={handleClose}
      title={
        ticketId
          ? viewMode === "view"
            ? "View Service Ticket"
            : "Edit Service Ticket"
          : "Create Service Ticket"
      }
      onSave={
        viewMode === "edit" || viewMode === "create" ? handleSubmit : undefined
      }
      expandedWidth={550}
      saveDisabled={isSubmitting}
      sidebarIcons={
        ticketId
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Ticket",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Ticket",
                onClick: () => setViewMode("edit"),
              },
            ]
          : []
      }
      defaultSidebarItem={viewMode}
    >
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box component="form" noValidate>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Requester Information
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid size={12}>
              <FormControl
                fullWidth
                error={!!formErrors.user_type}
                disabled={isSubmitting || viewMode === "view"}
                size="small"
              >
                <InputLabel id="user-type-label">User Type</InputLabel>
                <Select
                  labelId="user-type-label"
                  id="user-type"
                  name="user_type"
                  value={
                    formData.user_type.length > 0 ? formData.user_type[0] : ""
                  }
                  label="User Type"
                  onChange={(e) => {
                    const value = e.target.value as number;
                    setFormData((prev) => ({
                      ...prev,
                      user_type: [value],
                    }));
                    setFormErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.user_type;
                      return newErrors;
                    });
                  }}
                  disabled={isSubmitting || viewMode === "view" || !!ticketId}
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
            </Grid>

            <Grid size={12}>
              <FormControl
                component="fieldset"
                disabled={isSubmitting || viewMode === "view" || !!ticketId}
              >
                <RadioGroup
                  row
                  name="creation_mode"
                  value={formData.creation_mode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creation_mode: e.target.value as "new" | "existing",
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
            </Grid>

            {hasCustomerGroup() && formData.creation_mode === "existing" ? (
              <Grid size={12}>
                <Autocomplete
                  id="contact-select"
                  options={contacts}
                  loading={isLoadingContacts}
                  getOptionLabel={(option) =>
                    `${option.first_name} ${option.last_name} (${option.email_display})`
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  value={contacts.find(
                    (contact) => contact.id === formData.requested_by
                  )}
                  onChange={(event, contact) =>
                    handleContactChange(event, contact)
                  }
                  disabled={isSubmitting || !!ticketId}
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
                      size="small"
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
              </Grid>
            ) : (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    required
                    fullWidth
                    id="requester_first_name"
                    label="First Name"
                    name="requester_first_name"
                    value={formData.requester_first_name}
                    onChange={handleTextInputChange}
                    error={
                      viewMode === "edit" && !!formErrors.requester_first_name
                    }
                    helperText={
                      viewMode === "edit" ? formErrors.requester_first_name : ""
                    }
                    disabled={isSubmitting || !!ticketId}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    required
                    fullWidth
                    id="requester_last_name"
                    label="Last Name"
                    name="requester_last_name"
                    value={formData.requester_last_name}
                    onChange={handleTextInputChange}
                    error={
                      viewMode === "edit" && !!formErrors.requester_last_name
                    }
                    helperText={
                      viewMode === "edit" ? formErrors.requester_last_name : ""
                    }
                    disabled={isSubmitting || !!ticketId}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    required
                    fullWidth
                    id="requester_email"
                    label="Email Address"
                    name="requester_email"
                    value={formData.requester_email}
                    onChange={handleTextInputChange}
                    error={viewMode === "edit" && !!formErrors.requester_email}
                    helperText={
                      viewMode === "edit" ? formErrors.requester_email : ""
                    }
                    disabled={isSubmitting || !!ticketId}
                    size="small"
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Ticket Details
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid size={12}>
              <TextField
                required
                fullWidth
                id="subject"
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleTextInputChange}
                error={!!formErrors.subject}
                helperText={formErrors.subject}
                size="small"
                disabled={isSubmitting || viewMode === "view"}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                id="body"
                label="Description"
                name="body"
                value={formData.body}
                onChange={handleTextInputChange}
                error={!!formErrors.body}
                helperText={formErrors.body}
                multiline
                rows={3}
                size="small"
                disabled={isSubmitting || viewMode === "view"}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Ticket Classification
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl
                fullWidth
                size="small"
                error={!!formErrors.service_sub_category_id}
              >
                <Autocomplete
                  id="service_sub_category_id"
                  options={subCategories}
                  getOptionKey={(option) => option.id.toString()}
                  getOptionLabel={(option) => option.name || "Unnamed Category"}
                  value={subCategories.find(
                    (cat) => cat.id === formData.service_sub_category_id
                  ) || null}
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      service_sub_category_id: newValue?.id || null,
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Service Sub-Category"
                      variant="outlined"
                      size="small"
                      fullWidth
                      error={!!formErrors.service_sub_category_id}
                      helperText={formErrors.service_sub_category_id}
                    />
                  )}
                  disabled={isSubmitting || viewMode === "view"}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small" error={!!formErrors.status}>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleSelectChange}
                  label="Status"
                  disabled={isSubmitting || viewMode === "view"}
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="Pending Input">Pending Input</MenuItem>
                  <MenuItem value="On Hold">On Hold</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Assignment Details
          </Typography>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleSelectChange}
                  label="Priority"
                  disabled={isSubmitting || viewMode === "view"}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="dense" size="small">
                <Autocomplete
                  id="assigned_agent_id"
                  options={serviceAgents}
                  getOptionKey={(option) => option.id.toString()}
                  getOptionLabel={(option) =>
                    `${option.first_name || ""} ${
                      option.last_name || ""
                    }`.trim() || "Unnamed"
                  }
                  value={
                    serviceAgents.find(
                      (agent) => agent.id === formData.assigned_agent_id
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      assigned_agent_id: newValue?.id || null,
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned To"
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                  disabled={isSubmitting || viewMode === "view"}
                />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Target Resolution Date"
                  value={formData.target_resolution_date}
                  onChange={handleDateChange}
                  disabled={isSubmitting || viewMode === "view"}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      margin: "dense",
                      error: !!formErrors.target_resolution_date,
                      helperText: formErrors.target_resolution_date,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Box>
      )}
    </AnimatedDrawer>
  );
};

export default ServiceTicketDrawer;
