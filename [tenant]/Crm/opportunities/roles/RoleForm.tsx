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
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

// API Hooks
import {
  useCreateOpportunityRole,
  useUpdateOpportunityRole,
} from "@/app/hooks/api/opportunities";

// Types
import { OpportunityRole } from "@/app/types/opportunities";

// Form validation schema
const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  desc: z.string().optional(),
  status: z.boolean().default(true),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData: OpportunityRole | null;
  onSubmit: () => void;
  isViewMode?: boolean;
}

const RoleForm = React.forwardRef<{ submitForm: () => void }, RoleFormProps>(
  ({ initialData, onSubmit, isViewMode }, ref) => {
    const { t } = useTranslation();

    // Set up mutations
    const createRole = useCreateOpportunityRole();
    const updateRole = useUpdateOpportunityRole();

    // Initialize form with react-hook-form and zod validation
    const {
      control,
      handleSubmit,
      formState: { errors, isDirty, isSubmitting },
      reset,
    } = useForm<RoleFormData>({
      resolver: zodResolver(roleSchema),
      defaultValues: {
        name: initialData?.name || "",
        desc: initialData?.desc || "",
        status: initialData?.status ?? true,
      },
    });

    // Reset form when initialData changes
    React.useEffect(() => {
      if (initialData) {
        reset({
          name: initialData.name,
          desc: initialData.desc || "",
          status: initialData.status,
        });
      } else {
        reset({
          name: "",
          desc: "",
          status: true,
        });
      }
    }, [initialData, reset]);

    // Handle form submission
    const processSubmit = async (data: RoleFormData) => {
      try {
        if (initialData?.id) {
          // Update existing role
          await updateRole.mutateAsync({
            id: initialData.id,
            name: data.name,
            desc: data.desc,
            status: data.status,
          });
        } else {
          // Create new role
          await createRole.mutateAsync({
            name: data.name,
            desc: data.desc,
            status: data.status,
          });
        }
        onSubmit();
      } catch (error) {
        console.error("Error saving role:", error);
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
          {t("roleForm.basicInfo", "Basic Information")}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("roleFields.name", "Role Name")}
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
            name="desc"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("roleFields.description", "Description")}
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
                  label={t("roleFields.status", "Active")}
                />
                {errors.status && (
                  <FormHelperText>{errors.status.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Box>

        {/* Submission Status */}
        {(createRole.isPending || updateRole.isPending) && (
          <Typography color="info.main" sx={{ mt: 2 }}>
            {t("common.saving", "Saving...")}
          </Typography>
        )}

        {createRole.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("roleForm.errorCreating", "Error creating role")}
          </Typography>
        )}

        {updateRole.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("roleForm.errorUpdating", "Error updating role")}
          </Typography>
        )}
      </Box>
    );
  }
);

RoleForm.displayName = "RoleForm";

export default RoleForm;
