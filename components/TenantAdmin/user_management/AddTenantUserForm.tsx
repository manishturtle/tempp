"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getAuthHeaders } from "../../../hooks/api/auth";
interface Application {
  app_id: string;
  application_name: string;
  is_active: boolean;
}
import { COCKPIT_API_BASE_URL } from "../../../../utils/constants";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Box,
  Alert,
  Typography,
  SelectChangeEvent,
  FormControlLabel,
  Switch,
  Checkbox,
} from "@mui/material";

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  role: string[];
  applications: string[];
  isSuperAdmin: boolean;
  password: string;
  password_confirm: string;
}

interface AddTenantUserFormProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const AddTenantUserForm = ({
  open,
  onClose,
  onUserCreated,
}: AddTenantUserFormProps) => {
  const tenantSlug = useParams().tenant;

  const [formData, setFormData] = useState<FormData>({
    email: "",
    first_name: "",
    last_name: "",
    role: [],
    applications: [],
    isSuperAdmin: false, // Default to not a super admin
    password: "",
    password_confirm: "",
  });

  const [roles, setRoles] = useState<
    Array<{ id: number; name: string; description: string }>
  >([]);
  const [roleAppName, setRoleAppName] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Load applications and roles when the dialog is open and tenant is available
  useEffect(() => {
    if (open && tenantSlug) {
      loadApplications();
      loadRoles();
    }
  }, [open, tenantSlug]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        role: [],
        applications: [],
        isSuperAdmin: false,
        password: "",
        password_confirm: "",
      });
      setErrors({});
      setSubmitError("");
      setSuccess(false);
      setGeneratedPassword("");
    }
  }, [open]);

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      // We'll load roles after an application is selected
      setRoles([]);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setSubmitError("Failed to load roles. Please try again.");
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadApplications = async () => {
    setAppsLoading(true);
    try {
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/platform-admin/tenant-applications/${tenantSlug}/`,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      console.log("Applications loaded:", data);
      const activeApps = data.filter((app) => app.is_active);
      setApplications(activeApps);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setSubmitError("Failed to load applications. Please try again.");
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSelectChange = async (e: SelectChangeEvent<string[]>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: typeof value === "string" ? value.split(",") : value,
    });

    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }

    // If applications changed and there's exactly one application selected, load roles
    if (name === "applications" && Array.isArray(value) && value.length === 1) {
      setRolesLoading(true);
      try {
        const response = await fetch(
          `${COCKPIT_API_BASE_URL}/platform-admin/tenant/${tenantSlug}/roles/?app_id=${value[0]}`,
          {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch roles");
        }

        const data = await response.json();
        setRoles(data.roles);
        setRoleAppName(data.app_name);
      } catch (error) {
        console.error("Error fetching roles:", error);
        setSubmitError("Failed to load roles. Please try again.");
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    } else if (
      name === "applications" &&
      (!Array.isArray(value) || value.length !== 1)
    ) {
      // Clear roles if no application or multiple applications are selected
      setRoles([]);
      setFormData((prev) => ({ ...prev, role: [] }));
    }
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = "Email is invalid";
    }

    // Applications validation
    if (!formData.applications || formData.applications.length === 0) {
      newErrors.applications = "Please select at least one application";
    }
    
    // Role validation - if exactly one application is selected, a role should be selected too
    if (formData.applications && formData.applications.length === 1 && (!formData.role || formData.role.length === 0)) {
      newErrors.role = "Please select a role";
    }

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    if (!formData.password_confirm) {
      newErrors.password_confirm = "Please confirm your password";
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Validate form
    if (!validateForm()) {
      // Scroll to the first error field
      const firstErrorField = document.querySelector(".Mui-error");
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setLoading(true);

    try {
      // First check if user exists in this tenant
      const checkResponse = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/check-email/`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: formData.email }),
        }
      );

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check if user exists");
      }

      const checkData = await checkResponse.json();
      const userExists = checkData.exists;

      // If user exists, just assign applications
      if (userExists) {
        const assignResponse = await fetch(
          `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/${checkData.user_id}/applications/assign/`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              application_ids: formData.applications,
            }),
          }
        );

        if (!assignResponse.ok) {
          throw new Error("Failed to assign applications to existing user");
        }
      } else {
        // Create new user with applications
        const createResponse = await fetch(
          `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/`,
          {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: formData.email,
              first_name: formData.first_name,
              last_name: formData.last_name,
              user_type: "internal", // Always internal
              role_id: formData.role.length > 0 ? parseInt(formData.role[0], 10) : null, // Use selected role_id instead of hardcoded value
              application_ids: formData.applications,
              is_super_admin: formData.isSuperAdmin, // Add the isSuperAdmin field
              password: formData.password,
              password_confirm: formData.password_confirm,
            }),
          }
        );

        const data = await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(data.message || "Failed to create user");
        }

        // If a password was generated, store it
        if (data.generated_password) {
          setGeneratedPassword(data.generated_password);
        }
      }

      setSuccess(true);
      onUserCreated(); // Notify parent component

      // Close dialog after a delay to show success state
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error creating/updating user:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create/update user"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            User created successfully!
            {generatedPassword && (
              <Box mt={1}>
                <Typography variant="subtitle2">
                  Generated Password: <strong>{generatedPassword}</strong>
                </Typography>
                <Typography variant="caption">
                  Please save this password. It will not be shown again.
                </Typography>
              </Box>
            )}
          </Alert>
        )}

        <Box component="form" noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            error={!!errors.email}
            helperText={errors.email}
            autoComplete="off"
            inputProps={{
              autoComplete: "new-email",
            }}
            disabled={loading || success}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              margin="normal"
              fullWidth
              id="first_name"
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              disabled={loading || success}
            />

            <TextField
              margin="normal"
              fullWidth
              id="last_name"
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              disabled={loading || success}
            />
          </Box>

          <FormControl
            fullWidth
            margin="normal"
            required
            error={!!errors.applications}
            disabled={loading || appsLoading || success}
          >
            <InputLabel id="applications-select-label">Applications</InputLabel>
            <Select
              labelId="applications-select-label"
              id="applications"
              name="applications"
              value={formData.applications}
              label="Applications"
              onChange={handleSelectChange}
              multiple
              displayEmpty
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const app = applications.find((a) => a.app_id === value);
                    return app ? (
                      <Box
                        key={value}
                        sx={{
                          bgcolor: "primary.light",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.875rem",
                        }}
                      >
                        {app.application_name}
                      </Box>
                    ) : null;
                  })}
                </Box>
              )}
            >
              {appsLoading ? (
                <MenuItem disabled>Loading applications...</MenuItem>
              ) : applications.length === 0 ? (
                <MenuItem disabled>No applications available</MenuItem>
              ) : (
                applications.map((app: Application) => (
                  <MenuItem value={app.app_id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>{app.application_name}</Typography>
                      {app.is_active && (
                        <Typography
                          sx={{ color: "success.main", fontSize: "0.875rem" }}
                        >
                          Active
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.applications && (
              <FormHelperText>{errors.applications}</FormHelperText>
            )}
          </FormControl>

          <FormControl 
            fullWidth 
            margin="normal" 
            error={!!errors.role}
          >
            <InputLabel id="role-label">Roles</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              multiple
              value={formData.role}
              label="Roles"
              onChange={handleSelectChange}
              disabled={
                loading ||
                success ||
                !formData.applications.length ||
                formData.applications.length > 1
              }
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((roleId) => {
                    const role = roles.find((r) => r.id.toString() === roleId);
                    return (
                      <Box
                        key={roleId}
                        sx={{
                          bgcolor: "primary.light",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.875rem",
                        }}
                      >
                        {role?.name || roleId}
                      </Box>
                    );
                  })}
                </Box>
              )}
            >
              {rolesLoading ? (
                <MenuItem disabled>Loading roles...</MenuItem>
              ) : roles.length === 0 ? (
                <MenuItem disabled>
                  {formData.applications.length === 1
                    ? "No roles available"
                    : "Select exactly one application"}
                </MenuItem>
              ) : (
                roles.map((role) => (
                  <MenuItem key={role.id} value={role.id.toString()}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>{role.name}</Typography>
                      <Typography
                        sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                      >
                        ({roleAppName})
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
            {formData.applications.length > 1 && (
              <FormHelperText>
                Please select exactly one application to manage roles
              </FormHelperText>
            )}
          </FormControl>

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            value={formData.password}
            onChange={handleInputChange}
            error={!!errors.password}
            helperText={errors.password}
            autoComplete="new-password"
            inputProps={{
              autoComplete: "new-password",
            }}
            disabled={loading || success}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password_confirm"
            label="Confirm Password"
            type="password"
            id="password_confirm"
            value={formData.password_confirm}
            onChange={handleInputChange}
            error={!!errors.password_confirm}
            helperText={errors.password_confirm}
            autoComplete="new-password"
            inputProps={{
              autoComplete: "new-password",
            }}
            disabled={loading || success}
          />

          <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isSuperAdmin}
                  onChange={handleSwitchChange}
                  name="isSuperAdmin"
                  disabled={loading || success}
                  color="primary"
                />
              }
              label="Super Admin"
              labelPlacement="start"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || success}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Creating..." : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTenantUserForm;
