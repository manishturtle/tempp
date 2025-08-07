/**
 * Tax Rate Rule Editor Component
 *
 * Separate component for editing tax rate profile rules
 * Used within the event section of the AnimatedDrawer
 */
import React, { JSX } from "react";
import {
  Box,
  TextField,
  Grid,
  Button,
  Typography,
  Stack,
  Autocomplete,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { TaxRate } from "@/app/types/pricing";

interface TaxRateRuleEditorProps {
  editingRule: any;
  setEditingRule: (rule: any) => void;
  editingRuleIndex: number;
  taxRateOptions: TaxRate[];
  isTaxRatesLoading: boolean;
  watchedRules: any[];
  onSave: (cleanRule: any, updatedRules: any[]) => void;
  onCancel: () => void;
}

/**
 * Tax Rate Rule Editor component for managing rule conditions and outcomes
 */
export function TaxRateRuleEditor({
  editingRule,
  setEditingRule,
  editingRuleIndex,
  taxRateOptions,
  isTaxRatesLoading,
  watchedRules,
  onSave,
  onCancel,
}: TaxRateRuleEditorProps): JSX.Element {
  const { t } = useTranslation();

  const isEditing = editingRuleIndex >= 0;

  const handleAddCondition = (): void => {
    // Limit to maximum 3 conditions per rule
    if ((editingRule?.conditions || []).length >= 3) {
      return;
    }
    
    const newCondition = {
      attribute_name: "",
      operator: "",
      condition_value: "",
    };
    setEditingRule({
      ...editingRule,
      conditions: [...(editingRule?.conditions || []), newCondition],
    });
  };

  const handleUpdateCondition = (
    index: number,
    field: string,
    value: string
  ): void => {
    const updatedConditions = [...(editingRule?.conditions || [])];
    if (updatedConditions[index]) {
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value,
      };
      setEditingRule({
        ...editingRule,
        conditions: updatedConditions,
      });
    }
  };

  const handleDeleteCondition = (index: number): void => {
    const updatedConditions =
      editingRule?.conditions?.filter((_: any, i: number) => i !== index) || [];
    setEditingRule({
      ...editingRule,
      conditions: updatedConditions,
    });
  };

  const handleTaxRateChange = (newValue: TaxRate[]): void => {
    setEditingRule({
      ...editingRule,
      outcomes: Array.isArray(newValue)
        ? newValue.map((option) => ({ tax_rate: option.id }))
        : [],
    });
  };

  const handleSaveRule = (): void => {
    // Validate the rule has at least one condition and outcome
    if (!editingRule?.conditions?.length || !editingRule?.outcomes?.length) {
      alert("Rule must have at least one condition and one tax rate selected.");
      return;
    }

    // Validate all condition fields are filled
    const hasEmptyConditionFields = editingRule.conditions.some(
      (condition: any) => 
        !condition.attribute_name || 
        !condition.operator || 
        !condition.condition_value
    );

    if (hasEmptyConditionFields) {
      alert("Please fill all condition fields (Attribute, Operator, and Value).");
      return;
    }

    // Validate at least one tax rate is selected
    if (!editingRule?.outcomes?.length) {
      alert("Please select at least one tax rate.");
      return;
    }

    // Clean and prepare the rule data
    const cleanRule = {
      ...editingRule,
      // Ensure conditions have required fields
      conditions: (editingRule.conditions || [])
        .filter(Boolean)
        .map((condition: any) => ({
          attribute_name: condition.attribute_name || "",
          operator: condition.operator || "",
          condition_value: condition.condition_value || "",
        })),
      // Ensure outcomes have required fields
      outcomes: (editingRule.outcomes || [])
        .filter(Boolean)
        .map((outcome: any) => ({
          tax_rate: outcome.tax_rate,
        })),
      // Ensure required dates are present
      effective_from:
        editingRule.effective_from ||
        new Date().toISOString().split("T")[0],
      effective_to:
        editingRule.effective_to ||
        new Date(new Date().getFullYear() + 1, 11, 31)
          .toISOString()
          .split("T")[0],
      is_active: editingRule.is_active !== false, // default to true if not set
    };

    // Get current rules
    const currentRules = watchedRules || [];
    const updatedRules = [...currentRules];

    if (editingRuleIndex >= 0 && editingRuleIndex < updatedRules.length) {
      // Update existing rule
      updatedRules[editingRuleIndex] = cleanRule;
    } else {
      // Add new rule with priority
      updatedRules.push({
        ...cleanRule,
        priority: updatedRules.length + 1,
      });
    }

    console.log("Saving rule with data:", {
      cleanRule,
      isEditing: editingRuleIndex >= 0,
      currentRulesCount: currentRules.length,
      updatedRulesCount: updatedRules.length,
    });

    onSave(cleanRule, updatedRules);
  };

  const renderConditionValueField = (condition: any, index: number): JSX.Element => {
    if (condition?.attribute_name === "Selling Price") {
      return (
        <TextField
          size="small"
          fullWidth
          type="number"
          value={condition?.condition_value || ""}
          onChange={(e) =>
            handleUpdateCondition(index, "condition_value", e.target.value)
          }
          placeholder="Enter amount"
          inputProps={{ min: 0, step: "0.01" }}
        />
      );
    }

    if (condition?.attribute_name === "Market") {
      return (
        <Autocomplete
          size="small"
          options={["Domestic", "International"]}
          value={condition?.condition_value || ""}
          onChange={(_, newValue) =>
            handleUpdateCondition(index, "condition_value", newValue || "")
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select market"
              size="small"
            />
          )}
          disableClearable
          fullWidth
        />
      );
    }

    return (
      <Autocomplete
        size="small"
        options={["Within same state", "To a different state"]}
        value={condition?.condition_value || ""}
        onChange={(_, newValue) =>
          handleUpdateCondition(index, "condition_value", newValue || "")
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select jurisdiction"
            size="small"
          />
        )}
        disableClearable
        fullWidth
      />
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {isEditing ? t("Edit Rule") : t("Add New Rule")}
        </Typography>
        <IconButton
          size="small"
          onClick={onCancel}
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Conditions Section */}
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "medium" }}>
        {t("Conditions")}
      </Typography>

      <Stack spacing={1} sx={{ mb: 3 }}>
        {/* Header Row */}
        <Grid container spacing={2} sx={{ mb: 1, px: 1 }}>
          <Grid size={{ xs: 5, sm: 5 }}>
            <Typography variant="body2" sx={{ fontWeight: "medium" }}>
              {t("Attribute")}
            </Typography>
          </Grid>
          <Grid size={{ xs: 3, sm: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: "medium" }}>
              {t("Operator")}
            </Typography>
          </Grid>
          <Grid size={{ xs: 3, sm: 4 }}>
            <Typography variant="body2" sx={{ fontWeight: "medium" }}>
              {t("Value")}
            </Typography>
          </Grid>
          <Grid size={{ xs: 1, sm: 1 }}>{/* Action column */}</Grid>
        </Grid>

        {/* Conditions List */}
        {Array.isArray(editingRule?.conditions) &&
          editingRule.conditions.map((condition: any, index: number) => (
            <Grid key={index} container spacing={1} alignItems="center">
              <Grid size={{ xs: 12, sm: 5 }}>
                <Autocomplete
                  size="small"
                  freeSolo
                  fullWidth
                  options={[
                    "Selling Price",
                    "Market",
                    "Supply Jurisdiction",
                  ]}
                  value={condition?.attribute_name || ""}
                  onChange={(event: any, newValue: string | null) =>
                    handleUpdateCondition(index, "attribute_name", newValue || "")
                  }
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Select attribute" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <Autocomplete
                  size="small"
                  options={["=", "!=", ">", ">=", "<", "<="]}
                  value={condition?.operator || ""}
                  onChange={(_, newValue) =>
                    handleUpdateCondition(index, "operator", newValue || "")
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Operator"
                      size="small"
                    />
                  )}
                  disableClearable
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                {renderConditionValueField(condition, index)}
              </Grid>
              <Grid
                size={{ xs: 2, sm: 1 }}
                sx={{ display: "flex", justifyContent: "flex-end" }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleDeleteCondition(index)}
                  sx={{ color: "error.main" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          ))}

        {/* Add Condition Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddCondition}
          disabled={(editingRule?.conditions || []).length >= 3}
          sx={{ alignSelf: "flex-start" }}
        >
          {t("Add Condition")} {(editingRule?.conditions || []).length >= 3 ? "(Max 3)" : ""}
        </Button>
      </Stack>

      {/* Tax Rates Selection */}
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "medium" }}>
        {t("Applicable Tax Rates")}
      </Typography>

      <Autocomplete
        multiple
        options={taxRateOptions || []}
        getOptionLabel={(option) =>
          option && option.rate_name
            ? `${option.rate_name} (${option.rate_percentage}%)`
            : ""
        }
        value={
          Array.isArray(taxRateOptions)
            ? taxRateOptions.filter(
                (opt) =>
                  Array.isArray(editingRule?.outcomes) &&
                  editingRule.outcomes.some(
                    (o: any) => o && opt && o.tax_rate === opt.id
                  )
              )
            : []
        }
        onChange={(_, newValue) => handleTaxRateChange(newValue)}
        loading={isTaxRatesLoading}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            size="small"
            label={t("Select Tax Rates")}
            placeholder={t("Choose tax rates")}
          />
        )}
        isOptionEqualToValue={(option, value) =>
          option && value && option.id === value.id
        }
        sx={{ mb: 3 }}
      />

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          mt: 3,
        }}
      >
        <Button variant="outlined" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button variant="contained" onClick={handleSaveRule}>
          {t("Save Rule")}
        </Button>
      </Box>
    </Box>
  );
}
