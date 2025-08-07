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
  useCreateOpportunityType,
  useUpdateOpportunityType,
} from "@/app/hooks/api/opportunities";

// Types
import { OpportunityType } from "@/app/types/opportunities";

// Form validation schema
const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  desc: z.string().optional(),
  status: z.boolean().default(true),
});

type TypeFormData = z.infer<typeof typeSchema>;

export interface TypeFormRef {
  submitForm: () => void;
}

interface TypeFormProps {
  initialData: OpportunityType | null;
  onSubmit: () => void;
  isViewMode?: boolean;
}

const TypeForm = React.forwardRef<TypeFormRef, TypeFormProps>(
  ({ initialData, onSubmit, isViewMode }, ref) => {
    const { t } = useTranslation();

    // Set up mutations
    const createType = useCreateOpportunityType();
    const updateType = useUpdateOpportunityType();

    // Initialize form with react-hook-form and zod validation
    const {
      control,
      handleSubmit,
      formState: { errors, isDirty, isSubmitting },
      reset,
    } = useForm<TypeFormData>({
      resolver: zodResolver(typeSchema),
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
    const processSubmit = async (data: TypeFormData) => {
      try {
        if (initialData?.id) {
          // Update existing type
          await updateType.mutateAsync({
            id: initialData.id,
            name: data.name,
            desc: data.desc,
            status: data.status,
          });
        } else {
          // Create new type
          await createType.mutateAsync({
            name: data.name,
            desc: data.desc,
            status: data.status,
          });
        }
        onSubmit();
      } catch (error) {
        console.error("Error saving opportunity type:", error);
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
          {t("typeForm.basicInfo", "Basic Information")}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("typeFields.name", "Type Name")}
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
                label={t("typeFields.description", "Description")}
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
                  label={t("typeFields.status", "Active")}
                />
                {errors.status && (
                  <FormHelperText>{errors.status.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Box>

        {/* Submission Status */}
        {(createType.isPending || updateType.isPending) && (
          <Typography color="info.main" sx={{ mt: 2 }}>
            {t("common.saving", "Saving...")}
          </Typography>
        )}

        {createType.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("typeForm.errorCreating", "Error creating opportunity type")}
          </Typography>
        )}

        {updateType.isError && (
          <Typography color="error" sx={{ mt: 2 }}>
            {t("typeForm.errorUpdating", "Error updating opportunity type")}
          </Typography>
        )}
      </Box>
    );
  }
);

TypeForm.displayName = "TypeForm";

export default TypeForm;
