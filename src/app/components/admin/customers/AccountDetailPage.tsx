import { FC, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Skeleton,
  Alert,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountDetailHeader } from "@/app/components/admin/customers/AccountDetailHeader";
import { AccountDetailTabs } from "@/app/components/admin/customers/AccountDetailTabs";
import AccountDetailsSidebar from "@/app/components/admin/customers/AccountDetailsSidebar";
import useCustomFieldDefinitions from "@/app/hooks/api/useCustomFieldDefinitions";
import { AccountDetailData } from "@/app/types/account";
import {
  AddressFormData,
  AddressForm,
} from "@/app/components/admin/customers/forms/AddressForm";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import Notification from "@/app/components/common/Notification";
import api from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ContactForm, { ContactFormData } from "./forms/ContactForm";
import ContactsTabContent from "./ContactsTabContent";
import TaskForm, { TaskFormData, TaskApiData } from "./forms/TaskForm";
import TasksTabContent from "./TasksTabContent";

interface AccountDetailPageProps {
  accountId: string;
  accountData: AccountDetailData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Main component for the Account Detail page
 * Displays account information in a two-column layout with tabs
 */
const AccountDetailPageContent: FC<AccountDetailPageProps> = ({
  accountId,
  accountData,
  isLoading,
  isError,
  error,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const drawerContext = useDrawer();
  const [activeTab, setActiveTab] = useState<string | number>(0);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<
    AddressFormData | undefined
  >(undefined);
  const [selectedContact, setSelectedContact] = useState<
    ContactFormData | undefined
  >(undefined);
  const [selectedTask, setSelectedTask] = useState<TaskFormData | undefined>(
    undefined
  );
  const [isViewMode, setIsViewMode] = useState(true);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  // Fetch custom field definitions for accounts
  const { data: customFieldDefinitions = [] } =
    useCustomFieldDefinitions("Account");

  // Function to map API address data to form data structure
  const mapApiAddressToFormData = (apiAddress: any): AddressFormData => {
    return {
      id: apiAddress.id,
      address_type: apiAddress.address_type,
      street_1: apiAddress.street_1,
      street_2: apiAddress.street_2 || "",
      street_3: apiAddress.street_3 || "",
      city: apiAddress.city,
      state: apiAddress.state_province || "",
      postal_code: apiAddress.postal_code,
      country: apiAddress.country,
      is_default: false, // API doesn't have this field
      is_billing: apiAddress.is_primary_billing || false,
      is_shipping: apiAddress.is_primary_shipping || false,
      // Keep original fields for reference
      state_province: apiAddress.state_province,
      is_primary_billing: apiAddress.is_primary_billing,
      is_primary_shipping: apiAddress.is_primary_shipping,
      created_at: apiAddress.created_at,
      updated_at: apiAddress.updated_at,
      created_by: apiAddress.created_by,
      updated_by: apiAddress.updated_by,
      custom_fields: apiAddress.custom_fields,
    };
  };

  // Function to map form data back to API structure
  const mapFormDataToApiAddress = (formData: AddressFormData): any => {
    return {
      id: formData.id,
      address_type: formData.address_type,
      street_1: formData.street_1,
      street_2: formData.street_2 || "",
      street_3: formData.street_3 || "",
      city: formData.city,
      state_province: formData.state || formData.state_province || "",
      postal_code: formData.postal_code,
      country: formData.country,
      is_primary_billing:
        formData.is_billing || formData.is_primary_billing || false,
      is_primary_shipping:
        formData.is_shipping || formData.is_primary_shipping || false,
      custom_fields: formData.custom_fields || {},
    };
  };

  // Function to open the address drawer
  const openAddressDrawer = (initialData?: AddressFormData) => {
    if (initialData) {
      setSelectedAddress(initialData);
      setIsViewMode(true); // Start in view mode for existing addresses
    } else {
      setSelectedAddress(undefined);
      setIsViewMode(false); // Start in edit mode for new addresses
    }
    setAddressDrawerOpen(true);
  };

  // Function to open the contact drawer
  const openContactDrawer = (
    initialData?: ContactFormData,
    accountId?: string
  ) => {
    setSelectedContact(
      initialData || {
        first_name: "",
        last_name: "",
        email: "",
        job_title: "",
        status: "active",
        is_primary: false,
        account_id: accountId || accountData?.id || "",
      }
    );
    setContactDrawerOpen(true);
    setIsViewMode(initialData?.id ? true : false);

    // If we're opening for a new contact, make sure we're in edit mode
    if (!initialData?.id) {
      setIsViewMode(false);
    }
  };

  // Function to open the task drawer
  const openTaskDrawer = (
    initialData?: TaskFormData,
    accountId?: string,
    contactId?: string
  ) => {
    // For new tasks, don't include any ID to prevent conflicts
    if (!initialData?.id) {
      setSelectedTask({
        subject: "",
        description: "",
        status: "not_started", // Use the correct backend value
        priority: "medium", // Use the correct backend value
        due_date: null,
        account_id: accountId || accountData?.id || "",
        contact_id: contactId || "",
        owner: null,
        // Explicitly don't include an ID for new tasks
      });
    } else {
      // For existing tasks, include the ID for editing
      setSelectedTask(initialData);
    }

    setTaskDrawerOpen(true);
    setIsViewMode(initialData?.id ? true : false);

    // If we're opening for a new task, make sure we're in edit mode
    if (!initialData?.id) {
      setIsViewMode(false);
    }
  };

  // Handle sidebar item click
  const handleSidebarItemClick = (itemId: string) => {
    drawerContext.setActiveSidebarItem(itemId);
    if (itemId === "edit") {
      setIsViewMode(false);
    } else if (itemId === "view") {
      setIsViewMode(true);
    }
  };

  // Address save mutation
  const saveAddressMutation = useMutation({
    mutationFn: (addressData: AddressFormData) => {
      // Map form data to API structure
      const apiData = mapFormDataToApiAddress(addressData);

      // Add the account ID to the data - backend expects account_id as an integer
      apiData.account_id = parseInt(accountId, 10);

      // Determine if this is a create or update operation
      if (addressData.id) {
        // Update existing address
        return api.put(`addresses/${addressData.id}/`, apiData, {
          headers: getAuthHeaders(),
        });
      } else {
        // Create new address
        return api.post(`addresses/`, apiData, {
          headers: getAuthHeaders(),
        });
      }
    },
    onSuccess: () => {
      // Invalidate the account detail query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["accountDetail", accountId] });

      // Show success notification
      setNotification({
        open: true,
        message: selectedAddress
          ? t("notifications.addressUpdated")
          : t("notifications.addressCreated"),
        severity: "success",
      });

      // Close the drawer
      setAddressDrawerOpen(false);
      setSelectedAddress(undefined);
    },
    onError: (error: any) => {
      // Show error notification
      setNotification({
        open: true,
        message: `${
          selectedAddress
            ? t("notifications.addressUpdateFailed")
            : t("notifications.addressCreateFailed")
        }: ${error.message}`,
        severity: "error",
      });
    },
  });

  // Function to handle saving an address
  const handleSaveAddress = (formData: AddressFormData) => {
    saveAddressMutation.mutate(formData);
  };

  // Handle save contact
  const saveContactMutation = useMutation({
    mutationFn: async (formData: ContactFormData) => {
      const url = formData.id ? `/contacts/${formData.id}/` : "/contacts/";

      const method = formData.id ? "put" : "post";

      const response = await api[method](url, formData, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountDetail", accountId] });
      setContactDrawerOpen(false);
      setNotification({
        open: true,
        message: selectedContact?.id
          ? "Contact updated successfully"
          : "Contact created successfully",
        severity: "success",
      });
    },
    onError: (error: any) => {
      setNotification({
        open: true,
        message: `Error: ${error.message || "Failed to save contact"}`,
        severity: "error",
      });
    },
  });

  const handleSaveContact = (formData: ContactFormData) => {
    // Ensure account_id is set properly for both new and existing contacts
    const updatedFormData = {
      ...formData,
      account_id: formData.account_id || accountId, // Use the current accountId if not provided
    };
    saveContactMutation.mutate(updatedFormData);
  };

  // Handle save task
  const saveTaskMutation = useMutation({
    mutationFn: async (formData: any) => {
      const url = formData.id ? `/tasks/${formData.id}/` : "/tasks/";

      const method = formData.id ? "put" : "post";

      const response = await api[method](url, formData, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountDetail", accountId] });
      queryClient.invalidateQueries({ queryKey: ["accountTasks", accountId] });
      setTaskDrawerOpen(false);
      // Reset task data after successful save
      setTimeout(() => {
        setSelectedTask(undefined);
      }, 300); // Small delay to ensure drawer animation completes
      setNotification({
        open: true,
        message: selectedTask?.id
          ? t("notifications.taskUpdated") || "Task updated successfully"
          : t("notifications.taskCreated") || "Task created successfully",
        severity: "success",
      });
    },
    onError: (error: any) => {
      setNotification({
        open: true,
        message: `Error: ${error.message || "Failed to save task"}`,
        severity: "error",
      });
    },
  });

  const handleSaveTask = (formData: TaskFormData | TaskApiData) => {
    // Transform the form data to match the backend API's expected structure
    const apiPayload: any = {
      // Keep standard fields
      subject: formData.subject,
      description: formData.description,
      due_date: formData.due_date,

      // Map status and priority to backend expected values
      status: mapStatusToBackend(formData.status),
      priority: mapPriorityToBackend(formData.priority),

      // Map relationship fields to the expected API field names
      related_account_id: formData.account_id || accountId,
      related_contact_id: formData.contact_id || null,

      // Map owner to assignee_id
      assignee_id: formData.owner || null,

      // Include completed information if available
      completed_date: formData.completed_at || null,
    };

    // Only include ID for updates, not for new tasks
    if (formData.id) {
      apiPayload.id = formData.id;
    }

    saveTaskMutation.mutate(apiPayload);
  };

  // Helper function to map frontend status values to backend expected values
  const mapStatusToBackend = (status: string): string => {
    const statusMap: Record<string, string> = {
      open: "not_started",
      // Add other mappings if needed
    };

    return statusMap[status] || status;
  };

  // Helper function to map frontend priority values to backend expected values
  const mapPriorityToBackend = (priority: string): string => {
    const priorityMap: Record<string, string> = {
      normal: "medium",
      // Add other mappings if needed
    };

    return priorityMap[priority] || priority;
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={340} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {t("common.errors.loadingFailed", { resource: t("common.account") })}
          {error?.message && `: ${error.message}`}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      <Box>
        {/* Header Section */}
        <AccountDetailHeader
          account={accountData}
          tabButtons={[
            {
              label: t("common.actions.logActivity"),
              onClick: () => {}, // Placeholder for log activity action
              disabled: false,
            },
            {
              label: t("common.actions.newTask"),
              onClick: () => openTaskDrawer(undefined, accountId),
              disabled: false,
            },
            {
              label: t("common.actions.addContact"),
              onClick: () => openContactDrawer(undefined, accountId),
              disabled: false,
            },
            {
              label: t("common.actions.addAddress"),
              onClick: () => openAddressDrawer(),
              disabled: false,
            },
          ]}
        />

        {/* Two-Column Layout - Reversed from original design based on requirements */}
        <Grid container spacing={3}>
          {/* Left Column - Account Details Sidebar (30% width) */}
          <Grid size={{ xs: 12, md: 3 }}>
            <AccountDetailsSidebar
              accountData={accountData}
              setActiveTab={setActiveTab}
              customFieldDefinitions={customFieldDefinitions}
            />
          </Grid>
          {/* Right Column - Tabs (70% width) */}
          <Grid size={{ xs: 12, md: 9 }}>
            <AccountDetailTabs
              account={accountData}
              accountId={accountId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              openAddressDrawer={openAddressDrawer}
              openContactDrawer={openContactDrawer}
              openTaskDrawer={openTaskDrawer}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Address Drawer */}
      <AnimatedDrawer
        open={addressDrawerOpen}
        onClose={() => setAddressDrawerOpen(false)}
        initialWidth={550}
        expandedWidth={550}
        title={
          selectedAddress
            ? isViewMode
              ? t("addressDrawer.viewAddress")
              : t("addressDrawer.editAddress")
            : t("addressDrawer.newAddress")
        }
        sidebarIcons={
          selectedAddress
            ? [
                {
                  id: "view",
                  icon: <VisibilityIcon />,
                  tooltip: t("common.view") || "View",
                  onClick: () => handleSidebarItemClick("view"),
                },
                {
                  id: "edit",
                  icon: <EditIcon />,
                  tooltip: t("common.edit") || "Edit",
                  onClick: () => handleSidebarItemClick("edit"),
                },
              ]
            : undefined
        }
        footerContent={
          <Box
            sx={{ display: "flex", width: "100%", justifyContent: "flex-end" }}
          >
            {!isViewMode && (
              <Button
                variant="contained"
                color="primary"
                disabled={saveAddressMutation.isPending}
                onClick={() => {
                  // Trigger form submission by clicking the hidden submit button
                  const submitButton = document.getElementById(
                    "address-form-submit"
                  ) as HTMLButtonElement;
                  if (submitButton) {
                    submitButton.click();
                  } else {
                    // Fallback: If button not found, call the handler directly
                    console.log(
                      "Submit button not found, using fallback method"
                    );
                    if (selectedAddress) {
                      handleSaveAddress({
                        ...selectedAddress,
                      });
                    }
                  }
                }}
                startIcon={
                  saveAddressMutation.isPending ? (
                    <CircularProgress size={20} />
                  ) : null
                }
                size="small"
              >
                {saveAddressMutation.isPending
                  ? t("common.processing")
                  : t("common.save")}
              </Button>
            )}
          </Box>
        }
      >
        <Box>
          <AddressForm
            initialData={selectedAddress}
            onSubmit={handleSaveAddress}
            onCancel={() => setAddressDrawerOpen(false)}
            isSubmitting={saveAddressMutation.isPending}
            isViewMode={isViewMode}
          />
        </Box>
      </AnimatedDrawer>

      {/* Contact Drawer */}
      <AnimatedDrawer
        open={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        initialWidth={550}
        expandedWidth={550}
        title={
          selectedContact?.id
            ? isViewMode
              ? t("contactDrawer.viewContact") || "View Contact"
              : t("contactDrawer.editContact") || "Edit Contact"
            : t("contactDrawer.newContact") || "New Contact"
        }
        sidebarIcons={
          selectedContact?.id
            ? [
                {
                  id: "view",
                  icon: <VisibilityIcon />,
                  tooltip: t("common.view") || "View",
                  onClick: () => handleSidebarItemClick("view"),
                },
                {
                  id: "edit",
                  icon: <EditIcon />,
                  tooltip: t("common.edit") || "Edit",
                  onClick: () => handleSidebarItemClick("edit"),
                },
              ]
            : undefined
        }
        footerContent={
          <Box
            sx={{ display: "flex", width: "100%", justifyContent: "flex-end" }}
          >
            {!isViewMode && (
              <Button
                variant="contained"
                color="primary"
                disabled={saveContactMutation.isPending}
                onClick={() => {
                  // Trigger form submission by clicking the hidden submit button
                  const submitButton = document.getElementById(
                    "contact-form-submit"
                  ) as HTMLButtonElement;
                  if (submitButton) {
                    submitButton.click();
                  } else {
                    // Fallback: If button not found, call the handler directly
                    console.log(
                      "Submit button not found, using fallback method"
                    );
                    if (selectedContact) {
                      handleSaveContact({
                        ...selectedContact,
                      });
                    }
                  }
                }}
                startIcon={
                  saveContactMutation.isPending ? (
                    <CircularProgress size={20} />
                  ) : null
                }
                size="small"
              >
                {saveContactMutation.isPending
                  ? t("common.processing") || "Processing..."
                  : t("common.save") || "Save"}
              </Button>
            )}
          </Box>
        }
      >
        <Box>
          <ContactForm
            initialData={selectedContact}
            onSubmit={handleSaveContact}
            onCancel={() => setContactDrawerOpen(false)}
            isSubmitting={saveContactMutation.isPending}
            isViewMode={isViewMode}
          />
        </Box>
      </AnimatedDrawer>

      {/* Task Drawer */}
      <AnimatedDrawer
        open={taskDrawerOpen}
        onClose={() => {
          setTaskDrawerOpen(false);
          // Reset task data when drawer closes to prevent ID reuse
          setTimeout(() => {
            setSelectedTask(undefined);
          }, 300); // Small delay to ensure drawer animation completes
        }}
        initialWidth={550}
        expandedWidth={550}
        title={
          selectedTask?.id
            ? isViewMode
              ? t("taskDrawer.viewTask") || "View Task"
              : t("taskDrawer.editTask") || "Edit Task"
            : t("taskDrawer.newTask") || "New Task"
        }
        sidebarIcons={
          selectedTask?.id
            ? [
                {
                  id: "view",
                  icon: <VisibilityIcon />,
                  tooltip: t("common.view") || "View",
                  onClick: () => handleSidebarItemClick("view"),
                },
                {
                  id: "edit",
                  icon: <EditIcon />,
                  tooltip: t("common.edit") || "Edit",
                  onClick: () => handleSidebarItemClick("edit"),
                },
              ]
            : undefined
        }
        footerContent={
          <Box
            sx={{ display: "flex", width: "100%", justifyContent: "flex-end" }}
          >
            {!isViewMode && (
              <Button
                variant="contained"
                color="primary"
                disabled={saveTaskMutation.isPending}
                onClick={() => {
                  // Trigger form submission by clicking the hidden submit button
                  const submitButton = document.getElementById(
                    "task-form-submit"
                  ) as HTMLButtonElement;
                  if (submitButton) {
                    submitButton.click();
                  } else {
                    // Fallback: If button not found, call the handler directly
                    console.log(
                      "Submit button not found, using fallback method"
                    );
                    if (selectedTask) {
                      handleSaveTask({
                        ...selectedTask,
                      });
                    }
                  }
                }}
                startIcon={
                  saveTaskMutation.isPending ? (
                    <CircularProgress size={20} />
                  ) : null
                }
                size="small"
              >
                {saveTaskMutation.isPending
                  ? t("common.processing") || "Processing..."
                  : t("common.save") || "Save"}
              </Button>
            )}
          </Box>
        }
      >
        <Box>
          <TaskForm
            initialData={selectedTask}
            onSubmit={handleSaveTask}
            onCancel={() => {
              setTaskDrawerOpen(false);
              // Reset task data when drawer is canceled
              setTimeout(() => {
                setSelectedTask(undefined);
              }, 300); // Small delay to ensure drawer animation completes
            }}
            isSubmitting={saveTaskMutation.isPending}
            isViewMode={isViewMode}
            accountId={accountId}
          />
        </Box>
      </AnimatedDrawer>

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleNotificationClose}
      />
    </>
  );
};

/**
 * Wrapper component that provides the DrawerContext
 */
export const AccountDetailPage: FC<AccountDetailPageProps> = (props) => {
  return (
    <DrawerProvider>
      <AccountDetailPageContent {...props} />
    </DrawerProvider>
  );
};
