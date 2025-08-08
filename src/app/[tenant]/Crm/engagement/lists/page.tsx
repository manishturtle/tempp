'use client';

// Add type declaration for the custom window property at the top level
declare global {
  interface Window {
    selectedContactsForList: number[];
  }
}

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Button, 
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  FormControl,
  FormControlLabel,
  InputLabel,
  InputAdornment,
  Select,
  MenuItem as SelectMenuItem,
  TextField,
  Checkbox,
  Grid,
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { GridColDef } from '@mui/x-data-grid';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useGetLists, useCreateList, useUpdateList, useDeleteList, useCreateListWithFile, useUploadContactsToList, useAddMembersToList, useRemoveMembersFromList, useDownloadList } from '../../../../hooks/engagement/marketing/useLists';
import { useQueryClient } from '@tanstack/react-query';
import { useGetContacts } from '../../../../hooks/engagement/marketing/useContacts';
import { useDebounce } from '../../../../hooks/engagement/useDebounce';
import { MarketingList, ListType } from '../../../../types/engagement/marketing';
// import CustomerUploadDialog from '@/components/common/CustomerUploadDialog';
import CustomerUploadDialog from '../../../../components/common/CustomerUploadDialog';
// import { listFormSchema, ListFormData } from '@/types/schemas';
import { listFormSchema, ListFormData } from '../../../../types/engagement/schemas';
// import ConfirmDialog from '@/components/common/ConfirmDialog';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
// import CustomDataGrid from '@/components/common/CustomDataGrid';
import CustomDataGrid from '../../../../components/common/CustomDataGrid';
// import ContentCard from '@/components/common/ContentCard';
import ContentCard from '../../../../components/common/ContentCard';
// import AnimatedDrawer from '@/components/common/AnimatedDrawer';
import AnimatedDrawer from '../../../../components/common/AnimatedDrawer';
// import { DrawerProvider, useDrawer } from '@/contexts/DrawerContext';
import { DrawerProvider, useDrawer } from '../../../../contexts/DrawerContext';

function ListsPage() {
  const params = useParams();
  const router = useRouter();
  const tenant= params?.tenant as string;
  const queryClient = useQueryClient();
  
  // State for pagination, search, and UI controls
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // State for list actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedListForDelete, setSelectedListForDelete] = useState<MarketingList | null>(null);
  const [listToDelete, setListToDelete] = useState<MarketingList | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // State for drawer and drawer mode
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view' | 'members'>('create');
  const [currentList, setCurrentList] = useState<MarketingList | null>(null);
  
  // State for upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  // Form reference for submitting from drawer
  const formRef = useRef<{ submitForm: () => void }>({ submitForm: () => {} });
  
  // List Members View Component
  const ListMembersView = ({ listId }: { listId: number }) => {
    const [memberPage, setMemberPage] = useState(1);
    const [memberPageSize, setMemberPageSize] = useState(10);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const debouncedMemberSearch = useDebounce(memberSearchTerm, 500);
    
    // State for file upload
    const [files, setFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadSection, setShowUploadSection] = useState(false);
    const [uploadResults, setUploadResults] = useState<any>(null);
    
    // Upload contacts mutation
    const uploadContactsMutation = useUploadContactsToList(tenant);
    
    // Define the ListMember type
    type ListMember = {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };

    // Mock the useGetListMembers hook until it's implemented
    const useGetListMembers = (listId: string | undefined, options: { enabled: boolean }) => {
      return { data: [] as ListMember[] };
    };

    // Fetch list members (for future use)
    const { data: listMembers } = useGetListMembers(
      listId.toString(),
      { enabled: !!listId }
    );

    // Filter members by search term
    const filteredMembers = React.useMemo(() => {
      if (!listMembers) return [];
      return listMembers.filter((member: ListMember) => {
        const searchTermLower = memberSearchTerm.toLowerCase();
        return (
          member.first_name.toLowerCase().includes(searchTermLower) ||
          member.last_name.toLowerCase().includes(searchTermLower) ||
          member.email.toLowerCase().includes(searchTermLower) ||
          (member.phone && member.phone.includes(searchTermLower))
        );
      });
    }, [listMembers, memberSearchTerm]);

    // Transform data to ensure unique row IDs
    const processedMemberRows = React.useMemo(() => {
      if (!listMembers) return [];
      return listMembers.map(member => {
        // Safely access properties that might not exist in the type definition
        const contactId = 'contact_id' in member ? member.contact_id : undefined;
        const contact = 'contact' in member ? (member as any).contact : undefined;
        const id = member.id;
        
        return {
          ...member,
          uniqueId: `${id}-${contactId || contact || 'unknown'}`
        };
      });
    }, [listMembers]);
    
    // Add members mutation
    const addMembersMutation = useAddMembersToList(tenant);
    
    // Remove members mutation
    const removeMembersMutation = useRemoveMembersFromList(tenant);
    
    // Handle search change
    const handleMemberSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setMemberSearchTerm(event.target.value);
      setMemberPage(1); // Reset to first page on new search
    };
    
    // Handle pagination change
    const handleMemberPaginationModelChange = (model: { page: number, pageSize: number }) => {
      setMemberPage(model.page + 1); // API uses 1-based indexing
      setMemberPageSize(model.pageSize);
    };
    
    // Handle add members
    const handleAddMembers = () => {
      // Toggle the file upload section
      setShowUploadSection(!showUploadSection);
      // Reset state when opening the upload section
      if (!showUploadSection) {
        setFiles([]);
        setUploadError(null);
        setUploadResults(null);
      }
    };
    
    // Handle file drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Handle file drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setUploadError(null);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        validateAndSetFiles(droppedFiles);
      }
    };
    
    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null);
      
      if (e.target.files && e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files);
        validateAndSetFiles(selectedFiles);
      }
    };
    
    // Validate files and set state
    const validateAndSetFiles = (filesToValidate: File[]) => {
      const validFiles: File[] = [];
      let errors: string[] = [];
      
      filesToValidate.forEach(file => {
        // Check file type
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !['csv', 'xlsx', 'xls'].includes(fileExt)) {
          errors.push(`Invalid file type: ${file.name}. Only CSV and Excel files are supported.`);
          return;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`File too large: ${file.name}. Maximum size is 5MB.`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (errors.length > 0) {
        setUploadError(errors.join('\n'));
      } else {
        // Append to existing files for multiple file support
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
      }
    };
    
    // Handle file upload
    const handleUpload = async () => {
      if (files.length === 0) {
        setUploadError('Please select at least one file to upload.');
        return;
      }
      
      setIsUploading(true);
      setUploadError(null);
      setUploadResults(null);
      
      try {
        // Track overall results
        let totalCreated = 0;
        let totalExisting = 0;
        let totalAddedToList = 0;
        let totalAlreadyInList = 0;
        let totalErrors = 0;
        
        // Upload each file sequentially
        for (const file of files) {
          const result = await uploadContactsMutation.mutateAsync({ listId, file });
          
          // Accumulate results
          totalCreated += result.created_count || 0;
          totalExisting += result.existing_count || 0;
          totalAddedToList += result.added_to_list || 0;
          totalAlreadyInList += result.already_in_list || 0;
          totalErrors += result.error_count || 0;
        }
        
        // Store combined results
        setUploadResults({
          created_count: totalCreated,
          existing_count: totalExisting,
          added_to_list: totalAddedToList,
          already_in_list: totalAlreadyInList,
          error_count: totalErrors
        });
        
        // Clear files after successful upload
        setFiles([]);
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Successfully processed ${files.length} file(s)`,
          severity: 'success',
        });
      } catch (error) {
        setUploadError(`Failed to upload contacts: ${(error as Error)?.message || 'Unknown error'}`);
      } finally {
        setIsUploading(false);
      }
    };
    
    // Handle file removal
    const handleRemoveFile = (index: number) => {
      setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };
    
    // UI for file upload section
    const renderFileUploadSection = () => {
      if (!showUploadSection) return null;
      
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="h6">Upload Contacts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload CSV or Excel files with contacts to add to this list. You can select multiple files.
          </Typography>
          
          {/* Drag and drop area */}
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: 'background.paper',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              multiple // Allow multiple file selection
            />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Drag and drop files here or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </Typography>
          </Box>
          
          {/* Selected files */}
          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Selected Files ({files.length}):</Typography>
              {files.map((file, index) => (
                <Box
                  key={`${file.name}-${index}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    border: '1px solid #eee',
                    borderRadius: 1,
                    mt: 1,
                  }}
                >
                  <Typography variant="body2">{file.name}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    aria-label="remove file"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Upload results */}
          {uploadResults && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Results:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>{uploadResults.created_count} new contacts created</li>
                <li>{uploadResults.existing_count} existing contacts found</li>
                <li>{uploadResults.added_to_list} contacts added to the list</li>
                <li>{uploadResults.already_in_list} contacts were already in the list</li>
                {uploadResults.error_count > 0 && (
                  <li>{uploadResults.error_count} contacts had errors</li>
                )}
              </ul>
            </Alert>
          )}
          
          {/* Error message */}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
          
          {/* Upload button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setDrawerMode('create');
                  setCurrentList(null);
                  setDrawerOpen(true);
                }}
              >
                Create List
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CloudUploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Contacts
              </Button>
            </Box>
            <Button
              variant="outlined"
              onClick={() => {
                setShowUploadSection(false);
                setFiles([]);
                setUploadError(null);
                setUploadResults(null);
              }}
              sx={{ mr: 1 }}
              disabled={isUploading}
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
              startIcon={isUploading ? <CircularProgress size={20} /> : null}
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </Button>
          </Box>
        </Box>
      );
    };
    
    // Handle remove member
    const handleRemoveMember = (contactId: number) => {
      if (confirm('Are you sure you want to remove this member from the list?')) {
        removeMembersMutation.mutate({ 
          listId, 
          contactIds: [contactId] 
        }, {
          onSuccess: () => {
            setSnackbar({
              open: true,
              message: 'Member removed successfully',
              severity: 'success',
            });
          },
          onError: (error) => {
            setSnackbar({
              open: true,
              message: `Failed to remove member: ${(error as Error)?.message || 'Unknown error'}`,
              severity: 'error',
            });
          }
        });
      }
    };
    
    // Define columns for the data grid
    const memberColumns: GridColDef[] = [
      { 
        field: 'contact_name', 
        headerName: 'Name', 
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2">
            {params.value || 'No Name'}
          </Typography>
        )
      },
      { 
        field: 'contact_email', 
        headerName: 'Email', 
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2">
            {params.value || 'No Email'}
          </Typography>
        )
      },
      { 
        field: 'contact_phone', 
        headerName: 'Phone', 
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2">
            {params.value || 'No Phone'}
          </Typography>
        )
      },
      { 
        field: 'subscribed_at', 
        headerName: 'Subscribed At', 
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2">
            {params.value ? new Date(params.value).toLocaleString() : 'Unknown'}
          </Typography>
        )
      },
      
    ];
    
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search members..."
            value={memberSearchTerm}
            onChange={handleMemberSearchChange}
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
          <Button
            variant="contained"
            color="primary"
            startIcon={showUploadSection ? <PeopleIcon /> : <AddIcon />}
            onClick={handleAddMembers}
            disabled={addMembersMutation.isPending || isUploading}
          >
            {showUploadSection ? 'Cancel Upload' : 'Add Members'}
          </Button>
        </Box>
        
        {renderFileUploadSection()}
        
        {false ? ( // Replace isMembersLoading with false for now
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : false ? ( // Replace isMembersError with false for now
          <Box sx={{ p: 2 }}>
            <Typography color="error">
              Error loading members: Unknown error
            </Typography>
          </Box>
        ) : listMembers?.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              This list has no members yet. Add members by clicking the "Add Members" button.
            </Typography>
          </Box>
        ) : (
          <CustomDataGrid
            rows={processedMemberRows}
            columns={memberColumns}
            paginationModel={{ page: memberPage - 1, pageSize: memberPageSize }}
            onPaginationModelChange={handleMemberPaginationModelChange}
            pageSizeOptions={[5, 10, 25]}
            rowCount={listMembers?.length || 0}
            loading={false} // Replace isMembersLoading with false for now
            disableRowSelectionOnClick
            getRowId={(row) => row.uniqueId}
          />
        )}
      </Box>
    );
  };
  
  // State for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Fetch lists data
  const { 
    data: listsData, 
    isLoading, 
    isError, 
    error 
  } = useGetLists(tenant, page + 1, debouncedSearchTerm, false); // Initially hide internal lists
  
  // Mutations for list operations
  const createListMutation = useCreateList(tenant);
  const updateListMutation = useUpdateList(tenant);
  const deleteListMutation = useDeleteList(tenant);
  
  // Download list mutation
  const downloadListMutation = useDownloadList(tenant);
  const uploadContactsMutation = useUploadContactsToList(tenant);
  const createListWithFileMutation = useCreateListWithFile(tenant);

  // Handle pagination change
  const handlePaginationModelChange = (model: { page: number, pageSize: number }) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, listId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedListId(listId);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle filter change
  const handleFilterChange = (filters: any) => {
    console.log('Filters changed:', filters);
    // Handle filter changes here
  };

  // Handle create list
  const handleCreateList = () => {
    setDrawerMode('create');
    setCurrentList(null);
    setDrawerOpen(true);
  };

  // Handle edit list
  const handleEditList = () => {
    if (selectedListId) {
      const list = listsData?.results.find(list => list.id === selectedListId);
      if (list) {
        setCurrentList(list);
        setDrawerMode('edit');
        setDrawerOpen(true);
      }
    }
    handleMenuClose();
  };

  // Handle view list details
  const handleViewList = () => {
    if (selectedListId) {
      const list = listsData?.results.find(list => list.id === selectedListId);
      if (list) {
        setCurrentList(list);
        setDrawerMode('view');
        setDrawerOpen(true);
      }
    }
    handleMenuClose();
  };
  
  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // Handle view list members
  const handleViewMembers = () => {
    if (selectedListId) {
      // Navigate to the dedicated members page instead of opening a drawer
      router.push(`/${tenant}/Crm/engagement/lists/${selectedListId}/members`);
    }
    handleMenuClose();
  };

  // Handle manage criteria
  const handleManageCriteria = () => {
    if (selectedListId) {
      router.push(`/${tenant}/Crm/engagement/lists/${selectedListId}/criteria`);
    }
    handleMenuClose();
  };

  // Handle download list
  const handleDownloadList = () => {
    if (selectedListId) {
      setIsDownloading(true);
      downloadListMutation.mutate(selectedListId, {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: 'List downloaded successfully',
            severity: 'success',
          });
          setIsDownloading(false);
        },
        onError: (error) => {
          setSnackbar({
            open: true,
            message: `Failed to download list: ${(error as Error)?.message || 'Unknown error'}`,
            severity: 'error',
          });
          setIsDownloading(false);
        }
      });
    }
    handleMenuClose();
  };

  // Handle delete click
  const handleDeleteClick = () => {
    if (selectedListId) {
      const list = listsData?.results.find(list => list.id === selectedListId);
      if (list) {
        setSelectedListForDelete(list);
        setDeleteDialogOpen(true);
      }
    }
    handleMenuClose();
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (selectedListForDelete) {
      try {
        await deleteListMutation.mutateAsync(selectedListForDelete.id);
        setDeleteDialogOpen(false);
        setSelectedListForDelete(null);
        setSnackbar({
          open: true,
          message: `List "${selectedListForDelete.name}" deleted successfully!`,
          severity: 'success',
        });
      } catch (error) {
        console.error('Error deleting list:', error);
        setSnackbar({
          open: true,
          message: `Failed to delete list: ${(error as Error)?.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    }
  };
  
  // Handle direct save button click
  const handleSaveButtonClick = async () => {
    try {
      // Get name input element
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
      const listTypeSelect = document.querySelector('select[name="list_type"]') as HTMLSelectElement;
      
      if (!nameInput) {
        console.error('Name input not found');
        return;
      }
      
      // Extract current form data
      const formData = {
        name: nameInput.value,
        description: descriptionTextarea?.value || '',
        list_type: (listTypeSelect?.value as ListType) || 'STATIC',
        initial_contacts: [] as number[]
      };
      
      // Add selected contacts if available
      formData.initial_contacts = window.selectedContactsForList || [];
      
      // Validate the form data
      if (!formData.name) {
        setSnackbar({
          open: true,
          message: 'Please enter a name for the list',
          severity: 'error',
        });
        return;
      }
      
      console.log('Submitting form with direct data:', formData);
      
      if (drawerMode === 'edit' && currentList) {
        // Update existing list
        await updateListMutation.mutateAsync({ 
          listId: currentList.id, 
          data: formData
        });
        setSnackbar({
          open: true,
          message: `List "${formData.name}" updated successfully!`,
          severity: 'success',
        });
        setDrawerOpen(false);
      } else if (drawerMode === 'create') {
        // Check if there are files to upload
        const fileInput = document.getElementById('list-file-input') as HTMLInputElement;
        
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          // We have files to upload - use the combined endpoint
          try {
            console.log('Creating list with file upload in one operation');
            // Use the first file for now (we'll handle multiple files later if needed)
            const file = fileInput.files[0];
            
            // Use the new createListWithFile endpoint
            const result = await createListWithFileMutation.mutateAsync({
              name: formData.name,
              description: formData.description,
              listType: formData.list_type,
              file: file
            });
            
            console.log('List created with file successfully:', result);
            
            setSnackbar({
              open: true,
              message: `List "${formData.name}" created with ${result.added_to_list} contacts successfully!`,
              severity: 'success',
            });
          } catch (error) {
            console.error('Error creating list with file:', error);
            setSnackbar({
              open: true,
              message: `Failed to create list with file: ${(error as Error)?.message || 'Unknown error'}`,
              severity: 'error',
            });
          }
        } else {
          // No file selected, create list normally
          console.log('Creating new list with direct data:', formData);
          try {
            const result = await createListMutation.mutateAsync(formData);
            console.log('List created successfully:', result);
            
            // Show success message for list creation
            setSnackbar({
              open: true,
              message: `List "${formData.name}" created successfully!`,
              severity: 'success',
            });
          } catch (error) {
            console.error('Error creating list:', error);
            setSnackbar({
              open: true,
              message: `Failed to create list: ${(error as Error)?.message || 'Unknown error'}`,
              severity: 'error',
            });
          }
        }
        setDrawerOpen(false);
      }
    } catch (error) {
      console.error('Error saving list:', error);
      setSnackbar({
        open: true,
        message: `Failed to save list: ${(error as Error)?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };
  
  // Original form submission handler (for reference)
  const handleFormSubmit: SubmitHandler<ListFormData> = async (data) => {
    try {
      console.log('Original form submit handler called with data:', data);
      if (drawerMode === 'edit' && currentList) {
        // Update existing list
        await updateListMutation.mutateAsync({ 
          listId: currentList.id, 
          data 
        });
        setSnackbar({
          open: true,
          message: `List "${data.name}" updated successfully!`,
          severity: 'success',
        });
      } else if (drawerMode === 'create') {
        // Create new list
        console.log('Creating new list with data:', data);
        const result = await createListMutation.mutateAsync(data);
        console.log('List created successfully:', result);
        setSnackbar({
          open: true,
          message: `List "${data.name}" created successfully!`,
          severity: 'success',
        });
      }
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error saving list:', error);
      setSnackbar({
        open: true,
        message: `Failed to save list: ${(error as Error)?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Define columns for the data grid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'list_type',
      headerName: 'Type',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value === 'STATIC' ? 'Static' : 'Dynamic Segment'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ),
    },
    // {
    //   field: 'actions',
    //   headerName: 'Actions',
    //   width: 100,
    //   sortable: false,
    //   filterable: false,
    //   renderCell: (params) => (
    //     <IconButton
    //       onClick={(e) => handleMenuOpen(e, params.row.id)}
    //       size="small"
    //     >
    //       <MoreVertIcon />
    //     </IconButton>
    //   ),
    // },
  ];

  // Filter options for the content card
  const filterOptions = [
    {
      field: 'list_type',
      label: 'List Type',
      type: 'select' as const,
      options: [
        { value: 'STATIC', label: 'Static' },
        { value: 'DYNAMIC_SEGMENT', label: 'Dynamic Segment' },
      ],
    },
    {
      field: 'is_internal_generated',
      label: 'Internal Generated',
      type: 'boolean' as const,
    },
  ];

  // Tab options for the content card
  const tabOptions = [
    { value: 'all', label: 'All Lists', count: listsData?.count || 0 },
    { 
      value: 'static', 
      label: 'Static Lists', 
      count: listsData?.results.filter(list => list.list_type === 'STATIC').length || 0 
    },
    { 
      value: 'dynamic', 
      label: 'Dynamic Lists', 
      count: listsData?.results.filter(list => list.list_type === 'DYNAMIC_SEGMENT').length || 0 
    },
  ];
  
  // Make selectedContacts globally accessible for direct form submission
  useEffect(() => {
    // Initialize the global variable for contacts
    window.selectedContactsForList = [];
    
    return () => {
      // Clean up when component unmounts
      window.selectedContactsForList = [];
    };
  }, []);
  
  // Form component for creating/editing lists
  const ListForm = () => {
    // State for contacts search and selection
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [contactPage, setContactPage] = useState(1);
    const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
    const debouncedContactSearch = useDebounce(contactSearchTerm, 500);
    
    // State for file upload
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // Fetch contacts for selection
    const { data: contactsData, isLoading: isLoadingContacts } = useGetContacts(
      tenant,
      contactPage,
      debouncedContactSearch
    );
    
    // Upload contacts mutation
    const uploadContactsMutation = useUploadContactsToList(tenant);
    
    // Fetch form validation with react-hook-form and zod
    const { control, handleSubmit, formState: { errors }, reset, watch, getValues } = useForm<ListFormData>({
      resolver: zodResolver(listFormSchema),
      defaultValues: drawerMode === 'edit' && currentList
        ? {
            name: currentList.name,
            description: currentList.description || '',
            list_type: currentList.list_type,
            initial_contacts: [],
          }
        : {
            name: '',
            description: '',
            list_type: 'STATIC' as ListType,
            initial_contacts: [],
          }
    });

    // Update form when currentList changes
    React.useEffect(() => {
      if ((drawerMode === 'edit' || drawerMode === 'view') && currentList) {
        reset({
          name: currentList.name,
          description: currentList.description || '',
          list_type: currentList.list_type,
          initial_contacts: [],
        });
        setSelectedContacts([]);
      } else if (drawerMode === 'create') {
        reset({
          name: '',
          description: '',
          list_type: 'STATIC' as ListType,
          initial_contacts: [],
        });
        setSelectedContacts([]);
      }
    }, [currentList, drawerMode, reset]);

    // This will be called directly from the parent component
    React.useEffect(() => {
      // Assign the submit function to the parent component's ref
      formRef.current.submitForm = async () => {
        console.log('Direct form submission triggered');
        // Get the current form values
        const currentValues = getValues();
        console.log('Current form values:', currentValues);
        
        // Create the submission data with selected contacts
        const submissionData = {
          ...currentValues,
          initial_contacts: selectedContacts
        };
        
        console.log('Submitting with data:', submissionData);
        
        try {
          // First create the list
          const createdList = await createListMutation.mutateAsync(submissionData);
          console.log('List created successfully:', createdList);
          
          // If we have files to upload, upload them to the newly created list
          if (showFileUpload && files.length > 0) {
            setIsUploading(true);
            
            try {
              // Upload each file sequentially
              for (const file of files) {
                await uploadContactsMutation.mutateAsync({ listId: createdList.id, file });
              }
              
              setSnackbar({
                open: true,
                message: `List "${createdList.name}" created and contacts uploaded successfully!`,
                severity: 'success',
              });
            } catch (uploadError) {
              console.error('Error uploading contacts:', uploadError);
              setSnackbar({
                open: true,
                message: `List created but failed to upload contacts: ${(uploadError as Error)?.message || 'Unknown error'}`,
                severity: 'warning',
              });
            } finally {
              setIsUploading(false);
            }
          } else {
            // Just show success message for list creation
            setSnackbar({
              open: true,
              message: `List "${createdList.name}" created successfully!`,
              severity: 'success',
            });
          }
          
          // Close the drawer
          setDrawerOpen(false);
        } catch (error) {
          console.error('Error creating list:', error);
          setSnackbar({
            open: true,
            message: `Failed to create list: ${(error as Error)?.message || 'Unknown error'}`,
            severity: 'error',
          });
        }
      };
    }, [getValues, selectedContacts, showFileUpload, files, createListMutation, uploadContactsMutation]);

    // Handle contact selection
    const handleContactSelect = (contactId: number) => {
      setSelectedContacts(prev => {
        let newContacts;
        if (prev.includes(contactId)) {
          newContacts = prev.filter(id => id !== contactId);
        } else {
          newContacts = [...prev, contactId];
        }
        
        // Update the global reference for direct form submission
        window.selectedContactsForList = newContacts;
        
        return newContacts;
      });
    };
    
    // Handle contact search
    const handleContactSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setContactSearchTerm(event.target.value);
      setContactPage(1); // Reset to first page on new search
    };
    
    // Handle file drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Handle file drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setUploadError(null);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        validateAndSetFiles(droppedFiles);
      }
    };
    
    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null);
      
      if (e.target.files && e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files);
        validateAndSetFiles(selectedFiles);
      }
    };
    
    // Validate files and set state
    const validateAndSetFiles = (filesToValidate: File[]) => {
      const validFiles: File[] = [];
      let errors: string[] = [];
      
      filesToValidate.forEach(file => {
        // Check file type
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !['csv', 'xlsx', 'xls'].includes(fileExt)) {
          errors.push(`Invalid file type: ${file.name}. Only CSV and Excel files are supported.`);
          return;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`File too large: ${file.name}. Maximum size is 5MB.`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (errors.length > 0) {
        setUploadError(errors.join('\n'));
      } else {
        setFiles(validFiles);
      }
    };
    
    // Handle file removal
    const handleRemoveFile = (index: number) => {
      setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };
    
    // This is only used for the HTML form submission, which we're not using
    const onSubmit = (data: ListFormData) => {
      // Add selected contacts to the form data
      const formData = {
        ...data,
        initial_contacts: selectedContacts
      };
      console.log('HTML form submitted with data:', formData);
      handleFormSubmit(formData);
    };

    return (
      <Box component="form" onSubmit={(e) => {
        e.preventDefault();
        console.log('Form submitted via onSubmit');
        handleSubmit(onSubmit)();
      }} noValidate sx={{ mt: 2 }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="List Name"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                autoFocus
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                fullWidth
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name="list_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.list_type}>
                <InputLabel id="list-type-label">List Type</InputLabel>
                <Select
                  {...field}
                  labelId="list-type-label"
                  label="List Type"
                  disabled={drawerMode === 'edit' || drawerMode === 'view'} // Can't change list type after creation
                >
                  <SelectMenuItem value="STATIC">Static List</SelectMenuItem>
                  <SelectMenuItem value="DYNAMIC_SEGMENT">Dynamic Segment</SelectMenuItem>
                </Select>
              </FormControl>
            )}
          />
          
          {/* Only show contact selection for STATIC lists during creation */}
          {watch('list_type') === 'STATIC' && drawerMode === 'create' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Add Contacts to List
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowFileUpload(false)}
                  sx={{ flex: 1 }}
                  startIcon={<PeopleIcon />}
                >
                  Select Contacts
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setShowFileUpload(true)}
                  sx={{ flex: 1 }}
                  startIcon={<AddIcon />}
                >
                  Upload Contacts
                </Button>
              </Box>
              {!showFileUpload ? (
                <TextField
                  fullWidth
                  placeholder="Search contacts..."
                  value={contactSearchTerm}
                  onChange={handleContactSearchChange}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              ) : (
                <Box sx={{ mb: 3 }}>
                  <CustomerUploadDialog
                    open={true}
                    embedded={true}
                    onClose={(refresh) => {
                      setShowFileUpload(false);
                      if (refresh) {
                        // Refresh the list data after successful upload
                        queryClient.invalidateQueries({ queryKey: ['lists', tenant] });
                        setSnackbar({
                          open: true,
                          message: 'Contacts uploaded successfully!',
                          severity: 'success',
                        });
                      }
                    }}
                    title="Upload Contacts to List"
                    templateUrl={`/api/${tenant}/marketing/contacts/download_template/`}
                    validateEndpoint={`/api/${tenant}/marketing/contacts/validate_upload/`}
                    processEndpoint={`/api/${tenant}/marketing/lists/create_with_file/`}
                    type="lists"
                    customUploadHandler={(file, formData) => {
                      // Add list name and description to the form data
                      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
                      const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
                      const listTypeSelect = document.querySelector('select[name="list_type"]') as HTMLSelectElement;
                      
                      const listName = nameInput?.value || `Contact List ${new Date().toLocaleDateString()}`;
                      const listDescription = descriptionTextarea?.value || 'Created from file upload';
                      const listType = listTypeSelect?.value || 'STATIC';
                      
                      // Use our createListWithFile mutation
                      return createListWithFileMutation.mutateAsync({
                        name: listName,
                        description: listDescription,
                        listType: listType,
                        file: file
                      });
                    }}
                  />
                </Box>
              )}
              
              {selectedContacts.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Contacts: {selectedContacts.length}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedContacts.map(contactId => {
                      const contact = contactsData?.results.find(c => c.id === contactId) || 
                                    { id: contactId, email_address: `Contact #${contactId}` };
                      return (
                        <Chip 
                          key={contact.id}
                          label={contact.email_address || `Contact #${contact.id}`}
                          onDelete={() => handleContactSelect(contact.id)}
                          color="primary"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
              
              <Box sx={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {isLoadingContacts ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : contactsData?.results.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2">No contacts found</Typography>
                  </Box>
                ) : (
                  <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                    {contactsData?.results.map(contact => (
                      <Box 
                        component="li" 
                        key={contact.id}
                        sx={{ 
                          p: 1.5, 
                          borderBottom: '1px solid #eee',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f5f5f5' },
                          bgcolor: selectedContacts.includes(contact.id) ? '#e3f2fd' : 'transparent',
                        }}
                        onClick={() => handleContactSelect(contact.id)}
                      >
                        <Checkbox 
                          checked={selectedContacts.includes(contact.id)} 
                          onChange={() => {}} // Handled by the parent click
                          size="small"
                        />
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {contact.email_address || 'No Email'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {contact.first_name && contact.last_name ? 
                              `${contact.first_name} ${contact.last_name}` : 'No Name'}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
              
              {contactsData && contactsData.count > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="caption">
                    Showing {contactsData.results.length} of {contactsData.count} contacts
                  </Typography>
                  <Box>
                    <Button 
                      disabled={contactPage === 1}
                      onClick={() => setContactPage(prev => Math.max(prev - 1, 1))}
                      size="small"
                    >
                      Previous
                    </Button>
                    <Button 
                      disabled={!contactsData.next}
                      onClick={() => setContactPage(prev => prev + 1)}
                      size="small"
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Return the main component UI
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, mt: 0, pb: 0 }}>
        <Typography variant="h4" component="h1">
          Marketing Lists
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
        
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateList}
            sx={{ 
              bgcolor: '#f5821f', 
              '&:hover': { bgcolor: '#e67812' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
          >
            Create List
          </Button>
        </Box>
      </Box>

      <ContentCard
        onSearch={setSearchTerm}
        filterOptions={filterOptions}
        tabOptions={tabOptions}
        onFilterChange={handleFilterChange}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading lists...</Typography>
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Error loading lists: {(error as Error)?.message || 'Unknown error'}
          </Alert>
        ) : (
          <CustomDataGrid
            rows={listsData?.results || []}
            columns={columns}
            paginationModel={{
              page,
              pageSize,
            }}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[5, 10, 25, 50]}
            rowCount={listsData?.count || 0}
            loading={isLoading || deleteListMutation.isPending}
            paginationMode="server"
            autoHeight
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            onRowClick={(params) => {
              const list = listsData?.results.find(list => list.id === params.id);
              if (list) {
                setCurrentList(list);
                setSelectedListId(list.id);
                setDrawerMode('view');
                setDrawerOpen(true);
              }
            }}
            customStyles={{
              row: {
                cursor: 'pointer'
              }
            }}
          />
        )}
      </ContentCard>

      {/* Action Menu */}
      <Menu
        id="list-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewList}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleEditList}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleViewMembers}>
          <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
          View Members
        </MenuItem>
        <MenuItem onClick={handleDownloadList} disabled={isDownloading}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          {isDownloading ? 'Downloading...' : 'Download'}
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete List"
        content={`Are you sure you want to delete the list "${selectedListForDelete?.name || ''}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleteListMutation.isPending}
        confirmText="Delete"
      />
      
      {/* Customer Upload Dialog for creating list with file */}
      <CustomerUploadDialog
        open={uploadDialogOpen}
        onClose={(refresh) => {
          setUploadDialogOpen(false);
          if (refresh) {
            // Refresh the list data
            queryClient.invalidateQueries({ queryKey: ['lists', tenant] });
          }
        }}
        title="Create List with Contacts"
        templateUrl={`/api/${tenant}/marketing/contacts/download_template/`}
        validateEndpoint={`/api/${tenant}/marketing/contacts/validate-upload/`}
        processEndpoint={`/api/${tenant}/marketing/lists/create-with-file/`}
        type="lists"
        customUploadHandler={(file, formData) => {
          // Add list name and description to the form data
          const listName = formData.get('name') || `Contact List ${new Date().toLocaleDateString()}`;
          const listDescription = formData.get('description') || 'Created from file upload';
          const listType = formData.get('listType') || 'STATIC';
          
          // Use our createListWithFile mutation
          return createListWithFileMutation.mutateAsync({
            name: listName as string,
            description: listDescription as string,
            listType: listType as string,
            file: file
          });
        }}
      /> 

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* List Form Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={
          drawerMode === 'create' ? 'Create List' :
          drawerMode === 'edit' ? 'Edit List' :
          drawerMode === 'view' ? 'View List' :
          'List Members'
        }
        onSave={drawerMode === 'create' || drawerMode === 'edit' ? () => {
          console.log('Save button clicked - using direct submission');
          // Call the direct save handler instead of using form ref
          handleSaveButtonClick();
        } : undefined}
        saveDisabled={createListMutation.isPending || updateListMutation.isPending}
        sidebarIcons={
          drawerMode !== 'create' ? [
            {
              id: 'view',
              icon: <VisibilityIcon />,
              tooltip: 'View List',
              onClick: () => {
                setDrawerMode('view');
              }
            },
            {
              id: 'edit',
              icon: <EditIcon />,
              tooltip: 'Edit List',
              onClick: () => {
                setDrawerMode('edit');
              }
            },
            {
              id: 'delete',
              icon: <DeleteIcon />,
              tooltip: 'Delete List',
              onClick: () => {
                if (currentList) {
                  setSelectedListForDelete(currentList);
                  setDeleteDialogOpen(true);
                  setDrawerOpen(false);
                }
              }
            },
            {
              id: 'members',
              icon: <PeopleIcon />,
              tooltip: 'View Members',
              onClick: () => {
                if (currentList) {
                  // Navigate to the dedicated members page instead of opening a drawer mode
                  router.push(`/${tenant}/Crm/engagement/lists/${currentList.id}/members`);
                }
              }
            },
            {
              id: 'download',
              icon: <DownloadIcon />,
              tooltip: 'Download List',
              onClick: () => {
                if (currentList) {
                  setIsDownloading(true);
                  downloadListMutation.mutate(currentList.id, {
                    onSuccess: () => {
                      setSnackbar({
                        open: true,
                        message: 'List downloaded successfully',
                        severity: 'success',
                      });
                      setIsDownloading(false);
                    },
                    onError: (error) => {
                      setSnackbar({
                        open: true,
                        message: `Failed to download list: ${(error as Error)?.message || 'Unknown error'}`,
                        severity: 'error',
                      });
                      setIsDownloading(false);
                    }
                  });
                }
              }
            }
          ] : []
        }
      >
        {drawerMode === 'members' && currentList ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Members of {currentList.name}</Typography>
            <ListMembersView listId={currentList.id} />
          </Box>
        ) : drawerMode === 'view' ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>List Details</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Name</Typography>
              <Typography variant="body1">{currentList?.name}</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Description</Typography>
              <Typography variant="body1">{currentList?.description || 'No description'}</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Type</Typography>
              <Typography variant="body1">
                {currentList?.list_type === 'STATIC' ? 'Static List' : 'Dynamic Segment'}
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Created At</Typography>
              <Typography variant="body1">
                {currentList?.created_at ? new Date(currentList.created_at).toLocaleString() : 'Unknown'}
              </Typography>
            </Box>

          </Box>
        ) : (
          <ListForm />
        )}
      </AnimatedDrawer>
    </>
  );
}

// Wrap the ListsPage with DrawerProvider to provide drawer context
export default function Page() {
  return (
    <DrawerProvider>
      <ListsPage />
    </DrawerProvider>
  );
}
