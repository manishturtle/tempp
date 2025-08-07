/**
 * Tax Rate Profile Form Component
 *
 * Form for creating and editing tax rate profiles with tax rate selection
 */
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  TextField,
  Grid,
  FormControlLabel,
  FormControl,
  FormLabel,
  Button,
  Typography,
  Switch,
  Card,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import {
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { taxRateProfileSchema, TaxRateProfileFormValues } from "../schemas";
import { useTheme } from "@mui/material/styles";
import { useEventControls } from "@/app/components/common/AnimatedDrawer";
import { useFetchTaxRates } from "@/app/hooks/api/pricing";
import { TaxRateRuleEditor } from "./TaxRateRuleEditor";

// Sortable Rule Item Component
interface SortableRuleItemProps {
  rule: any;
  index: number;
  isViewMode: boolean;
  editingRuleIndex: number;
  editingRule: any;
  onEditRule: (index: number) => void;
  onDeleteRule: (index: number) => void;
  t: (key: string) => string;
}

function SortableRuleItem({
  rule,
  index,
  isViewMode,
  editingRuleIndex,
  editingRule,
  onEditRule,
  onDeleteRule,
  t,
}: SortableRuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `rule-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: editingRuleIndex === index ? "primary.main" : "divider",
        backgroundColor:
          editingRuleIndex === index ? "primary.50" : "background.paper",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 1,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <IconButton
          size="small"
          sx={{ mt: 0.25, cursor: isDragging ? "grabbing" : "grab" }}
          {...attributes}
          {...listeners}
        >
          <DragIcon fontSize="small" color="action" />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 0.5,
            }}
          >
            <Chip
              label={index + 1}
              size="small"
              color="primary"
              sx={{ minWidth: 20, height: 16, fontSize: "0.65rem" }}
            />
            {editingRuleIndex === index && (
              <Chip
                label={t("Editing")}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 16, fontSize: "0.6rem" }}
              />
            )}
          </Box>

          {rule.conditions && rule.conditions.length > 0 ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.8rem",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontWeight: "bold" }}>Conditions:</span>{" "}
              {rule.conditions
                .map(
                  (cond: any) =>
                    `${cond.attribute_name?.replace("_", " ")} ${
                      cond.operator
                    } ${cond.condition_value}`
                )
                .join(", ")}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.7rem", ml: 1 }}
            >
              No conditions defined
            </Typography>
          )}

          {/* Outcomes */}
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.8rem",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            <span style={{ fontWeight: "bold" }}>Tax Rates:</span>{" "}
            {rule.outcomes && rule.outcomes.length > 0
              ? rule.outcomes
                  .map((outcome: any) => `Tax Rate ${outcome.tax_rate}`)
                  .join(", ")
              : "No tax rates defined"}
          </Typography>
        </Box>

        {!isViewMode && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onEditRule(index)}
              disabled={editingRuleIndex === index || editingRule !== null}
              sx={{
                color:
                  editingRuleIndex === index || editingRule !== null
                    ? "action.disabled"
                    : "primary.main",
                p: 0.5,
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDeleteRule(index)}
              disabled={editingRuleIndex === index || editingRule !== null}
              sx={{
                color:
                  editingRuleIndex === index || editingRule !== null
                    ? "action.disabled"
                    : "error.main",
                p: 0.5,
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Card>
  );
}

interface TaxRateProfileFormProps {
  defaultValues?: Partial<TaxRateProfileFormValues>;
  onSubmit: (data: TaxRateProfileFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  isViewMode?: boolean;
}

/**
 * Tax Rate Profile Form component
 */
export const TaxRateProfileForm = React.forwardRef<
  { submitForm: () => void },
  TaxRateProfileFormProps
>(
  (
    {
      defaultValues = {
        profile_name: "",
        description: "",
        country_code: "IN",
        is_active: true,
        rules: [],
      },
      onSubmit,
      isSubmitting = false,
      isEditMode = false,
      isViewMode = false,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const theme = useTheme();

    // Use event controls to interact with the drawer's event section
    const eventControls = useEventControls();

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors },
    } = useForm<TaxRateProfileFormValues>({
      resolver: zodResolver(taxRateProfileSchema),
      defaultValues: defaultValues as TaxRateProfileFormValues,
    });

    // Watch rules for real-time updates
    const watchedRules = watch("rules") || [];

    // State for rule editing
    const [editingRuleIndex, setEditingRuleIndex] = React.useState<number>(-1);
    const [editingRule, setEditingRule] = React.useState<any>(null);

    // Fetch tax rates
    const { data: taxRatesData, isLoading: isTaxRatesLoading } =
      useFetchTaxRates();
    const taxRateOptions = taxRatesData?.results || [];

    // Drag and drop sensors
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Handle drag end
    const handleDragEnd = React.useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = watchedRules.findIndex(
            (_, index) => `rule-${index}` === active.id
          );
          const newIndex = watchedRules.findIndex(
            (_, index) => `rule-${index}` === over.id
          );

          if (oldIndex !== -1 && newIndex !== -1) {
            const newRules = arrayMove(watchedRules, oldIndex, newIndex);
            setValue("rules", newRules, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }
        }
      },
      [watchedRules, setValue]
    );

    // Stable callback functions to prevent infinite loops
    const handleSaveRule = React.useCallback(
      (cleanRule: any, updatedRules: any[]) => {
        // Update form state with validation
        setValue("rules", updatedRules, {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Reset editing state
        setEditingRuleIndex(-1);
        setEditingRule(null);

        // Close event section
        eventControls.closeEventSection();
      },
      [setValue, eventControls]
    );

    const handleCancelRule = React.useCallback(() => {
      // Reset editing state
      setEditingRuleIndex(-1);
      setEditingRule(null);

      // Close event section
      eventControls.closeEventSection();
    }, [eventControls]);

    // Update event content when editingRule changes
    React.useEffect(() => {
      if (editingRule && eventControls) {
        eventControls.setEventContent(
          <TaxRateRuleEditor
            editingRule={editingRule}
            setEditingRule={setEditingRule}
            editingRuleIndex={editingRuleIndex}
            taxRateOptions={taxRateOptions}
            isTaxRatesLoading={isTaxRatesLoading}
            watchedRules={watchedRules}
            onSave={handleSaveRule}
            onCancel={handleCancelRule}
          />
        );
      }
    }, [
      editingRule,
      editingRuleIndex,
      taxRateOptions,
      isTaxRatesLoading,
      watchedRules,
      eventControls,
      handleSaveRule,
      handleCancelRule,
    ]);

    // Show rule editor in event section
    const showRuleEditor = (ruleIndex: number | null) => {
      const actualIndex = ruleIndex === null ? -1 : ruleIndex;
      const isEditing = actualIndex >= 0;
      const rule = isEditing ? watchedRules[actualIndex] : null;

      // Set editing state
      setEditingRuleIndex(actualIndex);
      setEditingRule(
        rule
          ? {
              ...rule,
              conditions: rule.conditions || [],
              outcomes: rule.outcomes || [],
            }
          : {
              priority: watchedRules.length + 1,
              is_active: true,
              effective_from: new Date().toISOString().split("T")[0],
              effective_to: new Date(new Date().getFullYear(), 11, 31)
                .toISOString()
                .split("T")[0],
              conditions: [],
              outcomes: [],
            }
      );

      // Open the event section (content will be set by useEffect)
      eventControls.openEventSection();
    };

    // Rule management functions
    const handleAddRule = () => {
      showRuleEditor(null);
    };

    const handleEditRule = (ruleIndex: number) => {
      showRuleEditor(ruleIndex);
    };

    const handleDeleteRule = (ruleIndex: number) => {
      const currentRules = watchedRules.filter(
        (_, index) => index !== ruleIndex
      );
      setValue("rules", currentRules);
    };

    // Expose submitForm method to parent component via ref
    React.useImperativeHandle(ref, () => ({
      submitForm: () => {
        handleSubmit(onSubmit)();
      },
    }));

    return (
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="profile_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label={t("Name")}
                  fullWidth
                  required
                  error={!!errors.profile_name}
                  helperText={errors.profile_name?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label={t("Description")}
                  fullWidth
                  multiline
                  sx={{ mb: 0 }}
                  rows={1}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Rules Management Section */}
          <Grid size={{ xs: 12 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: "medium", mb: 1, mt: 1 }}
            >
              Rule Priority (Drag to reorder)
            </Typography>

            {watchedRules.length === 0 ? (
              <Card
                sx={{
                  p: 3,
                  textAlign: "center",
                  bgcolor: "grey.50",
                  border: "2px dashed",
                  borderColor: "grey.300",
                }}
              >
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  No rules defined
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Create rules to define when specific tax rates should be
                  applied
                </Typography>
                {!isViewMode && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddRule}
                    size="small"
                    disabled={editingRule !== null}
                  >
                    Add Rule
                  </Button>
                )}
              </Card>
            ) : (
              <Stack spacing={1}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={watchedRules.map((_, index) => `rule-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack spacing={1}>
                      {watchedRules.map((rule, index) => (
                        <SortableRuleItem
                          key={`rule-${index}`}
                          rule={rule}
                          index={index}
                          isViewMode={isViewMode}
                          editingRuleIndex={editingRuleIndex}
                          editingRule={editingRule}
                          onEditRule={handleEditRule}
                          onDeleteRule={handleDeleteRule}
                          t={t}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>

                {!isViewMode && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddRule}
                    size="small"
                    disabled={editingRule !== null}
                    sx={{ alignSelf: "flex-start", mt: 1 }}
                  >
                    Add Rule
                  </Button>
                )}
              </Stack>
            )}
          </Grid>

          {isEditMode && (
            <Grid size={12}>
              <FormControl component="fieldset">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!value}
                          onChange={(e) => onChange(e.target.checked)}
                          disabled={isViewMode}
                          color="primary"
                        />
                      }
                      label={value ? t("Active") : t("Inactive")}
                      labelPlacement="start"
                    />
                  )}
                />
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }
);
