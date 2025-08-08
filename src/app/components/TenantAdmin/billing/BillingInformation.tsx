'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
} from '@mui/material';
import { Edit } from '@mui/icons-material';

type BillingInfo = {
  companyName: string;
  address: string[];
  contactEmail: string;
  taxId: string;
};

export const BillingInformation = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    companyName: 'Acme Corporation Inc.',
    address: [
      '123 Innovation Drive,',
      'Suite 200,',
      'San Francisco, CA 94105',
      'United States',
    ],
    contactEmail: 'billing@acmecorp.com',
    taxId: 'XX-XXXXXXX',
  });
  const [formData, setFormData] = useState<BillingInfo>(billingInfo);

  const handleEditClick = () => {
    setFormData(billingInfo);
    setIsEditing(true);
  };

  const handleSave = () => {
    setBillingInfo(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleChange = (field: keyof BillingInfo, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Billing Information
          </Typography>
          <Button
            size="small"
            startIcon={<Edit fontSize="small" />}
            onClick={handleEditClick}
          >
            Edit
          </Button>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <Box component="span" fontWeight="medium" color="text.primary">
              Company Name:
            </Box>{' '}
            {billingInfo.companyName}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <Box component="span" fontWeight="medium" color="text.primary">
              Billing Address:
            </Box>
            <br />
            {billingInfo.address.join('\n')}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <Box component="span" fontWeight="medium" color="text.primary">
              Billing Contact:
            </Box>{' '}
            {billingInfo.contactEmail}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            <Box component="span" fontWeight="medium" color="text.primary">
              Tax ID:
            </Box>{' '}
            {billingInfo.taxId}
          </Typography>
        </Box>
      </CardContent>

      <Dialog open={isEditing} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Billing Information</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Company Name"
              fullWidth
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              margin="normal"
              size="small"
            />
            
            <TextField
              label="Billing Address"
              fullWidth
              multiline
              rows={4}
              value={formData.address.join('\n')}
              onChange={(e) => handleChange('address', e.target.value.split('\n'))}
              margin="normal"
              size="small"
            />
            
            <TextField
              label="Billing Contact Email"
              fullWidth
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              margin="normal"
              size="small"
            />
            
            <TextField
              label="Tax ID"
              fullWidth
              value={formData.taxId}
              onChange={(e) => handleChange('taxId', e.target.value)}
              margin="normal"
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
