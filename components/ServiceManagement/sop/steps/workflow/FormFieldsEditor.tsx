import React, { useState, useEffect, useImperativeHandle } from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import {sopApi} from "../../../../../services_service_management/sop"

// Import the three panel components
import LeftPanelFields from "./LeftPanelFields";
import MiddlePanelPreview from "./MiddlePanelPreview";
import RightPanelProperties from "./RightPanelProperties";

// Styled components for the layout
const LeftPanel = styled(Box)(({ theme }) => ({
  width: "280px",
  height: "100%",
  overflow: "auto",
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const MiddlePanel = styled(Box)(({ theme }) => ({
  flex: 1,
  height: "100%",
  overflowY: "auto",
  padding: theme.spacing(1),
  backgroundColor: "#f5f5f5",
}));

const RightPanel = styled(Box)(({ theme }) => ({
  width: "320px",
  height: "100%",
  overflowY: "auto",
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
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

interface FormFieldsEditorProps {
  fields: Field[];
  onSave: (fields: Field[]) => void;
  onCancel: () => void;
}

const FormFieldsEditor = React.forwardRef<
  { getFields: () => Field[]; handleSave: () => void },
  FormFieldsEditorProps
>(({ fields = [], onSave, onCancel }, ref) => {
  // State for fields and form management
  const [formFields, setFormFields] = useState<Field[]>(fields);
  const [searchTerm, setSearchTerm] = useState("");

  // State for currently selected field for editing
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [draggedFieldType, setDraggedFieldType] = useState<string | null>(null);
  const [fieldTypes, setFieldTypes] = useState<any>({});

  useEffect(() => {
    sopApi.getAllFieldTypes().then((fieldTypes) => {
      setFieldTypes(fieldTypes);
    });
  }, []);

  // Handle starting drag for a field type
  const handleDragStart = (fieldType: string) => {
    setDraggedFieldType(fieldType);
  };
  
  // Handle double click on field type - add field directly without drag and drop
  const handleFieldTypeDoubleClick = (fieldType: string) => {
    addFieldToForm(fieldType);
  };

  // Handle dropping a field type onto the form
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedFieldType) {
      addFieldToForm(draggedFieldType);
      setDraggedFieldType(null);
    }
  };

  // Handle drag over to allow drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Handle field selection
  const handleSelectField = (field: Field) => {
    setSelectedField(field);
  };

  // Handle field deletion
  const handleDeleteField = (id: string) => {
    setFormFields((prevFields) => {
      // Filter out the deleted field
      const newFields = prevFields.filter((field) => field.id !== id);
      
      // Reset the selectedField if we're deleting the currently selected one
      if (selectedField?.id === id) {
        setSelectedField(null);
      }
      
      // Re-calculate display_order for all remaining fields sequentially
      return newFields.map((field, index) => ({
        ...field,
        display_order: index + 1, // Reassign display_order starting from 1
      }));
    });
  };
  
  // Handle field reordering via drag-and-drop
  const handleReorderFields = (reorderedFields: Field[]) => {
    // Update form fields with the new order
    setFormFields(reorderedFields);
  };

  const getInitialValueForFieldType = (
    fieldType: string,
    attributes: Record<string, any>
  ): any => {
    const defaultValueFromAttributes = attributes.default_value; // Assuming 'default_value' is a key in attributes
    if (
      defaultValueFromAttributes !== undefined &&
      defaultValueFromAttributes !== null
    ) {
      return defaultValueFromAttributes;
    }
    if (
      fieldType === "MULTI_SELECT_DROPDOWN" ||
      (fieldType === "CHECKBOX" && attributes.options) ||
      (fieldType === "FILE_UPLOAD" && attributes.options)
    ) {
      // Checkbox group
      return [];
    }
    if (fieldType === "CHECKBOX" && !attributes.options) {
      // Single boolean checkbox
      return [];
    }
    return ""; // Default for text-like inputs
  };

  // Helper function to convert label to snake_case name
  const labelToName = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^\w\s]/gi, "") // Remove special characters
      .replace(/\s+/g, "_"); // Replace spaces with underscores
  };

  const addFieldToForm = (fieldTypeKey: string, insertAtIndex?: number) => {
    if (!fieldTypes) {
      console.error("Field type definitions not loaded yet.");
      return;
    }

    const fieldTypeDef = fieldTypes[fieldTypeKey];
    if (!fieldTypeDef) {
      console.error(`No definition found for field type: ${fieldTypeKey}`);
      return;
    }

    const initialAttributes: Record<string, any> = {};
    // Iterate over the ..._config keys in the schema for this fieldType
    for (const attrConfigKey in fieldTypeDef) {
      if (
        Object.prototype.hasOwnProperty.call(fieldTypeDef, attrConfigKey) &&
        attrConfigKey.endsWith("_config")
      ) {
        const attributeKey = attrConfigKey.replace("_config", ""); // e.g., 'label_config' -> 'label'
        const configSchema = fieldTypeDef[
          attrConfigKey as keyof typeof fieldTypeDef
        ] as any; // Cast for accessing defaultValue
        if (configSchema.type === "multi-select") {
          initialAttributes[attributeKey] = [];
        } else if (
          configSchema &&
          typeof configSchema === "object" &&
          "defaultValue" in configSchema
        ) {
          initialAttributes[attributeKey] = configSchema.defaultValue;
        } else {
          // Handle cases where a _config key might not have a defaultValue or is not an object
          // This shouldn't happen if FIELD_ATTRIBUTES_SCHEMA is well-defined
          initialAttributes[attributeKey] = undefined;
        }
      }
    }

    // Ensure 'label' exists in initialAttributes, even if schema had no default for label_config's defaultValue
    // (though our schema design gives label_config a defaultValue like "New Field")
    const initialLabel =
      initialAttributes.label ||
      `New ${fieldTypeKey.replace(/_/g, " ").toLowerCase()}`;
    if (!initialAttributes.label) {
      // Ensure label is set if not defaulted by schema processing
      initialAttributes.label = initialLabel;
    }

    const defaultName = labelToName(initialLabel); // Your existing helper

    const newField: Field = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      field_type: fieldTypeKey,
      field_name: defaultName,
      field_attributes: initialAttributes,
      display_order: formFields.length + 1, // Set initial display order based on current length
      value: getInitialValueForFieldType(fieldTypeKey, initialAttributes),
    };

    setFormFields((prevFields) => {
      const newFields = [...prevFields];
      if (insertAtIndex !== undefined && insertAtIndex < newFields.length) {
        newFields.splice(insertAtIndex, 0, newField);
      } else {
        newFields.push(newField);
      }
      // Re-calculate display_order for all fields
      return newFields.map((field, index) => ({
        ...field,
        display_order: index + 1,
      }));
    });

    setSelectedField(newField);
  };

  const updateFieldAttribute = (attributeKeyToUpdate: string, value: any) => {
    if (!selectedField) return;
    const updatedAttributes = {
      ...selectedField.field_attributes,
      [attributeKeyToUpdate]: value,
    };
    let newName = selectedField.field_name;
    // If the 'label' attribute itself is being updated, regenerate the field 'name'
    // This assumes 'label' is the direct key in attributes for the display label.
    if (attributeKeyToUpdate === "label" && typeof value === "string") {
      newName = labelToName(value);
    }

    const updatedField: Field = {
      // Ensure Field interface matches this
      ...selectedField,
      field_name: newName, // Update name if label changed
      field_attributes: updatedAttributes,
    };

    setSelectedField(updatedField); // Update the selected field state immediately for UI responsiveness

    // Update the field in the main formFields array
    setFormFields((prevFields) =>
      prevFields.map((f) => (f.id === updatedField.id ? updatedField : f))
    );
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getFields: () => formFields,
    handleSave: () => onSave(formFields),
  }));

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 70px)", width: "100%" }}>
      {/* LEFT PANEL: Field Type List */}
      <LeftPanel>
        <LeftPanelFields
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleDragStart={handleDragStart}
          handleFieldTypeDoubleClick={handleFieldTypeDoubleClick}
          fieldTypes={fieldTypes}
        />
      </LeftPanel>

      {/* MIDDLE PANEL: Form Preview */}
      <MiddlePanel>
        <MiddlePanelPreview
          formFields={formFields}
          handleDrop={handleDrop}
          handleDragOver={handleDragOver}
          handleDeleteField={handleDeleteField}
          handleSelectField={handleSelectField}
          selectedField={selectedField}
          updateFieldAttribute={updateFieldAttribute}
          onReorderFields={handleReorderFields}
        />
      </MiddlePanel>
      {/* RIGHT PANEL: Field Property Editor */}
      <RightPanel>
        <RightPanelProperties
          selectedField={selectedField}
          fieldTypes={fieldTypes}
          updateFieldAttribute={updateFieldAttribute}
        />
      </RightPanel>
    </Box>
  );
});

export default FormFieldsEditor;
