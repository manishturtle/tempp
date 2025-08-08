'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Card, CardContent,
  Stack, Grid, ToggleButtonGroup, ToggleButton, Container, Slider,
  List, ListItemButton, ListItemText, Paper, CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import LocationPicker from '../../../../../components/TenantAdmin/map/LocationPicker';
import { useParams } from 'next/navigation';
import CustomSnackbar from '@/app/components/common/CustomSnackbar';
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { COCKPIT_API_BASE_URL } from '@/utils/constants';


// This is the main content of your page
const GeoFencingPageContent = () => {
  const router = useRouter();
  const isApiLoaded = useApiIsLoaded();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [geofenceName, setGeofenceName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [shapeType, setShapeType] = useState('circle');
  const [radius, setRadius] = useState(100);
  const [address, setAddress] = useState('');
  const tenantSlug = useParams().tenant;

  const {
    ready,
    value: locationValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

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
  
  const handleMapClick = (place: any) => {
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setValue(place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`, false);
    }
  };

  const mapCenter = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
  }, [latitude, longitude]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      },
      (error) => {
        console.error("Geolocation error, using default:", error.message);
        setLatitude('18.5204');
        setLongitude('73.8567');
      }
    );
  }, []); 

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
      is_active: true
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
      // Get tenant slug from URL or context
      
      // Make API call
      const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create geofence');
      }
      
      const data = await response.json();
      setSuccessMessage('Geofence created successfully!');
      
      // Optionally redirect or clear form
      setTimeout(() => {
        router.push(`/${tenantSlug}/Crm/tenant-admin/geo-fenching`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating geofence');
      console.error('Error creating geofence:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isApiLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
 
    <>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" component="h1">Create New Geofence</Typography>
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
        {/* The fix is here: using the 'item' prop */}
        <Grid size={5} xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack spacing={3} component="form" noValidate onSubmit={handleSubmit}>
                <TextField 
                  label="Geofence Name" 
                  fullWidth 
                  required 
                  value={geofenceName} 
                  onChange={(e) => setGeofenceName(e.target.value)} 
                />
                
               
                
                <Box sx={{ position: 'relative' }}>
                  <TextField
                    label="Location"
                    fullWidth
                    required
                    value={locationValue}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    placeholder="Search for a location..."
                  />
                  {status === 'OK' && (
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
                
                {/* <TextField
                  label="Address"
                  fullWidth
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Detailed address (optional)"
                /> */}
                
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
                  <ToggleButtonGroup value={shapeType} exclusive onChange={(_e, val) => val && setShapeType(val)} fullWidth>
                    <ToggleButton value="circle">Circle</ToggleButton>
                    <ToggleButton value="polygon">Polygon</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box>
                  <Typography gutterBottom variant="subtitle2">Radius: {radius} meters</Typography>
                  <Slider value={radius} onChange={(_e, val) => setRadius(val as number)} step={10} min={0} max={2000} valueLabelDisplay="auto" />
                </Box>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Geofence'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={7} xs={12} md={7}>
          <Card sx={{ height: '600px', width: '100%' }}>
            <LocationPicker
              center={mapCenter}
              onLocationSelect={handleMapClick}
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