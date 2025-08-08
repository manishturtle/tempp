
//                 noOptionsText={!searchQueries.font ? 'Type to search for fonts' : 'No fonts found'}
//                 ListboxProps={{
//                   style: {
//                     maxHeight: '220px',
//                     scrollbarWidth: 'thin',
//                     scrollbarColor: '#bdbdbd #f5f5f5',
//                   }
//                 }}
//               />
//               <Typography variant="caption" color="text.secondary">
//                 This font will be used throughout the application
//               </Typography>
//             </Box>
//             <Box>
//               <Typography variant="body2" fontWeight={500} gutterBottom>
//                 Default Theme Mode
//               </Typography>
//               <FormControl component="fieldset">
//                 <ToggleButtonGroup
//                   value={themeMode}
//                   exclusive
//                   onChange={handleThemeChange}
//                   aria-label="text alignment"
//                   sx={{ display: 'flex', width: '100%', mt: 1 }}
//                   disabled={readOnly}
//                 >
//                   <ToggleButton value="light" aria-label="left aligned">
//                     <Typography variant="body2">Light</Typography>
//                   </ToggleButton>
//                   <ToggleButton value="dark" aria-label="centered">
//                     <Typography variant="body2">Dark</Typography>
//                   </ToggleButton>
//                   <ToggleButton value="system" aria-label="right aligned">
//                     <Typography variant="body2">System Default</Typography>
//                   </ToggleButton>
//                 </ToggleButtonGroup>
//                     control={<Radio size="small" />}
//                     label="Dark"
//                     sx={{ ml: 3 }}
//                   />
//                   <FormControlLabel
//                     value="system"
//                     control={<Radio size="small" />}
//                     label="System Default"
//                     sx={{ ml: 3 }}
//                   />
//                 </RadioGroup>
//               </FormControl>
//               <Typography variant="caption" color="text.secondary" display="block" mt={1}>
//                 Users can override this setting in their preferences
//               </Typography>
//             </Box>
//           </Box>
//         </Box>
//       </Paper>
//     </Box>
//   );
// };

// export default BrandingVisuals;


"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Select,
  styled,
  MenuItem,
  SelectChangeEvent,
  Popover,
  Autocomplete,
  Grid,
  Snackbar,
  IconButton,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { CloudUpload, Image as ImageIcon, Delete, Add, Search } from '@mui/icons-material';
import { ChromePicker, type ColorResult } from 'react-color';
import CustomSnackbar from '@/app/components/common/CustomSnackbar';
import { COCKPIT_API_BASE_URL } from '../../../../utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Interface for image data with signed URL
interface ImageData {
  url: string;
  filename: string;
  signed_url: string;
  disposition: string;
}

export interface BrandingFormData {
  default_theme_mode: 'light' | 'dark' | 'system';
  primary_brand_color: string;
  secondary_brand_color: string;
  default_font_style: string;
  company_logo_light?: string | ImageData;
  company_logo_dark?: string | ImageData;
  favicon?: string | ImageData;
  custom_css?: string;
}

interface BrandingVisualsProps {
  onSave: (data: BrandingFormData) => void;
  readOnly?: boolean;
  defaultValues?: BrandingFormData;
}



type FontType = {
  code: string;
  name: string;
};

const BrandingVisuals = React.forwardRef<{ triggerSubmit: () => boolean }, BrandingVisualsProps>(({ onSave, readOnly = false, defaultValues }, ref) => {
  // State for snackbar
  type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
    autoHideDuration?: number;
  };

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 6000
  });
  // State for validation errors
  const [errors, setErrors] = useState<{
    lightLogo?: string;
    favicon?: string;
  }>({});

  // State to store the uploaded image data
  const [uploadedImages, setUploadedImages] = useState<{
    'light-logo'?: ImageData | string;
    'dark-logo'?: ImageData | string;
    'favicon'?: ImageData | string;
  }>({});


  

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!imagePreviews['light-logo'] || imagePreviews['light-logo'] === defaultPlaceholderImage) {
      newErrors.lightLogo = 'Company logo (light background) is required';
    }
    
    if (!imagePreviews['favicon'] || imagePreviews['favicon'] === defaultPlaceholderImage) {
      newErrors.favicon = 'Favicon is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Handle save functionality
  const handleSave = (): boolean => {
    // First validate the form
    const isValid = validateForm();
    
    if (!isValid) {
      // Show error message for required fields
      const missingFields = [];
      if (!imagePreviews['light-logo'] || imagePreviews['light-logo'] === defaultPlaceholderImage) {
        missingFields.push('Company Logo (Light)');
      }
      if (!imagePreviews['favicon'] || imagePreviews['favicon'] === defaultPlaceholderImage) {
        missingFields.push('Favicon');
      }
      
      setSnackbar({
        open: true,
        message: `Please upload the following required files: ${missingFields.join(', ')}`,
        severity: 'error',
        autoHideDuration: 5000
      });
      return false;
    }
    
    try {
      // Helper function to get image data in the correct format
      const getImageData = (type: 'light-logo' | 'dark-logo' | 'favicon') => {
        // If we have uploaded image data, use it
        if (uploadedImages[type]) {
          return uploadedImages[type]!;
        }
        
        // Otherwise, check if we have a preview URL
        const previewUrl = imagePreviews[type];
        if (!previewUrl || previewUrl === defaultPlaceholderImage) return '';
        
        // Check if the preview URL matches any existing image data
        const propName = type === 'light-logo' ? 'company_logo_light' : 
                        type === 'dark-logo' ? 'company_logo_dark' : 'favicon';
        const originalData = defaultValues?.[propName];
        
        // If we have original data and it's an object, check if it matches our preview URL
        if (originalData && typeof originalData === 'object') {
          if (originalData.signed_url === previewUrl || originalData.url === previewUrl) {
            return originalData;
          }
        }
        
        // If we get here, return the URL as a string (for backward compatibility)
        return previewUrl;
      };
      
      // Prepare the form data with all fields
      const formData: BrandingFormData = {
        default_theme_mode: themeMode,
        primary_brand_color: primaryColor,
        secondary_brand_color: secondaryColor,
        default_font_style: selectedFont?.code || 'roboto',
        company_logo_light: getImageData('light-logo'),
        company_logo_dark: getImageData('dark-logo'),
        favicon: getImageData('favicon'),
        custom_css: defaultValues?.custom_css || ''
      };
      
      console.log('Saving form data:', formData);
      
      // Call the parent's onSave handler with the form data
      onSave(formData);
      return true;
    } catch (error) {
      console.error('Error in handleSave:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save branding settings. Please try again.',
        severity: 'error',
        autoHideDuration: 5000
      });
      return false;
    }
  };

  // Expose the triggerSubmit method to parent
  React.useImperativeHandle(ref, () => ({
    triggerSubmit: handleSave
  }));
  
  // Default placeholder image as data URL (light gray placeholder with mountain and sun icon)
  const defaultPlaceholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23E0E0E0'/%3E%3Cpath d='M80 60 L50 110 L110 110 Z' fill='%23BDBDBD'/%3E%3Ccircle cx='150' cy='50' r='20' fill='%23BDBDBD'/%3E%3Cpath d='M30 110 L0 170 L200 170 L170 110 Z' fill='%23BDBDBD'/%3E%3C/svg%3E";
  // Initialize state with default values or values from props
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(
    defaultValues?.default_theme_mode || 'light'
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    defaultValues?.primary_brand_color || '#000080'
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    defaultValues?.secondary_brand_color || '#D3D3D3'
  );
  const [selectedFont, setSelectedFont] = useState<FontType | null>(
    defaultValues?.default_font_style 
      ? { code: defaultValues.default_font_style, name: defaultValues.default_font_style.charAt(0).toUpperCase() + defaultValues.default_font_style.slice(1) }
      : { code: 'roboto', name: 'Roboto' }
  );
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  // Helper function to get image URL from potential complex object or string
  const getImageUrl = (imageData: string | ImageData | undefined): string => {
    if (!imageData) return '';
    
    // If it's a string, it's already a URL
    if (typeof imageData === 'string') {
      console.log('Using string URL:', imageData);
      return imageData;
    }
    
    // If it's an object, ALWAYS use signed_url if available
    if (imageData.signed_url) {
      console.log('Using signed URL:', imageData.signed_url);
      return imageData.signed_url;
    } else if (imageData.url) {
      console.log('Signed URL not available, using regular URL:', imageData.url);
      return imageData.url;
    }
    
    return '';
  };

  const [imagePreviews, setImagePreviews] = useState({
    'light-logo': '',
    'dark-logo': '',
    'favicon': ''
  });

  // Update image previews when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      console.log('Updating image previews with default values:', defaultValues);
      
      // Initialize the preview images with signed URLs directly
      const lightLogoUrl = defaultValues.company_logo_light && typeof defaultValues.company_logo_light === 'object' ? 
        defaultValues.company_logo_light.signed_url : 
        (typeof defaultValues.company_logo_light === 'string' ? defaultValues.company_logo_light : '');
      
      const darkLogoUrl = defaultValues.company_logo_dark && typeof defaultValues.company_logo_dark === 'object' ? 
        defaultValues.company_logo_dark.signed_url : 
        (typeof defaultValues.company_logo_dark === 'string' ? defaultValues.company_logo_dark : '');
      
      const faviconUrl = defaultValues.favicon && typeof defaultValues.favicon === 'object' ? 
        defaultValues.favicon.signed_url : 
        (typeof defaultValues.favicon === 'string' ? defaultValues.favicon : '');
      
      setImagePreviews({
        'light-logo': lightLogoUrl,
        'dark-logo': darkLogoUrl,
        'favicon': faviconUrl
      });
      
      // Store original image objects for future use
      const updatedUploads: {[key: string]: ImageData | string} = {};
      
      if (defaultValues.company_logo_light && typeof defaultValues.company_logo_light === 'object') {
        updatedUploads['light-logo'] = defaultValues.company_logo_light;
      }
      
      if (defaultValues.company_logo_dark && typeof defaultValues.company_logo_dark === 'object') {
        updatedUploads['dark-logo'] = defaultValues.company_logo_dark;
      }
      
      if (defaultValues.favicon && typeof defaultValues.favicon === 'object') {
        updatedUploads['favicon'] = defaultValues.favicon;
      }
      
      // Set the uploaded images with the full image data objects
      setUploadedImages(updatedUploads);
    }
  }, [defaultValues]);

  // Update state when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      setThemeMode(defaultValues.default_theme_mode || 'light');
      setPrimaryColor(defaultValues.primary_brand_color || '#000080');
      setSecondaryColor(defaultValues.secondary_brand_color || '#D3D3D3');
      
      // Handle font style properly
      const fontStyle = defaultValues.default_font_style || 'roboto';
      setSelectedFont({
        code: fontStyle,
        name: fontStyle.charAt(0).toUpperCase() + fontStyle.slice(1)
      });
      
      // Image previews are handled in the other useEffect
    }
  }, [defaultValues]);

  // States for Autocomplete dropdowns
  const [open, setOpen] = useState({
    font: false
  });

  const [searchQueries, setSearchQueries] = useState({
    font: ''
  });

  // Font data
  const fonts: FontType[] = [
    { name: 'Inter', code: 'inter' },
    { name: 'Roboto', code: 'roboto' },
    { name: 'Poppins', code: 'poppins' },
    { name: 'Montserrat', code: 'montserrat' },
    { name: 'Open Sans', code: 'opensans' },
    { name: 'Underdog', code: 'underdog' },
  ];

  const CustomScrollbar = styled('div')({
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '10px',
      '&:hover': {
        background: '#555',
      },
    },
  });

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeMode(event.target.value);
  };

  // Handle font selection change
  const handleFontStyleChange = (newValue: FontType | null): void => {
    setSelectedFont(newValue);
  };

  const handleSearchQueryChange = (field: string, value: string): void => {
    setSearchQueries((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const filterFonts = (items: FontType[], query: string): FontType[] => {
    return query
      ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
      : items;
  };

  // Filter the fonts based on search query
  const filteredFonts = filterFonts(fonts, searchQueries.font);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'light-logo' | 'dark-logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Create preview immediately for better UX using URL.createObjectURL for more reliable previews
    const previewUrl = URL.createObjectURL(file);
    
    // Update the preview image immediately with the object URL
    setImagePreviews(prev => ({
      ...prev,
      [type]: previewUrl
    }));
    
    // Store the file for upload
    setUploadedImages(prev => ({
      ...prev,
      [type]: { url: previewUrl, filename: file.name } // Temporary object until upload completes
    }));
    
    // Show file info in console for debugging
    console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
  
    // Map UI type to backend type
    const fileTypeMap = {
      'light-logo': 'company_logo_light',
      'dark-logo': 'company_logo_dark',
      'favicon': 'favicon'
    } as const;
  
    const backendFileType = fileTypeMap[type];
    
    try {
      setSnackbar({
        open: true,
        message: `Uploading ${type.replace('-', ' ')}...`,
        severity: 'info',
        autoHideDuration: 3000
      });
  
      // Get tenant slug from URL
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const tenantSlug = pathParts[0];
      
      if (!tenantSlug) {
        throw new Error('Could not determine tenant slug');
      }
      
      // Create FormData (reverting to this approach as it's more reliable)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', backendFileType);
  
      // Get auth headers (this includes the Authorization token)
      const authHeaders = getAuthHeaders();
      if (!authHeaders || !authHeaders['Authorization']) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // API base URL from .env if available, fallback to current origin
      const apiUrl = `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/file-upload/`;
      
      console.log(`Uploading to: ${apiUrl}`);
  
      // Make the API call with FormData
      // Note: We don't set Content-Type header - the browser will set it with the correct boundary
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeaders['Authorization'],
          'X-Requested-With': 'XMLHttpRequest'
          // Let the browser set Content-Type with boundary
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }
  
      const result = await response.json();
  
      // Store the full image data from the API response
      const imageData = {
        url: result.url,
        filename: result.filename || file.name,
        signed_url: result.signed_url || result.url,
        disposition: result.disposition || `inline; filename="${file.name}"`
      };
      
      console.log('Storing image data:', { type, imageData });
      
      // Update the uploaded images state with the full image data
      setUploadedImages(prev => ({
        ...prev,
        [type]: imageData
      }));
      
      // Always use signed URL for previews
      setImagePreviews(prev => ({
        ...prev,
        [type]: imageData.signed_url
      }));
  
      setSnackbar({
        open: true,
        message: `${type.replace('-', ' ').replace(/^\w/, c => c.toUpperCase())} uploaded successfully`,
        severity: 'success',
        autoHideDuration: 3000
      });
  
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setSnackbar({
        open: true,
        message: `Failed to upload ${type.replace('-', ' ')}: ${error.message}`,
        severity: 'error',
        autoHideDuration: 5000
      });
      
      // Revert the preview on error and clean up the object URL
      setImagePreviews(prev => ({
        ...prev,
        [type]: type === 'light-logo' ? getImageUrl(defaultValues?.company_logo_light) : 
                type === 'dark-logo' ? getImageUrl(defaultValues?.company_logo_dark) : 
                getImageUrl(defaultValues?.favicon)
      }));
      URL.revokeObjectURL(previewUrl);
    } finally {
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, type: 'primary' | 'secondary') => {
    setColorPickerFor(type);
    setAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
    setColorPickerFor(null);
  };

  const handleColorChange = (color: ColorResult) => {
    if (colorPickerFor === 'primary') {
      setPrimaryColor(color.hex);
    } else if (colorPickerFor === 'secondary') {
      setSecondaryColor(color.hex);
    }
    setAnchorEl(null);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleSnackbarClose}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <Box sx={{ width: '100%', bgcolor: 'background.default', p: 0 }}>
      {/* Color Picker Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <ChromePicker
          color={colorPickerFor === 'primary' ? primaryColor : secondaryColor}
          onChange={handleColorChange}
        />
      </Popover>

      {/* Company Logo - Light Background Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Company Logo (Light Background)</Typography>
          <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This logo will be displayed on light backgrounds throughout the application
        </Typography>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Box>
            <Box
              width={120}
              height={120}
              bgcolor="grey.100"
              borderRadius={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={{ xs: 0, sm: 3 }}
              mb={{ xs: 1, sm: 0 }}
              overflow="hidden"
              sx={{
                border: errors.lightLogo ? '1px solid red' : 'none'
              }}
            >
              {imagePreviews['light-logo'] ? (
                <img
                  src={imagePreviews['light-logo']}
                  alt="Light logo preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={defaultPlaceholderImage}
                  alt="Default light logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </Box>
            {errors.lightLogo && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 1 }}>
                {errors.lightLogo}
              </Typography>
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
              disabled={readOnly}
            >
              Upload Logo
              <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'light-logo')}  // or 'light-logo' or 'favicon'
              style={{ display: 'none' }}
              id="light-logo-upload"  // Unique ID for each file input
              // ref={darkLogoInputRef}  // If you're using refs
            />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 200x200px. PNG or SVG format preferred.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Company Logo - Dark Background Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Company Logo (Dark Background)</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>Optional</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This logo will be displayed on dark backgrounds throughout the application
        </Typography>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Box
            width={120}
            height={120}
            bgcolor="grey.800"
            borderRadius={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            mr={{ xs: 0, sm: 3 }}
            mb={{ xs: 2, sm: 0 }}
            overflow="hidden"
          >
            {imagePreviews['dark-logo'] ? (
              <img
                src={imagePreviews['dark-logo']}
                alt="Dark logo preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <img
                src={defaultPlaceholderImage}
                alt="Default dark logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'invert(0.8)' }}
              />
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
              disabled={readOnly}
            >
              Upload Logo
              <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'dark-logo')}  // or 'light-logo' or 'favicon'
              style={{ display: 'none' }}
              id="dark-logo-upload"  // Unique ID for each file input
              // ref={darkLogoInputRef}  // If you're using refs
            />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 200x200px. PNG or SVG format preferred.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Favicon Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Favicon</Typography>
          <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This icon will be displayed in browser tabs
        </Typography>
        <Box display="flex" alignItems="flex-start" flexWrap="wrap">
          <Box>
            <Box
              width={64}
              height={64}
              bgcolor="grey.100"
              borderRadius={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={{ xs: 0, sm: 3 }}
              mb={{ xs: 1, sm: 0 }}
              overflow="hidden"
              sx={{
                border: errors.favicon ? '1px solid red' : 'none'
              }}
            >
              {imagePreviews['favicon'] ? (
                <img
                  src={imagePreviews['favicon']}
                  alt="Favicon preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={defaultPlaceholderImage}
                  alt="Default favicon"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </Box>
            {errors.favicon && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 1, maxWidth: 200 }}>
                {errors.favicon}
              </Typography>
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
              disabled={readOnly}
            >
              Upload Favicon
              <input
                type="file"
                hidden
                accept="image/x-icon,image/png,image/svg+xml"
                onChange={(e) => handleFileUpload(e, 'favicon')}
                id="favicon-upload"
              />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 32x32px or 64x64px. ICO, PNG or SVG format.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Brand Colors Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={1}>Brand Colors</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          These colors will be used throughout the application
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Primary Brand Color
            </Typography>
            <Box display="flex" alignItems="center" sx={{ gap: 0 }}>
                 <Box
                  width={48}
                  height={40}
                  bgcolor={primaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => !readOnly && handleColorClick(e, 'primary')}
                  sx={{ cursor: readOnly ? 'default' : 'pointer' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={readOnly}
                  InputProps={{ readOnly }}
                  sx={{
                    margin: 0,
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for buttons, links and primary actions
              </Typography>
            
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Secondary Brand Color
            </Typography>
            
            <Box display="flex" alignItems="center" sx={{ gap: 0 }}>
                <Box
                  width={48}
                  height={40}
                  bgcolor={secondaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => !readOnly && handleColorClick(e, 'secondary')}
                  sx={{ cursor: readOnly ? 'default' : 'pointer' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={readOnly}
                  InputProps={{ readOnly }}
                  sx={{
                    margin: 0,
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for secondary elements and accents
              </Typography>
           
          
          </Grid>
        </Grid>
      </Paper>
      
      {/* Typography & Theme Card */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={1}>Typography & Theme</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure the look and feel of your application
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              open={open.font}
              onOpen={() => !readOnly && setOpen(prev => ({ ...prev, font: true }))}
              onClose={() => setOpen(prev => ({ ...prev, font: false }))}
              options={filteredFonts}
              disabled={readOnly}
              getOptionLabel={(option) => option.name}
              value={selectedFont}
              onChange={(_, newValue) => handleFontStyleChange(newValue)}
              inputValue={searchQueries.font}
              onInputChange={(_, newInputValue) => handleSearchQueryChange('font', newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params} 
                  size="small"
                  label="Default Font Style"
                  variant="outlined"
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.code}>
                  {option.name}
                </li>
              )}
              ListboxComponent={CustomScrollbar}
              ListboxProps={{
                style: {
                  maxHeight: 200,
                  paddingRight: '8px',
                },
              }}
              PaperComponent={({ children }) => (
                <Paper 
                  sx={{ 
                    width: 'auto',
                    minWidth: '300px',
                    boxShadow: 3,
                    mt: 0.5,
                    '& .MuiAutocomplete-listbox': {
                      p: 0,
                    },
                    '& .MuiAutocomplete-option': {
                      minHeight: '40px',
                      '&[data-focus="true"]': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        },
                      },
                    },
                  }}
                >
                  {children}
                </Paper>
              )}
              sx={{
                '& .MuiAutocomplete-popper': {
                  minWidth: '300px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  paddingRight: '8px !important',
                },
              }}
              noOptionsText={!searchQueries.font ? 'Type to search for fonts' : 'No fonts found'}
            />
            <Typography variant="caption" color="text.secondary">
              This font will be used throughout the application
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Default Theme Mode
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={themeMode}
                
                onChange={handleThemeChange}
              >
                <FormControlLabel
                  value="light"
                  control={<Radio size="small" />}
                  label="Light"
                  disabled={readOnly}
                />
                <FormControlLabel
                  value="dark"
                  control={<Radio size="small" />}
                  label="Dark"
                  disabled={readOnly}
                />
                <FormControlLabel
                  value="system"
                  control={<Radio size="small" />}
                  label="System Default"
                  disabled={readOnly}
                />
              </RadioGroup>
            </FormControl>
            <Typography variant="caption" color="text.secondary" display="block">
              Users can override this setting in their preferences
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      </Box>
    </>
  );
});

BrandingVisuals.displayName = 'BrandingVisuals';

export { BrandingFormData };
export default BrandingVisuals;