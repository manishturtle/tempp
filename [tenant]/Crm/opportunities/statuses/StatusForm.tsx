"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// MUI Components
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

// API Hooks
import {
  useCreateOpportunityStatus,
  useUpdateOpportunityStatus,
} from "@/app/hooks/api/opportunities";

// Types
import { OpportunityStatus } from "@/app/types/opportunities";
import { InputLabel, MenuItem, Select } from "@mui/material";

// Form validation schema
const statusSchema = z.object({
  name: z.string().min(1, "Name is required"),
  desc: z.string().optional(),
  status: z.boolean().default(true),
  type: z.enum(["OPEN", "CLOSED_WON", "CLOSED_LOST"]),
});

type StatusFormData = z.infer<typeof statusSchema>;

export interface StatusFormRef {
  submitForm: () => void;
}

interface StatusFormProps {
  initialData: OpportunityStatus | null;
  onSubmit: () => void;
  isViewMode?: boolean;
}

const StatusForm = React.forwardRef<StatusFormRef, StatusFormProps>(
  ({ initialData, onSubmit, isViewMode }, ref) => {
    const { t } = useTranslation();

    // Set up mutations
    const createStatus = useCreateOpportunityStatus();
    const updateStatus = useUpdateOpportunityStatus();

    // Initialize form with react-hook-form and zod validation
    const {
      control,
      handleSubmit,
      formState: { errors, isDirty, isSubmitting },
      reset,
    } = useForm<StatusFormData>({
      resolver: zodResolver(statusSchema),
      defaultValues: {
        name: initialData?.name || "",
        desc: initialData?.desc || "",
        status: initialData?.status ?? true,
        type: initialData?.type ?? "OPEN",
      },
    });

    // Reset form when initialData changes
    React.useEffect(() => {
      if (initialData) {
        reset({
          name: initialData.name,
          desc: initialData.desc || "",
          status: initialData.status,
          type: initialData.type,
        });
      } else {
        reset({
          name: "",
          desc: "",
          status: true,
          type: "OPEN",
        });
      }
    }, [initialData, reset]);

    // Handle form submission
    const processSubmit = async (data: StatusFormData) => {
      try {
        if (initialData?.id) {
          // Update existing status
          await updateStatus.mutateAsync({
            id: initialData.id,
            name: data.name,
            desc: data.desc,
            status: data.status,
            type: data.type,
          });
        } else {
          // Create new status
          await createStatus.mutateAsync({
            name: data.name,
            desc: data.desc,
            status: data.status,
            type: data.type,
          });
        }
        onSubmit();
      } catch (error) {
        console.error("Error saving status:", error);
      }
    };

    // Expose submitForm method to parent component through ref
    React.useImperativeHandle(ref, () => ({
      submitForm: () => {
        handleSubmit(processSubmit)();
      },
    }));

    return (
      <Box component="form" onSubmit={handleSubmit(processSubmit)} noValidate>
        {/* Basic Information Section */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {t("statusForm.basicInfo", "Basic Information")}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("statusFields.name", "Status Name")}
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isViewMode}
                required
                margin="normal"
              />
            )}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel id="stage-type-label">
                  {t("saleStageFields.type")}
                </InputLabel>
                <Select
                  {...field}
                  labelId="stage-type-label"
                  label={t("saleStageFields.type")}
                  disabled={isViewMode}
                >
                  <MenuItem value="OPEN">{t("saleStageTypes.open")}</MenuItem>
                  <MenuItem value="CLOSED_WON">
                    {t("saleStageTypes.closedWon")}
                  </MenuItem>
                  <MenuItem value="CLOSED_LOST">
                    {t("saleStageTypes.closedLost")}
                  </MenuItem>
                </Select>
                {errors.type && (
                  <FormHelperText>{errors.type.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
          <Controller
            name="desc"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("statusFields.description", "Description")}
                fullWidth
                multiline
                rows={4}
                error={!!errors.desc}
                helperText={errors.desc?.message}
                disabled={isViewMode}
                margin="normal"
              />
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field: { onChange, value } }) => (
              <FormControl fullWidth margin="normal" error={!!errors.status}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      disabled={isViewMode}
                    />
                  }
                  label={t("statusFields.status", "Active")}
                />
                {errors.status && (
                  <FormHelperText>{errors.status.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Box>

        {/* Submission Status */}
        {(createStatus.isPending || updateStatus.isPending) && (
          <Typography color="info.main" sx={{ mt: 2 }}>
            {t("common.saving", "Saving...")}
          </Typography>
        )}

        {createStatus.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("statusForm.errorCreating", "Error creating status")}
          </Typography>
        )}

        {updateStatus.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("statusForm.errorUpdating", "Error updating status")}
          </Typography>
        )}
      </Box>
    );
  }
);

StatusForm.displayName = "StatusForm";

export default StatusForm;
