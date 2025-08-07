import React from "react";
import {
  Box,
  Typography,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Info as InfoIcon } from "@mui/icons-material";

// Styled components for the layout
const RightPanelContainer = styled(Box)(({ theme }) => ({
  height: "100%",
  overflow: "auto",
  backgroundColor: theme.palette.background.paper,
  "&::-webkit-scrollbar": {
    display: "none",
  },
}));

// Updated Field interface to include attributes
interface Field {
  id: string;
  field_name: string;
  field_type: string;
  field_attributes?: Record<string, any>;
  value?: string | string[];
  display_order?: number;
}

interface RightPanelPropertiesProps {
  selectedField: Field | null;
  fieldTypes: any;
  updateFieldAttribute: (attributeKeyToUpdate: string, value: any) => void;
}

const RightPanelProperties: React.FC<RightPanelPropertiesProps> = ({
  selectedField,
  fieldTypes,
  updateFieldAttribute,
}) => {
  const renderAttributeEditor = () => {
    if (!selectedField) {
      return (
        <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          <InfoIcon sx={{ fontSize: 40, mb: 1, opacity: 0.7 }} />
          <Typography variant="body1">
            Select a field from the preview to edit its properties.
          </Typography>
        </Box>
      );
    }

    // Ensure fieldTypes (fetched schema) is loaded and has the selectedField.type
    if (!fieldTypes || !fieldTypes[selectedField.field_type]) {
      return (
        <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body1">
            Loading field type definition or definition not found for:{" "}
            {selectedField.field_type}
          </Typography>
        </Box>
      );
    }

    // fieldTypeDef is the schema for the selected field's type from your fetched FIELD_ATTRIBUTES_SCHEMA
    // e.g., fieldTypes['SINGLE_LINE_TEXT_INPUT'] which contains label_config, placeholder_config etc.
    const fieldTypeDef = fieldTypes[selectedField.field_type];

    // The 'label' attribute (for the field itself) is a primary property we want to edit
    // It's configured via 'label_config' in our schema.
    const currentFieldDisplayLabel =
      selectedField.field_attributes?.label || "";

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Properties: {currentFieldDisplayLabel || selectedField.field_name}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Edit the main display label for the field */}
        {/* This assumes 'label_config' exists in your schema for all input types */}
        {fieldTypeDef.label_config && (
          <TextField
            fullWidth
            label={fieldTypeDef.label_config.label || "Field Display Label"}
            value={currentFieldDisplayLabel}
            onChange={(e) => updateFieldAttribute("label", e.target.value)} // 'label' is the key in selectedField.attributes
            margin="normal"
            size="small"
            helperText={fieldTypeDef.label_config.helpText}
            required={fieldTypeDef.label_config.required}
          />
        )}

        <TextField
          fullWidth
          label="Field System Name (Read-only)"
          value={selectedField.field_name || ""}
          InputProps={{ readOnly: true }}
          margin="normal"
          size="small"
          helperText="Automatically derived from Display Label. Used by the system."
          disabled
          sx={{ mb: 2 }}
        />

        {/* Edit the 'is_required' attribute for the field */}
        {/* This assumes 'is_required_config' exists in your schema */}
        {fieldTypeDef.is_required_config && (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(
                  selectedField.field_attributes?.is_required ??
                    fieldTypeDef.is_required_config.defaultValue
                )}
                onChange={(e) =>
                  updateFieldAttribute("is_required", e.target.checked)
                }
              />
            }
            label={
              fieldTypeDef.is_required_config.label ||
              "Is this field mandatory?"
            }
            sx={{ display: "block", mt: 1, mb: 1 }}
          />
        )}

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption">Type Specific Attributes</Typography>
        </Divider>

        {/* Iterate over the attribute configurations specific to this fieldType */}
        {Object.entries(fieldTypeDef).map(
          ([attrConfigKey, attrSchema]: [string, any]) => {
            // Skip already handled general configs or non-config properties like displayLabel for the type itself
            if (
              !attrConfigKey.endsWith("_config") ||
              attrConfigKey === "label_config" ||
              attrConfigKey === "is_required_config"
            ) {
              return null;
            }
            const attributeKey = attrConfigKey.replace("_config", "");
            const currentValue = selectedField.field_attributes?.[attributeKey];
            // Conditional rendering based on attrSchema.condition
            if (attrSchema.condition && selectedField.field_attributes) {
              const conditionAttributeKey = attrSchema.condition.replace(
                "_config",
                ""
              );
              if (!selectedField.field_attributes[conditionAttributeKey]) {
                return null; // Don't render if condition not met
              }
            }
            // Render different input types based on attrSchema.type
            if (
              attrSchema.type === "text" ||
              attrSchema.type === "url" ||
              attrSchema.type === "textarea" ||
              attrSchema.type === "date" ||
              attrSchema.type === "datetime-local"
            ) {
              return (
                <TextField
                  key={attrConfigKey}
                  fullWidth
                  type={
                    attrSchema.type === "textarea" ? undefined : attrSchema.type
                  } // TextField handles 'textarea' via multiline prop
                  label={attrSchema.label}
                  value={currentValue ?? ""} // Handle null/undefined for controlled component
                  onChange={(e) =>
                    updateFieldAttribute(attributeKey, e.target.value)
                  }
                  margin="normal"
                  size="small"
                  helperText={attrSchema.helpText}
                  multiline={attrSchema.type === "textarea"}
                  rows={
                    attrSchema.type === "textarea"
                      ? attrSchema.rows || 3
                      : undefined
                  }
                  InputLabelProps={
                    attrSchema.type === "date" ||
                    attrSchema.type === "datetime-local"
                      ? { shrink: true }
                      : {}
                  }
                />
              );
            } else if (attrSchema.type === "number") {
              return (
                <TextField
                  key={attrConfigKey}
                  fullWidth
                  type="number"
                  label={attrSchema.label}
                  value={currentValue}
                  defaultValue={currentValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFieldAttribute(
                      attributeKey,
                      val === "" || val === null ? null : Number(val)
                    );
                  }}
                  margin="normal"
                  size="small"
                  helperText={attrSchema.helpText}
                  inputProps={{
                    min: attrSchema.min_value,
                    max: attrSchema.max_value,
                    step: attrSchema.step_value,
                  }}
                />
              );
            } else if (attrSchema.type === "boolean") {
              return (
                <FormControlLabel
                  key={attrConfigKey}
                  control={
                    <Checkbox
                      checked={Boolean(currentValue)}
                      onChange={(e) =>
                        updateFieldAttribute(attributeKey, e.target.checked)
                      }
                    />
                  }
                  label={attrSchema.label}
                  sx={{ display: "block", mt: 1, mb: 1 }}
                />
              );
            } else if (attrSchema.type === "select" && attrSchema.options) {
              return (
                <FormControl
                  fullWidth
                  margin="normal"
                  size="small"
                  key={attrConfigKey}
                >
                  <InputLabel>{attrSchema.label}</InputLabel>
                  <Select
                    value={currentValue ?? ""}
                    label={attrSchema.label}
                    onChange={(e) =>
                      updateFieldAttribute(attributeKey, e.target.value)
                    }
                  >
                    {(
                      attrSchema.options as Array<{
                        value: string;
                        label: string;
                      }>
                    ).map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {attrSchema.helpText && (
                    <FormHelperText>{attrSchema.helpText}</FormHelperText>
                  )}
                </FormControl>
              );
            } else if (attrSchema.type === "array_of_objects") {
              // Handling for options_config specifically (array of {value, label})
              if (attributeKey === "options") {
                return (
                  <TextField
                    key={attrConfigKey}
                    fullWidth
                    label={attrSchema.label}
                    value={currentValue ?? ""}
                    onChange={(e) =>
                      updateFieldAttribute(attributeKey, e.target.value)
                    }
                    margin="normal"
                    size="small"
                    multiline
                    rows={3} // Sensible default
                    helperText={
                      attrSchema.helpText ||
                      "Enter options as: Label1, Label2, ... (Values will be auto-generated from labels)"
                    }
                  />
                );
              }
            } else if (attrSchema.type === "array_of_strings_comma_separated") {
              return (
                <TextField
                  key={attrConfigKey}
                  fullWidth
                  label={attrSchema.label}
                  value={
                    Array.isArray(currentValue)
                      ? currentValue.join(",")
                      : currentValue || ""
                  }
                  onChange={(e) => {
                    const arrValue = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s);
                    updateFieldAttribute(attributeKey, arrValue);
                  }}
                  margin="normal"
                  size="small"
                  helperText={
                    attrSchema.helpText || "Enter values separated by commas."
                  }
                />
              );
            } else if (attrSchema.type === "multi-select") {
              return (
                <FormControl
                  fullWidth
                  margin="normal"
                  size="small"
                  key={attrConfigKey}
                >
                  <InputLabel>{attrSchema.label}</InputLabel>
                  <Select
                    value={currentValue ?? []}
                    label={attrSchema.label}
                    onChange={(e) =>
                      updateFieldAttribute(attributeKey, e.target.value)
                    }
                    multiple
                  >
                    {(
                      attrSchema.options as Array<{
                        value: string;
                        label: string;
                      }>
                    ).map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {attrSchema.helpText && (
                    <FormHelperText>{attrSchema.helpText}</FormHelperText>
                  )}
                </FormControl>
              );
            }

            return (
              <Typography
                key={attrConfigKey}
                variant="caption"
                color="textSecondary"
                sx={{ display: "block", mt: 1 }}
              >
                (Unsupported config type: {attrSchema.type} for {attributeKey})
              </Typography>
            );
          }
        )}
      </Box>
    );
  };

  return <RightPanelContainer>{renderAttributeEditor()}</RightPanelContainer>;
};

export default RightPanelProperties;
