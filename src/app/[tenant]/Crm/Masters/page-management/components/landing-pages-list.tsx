'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format as formatDate } from 'date-fns';
import {
  useAdminLandingPages,
  useDeleteLandingPage,
  type LandingPage
} from '@/app/hooks/api/admin/landing-pages';

interface LandingPagesListProps {
  onEditClick: (page: LandingPage) => void;
}

export function LandingPagesList({ onEditClick }: LandingPagesListProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  
  // Use centralized API hooks
  const { data: paginatedData, isLoading, error } = useAdminLandingPages();
  const deleteMutation = useDeleteLandingPage();
  
  // Extract landing pages from paginated response
  const landingPages = paginatedData?.results || [];

  const handleRowClick = (page: LandingPage): void => {
    setSelectedRow(page.id);
    // Navigate to content block editor page
    router.push(`/${params.tenant}/Crm/Masters/page-management/content/${page.slug}`);
  };

  const handleEditClick = (page: LandingPage, e: React.MouseEvent): void => {
    e.stopPropagation();
    onEditClick(page);
  };

  const handleDeleteClick = (page: LandingPage, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (window.confirm(t('confirmations.deletePage'))) {
      deleteMutation.mutate(page.slug, {
        onSuccess: () => {
          // The query invalidation is already handled in the hook
          // You could add a toast notification here if you have a toast system
          console.log(`Page ${page.title} successfully deleted`);
        },
        onError: (error) => {
          console.error('Error deleting page:', error);
          // You could add an error toast notification here
        }
      });
    }
  };
  
  const handleViewClick = (page: LandingPage, e: React.MouseEvent): void => {
    e.stopPropagation();
    window.open(`/store/page/${page.slug}`, '_blank');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t('error.failedToLoadData')}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('landingPages.title')}</TableCell>
              <TableCell>{t('landingPages.slug')}</TableCell>
              <TableCell>{t('landingPages.status')}</TableCell>
              <TableCell>{t('landingPages.lastUpdated')}</TableCell>
              <TableCell align="right">{t('actions.label')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {landingPages && landingPages.length > 0 ? (
              landingPages.map((page) => (
                <TableRow
                  key={page.id}
                  hover
                  selected={selectedRow === page.id}
                  onClick={() => handleRowClick(page)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{page.title}</TableCell>
                  <TableCell>{page.slug}</TableCell>
                  <TableCell>
                    <Chip
                      label={page.is_active !== false ? t('status.active') : t('status.inactive')}
                      color={page.is_active !== false ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{page.updated_at ? formatDate(new Date(page.updated_at), 'MMM dd, yyyy') : '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('actions.view')}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleViewClick(page, e)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('actions.edit')}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleEditClick(page, e)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('actions.delete')}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteClick(page, e)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('landingPages.noPages')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('landingPages.createPagePrompt')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Pagination info */}
        {paginatedData && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('pagination.showing')} {paginatedData.results.length} {t('pagination.of')} {paginatedData.count} {t('pagination.items')}
            </Typography>
          </Box>
        )}
      </TableContainer>
    </Box>
  );
}