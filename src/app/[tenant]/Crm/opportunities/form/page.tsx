"use client";

import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams, useParams } from "next/navigation";

// MUI Components
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

// Components
import OpportunityForm, { OpportunityFormRef } from "./OpportunityForm";
import ServiceTicketDetails from "./ServiceTicketDetails";

// API Hooks
import {
  useFetchOpportunity,
  useFetchStaffUsers,
} from "@/app/hooks/api/opportunities";

// Types
import { Opportunity } from "@/app/types/opportunities";

// Extended Opportunity type to include service_ticket
interface ExtendedOpportunity extends Opportunity {
  service_ticket?: {
    id: number;
    service_user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      linked_account: number;
      user_type: number[];
      phone: string | null;
      org_id: number;
      user_id: number | null;
      created_at: string;
      updated_at: string;
    };
    assigned_agent: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      full_name: string;
    } | null;
    tasks: Array<{
      id: number;
      source_step: {
        id: number;
        sop: {
          id: number;
        };
        sequence: number;
        step_name: string;
      };
      assigned_agent: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        full_name: string;
      } | null;
      subtasks: Array<{
        id: number;
        task: number;
        created_at: string;
        updated_at: string;
        created_by: number;
        updated_by: number;
        client_id: string;
        company_id: string;
        subtask_name: string;
        sequence: number;
        status: string;
        assigned_agent: {
          id: number;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
        } | null;
        visible: boolean;
      }>;
      client_id: string;
      company_id: string;
      created_at: string;
      updated_at: string;
      created_by: number;
      updated_by: number;
      task_name: string;
      sequence: number;
      status: string;
      allow_subtask_reordering: boolean;
      visible: boolean;
      service_ticket: number;
    }>;
    client_id: string;
    company_id: string;
    created_at: string;
    updated_at: string;
    created_by: number;
    updated_by: number;
    ticket_id: string;
    subject: string;
    body: string | null;
    status: string;
    priority: string;
    target_resolution_date: string | null;
    resolved_at: string | null;
    closed_at: string | null;
    executed_sop: number;
  };
}

const OpportunityFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = Array.isArray(params.tenant)
    ? params.tenant[0]
    : (params.tenant as string);

  // Get ID from query params (if in edit or view mode)
  const opportunityId = searchParams.get("id");
  const initialMode =
    searchParams.get("mode") || (opportunityId ? "edit" : "create");
  const [isViewMode, setIsViewMode] = useState(initialMode === "view");

  // Fetch opportunity data if in edit or view mode
  const {
    data: opportunity,
    isLoading,
    error,
  } = useFetchOpportunity(opportunityId || "", !!opportunityId) as {
    data?: ExtendedOpportunity;
    isLoading: boolean;
    error: any;
  };

  const { data: staffUsersData, isLoading: isLoadingStaffUsers } =
    useFetchStaffUsers();

  const formRef = useRef<OpportunityFormRef>(null);

  // Handle form submission
  const handleSubmit = () => {
    router.push(`/${tenantSlug}/Crm/opportunities`);
  };

  // Handle save/validate button click
  const handleSaveClick = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    router.push(`/${tenantSlug}/Crm/opportunities`);
  };

  // Handle view/edit mode toggle
  const handleModeToggle = () => {
    // Toggle the view mode directly using state
    setIsViewMode((prevMode) => !prevMode);
  };

  // Set page title based on mode
  let pageTitle = "";
  if (!opportunityId) {
    pageTitle = t("opportunity.create", "Create Opportunity");
  } else if (!isViewMode) {
    pageTitle = t("opportunity.edit", "Edit Opportunity");
  } else {
    pageTitle = t("opportunity.view", "View Opportunity");
  }

  // Opportunity form title (includes the opportunity name in edit/view mode)
  const formTitle = !opportunityId
    ? t("opportunity.createNew", "Create New Opportunity")
    : opportunity?.name || "";

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="h4" component="h1">
              {formTitle}
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleBackClick}>
                {t("common.back", "Back")}
              </Button>

              {opportunityId && (
                <Button variant="outlined" onClick={handleModeToggle}>
                  {isViewMode
                    ? t("common.edit", "Edit")
                    : t("common.viewMode", "View Mode")}
                </Button>
              )}

              {!isViewMode && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveClick}
                >
                  {t("common.save", "Save")}
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {/* Loading State */}
        {opportunityId && isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "30vh",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {opportunityId && error && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: "error.main",
            }}
          >
            <Typography variant="h6">
              {t("opportunity.errorLoading", "Error loading opportunity")}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {error instanceof Error ? error.message : String(error)}
            </Typography>
          </Box>
        )}

        {/* Form (only shown when not loading) */}
        {(!opportunityId || (!isLoading && !error)) && (
          <>
            <OpportunityForm
              ref={formRef}
              initialData={opportunity || null}
              onSubmit={handleSubmit}
              isViewMode={isViewMode}
              staffUsersData={staffUsersData || []}
              isLoadingStaffUsers={isLoadingStaffUsers}
            />

            {/* Service Ticket Details - only shown when service_ticket exists */}
            {opportunity?.service_ticket && (
              <ServiceTicketDetails
                serviceTicket={opportunity.service_ticket}
                isViewMode={isViewMode}
                staffUsersData={staffUsersData || []}
                isLoadingStaffUsers={isLoadingStaffUsers}
              />
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default OpportunityFormPage;
