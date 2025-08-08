import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { PromptVariant } from './page';

interface CompareVariantsModalProps {
  open: boolean;
  onClose: () => void;
  variants: PromptVariant[];
  onCompare: (selectedVariantIds: number[], variables: Record<number, Record<string, any>>) => void;
  tenantSlug: string;
}

const CompareVariantsModal: React.FC<CompareVariantsModalProps> = ({
  open,
  onClose,
  variants,
  onCompare,
  tenantSlug,
}) => {
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [variables, setVariables] = useState<Record<number, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (open) {
      setSelectedVariantIds([]);
      setVariables({});
      setError(null);
    }
  }, [open]);

  const handleVariantToggle = (variantId: number) => {
    setSelectedVariantIds((prev) => {
      const newSelection = prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId];

      // Update variables state when selection changes
      if (newSelection.length > 5) {
        setError('You can compare up to 5 variants at a time.');
        return prev; // Don't update selection if over limit
      } else {
        setError(null);
      }

      // Remove variables for unselected variants
      const newVariables = { ...variables };
      Object.keys(newVariables).forEach((id) => {
        if (!newSelection.includes(Number(id))) {
          delete newVariables[Number(id)];
        }
      });
      setVariables(newVariables);

      return newSelection;
    });
  };

  const handleVariableChange = (variantId: number, varName: string, value: any) => {
    setVariables((prev) => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [varName]: value,
      },
    }));
  };

  const handleCompare = () => {
    if (selectedVariantIds.length < 2) {
      setError('Please select at least 2 variants to compare');
      return;
    }
    onCompare(selectedVariantIds, variables);
  };

  const renderVariableInputs = (variant: PromptVariant) => {
    if (!variant.variables_schema?.properties) return null;

    return (
      <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Variables for {variant.variant_name}:
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(variant.variables_schema.properties).map(([varName, varDef]) => (
            <Grid item xs={12} sm={6} key={varName}>
              <TextField
                fullWidth
                size="small"
                label={varName}
                value={variables[variant.id]?.[varName] || ''}
                onChange={(e) => handleVariableChange(variant.id, varName, e.target.value)}
                placeholder={`Enter ${varName}`}
                required={variant.variables_schema.required?.includes(varName)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Compare Prompt Variants</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          Select up to 5 variants to compare. For variants with variables, you can specify test values.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {variants.map((variant) => (
            <Paper
              key={variant.id}
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                borderLeft: selectedVariantIds.includes(variant.id)
                  ? '4px solid #1976d2'
                  : '1px solid rgba(0, 0, 0, 0.12)',
              }}
            >
              <Box display="flex" alignItems="flex-start">
                <Checkbox
                  checked={selectedVariantIds.includes(variant.id)}
                  onChange={() => handleVariantToggle(variant.id)}
                  disabled={selectedVariantIds.length >= 5 && !selectedVariantIds.includes(variant.id)}
                />
                <Box sx={{ flexGrow: 1, ml: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">
                      {variant.variant_name}
                    </Typography>
                    <Chip
                      label={`v${variant.version_number}`}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {variant.prompt_name}
                  </Typography>
                  {selectedVariantIds.includes(variant.id) && renderVariableInputs(variant)}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCompare}
          variant="contained"
          color="primary"
          disabled={selectedVariantIds.length < 2 || isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Compare Selected'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompareVariantsModal;