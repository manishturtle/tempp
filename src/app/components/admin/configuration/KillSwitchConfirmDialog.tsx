"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface KillSwitchConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEnabling: boolean; // Whether we're enabling or disabling the kill switch
}

/**
 * KillSwitchConfirmDialog - A specialized confirmation dialog for the kill switch feature
 * Requires the user to type "CONFIRM" to enable or disable the kill switch as a safety measure
 */
export const KillSwitchConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  isLoading = false,
  isEnabling,
}: KillSwitchConfirmDialogProps): React.ReactElement => {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState<string>('');
  const isConfirmEnabled = confirmText === 'CONFIRM';

  // Determine colors and text based on whether we're enabling or disabling
  const actionColor = isEnabling ? 'error' : 'success';
  const alertSeverity = isEnabling ? 'error' : 'success';
  const ActionIcon = isEnabling ? WarningAmberIcon : CheckCircleOutlineIcon;
  
  const handleConfirm = (): void => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmText(''); // Reset the text field
    }
  };

  const handleCancel = (): void => {
    setConfirmText(''); // Reset the text field
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="kill-switch-dialog-title"
      aria-describedby="kill-switch-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle 
        id="kill-switch-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: `${actionColor}.main`,
          pb: 1
        }}
      >
        <ActionIcon color={actionColor} />
        {isEnabling 
          ? t('configuration.featureToggleSettings.killSwitchWarningEnable', 'WARNING: Activating Kill Switch') 
          : t('configuration.featureToggleSettings.killSwitchWarningDisable', 'NOTICE: Deactivating Kill Switch')}
      </DialogTitle>
      
      <DialogContent>
        <Alert severity={alertSeverity} sx={{ mb: 2 }}>
          {isEnabling
            ? t(
                'configuration.featureToggleSettings.killSwitchAlertEnable',
                'This action will immediately take down the website for all users!'
              )
            : t(
                'configuration.featureToggleSettings.killSwitchAlertDisable',
                'This action will restore normal website functionality for all users.'
              )
          }
        </Alert>
        
        <DialogContentText id="kill-switch-dialog-description" sx={{ mb: 3 }}>
          {isEnabling
            ? t(
                'configuration.featureToggleSettings.killSwitchDescriptionEnable',
                'Activating the kill switch will immediately disable all frontend functionality and display a maintenance message to all users. This should only be used in emergency situations.'
              )
            : t(
                'configuration.featureToggleSettings.killSwitchDescriptionDisable',
                'Deactivating the kill switch will restore normal website functionality. Make sure any issues that required the kill switch have been resolved before proceeding.'
              )
          }
        </DialogContentText>
        
        <Typography variant="subtitle1" fontWeight={500} gutterBottom>
          {t(
            'configuration.featureToggleSettings.killSwitchConfirmPrompt',
            'To proceed, type "CONFIRM" in the field below:'
          )}
        </Typography>
        
        <TextField
          autoFocus
          fullWidth
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          variant="outlined"
          placeholder="CONFIRM"
          error={confirmText !== '' && confirmText !== 'CONFIRM'}
          helperText={
            confirmText !== '' && confirmText !== 'CONFIRM'
              ? t(
                  'configuration.featureToggleSettings.killSwitchConfirmError',
                  'You must type CONFIRM exactly (all capitals)'
                )
              : ''
          }
          sx={{ mt: 1 }}
        />
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleCancel} color="primary" disabled={isLoading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button 
          onClick={handleConfirm} 
          color={actionColor} 
          variant="contained" 
          disabled={!isConfirmEnabled || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading 
            ? t('common.processing', 'Processing...') 
            : isEnabling
              ? t('configuration.featureToggleSettings.activateKillSwitch', 'Activate Kill Switch')
              : t('configuration.featureToggleSettings.deactivateKillSwitch', 'Deactivate Kill Switch')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KillSwitchConfirmDialog;
