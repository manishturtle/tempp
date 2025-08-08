/**
 * Delete Confirmation Dialog Component
 * 
 * Reusable dialog for confirming deletion of catalogue entities
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmationDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  content?: string;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  loading?: boolean;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  title,
  message,
  content,
  onClose,
  onCancel,
  onConfirm,
  isDeleting = false,
  loading = false
}) => {
  const { t } = useTranslation();
  
  // Use either onCancel or onClose (for backward compatibility)
  const handleCancel = onCancel || onClose || (() => {});
  
  // Use either content or message (for backward compatibility)
  const dialogContent = content || message || '';

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="delete-confirmation-dialog-title"
      aria-describedby="delete-confirmation-dialog-description"
    >
      <DialogTitle id="delete-confirmation-dialog-title">
        {title || t('delete')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-confirmation-dialog-description">
          {dialogContent}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="primary" disabled={isDeleting || loading}>
          {t('cancel')}
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          disabled={isDeleting || loading}
          startIcon={isDeleting || loading ? <CircularProgress size={20} /> : null}
        >
          {t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
