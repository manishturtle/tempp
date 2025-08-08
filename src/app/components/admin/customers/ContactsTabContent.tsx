"use client";

import { useState } from 'react';
import { Box, Typography, Button, Link, Chip, IconButton, Card, CardContent, Grid, Paper, Avatar } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import api from '@/lib/api';
import { ContactFormData } from './forms/ContactForm';
import { ContactSummary } from '@/app/types/account';

// Use ContactSummary as ContactSummaryData for backward compatibility
type ContactSummaryData = ContactSummary;

interface ContactsTabContentProps {
  accountId: string;
  contacts?: ContactSummary[];
  openContactDrawer: (initialData?: ContactFormData, accountId?: string) => void;
}

/**
 * Contacts tab content component for displaying contacts associated with an account
 */
export const ContactsTabContent = ({ 
  accountId, 
  contacts = [], 
  openContactDrawer 
}: ContactsTabContentProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Find primary contact
  const primaryContact = contacts.find(contact => contact.is_primary);

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await api.delete(`/contacts/${contactId}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate account detail query to refresh data
      queryClient.invalidateQueries({ queryKey: ['accountDetail', accountId] });
    }
  });

  // Handle edit contact
  const handleEdit = (contact: ContactSummary) => {
    openContactDrawer(contact as ContactFormData, accountId);
  };

  // Handle delete contact
  const handleDelete = (contactId: string) => {
    setContactToDelete(contactId);
    setConfirmDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete);
      setConfirmDialogOpen(false);
      setContactToDelete(null);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
    setContactToDelete(null);
  };

  // Define columns for the data grid
  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: t('Name') || 'Name',
      flex: 1,
      renderCell: (params: any) => {
        if (!params || !params.row) return null;
        return (
          <Link 
            component={NextLink} 
            href={`/Masters/customers/contacts/${params.row.id}`}
            sx={{ textDecoration: 'none' }}
          >
            {params.value || ''}
          </Link>
        );
      }
    },
    {
      field: 'job_title',
      headerName: t('Job Title') || 'Job Title',
      flex: 1
    },
    {
      field: 'email',
      headerName: t('Email') || 'Email',
      flex: 1.5,
      renderCell: (params: any) => {
        if (!params) return null;
        return params.value ? (
          <Link 
            href={`mailto:${params.value}`}
            sx={{ textDecoration: 'none' }}
          >
            {params.value}
          </Link>
        ) : null;
      }
    },
    {
      field: 'work_phone',
      headerName: t('Phone') || 'Phone',
      width: 150,
      renderCell: (params: any) => {
        if (!params) return null;
        return params.value ? (
          <Link 
            href={`tel:${params.value}`}
            sx={{ textDecoration: 'none' }}
          >
            {params.value}
          </Link>
        ) : null;
      }
    },
    {
      field: 'status',
      headerName: t('Status') || 'Status',
      width: 120,
      renderCell: (params: any) => {
        if (!params) return null;
        return (
          <Chip 
            label={params.value || ''} 
            size="small"
            color={params.value === 'Active' ? 'success' : 'default'}
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: t('Actions') || 'Actions',
      type: 'actions',
      width: 100,
      getActions: (params: any) => {
        if (!params || !params.row) return [];
        const row = params.row as ContactSummaryData;
        return [
          <GridActionsCellItem 
            key="delete"
            icon={<DeleteIcon />} 
            label={t('Delete') || 'Delete'} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              handleDelete(String(row.id));
            }} 
          />
        ];
      }
    }
  ];

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('Contact Persons') || 'Contact Persons'}
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<AddIcon />}
          onClick={() => openContactDrawer(undefined, accountId)}
        >
          {t('New Contact') || 'New Contact'}
        </Button>
      </Box>

      {/* Contact cards - showing first two contacts */}
      {contacts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {contacts.slice(0, 2).map((contact) => (
              <Grid item xs={12} sm={6} key={contact.id}>
                <Card elevation={0}
            sx={{ 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              backgroundColor: 'background.paper',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 2
              }
            }}>
                  <CardContent sx={{ position: 'relative', p: 2 }}>
                    {contact.is_primary && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 8, 
                          backgroundColor: 'primary.main', 
                          color: 'white',
                          fontSize: '0.75rem',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1
                        }}
                      >
                        {t('Primary') || 'Primary'}
                      </Box>
                    )}
                    
                    <IconButton 
                      size="small" 
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => handleEdit(contact)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          mr: 2, 
                          bgcolor: contact.is_primary ? 'primary.main' : 'grey.400',
                          width: 40,
                          height: 40
                        }}
                      >
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {contact.full_name || `${contact.first_name} ${contact.last_name}`.trim()}
                        </Typography>
                        
                        {contact.job_title && (
                          <Typography variant="body2" color="text.secondary">
                            {contact.job_title}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Link href={`mailto:${contact.email}`} sx={{ textDecoration: 'none' }}>
                        {contact.email}
                      </Link>
                    </Box>
                    
                    {contact.work_phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Link href={`tel:${contact.work_phone}`} sx={{ textDecoration: 'none' }}>
                          {contact.work_phone}
                        </Link>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All contacts section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('All Contacts') || 'All Contacts'}
        </Typography>
        
        <Paper variant="outlined">
          <DataGrid
            rows={contacts.map(contact => ({
              ...contact,
              // Ensure full_name is set for each contact
              full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
            }))}
            columns={columns}
            getRowId={(row) => row.id}
            autoHeight
            onRowClick={(params) => {
              const contact = params.row as ContactSummary;
              handleEdit({
                ...contact,
                id: String(contact.id) // Ensure id is a string for the form
              });
            }}
            hideFooterPagination={contacts.length <= 10}
            hideFooter={contacts.length <= 10}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              border: 'none',
            }}
            slots={{
              noRowsOverlay: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('No contacts found') || 'No contacts found'}
                  </Typography>
                </Box>
              ),
            }}
          />
        </Paper>
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        title="Delete Contact"
        content="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={deleteContactMutation.isPending}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default ContactsTabContent;
