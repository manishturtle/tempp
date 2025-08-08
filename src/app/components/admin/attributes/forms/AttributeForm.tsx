/**
 * Attribute Form Component
 *
 * Form for creating and editing attributes with data type selection and validation rules
 */
import React, { useEffect, forwardRef, useImperativeHandle } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Grid,
  Paper,
  FormHelperText,
  Autocomplete,
  Chip,
  CircularProgress,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Card,
  CardContent,
  InputLabel
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useTranslation } from "react-i18next";
import { attributeSchema, AttributeFormValues } from "../schemas";
import { useFetchAttributeGroups } from "@/app/hooks/api/attributes";
import { AttributeGroup, AttributeDataType } from "@/app/types/attributes";

interface AttributeFormProps {
  initialData?: Partial<AttributeFormValues> & { id?: number };
  onSubmit: (data: AttributeFormValues) => void;
  isSubmitting?: boolean;
  isViewMode?: boolean;
}

// Define the ref type
export interface AttributeFormRef {
  submitForm: () => void;
}

const AttributeForm = forwardRef<AttributeFormRef, AttributeFormProps>(
  (props, ref) => {
    const {
      initialData = {
        name: "",
        code: "",
        label: "",
        data_type: AttributeDataType.TEXT,
        description: "",
        is_active: true,
        use_for_variants: true,
        show_on_pdp: true,
        is_required: true,
        is_filterable: true,
        validation_rules: {},
        groups: [],
        options: [],
      },
      onSubmit,
      isSubmitting = false,
      isViewMode = false,
    } = props;

    const { t } = useTranslation();

    // Fetch attribute groups for the dropdown
    const { data: attributeGroupsData, isLoading: isLoadingAttributeGroups } = useFetchAttributeGroups({
      is_active: true // Only fetch active attribute groups
    });

    // Create a map of attribute groups for faster lookups
    const attributeGroupsMap = React.useMemo(() => {
      const map = new Map<number, AttributeGroup>();
      if (attributeGroupsData?.results) {
        attributeGroupsData.results.forEach((group) => {
          map.set(group.id, group);
        });
      } else if (Array.isArray(attributeGroupsData)) {
        // Handle case where attributeGroupsData is directly an array
        attributeGroupsData.forEach((group) => {
          map.set(group.id, group);
        });
      }
      return map;
    }, [attributeGroupsData]);

    useEffect(() => {
      console.log("Attribute Groups Data:", attributeGroupsData);
    }, [attributeGroupsData]);

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors },
    } = useForm<AttributeFormValues>({
      resolver: zodResolver(attributeSchema),
      defaultValues: initialData as AttributeFormValues,
    });

    // Set up field array for options
    const { fields, append, remove, move } = useFieldArray({
      control,
      name: "options",
    });

    // Watch data_type to conditionally render fields
    const dataType = watch("data_type");

    // Determine if we should show options section
    const showOptions = dataType === AttributeDataType.SELECT || dataType === AttributeDataType.MULTI_SELECT;

    // Expose submitForm method through ref
    useImperativeHandle(ref, () => ({
      submitForm: () => {
        handleSubmit(onSubmit)();
      },
    }));

    // Render validation fields based on data type
    const renderValidationFields = () => {
      switch (dataType) {
        case AttributeDataType.TEXT:
          return (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.min_length"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      size="small"
                      label={t("attributes.attribute.minLength")}
                      value={value === undefined ? "" : value}
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        onChange(val);
                      }}
                      fullWidth
                      InputProps={{
                        inputProps: { min: 0, step: 1 },
                      }}
                      error={!!errors.validation_rules?.min_length}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.min_length && (
                  <FormHelperText error>
                    {String(errors.validation_rules.min_length.message)}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.max_length"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      size="small"
                      label={t("attributes.attribute.maxLength")}
                      value={value === undefined ? "" : value}
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        onChange(val);
                      }}
                      fullWidth
                      InputProps={{
                        inputProps: { min: 1, step: 1 },
                      }}
                      error={!!errors.validation_rules?.max_length}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.max_length && (
                  <FormHelperText error>
                    {String(errors.validation_rules.max_length.message)}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="validation_rules.regex_pattern"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={t("attributes.attribute.regexPattern")}
                      fullWidth
                      error={!!errors.validation_rules?.regex_pattern}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.regex_pattern && (
                  <FormHelperText error>
                    {String(errors.validation_rules.regex_pattern.message)}
                  </FormHelperText>
                )}
              </Grid>
            </>
          );
        case AttributeDataType.NUMBER:
          return (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.min_value"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      size="small"
                      label={t("attributes.attribute.minValue")}
                      value={value === undefined ? "" : value}
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        onChange(val);
                      }}
                      fullWidth
                      error={!!errors.validation_rules?.min_value}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.min_value && (
                  <FormHelperText error>
                    {String(errors.validation_rules.min_value.message)}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.max_value"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      size="small"
                      label={t("attributes.attribute.maxValue")}
                      value={value === undefined ? "" : value}
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        onChange(val);
                      }}
                      fullWidth
                      error={!!errors.validation_rules?.max_value}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.max_value && (
                  <FormHelperText error>
                    {String(errors.validation_rules.max_value.message)}
                  </FormHelperText>
                )}
              </Grid>
            </>
          );
        case AttributeDataType.DATE:
          return (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.date_format"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={t("attributes.attribute.dateFormat")}
                      placeholder="YYYY-MM-DD"
                      fullWidth
                      error={!!errors.validation_rules?.date_format}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.date_format && (
                  <FormHelperText error>
                    {String(errors.validation_rules.date_format.message)}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.min_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={t("attributes.attribute.minDate")}
                      placeholder="YYYY-MM-DD"
                      fullWidth
                      error={!!errors.validation_rules?.min_date}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.min_date && (
                  <FormHelperText error>
                    {String(errors.validation_rules.min_date.message)}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="validation_rules.max_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={t("attributes.attribute.maxDate")}
                      placeholder="YYYY-MM-DD"
                      fullWidth
                      error={!!errors.validation_rules?.max_date}
                      disabled={isViewMode}
                    />
                  )}
                />
                {errors.validation_rules?.max_date && (
                  <FormHelperText error>
                    {String(errors.validation_rules.max_date.message)}
                  </FormHelperText>
                )}
              </Grid>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label={t("name")}
                  fullWidth
                  required
                  error={!!errors.name}
                  disabled={isViewMode}
                />
              )}
            />
            {errors.name && (
              <FormHelperText error>{errors.name.message}</FormHelperText>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label={t("code")}
                  fullWidth
                  required
                  error={!!errors.code}
                  disabled={isViewMode}
                />
              )}
            />
            {errors.code && (
              <FormHelperText error>{errors.code.message}</FormHelperText>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="label"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label={t("Label")}
                  fullWidth
                  required
                  error={!!errors.label}
                  disabled={isViewMode}
                />
              )}
            />
            {errors.label && (
              <FormHelperText error>{errors.label.message}</FormHelperText>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth error={!!errors.data_type} size="small">
              <InputLabel id="data-type-label" size="small">{t("Data Type")}</InputLabel>
              <Controller
                name="data_type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="data-type-label"
                    label={t("dataType")}
                    size="small"
                    disabled={isViewMode}
                    sx={{ height: '38px' }}
                  >
                    <MenuItem value={AttributeDataType.TEXT}>
                      {t("attributes.attribute.text")}
                    </MenuItem>
                    <MenuItem value={AttributeDataType.NUMBER}>
                      {t("attributes.attribute.number")}
                    </MenuItem>
                    <MenuItem value={AttributeDataType.BOOLEAN}>
                      {t("attributes.attribute.boolean")}
                    </MenuItem>
                    <MenuItem value={AttributeDataType.DATE}>
                      {t("attributes.attribute.date")}
                    </MenuItem>
                    <MenuItem value={AttributeDataType.SELECT}>
                      {t("attributes.attribute.select")}
                    </MenuItem>
                    <MenuItem value={AttributeDataType.MULTI_SELECT}>
                      {t("attributes.attribute.multiSelect")}
                    </MenuItem>
                  </Select>
                )}
              />
              {errors.data_type && (
                <FormHelperText>{errors.data_type.message}</FormHelperText>
              )}
            </FormControl>
          </Grid>

        

          {/* <Grid item xs={12} md={6}>
            <FormControl>
              <FormLabel>{t("Filterable")}</FormLabel>
              <Controller
                name="is_filterable"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        {...field}
                        disabled={isViewMode}
                      />
                    }
                    label={value ? t("yes") : t("no")}
                  />
                )}
              />
            </FormControl>
          </Grid> */}
          {dataType !== AttributeDataType.SELECT &&
            dataType !== AttributeDataType.MULTI_SELECT && (
              <Grid size={{ xs: 12 }}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      {t("attributes.attribute.validationRules")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      {renderValidationFields()}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
               {/* Options Management Section - Only for SELECT and MULTI_SELECT */}
          {showOptions && (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    {t("Options")}
                  </Typography>
                  {!isViewMode && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => append({ 
                        option_label: '', 
                        option_value: '', 
                        sort_order: fields.length 
                      })}
                      variant="outlined"
                      size="small"
                    >
                      {t("AddOption")}
                    </Button>
                  )}
                </Box>
                
                {fields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    {isViewMode 
                      ? t("NoOptionsAvailable") 
                      : t("NoOptionsAddedYet")}
                  </Typography>
                ) : (
                  <>
                    {fields.map((field, index) => (
                      <Box key={field.id} sx={{ mb: 2, p: 1, borderBottom: '1px solid #eee' }}>
                        <Grid container spacing={2} alignItems="center">
                          {/* Hidden fields for ID, value, and sort order */}
                          <Controller
                            name={`options.${index}.id`}
                            control={control}
                            render={({ field }) => <input type="hidden" {...field} />}
                          />
                          
                          <Controller
                            name={`options.${index}.option_value`}
                            control={control}
                            render={({ field }) => {
                              // Auto-set option_value from label if empty
                              if (field.value === '' && watch(`options.${index}.option_label`) !== '') {
                                field.onChange(watch(`options.${index}.option_label`).toLowerCase().replace(/\s+/g, '_'));
                              }
                              return <input type="hidden" {...field} />;
                            }}
                          />
                          
                          <Controller
                            name={`options.${index}.sort_order`}
                            control={control}
                            render={({ field }) => <input type="hidden" {...field} />}
                          />
                          
                          <Grid size={{ xs: 11 }}>
                            <Controller
                              name={`options.${index}.option_label`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label={t("Label")}
                                  fullWidth
                                  size="small"
                                  error={!!errors.options?.[index]?.option_label}
                                  helperText={errors.options?.[index]?.option_label?.message}
                                  required
                                  disabled={isViewMode}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Auto-update option_value based on label
                                    const value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                    setValue(`options.${index}.option_value`, value);
                                  }}
                                />
                              )}
                            />
                          </Grid>
                          
                          {!isViewMode && (
                            <Grid size={{ xs: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconButton 
                                color="error" 
                                onClick={() => remove(index)}
                                aria-label={t("RemoveOption")}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    ))}
                  </>
                )}
              </Paper>
            </Grid>
          )} 
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth error={!!errors.groups}>
              <FormLabel>{t("Groups")}</FormLabel>
              <Controller
                name="groups"
                control={control}
                render={({ field }) => {
                  // Ensure we have data before rendering
                  if (isLoadingAttributeGroups) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        <Typography variant="body2">Loading attribute groups...</Typography>
                      </Box>
                    );
                  }
                  
                  // Filter only active attribute groups
                  let activeGroups: AttributeGroup[] = [];
                  
                  if (attributeGroupsData?.results) {
                    // Handle paginated response with results property
                    activeGroups = attributeGroupsData.results.filter(group => group.is_active);
                  } else if (Array.isArray(attributeGroupsData)) {
                    // Handle direct array response
                    activeGroups = attributeGroupsData.filter(group => group.is_active);
                  }
                  
                  return (
                    <Autocomplete
                      multiple
                      id="groups"
                      options={activeGroups}
                      getOptionLabel={(option) => {
                        // Handle different option types
                        if (typeof option === "number") {
                          // Find the group by ID
                          const group = attributeGroupsMap.get(option);
                          return group ? group.name : `Group ${option}`;
                        }
                        return option.name || `Group ${option.id}`;
                      }}
                      isOptionEqualToValue={(option, value) => {
                        // Handle different value types
                        if (typeof value === "number") {
                          return option.id === value;
                        }
                        if (typeof option === "number") {
                          return option === value.id;
                        }
                        return option.id === value.id;
                      }}
                      loading={isLoadingAttributeGroups}
                      value={(field.value || []).map((id) => {
                        // Try to find the group in our map
                        const group = attributeGroupsMap.get(
                          typeof id === "number" ? id : (id as any).id
                        );
                        
                        // If found, return the group object
                        if (group) return group;
                        
                        // Otherwise, create a placeholder
                        return {
                          id: typeof id === "number" ? id : (id as any).id,
                          name: typeof id === "number" ? `Group ${id}` : (id as any).name || `Group ${(id as any).id}`,
                          display_order: 0,
                          is_active: true,
                          created_at: "",
                          updated_at: "",
                        };
                      })}
                      onChange={(_, newValue) => {
                        // Convert all values to IDs
                        const ids = newValue.map((item) => 
                          typeof item === "number" ? item : (item as any).id
                        );
                        field.onChange(ids);
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option.name || `Group ${option.id}`}
                            {...getTagProps({ index })}
                            key={option.id}
                          />
                        ))
                      }
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          {option.name || `Group ${option.id}`}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          error={!!errors.groups}
                          placeholder={t("Select Groups")}
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <React.Fragment>
                                {isLoadingAttributeGroups ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </React.Fragment>
                            ),
                          }}
                          disabled={isViewMode}
                        />
                      )}
                      disabled={isViewMode}
                      noOptionsText="No attribute groups found"
                    />
                  );
                }}
              />
              {errors.groups && (
                <FormHelperText error>{String(errors.groups.message)}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          {/* Only show use_for_variants when data type is SELECT or MULTI_SELECT */}
          {(dataType === AttributeDataType.SELECT || dataType === AttributeDataType.MULTI_SELECT) && (
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl>
                <FormLabel>{t("useForVariants")}</FormLabel>
                <Controller
                  name="use_for_variants"
                  control={control}
                  render={({ field: { value, ...field } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          {...field}
                          disabled={isViewMode}
                        />
                      }
                      label={value ? t("yes") : t("no")}
                    />
                  )}
                />
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl>
              <FormLabel>{t("showOnPdp")}</FormLabel>
              <Controller
                name="show_on_pdp"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        {...field}
                        disabled={isViewMode}
                      />
                    }
                    label={value ? t("yes") : t("no")}
                  />
                )}
              />
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl>
              <FormLabel>{t("isFilterable")}</FormLabel>
              <Controller
                name="is_filterable"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        {...field}
                        disabled={isViewMode}
                      />
                    }
                    label={value ? t("yes") : t("no")}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl>
              <FormLabel>{t("required")}</FormLabel>
              <Controller
                name="is_required"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        {...field}
                        disabled={isViewMode}
                      />
                    }
                    label={value ? t("yes") : t("no")}
                  />
                )}
              />
            </FormControl>
          </Grid>
          
          {/* Only show is_active toggle in edit and view modes, not in add mode */}
          { (isViewMode || props.initialData) && (
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl>
                <FormLabel>{t("field.status")}</FormLabel>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field: { value, ...field } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          {...field}
                          disabled={isViewMode}
                        />
                      }
                      label={value ? t("active") : t("inactive")}
                    />
                  )}
                />
              </FormControl>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("description")}
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  disabled={isViewMode}
                />
              )}
            />
            {errors.description && (
              <FormHelperText error>
                {String(errors.description.message)}
              </FormHelperText>
            )}
          </Grid>

       

        </Grid>
      </form>
    );
  }
);

export default AttributeForm;
