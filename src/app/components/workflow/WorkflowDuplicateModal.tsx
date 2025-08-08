import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress
} from '@mui/material';
import { useDuplicateWorkflow } from '@/app/hooks/api/ofm/useWorkflowMutations';
import type { Workflow } from '@/types/ofm';

interface WorkflowDuplicateModalProps {
  open: boolean;
  onClose: () => void;
  workflow: Workflow | null;
}

export const WorkflowDuplicateModal: React.FC<WorkflowDuplicateModalProps> = ({
  open,
  onClose,
  workflow
}) => {
  const { t } = useTranslation('ofm');
  const [newName, setNewName] = useState<string>(
    workflow ? `Copy of ${workflow.name}` : ''
  );

  // Reset the name when the modal opens with a different workflow
  React.useEffect(() => {
    if (workflow) {
      setNewName(`Copy of ${workflow.name}`);
    }
  }, [workflow]);

  const { mutate: duplicateWorkflow, isLoading } = useDuplicateWorkflow({
    onSuccess: () => {
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow) return;

    duplicateWorkflow({
      workflowId: workflow.id,
      newName: newName.trim()
    });
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('ofm:workflows.duplicate.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label={t('ofm:workflows.duplicate.nameLabel')}
              fullWidth
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isLoading}
              required
              helperText={t('ofm:workflows.duplicate.nameHelper')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            {t('ofm:common.cancel')}
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isLoading || !newName.trim()}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              t('ofm:workflows.duplicate.confirm')
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default WorkflowDuplicateModal;
