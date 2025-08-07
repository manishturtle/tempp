import React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormGroup,
  TextField,
  FormHelperText,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { DragIndicator, Delete as DeleteIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Upload } from "@mui/icons-material";

// Import dnd-kit components
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Styled components for the layout
const MiddlePanelContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  height: "100%",
  overflowY: "auto",
  backgroundColor: "#f5f5f5",
  "&::-webkit-scrollbar": {
    display: "none",
  },
}));

const FormPreviewArea = styled(Paper)(({ theme }) => ({
  minHeight: "300px",
  padding: theme.spacing(2),
  backgroundColor: "#ffffff",
  boxShadow: theme.shadows[1],
  position: "relative",
}));

const FieldComponentWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  position: "relative",
  "&:hover .field-actions": {
    opacity: 1,
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

interface MiddlePanelPreviewProps {
  formFields: Field[];
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDeleteField: (id: string) => void;
  handleSelectField: (field: Field) => void;
  selectedField: Field | null;
  updateFieldAttribute: (attributeKeyToUpdate: string, value: any) => void;
  onReorderFields: (newOrder: Field[]) => void;
}

// Sortable item component for each field
const SortableFieldItem = ({
  field,
  isSelected,
  onSelect,
  onDelete,
  children,
}: {
  field: Field;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <FieldComponentWrapper
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      sx={{
        border: isSelected ? "2px solid #1976d2" : "1px solid #e0e0e0",
        p: 2,
        borderRadius: 1,
        bgcolor: isSelected ? "rgba(25, 118, 210, 0.04)" : "#fff",
        mb: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: "grab", display: "flex", alignItems: "center" }}
        >
          <DragIndicator sx={{ mr: 1, color: "text.secondary" }} />
        </Box>
        {children}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{ ml: 1 }}
        >
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Box>
    </FieldComponentWrapper>
  );
};

const MiddlePanelPreview: React.FC<MiddlePanelPreviewProps> = ({
  formFields,
  handleDrop,
  handleDragOver,
  handleDeleteField,
  handleSelectField,
  selectedField,
  updateFieldAttribute,
  onReorderFields,
}) => {
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Find indices of the dragged item and the drop target
      const oldIndex = formFields.findIndex((field) => field.id === active.id);
      const newIndex = formFields.findIndex((field) => field.id === over.id);

      // Reorder fields
      const newOrder = arrayMove(formFields, oldIndex, newIndex);

      // Update display_order for each field
      const updatedFields = newOrder.map((field, index) => ({
        ...field,
        display_order: index + 1,
      }));

      // Call the parent handler to update state
      onReorderFields(updatedFields);
    }
  };
  const renderFieldPreview = (field: Field) => {
    const isSelected = selectedField?.id === field.id;
    return (
      <SortableFieldItem
        key={field.id}
        field={field}
        isSelected={isSelected}
        onSelect={() => handleSelectField(field)}
        onDelete={() => handleDeleteField(field.id)}
      >
        {renderFieldComponent(field)}
      </SortableFieldItem>
    );
  };

  // Render the appropriate MUI component based on field type
  const renderFieldComponent = (field: Field) => {
    const { field_type, field_attributes = {} } = field;
    const returnOptions = (options: string) => {
      return options
        .split(";")
        .map((opt: string) => opt.trim())
        .filter((opt: string) => opt)
        .map((opt: string) => ({
          label: opt,
          value: opt,
        }));
    };

    switch (field_type) {
      case "SINGLE_LINE_TEXT_INPUT":
        return (
          <TextField
            fullWidth
            label={field_attributes?.label}
            placeholder={field_attributes?.placeholder || ""}
            inputProps={{
              maxLength: field_attributes?.max_length || undefined,
            }}
            helperText={field_attributes?.helper_text}
            defaultValue={field_attributes?.default_value}
            required={field_attributes?.is_required}
          />
        );
      case "MULTI_LINE_TEXT_INPUT":
        return (
          <TextField
            fullWidth
            multiline
            rows={field_attributes?.rows || 3}
            label={field_attributes?.label}
            placeholder={field_attributes?.placeholder || ""}
            inputProps={{
              maxLength: field_attributes?.max_length || undefined,
            }}
            helperText={field_attributes?.helper_text}
            defaultValue={field_attributes?.default_value}
            required={field_attributes?.is_required}
          />
        );
      case "NUMBER_INPUT":
        return (
          <TextField
            fullWidth
            type="number"
            label={field_attributes?.label}
            placeholder={field_attributes?.placeholder || ""}
            inputProps={{
              min:
                field_attributes && field_attributes.min_value !== null
                  ? field_attributes.min_value
                  : undefined,
              max:
                field_attributes && field_attributes.max_value !== null
                  ? field_attributes.max_value
                  : undefined,
              step:
                field_attributes && field_attributes.allow_decimals
                  ? field_attributes.decimal_places
                    ? Math.pow(0.1, field_attributes.decimal_places)
                    : 0.01
                  : 1,
            }}
            // Display validation messages for min/max if set
            helperText={field_attributes && field_attributes?.helper_text}
            defaultValue={field_attributes?.default_value}
            required={field_attributes?.is_required}
          />
        );
      case "URL_INPUT":
        return (
          <TextField
            fullWidth
            type="url"
            label={field_attributes?.label}
            placeholder={field_attributes?.placeholder || "https://"}
            defaultValue={field_attributes?.default_value}
            required={field_attributes?.is_required}
          />
        );
      case "DATE_INPUT": {
        // Get min date from attributes, or today if past dates not allowed
        let minDate = undefined;
        if (field_attributes && field_attributes.min_date) {
          minDate = new Date(field_attributes.min_date);
        }
        // Get max date from attributes, or today if future dates not allowed
        let maxDate = undefined;
        if (field_attributes && field_attributes.max_date) {
          maxDate = new Date(field_attributes.max_date);
        }

        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              slotProps={{
                textField: {
                  fullWidth: true,
                  label: field_attributes?.label,
                  helperText: field_attributes?.helper_text || "",
                  required: field_attributes?.is_required,
                  size: "small",
                },
              }}
              minDate={minDate}
              maxDate={maxDate}
              defaultValue={field_attributes?.default_value}
            />
          </LocalizationProvider>
        );
      }
      case "DATETIME_INPUT":
        // Get min datetime from attributes or today if past dates not allowed
        let minDateTime = undefined;
        if (field_attributes && field_attributes.min_datetime) {
          minDateTime = new Date(field_attributes.min_datetime);
        }

        // Get max datetime from attributes or today if future dates not allowed
        let maxDateTime = undefined;
        if (field_attributes && field_attributes.max_datetime) {
          maxDateTime = new Date(field_attributes.max_datetime);
        }

        const timeStep =
          field_attributes && field_attributes.time_step_minutes
            ? field_attributes.time_step_minutes
            : 5;

        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              slotProps={{
                textField: {
                  fullWidth: true,
                  label: field_attributes?.label,
                  helperText: field_attributes?.helper_text || "",
                  required: field_attributes?.is_required,
                  size: "small",
                },
              }}
              minDateTime={minDateTime}
              maxDateTime={maxDateTime}
              defaultValue={field_attributes?.default_value}
              minutesStep={timeStep}
            />
          </LocalizationProvider>
        );
      case "SINGLE_SELECT_DROPDOWN": {
        const options = returnOptions(field_attributes?.options || "");
        return (
          <FormControl
            fullWidth
            size="small"
            required={field_attributes?.is_required}
          >
            <InputLabel>{field_attributes?.label || "Select..."}</InputLabel>
            <Select
              value={field_attributes?.value || ""}
              label={field_attributes?.label || "Select..."}
              onChange={(e) => updateFieldAttribute("value", e.target.value)}
            >
              {options.map((opt: { value: string; label: string }) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {field_attributes?.helper_text || ""}
            </FormHelperText>
          </FormControl>
        );
      }
      case "MULTI_SELECT_DROPDOWN": {
        const options = returnOptions(field_attributes?.options || "");
        return (
          <FormControl
            fullWidth
            size="small"
            required={field_attributes?.is_required}
          >
            <InputLabel>
              {field_attributes?.label || "Select multiple..."}
            </InputLabel>
            <Select
              multiple
              value={field_attributes?.value || []}
              label={field_attributes?.label || "Select multiple..."}
              onChange={(e) => updateFieldAttribute("value", e.target.value)}
            >
              {(options || []).map((opt: { value: string; label: string }) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {field_attributes?.helper_text || ""}
            </FormHelperText>
          </FormControl>
        );
      }
      case "CHECKBOX": {
        const options = returnOptions(field_attributes?.options || "");
        const selectedValues = field_attributes?.value || [];

        return (
          <FormGroup>
            {options.map((opt: { value: string; label: string }) => (
              <FormControlLabel
                key={opt.value}
                control={
                  <Checkbox
                    checked={selectedValues.includes(opt.value)}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...selectedValues, opt.value]
                        : selectedValues.filter((v: string) => v !== opt.value);
                      updateFieldAttribute("value", newValue);
                    }}
                  />
                }
                label={opt.label}
              />
            ))}
            <FormHelperText>
              {field_attributes?.helper_text || ""}
            </FormHelperText>
          </FormGroup>
        );
      }
      case "RADIO_BUTTON_GROUP": {
        const options = returnOptions(field_attributes?.options || "");
        const selectedValue = field_attributes?.value || "";
        const layout = field_attributes?.layout || "vertical";

        return (
          <RadioGroup
            value={selectedValue}
            onChange={(e) => updateFieldAttribute("value", e.target.value)}
            row={layout === "horizontal"}
          >
            {options.map((opt: { value: string; label: string }) => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio />}
                label={opt.label}
              />
            ))}
            <FormHelperText>
              {field_attributes?.helper_text || ""}
            </FormHelperText>
          </RadioGroup>
        );
      }
      case "RATING": {
        const maxRating = field_attributes?.max_rating || 5;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* Simplified rating preview */}
            {Array.from({ length: maxRating }).map((_, i) => (
              <Box
                key={i}
                component="span"
                sx={{
                  color: "text.disabled",
                  fontSize: "1.5rem",
                  cursor: "default",
                }}
              >
                ★
              </Box>
            ))}
          </Box>
        );
      }
      case "FILE_UPLOAD": {
        // Get allowed file types
        const allowedTypes = field_attributes?.allowed_file_types || [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ];

        // Convert MIME types to readable format
        const readableTypes = allowedTypes
          .map((mime: string) => {
            const mimeMap: Record<string, string> = {
              "application/pdf": "PDF",
              "image/jpeg": "JPEG",
              "image/png": "PNG",
              "application/msword": "DOC",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                "DOCX",
              "application/vnd.ms-excel": "XLS",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                "XLSX",
              "text/plain": "TXT",
              "application/zip": "ZIP",
            };
            return mimeMap[mime] || mime;
          })
          .join(", ");

        // Get max file size
        const maxSize = field_attributes?.max_file_size_mb || 5;

        return (
          <Box>
            <Button variant="outlined" startIcon={<Upload />}>
              Upload File
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Allowed types: {readableTypes}
            </Typography>
            <Typography variant="caption" display="block">
              Max size: {maxSize} MB
            </Typography>
            {field_attributes?.upload_instructions && (
              <Typography variant="caption" display="block">
                Upload Instructions: {field_attributes?.upload_instructions}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {field_attributes?.helper_text || ""}
            </Typography>
          </Box>
        );
      }
      default:
        return (
          <Typography color="textSecondary">
            Field type '{field_type}' preview not implemented
          </Typography>
        );
    }
  };

  return (
    <MiddlePanelContainer>
      <FormPreviewArea
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{ minHeight: formFields.length === 0 ? 300 : "auto" }}
      >
        {formFields.length === 0 ? (
          <Box
            sx={{
              height: 300,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" gutterBottom>
              Drag and drop fields here
            </Typography>
            <Typography variant="caption">
              or select a field from the left panel
            </Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={formFields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              {formFields
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((field) => renderFieldPreview(field))}
            </SortableContext>
          </DndContext>
        )}
      </FormPreviewArea>
    </MiddlePanelContainer>
  );
};
export default MiddlePanelPreview;
