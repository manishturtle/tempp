'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getAuthHeaders } from "../../../hooks/api/auth";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  OutlinedInput,
  Chip,
  SelectChangeEvent,
  Typography,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { COCKPIT_API_BASE_URL } from "../../../../utils/constants";


// Interfaces define the shape of our data
interface Role {
  id: string | number;
  name: string;
  description?: string;
}

interface Application {
  app_id: string | number;
  application_name: string;
}

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  applications: string[];
  applicationRoles: Record<string, string[]>;
  is_active: boolean;
  isSuperAdmin: boolean;
}

interface EditTenantUserFormProps {
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  userId: string | number;
}

const EditTenantUserForm = ({
  open,
  onClose,
  onUserUpdated,
  userId,
}: EditTenantUserFormProps) => {
  const params = useParams();
  const tenantSlug = params?.tenant as string;

  // State management
  const [formData, setFormData] = useState<FormData>({
    email: "",
    first_name: "",
    last_name: "",
    applications: [],
    applicationRoles: {},
    is_active: true,
    isSuperAdmin: false,
  });

  const [applications, setApplications] = useState<Application[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Record<string, Role[]>>({});
  const [selectedAppForRoles, setSelectedAppForRoles] = useState<string | null>(null);

  // State for loading, errors, and success feedback
  const [loading, setLoading] = useState(false);
  // **FIX**: Replaced loadingUser with a single initialLoading state
  const [initialLoading, setInitialLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // Effect to reset form state when the dialog is closed
  useEffect(() => {
    if (!open) {
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        applications: [],
        applicationRoles: {},
        is_active: true,
        isSuperAdmin: false,
      });
      setApplications([]);
      setAvailableRoles({});
      setSelectedAppForRoles(null);
      setErrors({});
      setRoleErrors({});
      setSubmitError("");
      setSuccess(false);
      // **FIX**: Reset the new initialLoading state
      setInitialLoading(true);
    }
  }, [open]);

  // Fetches roles for a specific application, avoiding refetches
  const loadRolesForApplication = useCallback(async (appId: string | number) => {
    const appIdStr = appId.toString();
    if (availableRoles[appIdStr] || loadingRoles[appIdStr]) return;

    setLoadingRoles(prev => ({ ...prev, [appIdStr]: true }));
    setRoleErrors(prev => ({ ...prev, [appIdStr]: "" }));

    try {
      const authHeader = getAuthHeaders();
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/tenant/roles/?app_id=${appIdStr}`,
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      if (!response.ok) throw new Error(`Failed to load roles`);
      const data = await response.json();
      setAvailableRoles(prev => ({
        ...prev,
        [appIdStr]: data.roles || [],
      }));
    } catch (error) {
      console.error(`Error loading roles for app ${appIdStr}:`, error);
      setRoleErrors(prev => ({
        ...prev,
        [appIdStr]: "Failed to load roles.",
      }));
    } finally {
      setLoadingRoles(prev => ({ ...prev, [appIdStr]: false }));
    }
  }, [tenantSlug, availableRoles, loadingRoles]);

  // Fetches all available applications for the tenant
  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const authHeader = getAuthHeaders();
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/platform-admin/tenant-applications/${tenantSlug}/`,
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      if (!response.ok) throw new Error("Failed to fetch applications");
      const apps = await response.json();
      const transformedApps = apps.map((app: any) => ({
        app_id: app.app_id,
        application_name: app.application_name,
      }));
      setApplications(transformedApps);
      await Promise.all(transformedApps.map((app: Application) => 
        loadRolesForApplication(app.app_id)
      ));
    } catch (error) {
      console.error("Error loading applications:", error);
      setSubmitError("Failed to load application list.");
    } finally {
      setAppsLoading(false);
    }
  }, [tenantSlug, loadRolesForApplication]);

  // Fetches the specific user's data
  const loadUserData = useCallback(async () => {
    try {
      const authHeader = getAuthHeaders();
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/${userId}/`,
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      if (!response.ok) throw new Error("Failed to fetch user data");
      const userData = await response.json();
      const userApps = userData.applications || [];
      const appIds = userApps.map((app: any) => app.app_id.toString());
      const applicationRoles: Record<string, string[]> = {};
      userApps.forEach((app: any) => {
        if (app.roles?.length > 0) {
          applicationRoles[app.app_id] = app.roles.map((role: any) => role.id.toString());
        }
      });
      setFormData({
        email: userData.email || "",
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        applications: appIds,
        applicationRoles,
        is_active: userData.is_active,
        isSuperAdmin: userData.is_super_admin || false,
      });
      if (appIds.length > 0) {
        setSelectedAppForRoles(appIds[0]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setSubmitError("Failed to load user data. Please try again.");
    }
  }, [tenantSlug, userId]);

  // **FIX**: Main data loading effect now uses the unified loading state
  useEffect(() => {
    if (open && userId) {
        const loadAllData = async () => {
            try {
                // Wait for ALL initial data to be fetched
                await Promise.all([loadApplications(), loadUserData()]);
            } catch (error) {
                console.error("Error during initial data load:", error);
                // Errors are already handled in the individual functions
            } finally {
                // Only turn off the main spinner after everything is done
                setInitialLoading(false);
            }
        };
        loadAllData();
    }
  }, [open, userId, loadApplications, loadUserData]);
  
  // Event handlers memoized with useCallback
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  }, []);

  const handleApplicationChange = useCallback(async (event: SelectChangeEvent<string[]>) => {
    const selectedApps = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    const newApps = selectedApps.filter(appId => !formData.applications.includes(appId));
    setFormData(prev => ({ ...prev, applications: selectedApps }));
    if (newApps.length > 0) {
        await Promise.all(newApps.map(appId => loadRolesForApplication(appId)));
    }
  }, [formData.applications, loadRolesForApplication]);

  const handleRoleChange = useCallback((appId: string | number, roleIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      applicationRoles: { ...prev.applicationRoles, [appId]: roleIds },
    }));
  }, []);

  const handleRemoveRole = useCallback((appId: string | number, roleId: string) => {
    setFormData(prev => ({
      ...prev,
      applicationRoles: {
        ...prev.applicationRoles,
        [appId]: (prev.applicationRoles[appId] || []).filter(id => id !== roleId),
      },
    }));
  }, []);

  const handleAppForRolesChange = useCallback((appId: string) => {
    setSelectedAppForRoles(appId);
  }, []);
  
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (formData.applications.length === 0) newErrors.applications = "Please select at least one application";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateForm()) return;
    setLoading(true);
    try {
      const role_assignments = Object.entries(formData.applicationRoles)
        .filter(([appId]) => formData.applications.includes(appId))
        .map(([appId, roleIds]) => ({
          application_id: appId,
          role_ids: roleIds,
        }));
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/${userId}/`,
        {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            application_ids: formData.applications,
            role_assignments,
            is_active: formData.is_active,
            is_superuser: formData.isSuperAdmin,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update user");
      }
      setSuccess(true);
      setTimeout(() => {
        onUserUpdated();
        onClose();
      }, 1500);
    } catch (error: any) {
      setSubmitError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, userId, tenantSlug, onUserUpdated, onClose]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Edit Tenant User
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* **FIX**: Use the single initialLoading state to prevent blinking */}
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" noValidate onSubmit={handleSubmit}>
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>User updated successfully!</Alert>}
            <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" value={formData.email} disabled />
            <TextField margin="normal" required fullWidth id="first_name" label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} error={!!errors.first_name} helperText={errors.first_name} />
            <TextField margin="normal" required fullWidth id="last_name" label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} error={!!errors.last_name} helperText={errors.last_name} />
            <FormControl fullWidth margin="normal" required error={!!errors.applications}>
              <InputLabel id="applications-label">Applications</InputLabel>
              <Select labelId="applications-label" id="applications" multiple value={formData.applications} onChange={handleApplicationChange} input={<OutlinedInput label="Applications" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const app = applications.find(a => a.app_id.toString() === value);
                      return app ? <Chip key={value} label={app.application_name} /> : null;
                    })}
                  </Box>
                )}
              >
                {appsLoading ? (
                  <MenuItem disabled>Loading applications...</MenuItem>
                ) : applications.length > 0 ? (
                  applications.map((app) => (
                    <MenuItem key={app.app_id} value={app.app_id.toString()}>
                      <Checkbox checked={formData.applications.includes(app.app_id.toString())} />
                      {app.application_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No applications available</MenuItem>
                )}
              </Select>
              {errors.applications && <FormHelperText>{errors.applications}</FormHelperText>}
            </FormControl>
            {formData.applications.length > 0 && (
              <Box sx={{ mt: 2, mb: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Application Roles</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {formData.applications.map((appId) => {
                    const app = applications.find(a => a.app_id.toString() === appId);
                    if (!app) return null;
                    const isSelected = selectedAppForRoles === appId;
                    const roleCount = formData.applicationRoles[appId]?.length || 0;
                    return (
                      <Chip key={appId} label={`${app.application_name}${roleCount > 0 ? ` (${roleCount})` : ''}`} onClick={() => handleAppForRolesChange(appId)} color={isSelected ? 'primary' : 'default'} />
                    );
                  })}
                </Box>
                {selectedAppForRoles && (() => {
                  const app = applications.find(a => a.app_id.toString() === selectedAppForRoles);
                  const selectedRoles = formData.applicationRoles[selectedAppForRoles] || [];
                  const rolesForApp = availableRoles[selectedAppForRoles] || [];
                  const isLoading = loadingRoles[selectedAppForRoles];
                  const error = roleErrors[selectedAppForRoles];
                  return (
                    <FormControl fullWidth error={!!error} disabled={isLoading}>
                      <InputLabel id="roles-label">{app?.application_name || 'Select'} Roles</InputLabel>
                      <Select labelId="roles-label" multiple value={selectedRoles} onChange={(e) => handleRoleChange(selectedAppForRoles, e.target.value as string[])} input={<OutlinedInput label={`${app?.application_name || 'Select'} Roles`} />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((roleId) => {
                              const role = rolesForApp.find(r => r.id.toString() === roleId);
                              return <Chip key={roleId} label={role?.name || roleId} size="small" onDelete={() => handleRemoveRole(selectedAppForRoles, roleId)} onMouseDown={(e) => e.stopPropagation()} />;
                            })}
                          </Box>
                        )}
                      >
                        {isLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                        ) : rolesForApp.length > 0 ? (
                          rolesForApp.map((role) => (
                            <MenuItem key={role.id} value={role.id.toString()}>
                              <Checkbox checked={selectedRoles.includes(role.id.toString())} />
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body1">{role.name}</Typography>
                                {role.description && <Typography variant="caption" color="text.secondary">{role.description}</Typography>}
                              </Box>
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>No roles available for this application.</MenuItem>
                        )}
                      </Select>
                      {error && <FormHelperText>{error}</FormHelperText>}
                    </FormControl>
                  );
                })()}
              </Box>
            )}
            <FormControlLabel control={<Checkbox checked={formData.is_active} onChange={handleCheckboxChange} name="is_active" />} label="Active" />
            <FormControlLabel control={<Checkbox checked={formData.isSuperAdmin} onChange={handleCheckboxChange} name="isSuperAdmin" />} label="Super Admin" />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {/* **FIX**: Disable button during initial load */}
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading || initialLoading}>
          {loading ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTenantUserForm;