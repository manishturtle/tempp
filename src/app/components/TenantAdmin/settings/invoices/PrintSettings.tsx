"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Autocomplete,
  CircularProgress,
} from "@mui/material";

interface PrintSettingsProps {
  isEditMode: boolean;
  data: any;
  setData: any;
  configDefinitions: any[];
  templates: any[];
  templatesLoading: boolean;
  templatesError: string | null;
}

const PrintSettings: React.FC<PrintSettingsProps> = ({
  isEditMode,
  data,
  setData,
  configDefinitions,
  templates,
  templatesLoading,
  templatesError,
}) => {
  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePrintSettingChange = (key: string, value: boolean) => {
    setData((prev: any) => ({
      ...prev,
      printSettings: {
        ...prev.printSettings,
        [key]: value,
      },
    }));
  };

  const printConfigs = configDefinitions.filter(
    (def: any) => def.category === "PRINT"
  );

  // Find the currently selected template
  const selectedTemplate =
    templates.find((t) => t.id === data.template_id) || null;

  // Filter print configs to only show those included in the selected template's print_settings
  const filteredPrintConfigs = selectedTemplate
    ? printConfigs.filter((config) =>
        selectedTemplate.print_settings.includes(config.id)
      )
    : [];

  // Initialize printSettings when template changes
  useEffect(() => {
    if (selectedTemplate && filteredPrintConfigs.length > 0) {
      const newPrintSettings: any = {};
      filteredPrintConfigs.forEach((config) => {
        // Only set if not already set (to preserve existing values)
        if (data.printSettings[config.key_name] === undefined) {
          newPrintSettings[config.key_name] = true; // Default to true
        }
      });

      // Only update if there are new settings to add
      if (Object.keys(newPrintSettings).length > 0) {
        setData((prev: any) => ({
          ...prev,
          printSettings: {
            ...prev.printSettings,
            ...newPrintSettings,
          },
        }));
      }
    }
  }, [selectedTemplate?.id, filteredPrintConfigs.length]);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" sx={{ mb: "0px" }}>
            Print Settings
          </Typography>
        </Grid>

        {/* Template Selection */}
        <Grid size={{ xs: 12 }}>
          <Autocomplete
            id="template-select"
            options={templates}
            loading={templatesLoading}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={templates.find((t) => t.id === data.template_id) || null}
            onChange={(_, newValue) => {
              handleChange("template_id", newValue ? newValue.id : null);
            }}
            disabled={isEditMode}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select template"
                error={!!templatesError}
                helperText={templatesError}
                fullWidth
                size="small"
                sx={{ mb: "0px" }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {templatesLoading && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>

        {/* Dynamic Print Settings */}
        {filteredPrintConfigs.map((config) => (
          <Grid size={{ xs: 12 }} key={config.id}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    data.printSettings[config.key_name] === undefined
                      ? true
                      : !!data.printSettings[config.key_name]
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePrintSettingChange(config.key_name, e.target.checked)
                  }
                  color="primary"
                />
              }
              label={config.display_name}
            />
          </Grid>
        ))}

        {/* Show message when no template is selected */}
        {filteredPrintConfigs.length === 0 && data.template_id === null && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              Select a template to view available print settings
            </Typography>
          </Grid>
        )}

        {/* Show message when template has no print settings */}
        {filteredPrintConfigs.length === 0 && data.template_id !== null && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              The selected template has no configurable print settings
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PrintSettings;
