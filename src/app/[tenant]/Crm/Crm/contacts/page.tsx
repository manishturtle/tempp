'use client';

import { useState, useRef } from 'react';
import PageTitle from '@/app/components/PageTitle';
import { 
  Button, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Divider,
  Collapse,
  Alert,
  Snackbar
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EnhanceIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';

interface ImageItem {
  id: string;
  dataUrl: string;
  name: string;
  enhanced?: boolean;
  enhancedUrl?: string;
}

interface ClaidOperation {
  id: string;
  label: string;
  value: string;
  category: 'restoration' | 'adjustment' | 'background' | 'resize';
  apiParam?: string;
  defaultValue?: number;
}

// This would typically be in an environment variable or config file
const CLAID_API_KEY = '8e183d02dd6b49c9bb2b60fdc94e6346'; // Replace with your actual API key
const CLAID_API_ENDPOINT = 'https://api.claid.ai/v1-beta1/image/edit';
// CORS proxy for development - in production, use a server-side proxy instead
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

export default function ContactsPage() {
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Claid AI operations as chips with API parameters
  const availableOperations: ClaidOperation[] = [
    { id: 'upscale', label: 'Upscale', value: 'upscale', category: 'restoration', apiParam: 'upscale', defaultValue: 2 },
    { id: 'decompress', label: 'Decompress', value: 'decompress', category: 'restoration', apiParam: 'decompress', defaultValue: 1 },
    { id: 'polish', label: 'Polish', value: 'polish', category: 'restoration', apiParam: 'polish', defaultValue: 1 },
    { id: 'hdr', label: 'HDR Effect', value: 'hdr', category: 'adjustment', apiParam: 'hdr', defaultValue: 50 },
    { id: 'sharpness', label: 'Sharpen', value: 'sharpness', category: 'adjustment', apiParam: 'sharpness', defaultValue: 40 },
    { id: 'remove_bg', label: 'Remove Background', value: 'remove_bg', category: 'background', apiParam: 'remove', defaultValue: 1 },
    { id: 'resize', label: 'Resize', value: 'resize', category: 'resize' },
  ];

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const newImage: ImageItem = {
            id: `${file.name}-${Date.now()}`,
            dataUrl: reader.result as string,
            name: file.name,
            enhanced: false
          };
          
          setSelectedImages(prevImages => [...prevImages, newImage]);
          
          // If this is the first image, open the dialog for it
          if (selectedImages.length === 0) {
            setCurrentImage(newImage);
            setDialogOpen(true);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset the input value to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setSelectedImages(prevImages => prevImages.filter(image => image.id !== id));
  };

  const handleOpenDialog = (image: ImageItem) => {
    setCurrentImage(image);
    setPrompt('');
    setSelectedOperations([]);
    setShowEnhanceOptions(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentImage(null);
    setPrompt('');
    setSelectedOperations([]);
    setShowEnhanceOptions(false);
  };

  const handleToggleOperation = (operationId: string) => {
    setSelectedOperations(prev => 
      prev.includes(operationId) 
        ? prev.filter(id => id !== operationId) 
        : [...prev, operationId]
    );
  };

  const handleUseOriginal = () => {
    // Just close the dialog and move to next image if available
    handleCloseDialog();
    
    // Find the next unprocessed image
    const nextUnprocessedImage = selectedImages.find(
      img => !img.enhanced && img.id !== currentImage?.id
    );
    
    if (nextUnprocessedImage) {
      handleOpenDialog(nextUnprocessedImage);
    }
  };

  const handleShowEnhanceOptions = () => {
    setShowEnhanceOptions(true);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Convert data URL to Blob for upload
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Build Claid API request payload based on selected operations
  const buildClaidRequestPayload = (imageDataUrl: string) => {
    const operations: Record<string, any> = {};
    
    // Add restorations if selected
    const restorations = selectedOperations.filter(id => 
      availableOperations.find(op => op.id === id && op.category === 'restoration')
    );
    
    if (restorations.length > 0) {
      operations.restorations = {};
      restorations.forEach(id => {
        const operation = availableOperations.find(op => op.id === id);
        if (operation?.apiParam) {
          operations.restorations[operation.apiParam] = operation.defaultValue;
        }
      });
    }
    
    // Add adjustments if selected
    const adjustments = selectedOperations.filter(id => 
      availableOperations.find(op => op.id === id && op.category === 'adjustment')
    );
    
    if (adjustments.length > 0) {
      operations.adjustments = {};
      adjustments.forEach(id => {
        const operation = availableOperations.find(op => op.id === id);
        if (operation?.apiParam) {
          operations.adjustments[operation.apiParam] = operation.defaultValue;
        }
      });
    }
    
    // Add background removal if selected
    if (selectedOperations.includes('remove_bg')) {
      operations.background = {
        remove: true
      };
    }
    
    // Add resize if selected (default to 800x800)
    if (selectedOperations.includes('resize')) {
      operations.resizing = {
        width: 800,
        height: 800,
        fit: "contain"
      };
    }
    
    // Add style transfer with prompt if provided
    if (prompt.trim()) {
      operations.generative = {
        style_transfer: {
          prompt: prompt.trim()
        }
      };
    }
    
    return {
      input: imageDataUrl,
      operations: operations,
      output: {
        format: {
          type: "jpeg",
          quality: 90
        }
      }
    };
  };

  // Process image with Claid AI
  const processImageWithClaidAI = async (imageDataUrl: string): Promise<string> => {
    try {
      // Build request payload
      const payload = buildClaidRequestPayload(imageDataUrl);
      
      // For development: Use a mock response to avoid CORS issues
      // Remove this in production and use the actual API call
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Return the original image URL as a mock response
        // In production, this would be the enhanced image URL from Claid
        console.log('Development mode: Using mock response for Claid API');
        return imageDataUrl;
      }
      
      // Make API request with CORS proxy for development
      // In production, this should be handled by a server-side API
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `${CORS_PROXY}${CLAID_API_ENDPOINT}`
        : CLAID_API_ENDPOINT;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLAID_API_KEY}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claid API error: ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      
      // Return the URL of the processed image
      return result.data.output.tmp_url;
    } catch (error) {
      console.error('Error processing image with Claid AI:', error);
      
      // In development, return the original image if there's an error
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Returning original image due to API error');
        return imageDataUrl;
      }
      
      throw error;
    }
  };

  const handleEnhanceWithAI = async () => {
    if (!currentImage) return;
    
    // If enhancement options are not shown yet, show them instead of processing
    if (!showEnhanceOptions) {
      handleShowEnhanceOptions();
      return;
    }
    
    // Validate if any operations are selected or prompt is provided
    if (selectedOperations.length === 0 && !prompt.trim()) {
      showNotification('Please select at least one enhancement operation or provide a prompt', 'warning');
      return;
    }
    
    setIsEnhancing(true);
    
    try {
      // Process image with Claid AI
      const enhancedImageUrl = await processImageWithClaidAI(currentImage.dataUrl);
      
      // Update the current image with enhanced version
      const enhancedImage: ImageItem = {
        ...currentImage,
        enhanced: true,
        enhancedUrl: enhancedImageUrl
      };
      
      // Update the image in the selectedImages array
      setSelectedImages(prev => 
        prev.map(img => img.id === currentImage.id ? enhancedImage : img)
      );
      
      showNotification('Image enhanced successfully', 'success');
      
      // Close the dialog
      handleCloseDialog();
      
      // Find the next unprocessed image
      const nextUnprocessedImage = selectedImages.find(
        img => !img.enhanced && img.id !== currentImage.id
      );
      
      // If there's another image to process, open the dialog for it
      if (nextUnprocessedImage) {
        handleOpenDialog(nextUnprocessedImage);
      }
    } catch (error) {
      console.error('Error enhancing image:', error);
      showNotification(`Error enhancing image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleProcessAllRemaining = async () => {
    // Close the current dialog
    handleCloseDialog();
    
    // Process all remaining unenhanced images
    setIsEnhancing(true);
    
    try {
      // Get all unprocessed images
      const unprocessedImages = selectedImages.filter(img => !img.enhanced);
      
      // Process each image sequentially
      for (const image of unprocessedImages) {
        try {
          // Process image with Claid AI
          const enhancedImageUrl = await processImageWithClaidAI(image.dataUrl);
          
          // Update the image in the selectedImages array
          setSelectedImages(prev => 
            prev.map(img => img.id === image.id ? {
              ...img,
              enhanced: true,
              enhancedUrl: enhancedImageUrl
            } : img)
          );
        } catch (error) {
          console.error(`Error processing image ${image.name}:`, error);
          // Continue with next image even if one fails
        }
      }
      
      showNotification('All images processed successfully', 'success');
    } catch (error) {
      console.error('Error processing all images:', error);
      showNotification(`Error processing images: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Group operations by category for better organization
  const groupedOperations = {
    restoration: availableOperations.filter(op => op.category === 'restoration'),
    adjustment: availableOperations.filter(op => op.category === 'adjustment'),
    background: availableOperations.filter(op => op.category === 'background'),
    resize: availableOperations.filter(op => op.category === 'resize')
  };

  // Count unprocessed images
  const unprocessedCount = selectedImages.filter(img => !img.enhanced).length;

  return (
    <div className="space-y-4">
      <PageTitle 
        titleKey="pages.crm.contacts.title" 
        descriptionKey="pages.crm.contacts.description"
      />
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Contact Image Upload</Typography>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleButtonClick}
            sx={{ mb: 2 }}
          >
            Select Images
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          {selectedImages.length > 0 && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Selected Images:</Typography>
              <Grid container spacing={2}>
                {selectedImages.map((image) => (
                  <Grid item xs={12} sm={6} md={4} key={image.id}>
                    <Paper 
                      elevation={2} 
                      sx={{ 
                        p: 1, 
                        position: 'relative',
                        '&:hover .image-actions': {
                          opacity: 1,
                        },
                        border: image.enhanced ? '2px solid #4caf50' : 'none',
                      }}
                    >
                      <Box className="image-actions" sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        display: 'flex',
                        gap: 1,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: 1,
                        padding: '2px'
                      }}>
                        {!image.enhanced && (
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenDialog(image)}
                            title="Enhance with AI"
                          >
                            <EnhanceIcon />
                          </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleRemoveImage(image.id)}
                          title="Remove image"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box 
                        component="img"
                        src={image.enhancedUrl || image.dataUrl}
                        alt={image.name}
                        sx={{ 
                          width: '100%', 
                          height: 200, 
                          objectFit: 'cover',
                          borderRadius: 1
                        }}
                        onClick={() => handleOpenDialog(image)}
                      />
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mt: 1 
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {image.name}
                        </Typography>
                        {image.enhanced && (
                          <Chip 
                            label="Enhanced" 
                            size="small" 
                            color="success" 
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Enhancement Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            {showEnhanceOptions ? "Image Enhancement Options" : "Image Preview"}
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentImage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'center',
                mb: 2
              }}>
                <Box 
                  component="img"
                  src={currentImage.dataUrl}
                  alt={currentImage.name}
                  sx={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px',
                    objectFit: 'contain',
                    borderRadius: 1
                  }}
                />
              </Box>
              
              <Collapse in={showEnhanceOptions}>
                <Box>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="subtitle2">Enhancement Options</Typography>
                  </Divider>
                  
                  <TextField
                    label="Enhancement Prompt"
                    placeholder="Describe how you want to enhance this image"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                  />
                  
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    Select Operations:
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Restoration:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      {groupedOperations.restoration.map((op) => (
                        <Chip
                          key={op.id}
                          label={op.label}
                          clickable
                          color={selectedOperations.includes(op.id) ? "primary" : "default"}
                          onClick={() => handleToggleOperation(op.id)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Adjustments:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      {groupedOperations.adjustment.map((op) => (
                        <Chip
                          key={op.id}
                          label={op.label}
                          clickable
                          color={selectedOperations.includes(op.id) ? "primary" : "default"}
                          onClick={() => handleToggleOperation(op.id)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Background:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      {groupedOperations.background.map((op) => (
                        <Chip
                          key={op.id}
                          label={op.label}
                          clickable
                          color={selectedOperations.includes(op.id) ? "primary" : "default"}
                          onClick={() => handleToggleOperation(op.id)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Resize:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                      {groupedOperations.resize.map((op) => (
                        <Chip
                          key={op.id}
                          label={op.label}
                          clickable
                          color={selectedOperations.includes(op.id) ? "primary" : "default"}
                          onClick={() => handleToggleOperation(op.id)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button 
            onClick={handleUseOriginal}
            variant="outlined"
            disabled={isEnhancing}
          >
            Use Original
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {showEnhanceOptions && unprocessedCount > 1 && (
              <Button 
                onClick={handleProcessAllRemaining}
                variant="contained"
                color="secondary"
                disabled={isEnhancing}
              >
                Process All ({unprocessedCount})
              </Button>
            )}
            <Button 
              onClick={handleEnhanceWithAI}
              variant="contained"
              color="primary"
              disabled={isEnhancing}
            >
              {showEnhanceOptions ? "Apply Enhancement" : "Enhance with AI"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body1">Contacts list and management will go here</Typography>
      </Paper>
    </div>
  );
}
