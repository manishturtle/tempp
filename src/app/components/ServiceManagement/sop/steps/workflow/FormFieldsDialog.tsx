import React from "react";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FormFieldsEditor from "./FormFieldsEditor";

interface FormFieldsDialogProps {
  open: boolean;
  fields: any[];
  displayName?: string;
  onSave: (fields: any[]) => void;
  onClose: () => void;
}

const FormFieldsDialog: React.FC<FormFieldsDialogProps> = ({
  open,
  fields,
  displayName = "",
  onSave,
  onClose,
}) => {
  // Create a ref to access the FormFieldsEditor methods
  const formFieldsEditorRef = React.useRef<{
    getFields: () => any[];
    handleSave: () => void;
  } | null>(null);

  // Function to handle save from the toolbar
  const handleSaveFromToolbar = () => {
    if (formFieldsEditorRef.current) {
      formFieldsEditorRef.current.handleSave();
    }
  };
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { bgcolor: "#f5f5f5" } }}
    >
      <AppBar
        position="sticky"
        color="default"
        elevation={1}
        sx={{ bgcolor: "#fff", borderBottom: "1px solid #ccc" }}
      >
        <Toolbar>
          {/* Left-aligned close button */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ mr: 2 }}
          >
            <CloseIcon />
          </IconButton>
          
          {/* Center-aligned title */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              textAlign: 'center',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'fit-content',
              maxWidth: '50%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Form Fields Editor{displayName ? ` | ${displayName}` : ""}
          </Typography>
          
          {/* Right-aligned action buttons */}
          <Box sx={{ display: 'flex', marginLeft: 'auto' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onClose}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveFromToolbar}
            >
              Save Fields
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 0 }}>
        <FormFieldsEditor
          ref={formFieldsEditorRef}
          fields={fields}
          onSave={onSave}
          onCancel={onClose}
        />
      </Box>
    </Dialog>
  );
};

export default FormFieldsDialog;
