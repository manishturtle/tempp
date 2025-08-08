import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '80vh',
  },
}));

const StyledTableContainer = styled('div')(({ theme }) => ({
  maxHeight: 'calc(80vh - 150px)',
  overflow: 'auto',
  '& .MuiTableContainer-root': {
    maxHeight: '100%',
    '& .MuiTableCell-root': {
      verticalAlign: 'top',
      padding: theme.spacing(1.5),
      '&:first-of-type': {
        width: '200px',
        fontWeight: 'bold',
        backgroundColor: theme.palette.grey[100],
      },
    },
  },
}));

const PromptCell = styled(Box)(({ theme }) => ({
  maxHeight: '200px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  '&:hover': {
    backgroundColor: theme.palette.grey[100],
  },
}));

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          opacity: 0.7,
          '&:hover': {
            opacity: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

interface VariantComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  currentVariant: any;
  siblings: any[];
  onSelectVariant: (variant: any) => void;
}

export function VariantComparisonDialog({
  open,
  onClose,
  currentVariant,
  siblings,
  onSelectVariant,
}: VariantComparisonDialogProps) {
  if (!currentVariant) return null;

  const renderField = (field: string) => {
    if (field === 'system_prompt' || field === 'user_prompt') {
      return (value: string) => (
        <Box sx={{ position: 'relative' }}>
          <PromptCell>
            {value || '-'}
            {value && <CopyButton content={value} />}
          </PromptCell>
        </Box>
      );
    }
    return (value: any) => String(value || '-');
  };

  const fields = [
    { id: 'variant_name', label: 'Name', render: (v: any) => v },
    { id: 'system_prompt', label: 'System Prompt', render: renderField('system_prompt') },
    { id: 'user_prompt', label: 'User Prompt', render: renderField('user_prompt') },
    { id: 'created_at', label: 'Created', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth={false}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Compare Variants</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <StyledTableContainer>
          <TableContainer component={Paper}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Current Variant</TableCell>
                  {siblings.map((sibling, idx) => (
                    <TableCell key={sibling.id}>
                      Variant {idx + 1}
                      {sibling.variant_name && ` (${sibling.variant_name})`}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell component="th" scope="row">
                      {field.label}
                    </TableCell>
                    <TableCell>
                      {field.render(currentVariant[field.id])}
                    </TableCell>
                    {siblings.map((sibling) => (
                      <TableCell 
                        key={`${sibling.id}-${field.id}`}
                        onClick={() => field.id !== 'created_at' ? onSelectVariant(sibling) : undefined}
                        sx={{ 
                          cursor: field.id !== 'created_at' ? 'pointer' : 'default',
                          '&:hover': { 
                            backgroundColor: field.id !== 'created_at' ? 'action.hover' : 'inherit'
                          } 
                        }}
                      >
                        {field.render(sibling[field.id])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </StyledTableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="primary"
        >
          Done
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}

export default VariantComparisonDialog;
