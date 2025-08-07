'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert, 
  Breadcrumbs,
  Table, 
  TableBody, 
  TableCell,
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions, 
  Autocomplete, 
  TextField,
  InputAdornment,
  Chip,
  Divider
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { useGetListById, useGetListMembers, useAddMembersToList, useRemoveMembersFromList } from '../../../../../../hooks/engagement/marketing/useLists';
import { useGetContacts } from '../../../../../../hooks/engagement/marketing/useContacts';
import { MarketingList, ListMember, Contact } from '../../../../../../types/engagement/marketing';
import ConfirmDialog from '../../../../../../components/common/ConfirmDialog';
import CustomDataGrid from '../../../../../../components/common/CustomDataGrid';
import { useDebounce } from '../../../../../../hooks/engagement/useDebounce';

// Local notification functions
const showSuccessNotification = (message: string) => {
  console.log('SUCCESS:', message);
  // You can replace this with your actual notification system
  alert(message);
};

const showErrorNotification = (message: string) => {
  console.error('ERROR:', message);
  // You can replace this with your actual notification system
  alert(`Error: ${message}`);
};

export default function ManageListMembersPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params?.tenant as string;
  const listId = params.listId ? parseInt(params.listId as string, 10) : undefined;

  // Fetch list details
  const { 
    data: listData, 
    isLoading: isLoadingList, 
    error: listError 
  } = useGetListById(tenant, listId);

  // For list members pagination and search
  const [membersPage, setMembersPage] = useState(1);
  const [membersRowsPerPage, setMembersRowsPerPage] = useState(10);
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const debouncedMembersSearchTerm = useDebounce(membersSearchTerm, 300);

  // Fetch list members
  const { 
    data: membersData, 
    isLoading: isLoadingMembers,
    isError: isMembersError,
    error: membersError,
    refetch: refetchMembers 
  } = useGetListMembers(
    tenant,
    listId,
    membersPage,
    debouncedMembersSearchTerm
  );
  
  // Mutations for adding and removing members
  const addMembersMutation = useAddMembersToList(tenant);
  const removeMembersMutation = useRemoveMembersFromList(tenant);

  // For Add Member Dialog & Autocomplete
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [contactsForAutocomplete, setContactsForAutocomplete] = useState<Contact[]>([]);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<Contact[]>([]);
  const [autocompleteSearch, setAutocompleteSearch] = useState('');
  const debouncedAutocompleteSearch = useDebounce(autocompleteSearch, 500);
  
  // Fetch contacts for autocomplete
  const { 
    data: allContactsData, 
    isLoading: isLoadingAllContacts 
  } = useGetContacts(
    tenant, 
    1, 
    debouncedAutocompleteSearch
  );

  // Update contacts for autocomplete when data changes
  useEffect(() => {
    if (allContactsData?.results) {
      setContactsForAutocomplete(allContactsData.results);
    }
  }, [allContactsData]);

  // For Delete Member Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedMemberForDelete, setSelectedMemberForDelete] = useState<ListMember | null>(null);

  // Handle pagination
  const handleMembersPageChange = (event: unknown, newPage: number) => {
    setMembersPage(newPage + 1); // API is 1-indexed
  };

  const handleMembersRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMembersRowsPerPage(parseInt(event.target.value, 10));
    setMembersPage(1); // Reset to first page
  };
  
  // Handle member search
  const handleMembersSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMembersSearchTerm(event.target.value);
    setMembersPage(1); // Reset to first page
  };
  
  // Add members dialog handlers
  const handleOpenAddMemberDialog = () => setAddMemberDialogOpen(true);
  
  const handleCloseAddMemberDialog = () => {
    setAddMemberDialogOpen(false);
    setSelectedContactsToAdd([]);
    setAutocompleteSearch('');
  };
  
  const handleAddSelectedMembers = async () => {
    if (!listId || selectedContactsToAdd.length === 0) return;
    const contactIds = selectedContactsToAdd.map(c => c.id);
    
    try {
      await addMembersMutation.mutateAsync({ 
        listId, 
        contactIds 
      });
      handleCloseAddMemberDialog();
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  // Remove member handlers
  const handleRemoveMemberInitiate = (member: ListMember) => {
    setSelectedMemberForDelete(member);
    setDeleteConfirmOpen(true);
  };
  
  const handleRemoveMemberConfirm = async () => {
    if (!listId || !selectedMemberForDelete) return;
    
    try {
      // Extract the contact ID from the member
      // Based on the API response, the contact ID is in the 'contact' field
      // @ts-ignore - Ignoring type check as we know 'contact' exists in the API response
      const contactId = selectedMemberForDelete.contact || selectedMemberForDelete.contact_id;
      
      // Log the data being sent to help with debugging
      console.log('Removing member with data:', { 
        listId, 
        contactId,
        member: selectedMemberForDelete 
      });
      
      if (!contactId) {
        showErrorNotification('Cannot remove member: Missing contact ID');
        return;
      }
      
      // Make the API call with the contact ID from the 'contact' field
      // This is the ID that matches the contacts API response
      await removeMembersMutation.mutateAsync({ 
        listId, 
        contactIds: [contactId] 
      });
      
      // Manually refetch the list members to ensure the UI updates
      refetchMembers();
      
      setSelectedMemberForDelete(null);
      setDeleteConfirmOpen(false);
      showSuccessNotification('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      showErrorNotification('Failed to remove member from list');
    }
  };
  
  const handleRemoveMemberCancel = () => {
    setSelectedMemberForDelete(null);
    setDeleteConfirmOpen(false);
  };

  // Process member rows to ensure unique IDs for the data grid
  const processedMemberRows = React.useMemo(() => {
    if (!membersData?.results) return [];
    return membersData.results.map(member => {
      // Log the raw member data to help with debugging
      console.log('Raw member data:', member);
      
      // Based on the API response, the contact ID is in the 'contact' field
      // Example response:
      // {
      //   "id": 11,
      //   "contact": 6,  <-- This is the contact ID we need
      //   "contact_email": "example4@example.com",
      //   ...
      // }
      
      // Extract the contact ID from the 'contact' field
      // @ts-ignore - Ignoring type check as we know 'contact' exists in the API response
      const contactId = member.contact;
      
      return {
        ...member,
        // Ensure the ID is explicitly set for the data grid
        id: member.id,
        // Set the contact_id field to the value from the 'contact' field
        contact_id: contactId,
        uniqueId: `member-${member.id}`
      };
    });
  }, [membersData?.results]);
  
  // Loading and error states
  if (isLoadingList) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (listError || !listData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load list details. {(listError as Error)?.message}
        </Alert>
      </Box>
    );
  }

  // Check if this is a dynamic segment that's not internally generated
  if (listData.list_type === 'DYNAMIC_SEGMENT' && !listData.is_internal_generated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Member management is not applicable for this type of dynamic segment.
        </Alert>
      </Box>
    );
  }

  const pageTitle = `Manage Members: ${listData.name}`;
  
  // Define columns for the member data grid
  const memberColumns = [
    { 
      field: 'contact_id', 
      headerName: 'Contact ID', 
      width: 100,
      renderCell: (params: any) => {
        // This displays the contact_id from the contacts API response
        // http://127.0.0.1:8000///api/man/marketing/contacts/
        return (
          <Typography variant="body2">
            {params.value || 'N/A'}
          </Typography>
        );
      } 
    },
    { 
      field: 'contact_name', 
      headerName: 'Name', 
      flex: 1,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      )
    },
    { 
      field: 'contact_email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      )
    },
    { 
      field: 'contact_phone', 
      headerName: 'Phone', 
      flex: 1,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      )
    },
    { 
      field: 'subscribed_at', 
      headerName: 'Subscribed At', 
      width: 180,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.value ? new Date(params.value).toLocaleDateString() : '-'}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params: any) => (
        <IconButton 
          onClick={() => handleRemoveMemberInitiate(params.row)} 
          size="small"
          color="error"
          disabled={removeMembersMutation.isPending}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  // This section was moved up to avoid conditional hook calls
  
  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb" 
        sx={{ mb: 0.5, mt: 0 }}
      >
        <Link href={`/${tenant}/Crm/engagement`} passHref legacyBehavior>
          <Typography 
            color="text.primary" 
            sx={{
              textDecoration: 'none', 
              '&:hover': { textDecoration: 'underline' },
              cursor: 'pointer'
            }}
          >
            Home
          </Typography>
        </Link>
        <Link href={`/${tenant}/Crm/engagement/lists`} passHref legacyBehavior>
          <Typography 
            color="text.primary" 
            sx={{
              textDecoration: 'none', 
              '&:hover': { textDecoration: 'underline' },
              cursor: 'pointer'
            }}
          >
            Marketing Lists
          </Typography>
        </Link>
        <Typography color="text.primary">
          {listData.name} - Members
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 0.5, m: 0, mt: -1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, mt: 0, pb: 0 }}>
          <Typography variant="h5" component="h1">{pageTitle}</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpenAddMemberDialog}
            sx={{ 
              bgcolor: '#f5821f', 
              '&:hover': { bgcolor: '#e67812' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
          >
            Add Members
          </Button>
        </Box>

        {/* Search box */}
        <Box sx={{ mb: 0.5 }}>
          <TextField
            placeholder="Search members..."
            value={membersSearchTerm}
            onChange={handleMembersSearchChange}
            size="small"
            sx={{ width: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Members Data Grid */}
        {isLoadingMembers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 0.5 }}>
            <CircularProgress />
          </Box>
        ) : isMembersError ? (
          <Alert severity="error" sx={{ m: 0.5 }}>
            Error loading members: {(membersError as Error)?.message || 'Unknown error'}
          </Alert>
        ) : processedMemberRows.length === 0 ? (
          <Box sx={{ p: 0.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              This list has no members yet. Add members by clicking the "Add Members" button.
            </Typography>
          </Box>
        ) : (
          <CustomDataGrid
            rows={processedMemberRows}
            columns={memberColumns}
            paginationModel={{
              page: membersPage - 1, // Convert 1-indexed to 0-indexed
              pageSize: membersRowsPerPage,
            }}
            onPaginationModelChange={(model) => {
              setMembersPage(model.page + 1); // Convert 0-indexed to 1-indexed
              setMembersRowsPerPage(model.pageSize);
            }}
            pageSizeOptions={[5, 10, 25]}
            rowCount={membersData?.count || 0}
            loading={isLoadingMembers}
            disableRowSelectionOnClick
            getRowId={(row) => row.uniqueId}
            paginationMode="server"
            autoHeight
          />
        )}
      </Paper>

      {/* Add Member Dialog */}
      <Dialog 
        open={addMemberDialogOpen} 
        onClose={handleCloseAddMemberDialog} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddIcon color="primary" />
            <Typography variant="h6">Add Members to List: {listData?.name}</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You can select multiple contacts to add to this list at once. Search by name, email, or phone number.
          </Typography>
          
          <Autocomplete
            multiple
            id="add-contacts-autocomplete"
            options={contactsForAutocomplete}
            getOptionLabel={(option) => 
              `${option.first_name || ''} ${option.last_name || ''} (${option.email_address || option.phone_number || 'ID: ' + option.id})`
            }
            value={selectedContactsToAdd}
            onChange={(event, newValue) => {
              setSelectedContactsToAdd(newValue);
            }}
            onInputChange={(event, newInputValue) => {
              setAutocompleteSearch(newInputValue);
            }}
            disableCloseOnSelect={true} // Keep dropdown open when selecting items
            loading={isLoadingAllContacts}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search and select multiple contacts"
                placeholder="Type to search contacts"
                variant="outlined"
                fullWidth
                margin="normal"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {isLoadingAllContacts ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
                helperText={`${selectedContactsToAdd.length} contact(s) selected`}
              />
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selected} 
                      style={{ width: '18px', height: '18px' }}
                      onChange={() => {}} // Handled by Autocomplete
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">
                      {option.first_name || ''} {option.last_name || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.email_address || option.phone_number || `ID: ${option.id}`}
                    </Typography>
                  </Box>
                </Box>
              </li>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={`${option.first_name || ''} ${option.last_name || ''}`}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
          />
          
          {selectedContactsToAdd.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">
                Selected Contacts ({selectedContactsToAdd.length}):
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedContactsToAdd.map((contact) => (
                  <Chip
                    key={contact.id}
                    label={`${contact.first_name || ''} ${contact.last_name || ''}`}
                    size="small"
                    onDelete={() => {
                      setSelectedContactsToAdd(selectedContactsToAdd.filter(c => c.id !== contact.id));
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseAddMemberDialog} 
            disabled={addMembersMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddSelectedMembers} 
            variant="contained" 
            disabled={selectedContactsToAdd.length === 0 || addMembersMutation.isPending}
            color="primary"
            startIcon={addMembersMutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {addMembersMutation.isPending ? 'Adding...' : `Add ${selectedContactsToAdd.length} Contact(s)`}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Member Confirmation */}
      {selectedMemberForDelete && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Remove Member"
          content={`Are you sure you want to remove this contact from the list?`}
          onConfirm={handleRemoveMemberConfirm}
          onCancel={handleRemoveMemberCancel}
          confirmText="Remove"
          isLoading={removeMembersMutation.isPending}
        />
      )}
    </>
  );
}
