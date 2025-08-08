"use client";

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Link, 
  Chip, 
  IconButton, 
  Paper, 
  ToggleButtonGroup, 
  ToggleButton,
  Avatar,
  Tooltip
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import api from '@/lib/api';
import { TaskFormData } from './forms/TaskForm';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';

// Task summary data interface
interface TaskSummaryData {
  id: string | number;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string | Date;
  // Assignee in the backend
  owner?: {
    id: number;
    name: string;
    avatar?: string;
  };
  // Backend uses related_account and related_contact
  related_account?: {
    id: number;
    name: string;
  };
  related_contact?: {
    id: number;
    name: string;
  };
  // For backward compatibility
  account_id?: string | number;
  contact_id?: string | number;
  // Completion information
  completed_at?: string | Date;
  completed_by?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface TasksTabContentProps {
  accountId: string;
  openTaskDrawer: (initialData?: TaskFormData, accountId?: string, contactId?: string) => void;
}

/**
 * Tasks tab content component for displaying tasks associated with an account
 */
export const TasksTabContent = ({ 
  accountId, 
  openTaskDrawer 
}: TasksTabContentProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Fetch tasks based on status filter
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ['accountTasks', accountId, statusFilter],
    queryFn: async () => {
      // Use the correct API parameter for filtering by account
      let url = `/tasks/?related_account=${accountId}`;
      
      // Add status filter if needed
      if (statusFilter === 'open') {
        // The API doesn't support multiple values in a single parameter
        // So we'll fetch all tasks and filter client-side
      } else if (statusFilter === 'completed') {
        url += '&status=completed';
      }
      
      const response = await api.get(url, {
        headers: getAuthHeaders()
      });
      
      // If we're filtering for open tasks, filter the response client-side
      if (statusFilter === 'open' && Array.isArray(response.data)) {
        return response.data.filter(task => 
          ['not_started', 'in_progress', 'deferred'].includes(task.status)
        );
      }
      
      return response.data;
    },
    enabled: !!accountId
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete(`/tasks/${taskId}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate account tasks query to refresh data
      queryClient.invalidateQueries({ queryKey: ['accountTasks', accountId] });
    }
  });

  // Handle edit task
  const handleEdit = (task: TaskSummaryData) => {
    openTaskDrawer({
      ...task,
      id: String(task.id),
      due_date: task.due_date ? new Date(task.due_date) : null,
      completed_at: task.completed_at ? new Date(task.completed_at) : null,
      owner: task.owner?.id ? String(task.owner.id) : null,
      // Map the backend field names to our frontend field names
      account_id: task.related_account?.id ? String(task.related_account.id) : accountId,
      contact_id: task.related_contact?.id ? String(task.related_contact.id) : null,
      completed_by: task.completed_by?.id ? String(task.completed_by.id) : null
    } as TaskFormData, accountId);
  };

  // Handle delete task
  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setConfirmDialogOpen(true);
  };

  // Confirm delete task
  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setConfirmDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'open' | 'completed' | 'all') => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
    }
  };

  // Open tasks (filtered by status)
  const openTasks = tasksData?.results?.filter(
    (task: TaskSummaryData) => 
      statusFilter === 'all' || 
      (statusFilter === 'open' && task.status !== 'Completed') ||
      (statusFilter === 'completed' && task.status === 'Completed')
  ) || [];

  // Completed tasks
  const completedTasks = tasksData?.results?.filter(
    (task: TaskSummaryData) => task.status === 'Completed'
  ) || [];

  // Define columns for the open tasks data grid
  const openTasksColumns: GridColDef[] = [
    {
      field: 'subject',
      headerName: t('tasks.subject') || 'SUBJECT',
      flex: 1,
      renderCell: (params: any) => {
        if (!params || !params.row) return null;
        return (
          <Link 
            component="button"
            onClick={() => handleEdit(params.row)}
            sx={{ 
              textDecoration: 'none', 
              textAlign: 'left',
              color: 'primary.main',
              fontWeight: 500,
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {params.value || ''}
          </Link>
        );
      }
    },
    {
      field: 'owner',
      headerName: t('tasks.assignedTo') || 'ASSIGNEE',
      width: 150,
      renderCell: (params: any) => {
        if (!params || !params.row || !params.row.owner) return null;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Avatar 
              src={params.row.owner.avatar} 
              sx={{ width: 28, height: 28, mr: 1 }}
            >
              {params.row.owner?.name?.charAt(0) || ''}
            </Avatar>
            <Typography variant="body2">
              {params.row.owner.name}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'due_date',
      headerName: t('tasks.dueDate') || 'DUE DATE',
      width: 120,
      renderCell: (params: any) => {
        if (!params || !params.value) return null;
        const date = new Date(params.value);
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        }).format(date);
        
        // Determine if the task is overdue
        const isOverdue = date < new Date() && params.row.status !== 'completed';
        
        return (
          <Typography 
            variant="body2" 
            color={isOverdue ? 'error.main' : 'text.primary'}
            fontWeight={isOverdue ? 500 : 400}
            sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          >
            {formattedDate}
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: t('tasks.status') || 'STATUS',
      width: 120,
      renderCell: (params: any) => {
        if (!params) return null;
        
        let color = 'default';
        let label = '';
        
        switch (params.value) {
          case 'not_started':
            color = 'info';
            label = t('taskStatus.notStarted') || 'Not Started';
            break;
          case 'in_progress':
            color = 'warning';
            label = t('taskStatus.inProgress') || 'In Progress';
            break;
          case 'completed':
            color = 'success';
            label = t('taskStatus.completed') || 'Completed';
            break;
          case 'deferred':
            color = 'secondary';
            label = t('taskStatus.deferred') || 'Deferred';
            break;
          default:
            color = 'default';
            label = params.value || '';
        }
        
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Chip 
              label={label} 
              size="small"
              color={color as any}
              variant="outlined"
              sx={{ borderRadius: '16px' }}
            />
          </Box>
        );
      }
    },
    {
      field: 'priority',
      headerName: t('tasks.priority') || 'PRIORITY',
      width: 100,
      renderCell: (params: any) => {
        if (!params) return null;
        
        let color = 'default';
        let label = '';
        
        switch (params.value) {
          case 'high':
            color = 'error';
            label = t('priority.high') || 'High';
            break;
          case 'medium':
            color = 'warning';
            label = t('priority.medium') || 'Medium';
            break;
          case 'low':
            color = 'success';
            label = t('priority.low') || 'Low';
            break;
          case 'urgent':
            color = 'error';
            label = t('priority.urgent') || 'Urgent';
            break;
          default:
            color = 'default';
            label = params.value || '';
        }
        
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Chip 
              label={label} 
              size="small"
              color={color as any}
              variant="outlined"
              sx={{ borderRadius: '16px' }}
            />
          </Box>
        );
      }
    },
    {
      field: 'actions',
      headerName: t('tasks.actions') || 'ACTIONS',
      width: 80,
      renderCell: (params: any) => {
        if (!params || !params.row) return null;
        const row = params.row as TaskSummaryData;
        
        return (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              handleDelete(String(row.id));
            }}
            aria-label={t('tasks.deleteTask') || 'Delete Task'}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      }
    }
  ];

  // Define columns for the completed tasks data grid
  const completedTasksColumns: GridColDef[] = [
    {
      field: 'subject',
      headerName: t('tasks.subject') || 'SUBJECT',
      flex: 1,
      renderCell: (params: any) => {
        if (!params || !params.row) return null;
        return (
          <Link 
            component="button"
            onClick={() => handleEdit(params.row)}
            sx={{ 
              textDecoration: 'none', 
              textAlign: 'left',
              color: 'primary.main',
              fontWeight: 500,
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {params.value || ''}
          </Link>
        );
      }
    },
    {
      field: 'completed_by',
      headerName: t('tasks.completedBy') || 'COMPLETED BY',
      width: 150,
      renderCell: (params: any) => {
        if (!params || !params.row || !params.row.completed_by) return null;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Avatar 
              src={params.row.completed_by.avatar} 
              sx={{ width: 28, height: 28, mr: 1 }}
            >
              {params.row.completed_by?.name?.charAt(0) || ''}
            </Avatar>
            <Typography variant="body2">
              {params.row.completed_by.name}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'completed_at',
      headerName: t('tasks.completedAt') || 'COMPLETION DATE',
      width: 150,
      renderCell: (params: any) => {
        if (!params || !params.value) return null;
        const date = new Date(params.value);
        return (
          <Typography 
            variant="body2"
            sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          >
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric'
            }).format(date)}
          </Typography>
        );
      }
    },
    {
      field: 'actions',
      headerName: t('tasks.actions') || 'ACTIONS',
      width: 80,
      renderCell: (params: any) => {
        if (!params || !params.row) return null;
        const row = params.row as TaskSummaryData;
        
        return (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              handleEdit(row);
            }}
            aria-label={t('tasks.viewTask') || 'View Task'}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        );
      }
    }
  ];

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={500}>
          {statusFilter === 'completed' ? 
            (t('tasks.completedTasks') || 'Recently Completed Tasks') : 
            (t('tasks.openTasks') || 'Open Tasks')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusFilterChange}
            aria-label="task status filter"
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="open" aria-label="open tasks">
              {t('tasks.filterOpen') || 'Open'}
            </ToggleButton>
            <ToggleButton value="completed" aria-label="completed tasks">
              {t('tasks.filterCompleted') || 'Completed'}
            </ToggleButton>
            <ToggleButton value="all" aria-label="all tasks">
              {t('tasks.filterAll') || 'All'}
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button 
            variant="outlined" 
            color="primary"
            size="small" 
            startIcon={<AddIcon />}
            onClick={() => openTaskDrawer(undefined, accountId)}
            sx={{ borderRadius: '4px' }}
          >
            {t('tasks.newTask') || 'New Task'}
          </Button>
        </Box>
      </Box>

      {/* Tasks data grid */}
      <Box sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          <DataGrid
            rows={statusFilter === 'completed' ? completedTasks : openTasks}
            columns={statusFilter === 'completed' ? completedTasksColumns : openTasksColumns}
            getRowId={(row) => row.id}
            autoHeight
            onRowClick={(params) => {
              const task = params.row as TaskSummaryData;
              handleEdit(task);
            }}
            hideFooterPagination={openTasks.length <= 10}
            hideFooter={openTasks.length <= 10}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              '& .MuiDataGrid-cell': {
                py: 1.5,
                display: 'flex',
                alignItems: 'center'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.100',
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'uppercase'
                }
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
              },
              border: 'none'
            }}
            disableColumnMenu
          />
        </Paper>
      </Box>

      {/* Confirmation dialog for delete */}
      <ConfirmDialog
        open={confirmDialogOpen}
        title={t('Delete Task') || 'Delete Task'}
        content={t('Are you sure you want to delete this task? This action cannot be undone.') || 'Are you sure you want to delete this task? This action cannot be undone.'}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </Box>
  );
};

export default TasksTabContent;
