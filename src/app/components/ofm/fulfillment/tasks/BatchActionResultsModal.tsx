'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Chip,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BatchActionResultItem } from '@/types/ofm/tasks';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface BatchActionResultsModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  
  /**
   * Array of successfully processed items
   */
  success: BatchActionResultItem[];
  
  /**
   * Array of failed items
   */
  failed: BatchActionResultItem[];
  
  /**
   * Callback when the modal is closed
   */
  onClose: () => void;
}

/**
 * Modal for displaying the results of a batch action
 */
const BatchActionResultsModal: React.FC<BatchActionResultsModalProps> = ({
  open,
  success,
  failed,
  onClose
}) => {
  const { t } = useTranslation('ofm');
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="batch-action-results-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="batch-action-results-title">
        {t('ofm:tasks.batchResultsTitle')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('ofm:tasks.batchResultsSummary', { 
              success: success.length, 
              failed: failed.length,
              total: success.length + failed.length
            })}
          </Typography>
        </Box>
        
        {failed.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="error" gutterBottom>
              {t('ofm:tasks.batchResultsFailures')}
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {failed.map((item) => (
                  <React.Fragment key={item.oif_id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              {t('ofm:tasks.itemId')}: {item.oif_id}
                            </Typography>
                          </Box>
                        }
                        secondary={item.reason || t('ofm:tasks.unknownError')}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}
        
        {success.length > 0 && (
          <Box>
            <Typography variant="h6" color="success" gutterBottom>
              {t('ofm:tasks.batchResultsSuccesses')}
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {success.map((item) => (
                  <React.Fragment key={item.oif_id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              {t('ofm:tasks.itemId')}: {item.oif_id}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('ofm:common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchActionResultsModal;
