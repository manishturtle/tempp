/**
 * Confirm Dialog Component
 * 
 * Reusable dialog for confirming actions like deletion
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

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  content,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText,
  cancelText
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: (theme) => ({
          borderRadius: theme.shape.borderRadius,
          overflow: 'hidden'
        })
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle 
        id="confirm-dialog-title"
        sx={(theme) => ({
          pb: theme.spacing(1)
        })}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={(theme) => ({
        pb: theme.spacing(2)
      })}>
        <DialogContentText id="confirm-dialog-description">
          {content}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={(theme) => ({
        px: theme.spacing(3),
        pb: theme.spacing(2),
        gap: theme.spacing(1)
      })}>
        <Button onClick={onCancel} color="primary" disabled={isLoading}>
          {cancelText || t('cancel')}
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? t('processing') : confirmText || t('confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
