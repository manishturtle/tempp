import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  CircularProgress,
  OutlinedInput,
  InputLabel,
  Rating,
  FormGroup,
  Box,
  Chip,
} from "@mui/material";
import {
  UploadFile,
  Star,
  Attachment as AttachmentIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import serviceTicketsApi from "../../../services_service_management/serviceTickets";

// Interface for file upload objects
interface FileUploadItem {
  fieldId: number;
  file: File;
  fileName: string;
  fileType: string;
}

interface TaskFormProps {
  open: boolean;
  task: any;
  onClose: () => void;
  onSaved: () => void;
  handleCompleteTask?: (task: any) => void;
  updateStatus?: boolean;
}

export default function TaskForm({
  open,
  task,
  onClose,
  onSaved,
  handleCompleteTask,
  updateStatus,
}: TaskFormProps) {
  console.log(task);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState<{ [key: string]: boolean }>({});
  const [fileObjects, setFileObjects] = useState<Record<string, File[]>>({});
  const [error, setError] = useState("");
  const [fileDeleteLoading, setFileDeleteLoading] = useState<Record<string, boolean>>({});
  const [fileDownloadLoading, setFileDownloadLoading] = useState<Record<string, boolean>>({});
  const isCompleted = task?.status === "Completed";

  useEffect(() => {
    if (task && task.form_fields) {
      const initialValues: Record<string, any> = {};
      
      task.form_fields.forEach((field: any) => {
        const fieldType = field.field_type?.toUpperCase?.() || '';
        
        if (fieldType === "DATE_INPUT" || fieldType === "DATETIME_INPUT") {
          let dateValue = null;
          
          if (field.field_value) {
            try {
              if (typeof field.field_value === 'string') {
                dateValue = new Date(field.field_value);
                
                if (isNaN(dateValue.getTime()) && field.field_value.includes('T')) {
                  const datePart = field.field_value.split('T')[0];
                  dateValue = new Date(datePart);
                }
                
                if (isNaN(dateValue.getTime()) && field.field_value.match(/\d{4}-\d{2}-\d{2}/)) {
                  const [year, month, day] = field.field_value.split('T')[0].split('-').map(Number);
                  dateValue = new Date(year, month - 1, day); // month is 0-indexed in JS Date
                }
              } else if (field.field_value instanceof Date) {
                dateValue = field.field_value;
              }
              
              if (isNaN(dateValue?.getTime())) {
                dateValue = null;
              }
            } catch (error) {
              dateValue = null;
            }
          }
          
          initialValues[field.field_name] = dateValue;
        } else {
          initialValues[field.field_name] = field.field_value || "";
        }
      });
      
      setFormValues(initialValues);
    }
  }, [task]);

  const handleChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleFileUpload = async (fieldName: string, files: File[], fieldAttributes: any) => {
    try {
      setFileLoading((prev) => ({ ...prev, [fieldName]: true }));
      
      // Get max file size from field attributes or use default 10MB
      const maxSizeInMB = fieldAttributes?.max_file_size_mb || 10;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      
      // Check if any file exceeds size limit
      for (const file of files) {
        if (file.size > maxSizeInBytes) {
          setError(`File size exceeds ${maxSizeInMB}MB limit: ${file.name}`);
          setFileLoading((prev) => ({ ...prev, [fieldName]: false }));
          return;
        }
      }
      
      // Create file metadata objects for each file (without base64 encoding)
      const fileDataArray = files.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }));
      
      // Store file metadata for UI display
      handleChange(fieldName, JSON.stringify(fileDataArray));
      
      // Store actual File objects for later upload
      setFileObjects(prev => ({
        ...prev,
        [fieldName]: files
      }));
    } catch (err) {
      console.error("Error handling file upload:", err);
      setError("Failed to process file upload");
    } finally {
      setFileLoading((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Validate each required field
    if (!task.form_fields || task.form_fields.length === 0) {
      return errors;
    }

    task.form_fields.forEach((field: any) => {
      const isRequired = field?.field_attributes?.required;
      if (!isRequired) return;

      const value = formValues[field.field_name];

      // Check various empty value scenarios
      if (value === undefined || value === null) {
        errors.push(`${field.field_attributes.field_label} is required`);
        return;
      }

      // Check for empty arrays
      if (Array.isArray(value) && value.length === 0) {
        errors.push(
          `${field.field_attributes.field_label} requires at least one selection`
        );
        return;
      }

      // Check for empty strings
      if (typeof value === "string" && value.trim() === "") {
        errors.push(`${field.field_attributes.field_label} cannot be empty`);
        return;
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    try {
      // Validate form first
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join("\n"));
        return;
      }

      setLoading(true);
      setError("");

      // Only proceed if the task has form fields
      if (task.form_fields && task.form_fields.length > 0) {
        // Prepare the payload for the SubtaskFields update-fields endpoint and collect files
        const fieldUpdates: { id: number; field_value: any; has_file_uploads?: boolean }[] = [];
        const fileUploads: FileUploadItem[] = [];
        
        // Process each field
        for (const field of task.form_fields) {
          const fieldName = field.field_name;
          const fieldValue = formValues[fieldName] ?? null;
          
          // Handle file uploads differently
          if (field.field_type === 'FILE_UPLOAD' && fileObjects[fieldName]) {
            // Skip adding FILE_UPLOAD fields to fieldUpdates
            // Only prepare files for upload
            const metadata = fieldValue ? JSON.parse(fieldValue) : [];
            fileObjects[fieldName].forEach((file, index) => {
              // Match file with its metadata
              const fileInfo = metadata[index] || { fileName: file.name };
              fileUploads.push({
                fieldId: field.id,
                file,
                fileName: fileInfo.fileName,
                fileType: file.type,
              });
            });
          } else {
            // Handle normal fields
            fieldUpdates.push({
              id: field.id,
              field_value: fieldValue,
            });
          }
        }

        // First update all field values
        await serviceTicketsApi.updateSubtaskFields(fieldUpdates);
        
        // Then upload files if any exist
        if (fileUploads.length > 0) {
          console.log("Uploading files:", fileUploads);
          
          // Create a progress indicator
          setError(`Uploading ${fileUploads.length} file(s)...`);
          
          // Upload each file with progress updates
          let completedUploads = 0;
          for (const upload of fileUploads) {
            try {
              // Set loading state for this specific field
              const fieldName = task.form_fields.find((f: any) => f.id === upload.fieldId)?.field_name;
              if (fieldName) {
                setFileLoading((prev) => ({ ...prev, [fieldName]: true }));
              }
              
              // Upload the file
              await serviceTicketsApi.uploadFieldFile(upload.fieldId, upload.file, upload.fileName);
              
              // Update progress
              completedUploads++;
              setError(`Uploaded ${completedUploads} of ${fileUploads.length} file(s)...`);
            } catch (uploadErr) {
              console.error("Error uploading file:", upload.fileName, uploadErr);
              // Continue with other files even if one fails
            } finally {
              // Clear loading state for this field
              const fieldName = task.form_fields.find((f: any) => f.id === upload.fieldId)?.field_name;
              if (fieldName) {
                setFileLoading((prev) => ({ ...prev, [fieldName]: false }));
              }
            }
          }
          
          // Clear error message used for progress updates
          if (completedUploads === fileUploads.length) {
            setError(""); // All files uploaded successfully
          } else {
            setError(`${completedUploads} of ${fileUploads.length} files uploaded successfully`);
          }
        }
      }

      // If handleCompleteTask prop is provided, call it to complete the task
      if (handleCompleteTask && updateStatus) {
        // Update the task object with new field values before completing
        const updatedTask = {
          ...task,
          form_fields: task.form_fields?.map((field: any) => ({
            ...field,
            field_value: formValues[field.field_name] ?? field.field_value,
          })),
        };

        handleCompleteTask(updatedTask);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving task form:", err);
      setError(err.message || "Failed to save form data");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: any) => {
    const {
      field_name,
      field_type,
      field_attributes = {},
    } = field || {};
    const { field_label = "", options = [], helperText = "" } = field_attributes || {};

    switch (field_type) {
      case "SINGLE_LINE_TEXT_INPUT":
        return (
          <FormControl key={field_name} fullWidth margin="normal">
            <TextField
              label={field_label}
              value={formValues[field_name] || ""}
              onChange={(e) => handleChange(field_name, e.target.value)}
              placeholder={field_attributes.placeholder}
              required={field_attributes.is_required}
              inputProps={{
                maxLength: field_attributes.max_length,
              }}
              helperText={field_attributes.helper_text}
              disabled={isCompleted}
            />
          </FormControl>
        );

      case "MULTI_LINE_TEXT_INPUT":
        return (
          <FormControl key={field.id} fullWidth margin="normal">
            <TextField
              label={field_attributes.label}
              value={formValues[field_name] || ""}
              onChange={(e) => handleChange(field_name, e.target.value)}
              placeholder={field_attributes.placeholder}
              required={field_attributes.is_required}
              multiline
              rows={field_attributes.rows || 4}
              inputProps={{
                maxLength: field_attributes.max_length,
              }}
              helperText={field_attributes.helper_text}
              disabled={isCompleted}
            />
          </FormControl>
        );

      case "URL_INPUT":
        return (
          <FormControl key={field.id} fullWidth margin="normal">
            <TextField
              label={field_attributes.label}
              value={formValues[field_name] || ""}
              onChange={(e) => handleChange(field_name, e.target.value)}
              placeholder={field_attributes.placeholder}
              required={field_attributes.is_required}
              type="url"
              helperText={field_attributes.helper_text}
              disabled={isCompleted}
            />
          </FormControl>
        );

      case "DATE_INPUT":
        console.log(`Rendering DATE_INPUT (${field_name}):`, {
          fieldName: field_name,
          currentValue: formValues[field_name],
          fieldAttributes: field_attributes,
          rawFieldValue: field.field_value
        });
        
        // Ensure we have a valid Date object
        let dateValue = null;
        try {
          if (formValues[field_name]) {
            if (formValues[field_name] instanceof Date) {
              dateValue = formValues[field_name];
            } else {
              dateValue = new Date(formValues[field_name]);
            }
            // Check if date is valid
            if (isNaN(dateValue.getTime())) {
              console.warn(`Invalid date value for ${field_name}:`, formValues[field_name]);
              dateValue = null;
            } else {
              console.log(`Valid date detected for ${field_name}:`, dateValue.toISOString());
            }
          }
        } catch (error) {
          console.error(`Error parsing date for ${field_name}:`, error);
          dateValue = null;
        }
        
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <FormControl key={field.id} fullWidth margin="normal">
              <DatePicker
                label={field_attributes.label}
                value={dateValue}
                onChange={(value) => {
                  console.log(`Date changed for ${field_name}:`, value);
                  handleChange(field_name, value);
                }}
                minDate={
                  field_attributes.min_date
                    ? new Date(field_attributes.min_date)
                    : undefined
                }
                maxDate={
                  field_attributes.max_date
                    ? new Date(field_attributes.max_date)
                    : undefined
                }
                slotProps={{
                  textField: {
                    required: field_attributes.is_required,
                    helperText: field_attributes.helper_text,
                  },
                }}
                disabled={isCompleted}
              />
            </FormControl>
          </LocalizationProvider>
        );

      case "DATETIME_INPUT":
        console.log(`Rendering DATETIME_INPUT (${field_name}):`, {
          fieldName: field_name,
          currentValue: formValues[field_name],
          fieldAttributes: field_attributes,
          rawFieldValue: field.field_value
        });
        
        // Ensure we have a valid Date object
        let dateTimeValue = null;
        try {
          if (formValues[field_name]) {
            if (formValues[field_name] instanceof Date) {
              dateTimeValue = formValues[field_name];
            } else {
              dateTimeValue = new Date(formValues[field_name]);
            }
            // Check if date is valid
            if (isNaN(dateTimeValue.getTime())) {
              console.warn(`Invalid datetime value for ${field_name}:`, formValues[field_name]);
              dateTimeValue = null;
            } else {
              console.log(`Valid datetime detected for ${field_name}:`, dateTimeValue.toISOString());
            }
          }
        } catch (error) {
          console.error(`Error parsing datetime for ${field_name}:`, error);
          dateTimeValue = null;
        }
        
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <FormControl key={field.id} fullWidth margin="normal">
              <DateTimePicker
                label={field_attributes.label}
                value={dateTimeValue}
                onChange={(value) => {
                  console.log(`DateTime changed for ${field_name}:`, value);
                  handleChange(field_name, value);
                }}
                minDateTime={
                  field_attributes.min_datetime
                    ? new Date(field_attributes.min_datetime)
                    : undefined
                }
                maxDateTime={
                  field_attributes.max_datetime
                    ? new Date(field_attributes.max_datetime)
                    : undefined
                }
                slotProps={{
                  textField: {
                    required: field_attributes.is_required,
                    helperText: field_attributes.helper_text,
                  },
                }}
                disabled={isCompleted}
              />
            </FormControl>
          </LocalizationProvider>
        );

      case "SINGLE_SELECT_DROPDOWN": {
        const options = field_attributes.options
          .split(";")
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt !== "");
        return (
          <FormControl
            key={field.id}
            fullWidth
            margin="normal"
            required={field_attributes.is_required}
          >
            <InputLabel id={`${field_name}-label`}>
              {field_attributes.label}
            </InputLabel>
            <Select
              labelId={`${field_name}-label`}
              value={formValues[field_name] || ""}
              onChange={(e) => handleChange(field_name, e.target.value)}
              label={field_attributes.label}
              disabled={isCompleted}
            >
              {options.map((option: string) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      case "MULTI_SELECT_DROPDOWN": {
        const options = field_attributes.options
          .split(";")
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt !== "");
        const selectedValues = Array.isArray(formValues[field_name])
          ? formValues[field_name]
          : formValues[field_name]
          ? [formValues[field_name]]
          : [];

        return (
          <FormControl
            key={field.id}
            fullWidth
            margin="normal"
            required={field_attributes.is_required}
          >
            <InputLabel id={`${field_name}-label`}>
              {field_attributes.label}
            </InputLabel>
            <Select
              labelId={`${field_name}-label`}
              multiple
              value={selectedValues}
              onChange={(e) => {
                const value = e.target.value;
                handleChange(
                  field_name,
                  typeof value === "string" ? value.split(",") : value
                );
              }}
              input={<OutlinedInput label={field_attributes.label} />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
              disabled={isCompleted}
            >
              {options.map((option: string) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={selectedValues.indexOf(option) > -1} />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      case "CHECKBOX": {
        const options = field_attributes.options
          .split(";")
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt !== "");
        const selectedValues = Array.isArray(formValues[field_name])
          ? formValues[field_name]
          : [];

        return (
          <FormControl
            key={field.id}
            fullWidth
            margin="normal"
            required={field_attributes.is_required}
            component="fieldset"
          >
            <FormLabel component="legend">{field_attributes.label}</FormLabel>
            <FormGroup>
              {options.map((option: string) => {
                const isChecked = selectedValues.includes(option);

                return (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          const updatedValues = [...selectedValues];
                          if (e.target.checked) {
                            updatedValues.push(option);
                          } else {
                            const index = updatedValues.indexOf(option);
                            if (index > -1) {
                              updatedValues.splice(index, 1);
                            }
                          }
                          handleChange(field_name, updatedValues);
                        }}
                      />
                    }
                    label={option}
                    disabled={isCompleted}
                  />
                );
              })}
            </FormGroup>
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      case "RADIO_BUTTON_GROUP": {
        const options = field_attributes.options
          .split(";")
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt !== "");
        const layout =
          field_attributes.layout === "vertical" ? "column" : "row";

        return (
          <FormControl
            key={field.id}
            component="fieldset"
            fullWidth
            required={field_attributes.is_required}
            margin="normal"
          >
            <FormLabel component="legend">{field_attributes.label}</FormLabel>
            <RadioGroup
              aria-label={field_name}
              name={field_name}
              value={formValues[field_name] || ""}
              onChange={(e) => handleChange(field_name, e.target.value)}
              sx={{ display: "flex", flexDirection: layout }}
            >
              {options.map((option: string) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                  disabled={isCompleted}
                />
              ))}
            </RadioGroup>
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      case "RATING": {
        const maxRating = field_attributes.max_rating || 5;
        const labels = field_attributes.rating_labels
          ? field_attributes.rating_labels
              .split(",")
              .map((l: string) => l.trim())
          : [];

        return (
          <FormControl
            key={field.id}
            fullWidth
            margin="normal"
            required={field_attributes.is_required}
          >
            <FormLabel component="legend">{field_attributes.label}</FormLabel>
            <Rating
              name={field_name}
              value={Number(formValues[field_name]) || 0}
              max={maxRating}
              precision={field_attributes.allow_half_ratings ? 0.5 : 1}
              onChange={(event, newValue) => {
                handleChange(field_name, newValue);
              }}
              icon={<Star fontSize="inherit" />}
              disabled={isCompleted}
            />
            {labels.length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  width: `${maxRating * 24}px`,
                }}
              >
                {labels.map((label: string, index: number) => (
                  <Typography
                    key={index}
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.7rem" }}
                  >
                    {index + 1 === Number(formValues[field_name]) && label}
                  </Typography>
                ))}
              </Box>
            )}
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      case "FILE_UPLOAD":
        // Handle file download (for saved files)
        const handleFileDownload = async (fieldId: number, fileId?: number) => {
          try {
            const loadingKey = `${fieldId}_${fileId || 'all'}`;
            setFileDownloadLoading(prev => ({ ...prev, [loadingKey]: true }));
            
            // Call the API to get a signed download URL
            const response = await serviceTicketsApi.downloadFieldFile(fieldId, {
              fileId: fileId,
              inline: false
            });
            
            // Open the URL in a new tab
            if (response.data?.signed_url) {
              window.open(response.data.signed_url, '_blank');
            }
          } catch (error) {
            console.error('Error downloading file:', error);
            setError('Failed to download file');
          } finally {
            const loadingKey = `${fieldId}_${fileId || 'all'}`;
            setFileDownloadLoading(prev => ({ ...prev, [loadingKey]: false }));
          }
        };
        
        // Handle file deletion (for saved files)
        const handleFileDelete = async (fieldId: number, fileId: number) => {
          try {
            const loadingKey = `${fieldId}_${fileId}`;
            setFileDeleteLoading(prev => ({ ...prev, [loadingKey]: true }));
            
            // Call the API to delete the file
            const response = await serviceTicketsApi.deleteFieldFile(fileId);
            
            // If successful, notify parent to refresh data
            if (response.data?.success) {
              // Clear any errors
              setError('');
              
              // Trigger parent component to refresh data
              // This will reload the task with updated file list
              onSaved();
              
              // Show a brief success message
              console.log(`File deleted successfully. ${response.data?.remaining_files} files remaining.`);
            } else {
              // Handle unsuccessful deletion
              setError(response.data?.error || 'Failed to delete file');
            }
          } catch (error) {
            console.error('Error deleting file:', error);
            setError('Failed to delete file');
          } finally {
            const loadingKey = `${fieldId}_${fileId}`;
            setFileDeleteLoading(prev => ({ ...prev, [loadingKey]: false }));
          }
        };
        
        return (
          <FormControl
            key={field.id}
            fullWidth
            margin="normal"
            required={field_attributes.is_required}
          >
            <FormLabel component="legend">{field_attributes.label}</FormLabel>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mt: 1 }}
              startIcon={fileLoading[field_name] ? null : <UploadFile />}
              disabled={loading || fileLoading[field_name] || isCompleted}
            >
              {fileLoading[field_name]
                ? "Uploading..."
                : field_attributes.button_text || "Upload File"}
              <input
                type="file"
                hidden
                multiple={field_attributes.allow_multiple_uploads === true}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    // Convert FileList to array and process files
                    const fileArray = Array.from(files);
                    handleFileUpload(field_name, fileArray, field_attributes);
                  }
                }}
                accept={field_attributes.allowed_file_types?.join(",")}
              />
            </Button>
            
            {/* Saved files from the backend */}
            {field.field_value === "FILE UPLOADED" && field.file_uploads && field.file_uploads.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ width: '100%' }}>Saved Files:</Typography>
                {field.file_uploads.map((fileUpload: any) => {
                  const fileLoadingKey = `${field.id}_${fileUpload.id}`;
                  const isDeleteLoading = fileDeleteLoading[fileLoadingKey] || false;
                  const isDownloadLoading = fileDownloadLoading[fileLoadingKey] || false;
                  
                  // Calculate file size display
                  const fileSizeDisplay = fileUpload.file_size < 1024 * 1024
                    ? `${(fileUpload.file_size / 1024).toFixed(1)} KB`
                    : `${(fileUpload.file_size / (1024 * 1024)).toFixed(1)} MB`;
                  
                  return (
                    <Chip
                      key={fileUpload.id}
                      label={`${fileUpload.file_name} (${fileSizeDisplay})`}
                      color="primary"
                      variant="outlined"
                      icon={<AttachmentIcon fontSize="small" />}
                      deleteIcon={
                        <Box sx={{ display: 'flex' }}>
                          {isDownloadLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DownloadIcon 
                              fontSize="small" 
                              sx={{ mr: 0.5, cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileDownload(field.id, fileUpload.id);
                              }}
                            />
                          )}
                          {isDeleteLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DeleteIcon 
                              fontSize="small" 
                              sx={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileDelete(field.id, fileUpload.id);
                              }}
                            />
                          )}
                        </Box>
                      }
                      onDelete={() => {}} // This is needed to make deleteIcon appear
                    />
                  );
                })}
              </Box>
            )}
            
            {/* Newly uploaded files (not saved yet) */}
            {fileObjects[field_name] && fileObjects[field_name].length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>New Files (not saved yet):</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(() => {
                  try {
                    // Get the parsed file metadata if available
                    const fileDataArray = formValues[field_name] ? JSON.parse(formValues[field_name]) : [];
                    
                    // Map files to chips
                    return fileObjects[field_name].map((file, index) => {
                      const fileData = fileDataArray[index] || { fileName: file.name, fileSize: file.size };
                      const fileSizeDisplay = file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                        
                      return (
                        <Chip
                          key={`new-${index}`}
                          label={`${fileData.fileName} (${fileSizeDisplay})`}
                          onDelete={() => {
                            // Remove this file from both state arrays
                            const updatedFiles = [...fileObjects[field_name]];
                            updatedFiles.splice(index, 1);
                            
                            if (updatedFiles.length === 0) {
                              // No more files in this field
                              handleChange(field_name, null);
                              setFileObjects(prev => {
                                const newState = {...prev};
                                delete newState[field_name];
                                return newState;
                              });
                            } else {
                              // Update file objects array
                              setFileObjects(prev => ({
                                ...prev,
                                [field_name]: updatedFiles
                              }));
                              
                              // Update file metadata JSON
                              const updatedMetadata = fileDataArray.filter((_: any, i: number) => i !== index);
                              handleChange(field_name, JSON.stringify(updatedMetadata));
                            }
                          }}
                          color="secondary"
                          variant="outlined"
                          icon={<AttachmentIcon fontSize="small" />}
                        />
                      );
                    });
                  } catch (err) {
                    console.error('Error rendering new files:', err);
                    return null;
                  }
                })()}
                </Box>
              </>
            )}
            
            {/* Helper text and instructions */}
            {field_attributes.helper_text && (
              <FormHelperText>{field_attributes.helper_text}</FormHelperText>
            )}
            {field_attributes.upload_instructions && (
              <FormHelperText>
                {field_attributes.upload_instructions}
              </FormHelperText>
            )}
          </FormControl>
        );

      default:
        return (
          <Typography color="error" variant="body2" key={field.field_name}>
            Unsupported field type: {field.field_type}
          </Typography>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{task?.TaskName || "Task Form"}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Please fill out all required fields before completing this task.
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {task?.form_fields
            ?.sort((a: any, b: any) => a.display_order - b.display_order)
            .map((field: any) => renderField(field))}
        </Stack>

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || isCompleted}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
