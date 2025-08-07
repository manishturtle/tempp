'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Tooltip
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useParams } from 'next/navigation';
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { COCKPIT_API_BASE_URL } from '@/utils/constants';


interface Geofence {
  id: number;
  name: string;
  description: string;
  geometry_type: string;
  address: string;
  radius?: number;
  is_active: boolean;
  created_at: string;
}

const GeoFencingPage = () => {
  const router = useRouter();
  const tenantSlug = useParams().tenant;
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeofences = async () => {
      console.log("pppp:",tenantSlug);
      setLoading(true);
      try {
        const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/`, {
          headers: {
            ...getAuthHeaders(),
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch geofences');
        }

        const data = await response.json();
        setGeofences(data.results || data);
      } catch (err) {
        console.error('Error fetching geofences:', err);
        setError('Failed to load geofences. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGeofences();
  }, [tenantSlug]);

  const handleAddNew = () => {
    router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching/add`);
  };

  const handleEdit = (id: number) => {
    router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching/edit/${id}?mode=edit`);
  };

  const handleView = (id: number) => {
    router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching/edit/${id}?mode=view`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      try {
        const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/${id}/`, {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders(),
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete geofence');
        }

        // Remove the deleted geofence from the state
        setGeofences(geofences.filter(geofence => geofence.id !== id));
      } catch (err) {
        console.error('Error deleting geofence:', err);
        alert('Failed to delete geofence. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">Geofences</Typography>
          <Box>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => router.back()}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              Add New Geofence
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>Loading geofences...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Header with back button and page title */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">Geofences</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            sx={{ ml: 1 }}
          >
            Add New Geofence
          </Button>
        </Box>
      </Box>

      {/* Error message */}
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Geofence list */}
      <Card>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Radius (m)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {geofences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Stack spacing={2} sx={{ py: 3 }}>
                        <Typography variant="body1">No geofences found.</Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={handleAddNew}
                          sx={{ alignSelf: 'center' }}
                        >
                          Create your first geofence
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  geofences.map((geofence) => (
                    <TableRow key={geofence.id}>
                      <TableCell component="th" scope="row">
                        {geofence.name}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={geofence.geometry_type} 
                          color={
                            geofence.geometry_type === 'CIRCLE' ? 'primary' : 
                            geofence.geometry_type === 'POLYGON' ? 'secondary' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{geofence.address}</TableCell>
                      <TableCell>{geofence.radius || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={geofence.is_active ? 'Active' : 'Inactive'} 
                          color={geofence.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(geofence.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="View">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleView(geofence.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleEdit(geofence.id)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(geofence.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
      </Card>
    </>
  );
};

export default GeoFencingPage;