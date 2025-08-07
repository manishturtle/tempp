'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Card, CardContent,
  Stack, Grid, ToggleButtonGroup, ToggleButton, Container, Slider,
  List, ListItemButton, ListItemText, Paper, CircularProgress,
  Chip, Switch, FormControlLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import LocationPicker from '../../../../../../components/TenantAdmin/map/LocationPicker';
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { COCKPIT_API_BASE_URL } from '@/utils/constants';


interface GeofenceDetail {
  id: number;
  name: string;
  description: string;
  geometry_type: string;
  point: {
    type: string;
    coordinates: number[];
  };
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
  radius?: number;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    username: string;
    email: string;
  };
}

// This is the main content of your page
const GeoFencingPageContent = () => {
  const router = useRouter();
  const isApiLoaded = useApiIsLoaded();
  const { tenant, id } = useParams();
  const tenantSlug = tenant;
  const searchParams = useSearchParams();
  
  // View/Edit mode from URL parameter
  const mode = searchParams.get('mode') || 'view';
  const isViewMode = mode === 'view';
  
  const [loading, setLoading] = useState(true);
  const [geofence, setGeofence] = useState<GeofenceDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [geofenceName, setGeofenceName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [shapeType, setShapeType] = useState('circle');
  const [radius, setRadius] = useState(0);
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const {
    ready,
    value: locationValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

  // Fetch geofence data on load
  useEffect(() => {
    const fetchGeofence = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/${id}/`, {
          headers: {
            ...getAuthHeaders(),
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch geofence details');
        }

        const data = await response.json();
        setGeofence(data);
        
        // Populate form fields with geofence data
        setGeofenceName(data.name);
        setDescription(data.description || '');
        setLatitude(data.point?.coordinates ? data.point.coordinates[1].toFixed(6) : '');
        setLongitude(data.point?.coordinates ? data.point.coordinates[0].toFixed(6) : '');
        setShapeType(data.geometry_type === 'CIRCLE' ? 'circle' : 'polygon');
        setRadius(data.radius || 100);
        setAddress(data.address || '');
        setValue(data.address || '', false);
        setIsActive(data.is_active);

      } catch (err) {
        console.error('Error fetching geofence details:', err);
        setFetchError('Failed to load geofence details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGeofence();
    }
  }, [id, tenantSlug, setValue]);

  // Handle location selection from places autocomplete
  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };
  
  // Handle location selection from map click
  const handleMapClick = (place: any) => {
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setValue(place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`, false);
    }
  };

  // Compute map center
  const mapCenter = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
  }, [latitude, longitude]);

  // Toggle between view and edit modes
  const toggleMode = () => {
    const newMode = isViewMode ? 'edit' : 'view';
    router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching/edit/${id}?mode=${newMode}`);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    // Validate form
    if (!geofenceName) {
      setError('Geofence name is required');
      setIsSubmitting(false);
      return;
    }
    
    if (!latitude || !longitude) {
      setError('Location coordinates are required');
      setIsSubmitting(false);
      return;
    }
    
    if (shapeType === 'circle' && (!radius || radius <= 0)) {
      setError('Radius must be greater than 0 for circle geofence');
      setIsSubmitting(false);
      return;
    }
    
    // Prepare payload based on shape type
    let payload: any = {
      name: geofenceName,
      description: description || '',
      address: address || locationValue,
      is_active: isActive
    };
    
    if (shapeType === 'circle') {
      payload = {
        ...payload,
        geometry_type: 'CIRCLE',
        point: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        radius: radius
      };
    } else if (shapeType === 'polygon') {
      // For polygon, you would need to collect polygon points
      // This is simplified - in reality you'd need to collect the polygon points from the map
      payload = {
        ...payload,
        geometry_type: 'POINT',
        point: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      };
    }
    
    try {
      // Make API call
      const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/${id}/`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update geofence');
      }
      
      const data = await response.json();
      setSuccessMessage('Geofence updated successfully!');
      setGeofence(data);
      
      // Return to view mode after successful update
      setTimeout(() => {
        router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching`);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating geofence');
      console.error('Error updating geofence:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading || !isApiLoaded) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>Loading geofence details...</Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (fetchError || !geofence) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">Geofence Details</Typography>
        </Box>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6">Error</Typography>
          <Typography variant="body1">{fetchError || 'Geofence not found'}</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching`)}>
            Back to Geofences
          </Button>
        </Paper>
      </Container>
    );
  }

  // Format dates for display
  const createdDate = new Date(geofence.created_at).toLocaleString();
  const updatedDate = new Date(geofence.updated_at).toLocaleString();

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" component="h1">
            {isViewMode ? 'Geofence Details' : 'Edit Geofence'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color={isViewMode ? "primary" : "secondary"}
          onClick={toggleMode}
        >
          {isViewMode ? 'Edit Geofence' : 'Cancel Edit'}
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          <Typography>{error}</Typography>
        </Box>
      )}
      
      {successMessage && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1 }}>
          <Typography>{successMessage}</Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 5, md: 5 }}>
          <Card>
            <CardContent>
              <Stack spacing={3} component="form" noValidate onSubmit={handleSubmit}>
                <TextField 
                  label="Geofence Name" 
                  fullWidth 
                  required 
                  value={geofenceName} 
                  onChange={(e) => setGeofenceName(e.target.value)}
                  InputProps={{
                    readOnly: isViewMode
                  }}
                />
                
                {/* Description field if needed */}
                
                <Box sx={{ position: 'relative' }}>
                  <TextField
                    label="Location"
                    fullWidth
                    required
                    value={locationValue}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready || isViewMode}
                    placeholder="Search for a location..."
                    InputProps={{
                      readOnly: isViewMode
                    }}
                  />
                  {status === 'OK' && !isViewMode && (
                    <Paper sx={{ position: 'absolute', zIndex: 100, width: '100%' }}>
                      <List>
                        {data.map(({ place_id, description }) => (
                          <ListItemButton key={place_id} onMouseDown={() => handleSelect(description)}>
                            <ListItemText primary={description} />
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Latitude"
                      fullWidth
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Longitude"
                      fullWidth
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
                
                <Box>
                  <Typography gutterBottom variant="subtitle2">Shape Type</Typography>
                  <ToggleButtonGroup 
                    value={shapeType} 
                    exclusive 
                    onChange={(_e, val) => !isViewMode && val && setShapeType(val)} 
                    fullWidth
                    disabled={isViewMode}
                  >
                    <ToggleButton value="circle">Circle</ToggleButton>
                    <ToggleButton value="polygon">Polygon</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box>
                  <Typography gutterBottom variant="subtitle2">Radius: {radius} meters</Typography>
                  <Slider 
                    value={radius} 
                    onChange={(_e, val) => setRadius(val as number)} 
                    step={10} 
                    min={0} 
                    max={2000} 
                    valueLabelDisplay="auto"
                    disabled={isViewMode}
                  />
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={isViewMode}
                    />
                  }
                  label="Active"
                />
                
                {!isViewMode && (
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Geofence'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 7, md: 7 }}>
          <Card sx={{ height: '600px', width: '100%' }}>
            <LocationPicker
              center={mapCenter}
              onLocationSelect={isViewMode ? undefined : handleMapClick}
              shapeType={shapeType}
              radius={radius}
            />
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

// This is the top-level component that provides the Google Maps API
const GeoFencingPage = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <Container><Typography color="error" sx={{ mt: 3 }}>API Key is missing.</Typography></Container>;
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <GeoFencingPageContent />
    </APIProvider>
  );
};

export default GeoFencingPage;