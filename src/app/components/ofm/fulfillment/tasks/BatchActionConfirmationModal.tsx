'use client';

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

interface BatchActionConfirmationModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  
  /**
   * The action being performed (e.g., 'COMPLETE_STEP')
   */
  action: string;
  
  /**
   * The number of items being processed
   */
  count: number;
  
  /**
   * Whether the action is currently being processed
   */
  isLoading: boolean;
  
  /**
   * Callback when the action is confirmed
   */
  onConfirm: () => void;
  
  /**
   * Callback when the modal is closed without confirming
   */
  onCancel: () => void;
}

/**
 * Modal for confirming batch actions on tasks
 */
const BatchActionConfirmationModal: React.FC<BatchActionConfirmationModalProps> = ({
  open,
  action,
  count,
  isLoading,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation('ofm');
  
  // Get a human-readable action name
  const getActionDisplayName = (actionType: string): string => {
    switch (actionType) {
      case 'COMPLETE_STEP':
        return t('ofm:tasks.actions.completeStep');
      case 'HOLD':
        return t('ofm:tasks.actions.hold');
      case 'EXCEPTION':
        return t('ofm:tasks.actions.exception');
      case 'CANCEL':
        return t('ofm:tasks.actions.cancel');
      default:
        return actionType;
    }
  };
  
  const actionDisplayName = getActionDisplayName(action);
  
  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onCancel}
      aria-labelledby="batch-action-confirmation-title"
    >
      <DialogTitle id="batch-action-confirmation-title">
        {t('ofm:tasks.batchConfirmTitle')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('ofm:tasks.batchConfirm', { 
            count, 
            action: actionDisplayName 
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onCancel} 
          disabled={isLoading}
          color="inherit"
        >
          {t('ofm:common.cancel')}
        </Button>
        <Button 
          onClick={onConfirm} 
          color="primary" 
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading 
            ? t('ofm:common.processing') 
            : t('ofm:common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchActionConfirmationModal;
