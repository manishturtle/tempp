import React from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  InputAdornment,
  Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Search as SearchIcon } from "@mui/icons-material";

// Styled components for the layout
const LeftPanelContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: "100%",
  overflowY: "auto",
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  "&::-webkit-scrollbar": {
    display: "none",
  },
}));

interface FieldTypesResponse {
  [fieldType: string]: any;
}

interface LeftPanelFieldsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleDragStart: (fieldType: string) => void;
  handleFieldTypeDoubleClick: (fieldType: string) => void;
  fieldTypes: FieldTypesResponse;
}

// Field type categories for organization
const FIELD_CATEGORIES = [
  {
    id: "text",
    label: "Text Fields",
    types: ["SINGLE_LINE_TEXT_INPUT", "MULTI_LINE_TEXT_INPUT", "URL_INPUT"],
  },
  {
    id: "numeric",
    label: "Numeric Fields",
    types: ["NUMBER_INPUT"],
  },
  {
    id: "date",
    label: "Date & Time",
    types: ["DATE_INPUT", "DATETIME_INPUT"],
  },
  {
    id: "selection",
    label: "Selection Fields",
    types: [
      "SINGLE_SELECT_DROPDOWN",
      "MULTI_SELECT_DROPDOWN",
      "CHECKBOX",
      "RADIO_BUTTON_GROUP",
      "RATING",
    ],
  },
  {
    id: "uploads",
    label: "File Uploads",
    types: ["FILE_UPLOAD"],
  },
];

const LeftPanelFields: React.FC<LeftPanelFieldsProps> = ({
  searchTerm,
  setSearchTerm,
  handleDragStart,
  handleFieldTypeDoubleClick,
  fieldTypes,
}) => {
  // Filter field types based on search term
  const getFilteredFieldTypes = () => {
    if (!searchTerm) return FIELD_CATEGORIES;

    return FIELD_CATEGORIES.map((category) => ({
      ...category,
      types: category.types.filter((typeId) => {
        const fieldType = fieldTypes[typeId as keyof typeof fieldTypes];
        return fieldType?.label
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }),
    })).filter((category) => category.types.length > 0);
  };

  // Get field type icon based on type
  const getFieldTypeIcon = (fieldType: string) => {
    // This function will be imported from the main component
    switch (fieldType) {
      case "SINGLE_LINE_TEXT_INPUT":
        return <TextFields />;
      case "MULTI_LINE_TEXT_INPUT":
        return <TextFields />;
      case "NUMBER_INPUT":
        return <TextFields />;
      case "DATE_INPUT":
        return <DateRange />;
      case "DATETIME_INPUT":
        return <AccessTime />;
      case "SINGLE_SELECT_DROPDOWN":
        return <ArrowDropDown />;
      case "MULTI_SELECT_DROPDOWN":
        return <ArrowDropDown />;
      case "CHECKBOX":
        return <CheckBoxIcon />;
      case "RADIO_BUTTON_GROUP":
        return <RadioButtonChecked />;
      case "URL_INPUT":
        return <LinkIcon />;
      case "FILE_UPLOAD":
      case "DOCUMENT_UPLOAD":
        return <Upload />;
      case "RATING":
        return <Star />;
      default:
        return <TextFields />;
    }
  };

  return (
    <LeftPanelContainer>
      <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
        <Typography variant="h6" gutterBottom>
          Field Types
        </Typography>
        <TextField
          fullWidth
          placeholder="Search field types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ px: 2, py: 1, overflowY: "auto" }}>
        {getFilteredFieldTypes().map((category) => (
          <Box key={category.id} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                mb: 1.5,
                px: 1,
              }}
            >
              {category.label}
            </Typography>

            <Grid container spacing={1}>
              {category.types.map((fieldType) => {
                const fieldTypeInfo =
                  fieldTypes[fieldType as keyof typeof fieldTypes];
                return (
                  <Grid size={6} key={fieldType}>
                    <Paper
                      sx={{
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        cursor: "grab",
                        height: "100%",
                        boxShadow: "none",
                        backgroundColor: "#f5f5f5",
                        transition: "background-color 0.2s",
                        '&:hover': {
                          backgroundColor: "#e8e8e8",
                        },
                        '&:active': {
                          backgroundColor: "#e0e0e0",
                        }
                      }}
                      variant="outlined"
                      draggable
                      onDragStart={() => handleDragStart(fieldType)}
                      onDoubleClick={() => handleFieldTypeDoubleClick(fieldType)}
                    >
                      <Box
                        sx={{
                          mr: 1.5,
                          display: "flex",
                          color: "primary.main",
                        }}
                      >
                        {getFieldTypeIcon(fieldType)}
                      </Box>
                      <Typography variant="body2" noWrap>
                        {fieldTypeInfo?.label || fieldType}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>
    </LeftPanelContainer>
  );
};

// Add missing imports
import {
  TextFields,
  CheckBox as CheckBoxIcon,
  RadioButtonChecked,
  ArrowDropDown,
  DateRange,
  AccessTime,
  Link as LinkIcon,
  Upload,
  Star,
} from "@mui/icons-material";

export default LeftPanelFields;
