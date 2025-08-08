"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export enum SOPEditAction {
  CANCEL = "cancel",
  UPDATE_EXISTING = "update_existing",
  CREATE_NEW_VERSION = "create_new_version",
}

interface SOPEditConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: SOPEditAction) => void;
}

const SOPEditConfirmationDialog: React.FC<SOPEditConfirmationDialogProps> = ({
  open,
  onClose,
  onAction,
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => onAction(SOPEditAction.CANCEL)}
      aria-labelledby="sop-edit-confirmation-dialog-title"
      aria-describedby="sop-edit-confirmation-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="sop-edit-confirmation-dialog-title">
        <Typography variant="h6" component="span">
          Save SOP Changes
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="sop-edit-confirmation-dialog-description">
          How would you like to save your changes to this SOP?
        </DialogContentText>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          • <strong>Cancel</strong>: Don't save any changes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>Update Existing</strong>: Modify the current SOP version
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>Create New Version</strong>: Create a new version of this SOP while preserving the current version
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onAction(SOPEditAction.CANCEL)}>Cancel</Button>
        <Button onClick={() => onAction(SOPEditAction.UPDATE_EXISTING)}>
          Update Existing
        </Button>
        <Button 
          onClick={() => onAction(SOPEditAction.CREATE_NEW_VERSION)} 
          variant="contained" 
          color="primary"
        >
          Create New Version
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SOPEditConfirmationDialog;
