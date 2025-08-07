'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper,
  IconButton,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Divider,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Badge,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudUpload as CloudUploadIcon,
  AddPhotoAlternate as AddPhotoIcon,
  AutoFixHigh as EnhanceIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { ImageData, ImageUploader } from './ImageUploader';
import { useDropzone } from 'react-dropzone';
import { ImageKitProvider } from '@imagekit/next';
import ImageDialog, { ImageItem as ImageKitItem } from '@/app/components/ImageKIt.io/ImageDialog';
import imageUploadRegistry from '@/app/services/ImageUploadRegistry';
import { useUploadTemporaryImage, useDeleteImage } from '@/app/hooks/api/assets';

export interface ImageManagerProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  ownerType: 'product' | 'variant' | 'division' | 'category' | 'subcategory';
  disabled?: boolean;
  maxImages?: number;
}


/**
 * Enhanced component for managing (upload, display, edit, delete) images for products or variants
 * Features a grid layout with 3 images per row and improved UI controls
 */
export const ImageManager = ({
  images,
  onImagesChange,
  ownerType,
  disabled = false,
  maxImages = 10
}: ImageManagerProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [editingImage, setEditingImage] = useState<ImageData | null>(null);
  const [editAltText, setEditAltText] = useState('');
  
  // State for ImageKit.io dialog
  const [imageKitDialogOpen, setImageKitDialogOpen] = useState<boolean>(false);
  const [selectedFilesForImageKit, setSelectedFilesForImageKit] = useState<ImageKitItem[]>([]);
  const instanceId = useRef<string>(`${ownerType}_${Date.now()}`);
  
  // State for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  // Handle new image upload
  const handleImageUploaded = (newImage: ImageData) => {
    const updatedImages = [...images, newImage];
    onImagesChange(updatedImages);
  };
  
  // Set an image as the default
  const handleSetDefault = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      is_default: img.id === imageId
    }));
    onImagesChange(updatedImages);
  };
  
  // Delete an image
// Delete an image
const handleDelete = async (imageId: string) => {
  try {
    // Show loading state
   

    // Find the image data to get additional details if needed
    const imageToDelete = images.find(img => img.id === imageId);
    
    if (!imageToDelete) {
      throw new Error('Image not found in local state');
    }
    
    // For divisions, categories, and subcategories, we need to use entity ID or image URL
    // For products and variants, we can use the image ID directly
    let idToSend = imageId;
    
    // For division/category/subcategory, send image URL if available
    if (['division', 'category', 'subcategory'].includes(ownerType) && imageToDelete.image) {
      // Extract just the path part without query parameters
      const imageUrl = imageToDelete.image;
      
      // First remove query parameters if present
      const questionMarkIndex = imageUrl.indexOf('?');
      const pathWithoutQuery = questionMarkIndex !== -1 ? 
        imageUrl.substring(0, questionMarkIndex) : 
        imageUrl;
      
      // If the URL contains the pattern 'divisions/' or 'categories/' or 'subcategories/',
      // extract that part as it's likely what's stored in the database
      const folderPatterns = ['divisions/', 'categories/', 'subcategories/'];
      let found = false;
      
      for (const pattern of folderPatterns) {
        const patternIndex = pathWithoutQuery.indexOf(pattern);
        if (patternIndex !== -1) {
          // Extract from the pattern to the end (before query params)
          idToSend = pathWithoutQuery.substring(patternIndex);
          found = true;
          break;
        }
      }
      
      // If we couldn't find the pattern, use the filename as fallback
      if (!found) {
        const lastSlashIndex = pathWithoutQuery.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          // Use the path starting from the last folder
          const folderAndFile = pathWithoutQuery.substring(lastSlashIndex + 1);
          // If this is for a division, category, or subcategory, prepend the folder name
          idToSend = `${ownerType}s/${folderAndFile}`;
        } else {
          // Just use the path without query if all else fails
          idToSend = pathWithoutQuery;
        }
      }
    }

    console.log(`Deleting ${ownerType} image with identifier: ${idToSend}`);
    
    // Call the delete API
    await deleteImage.mutateAsync({
      imageId: idToSend,
      ownerType
    });

    // Update local state - for the parent component as well
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // If we deleted the default image, set a new default if any images remain
    if (updatedImages.length > 0 && !updatedImages.some(img => img.is_default)) {
      updatedImages[0].is_default = true;
    }
    
    // Important: When we delete an image, we need to make sure the parent component
    // is informed and properly updates any references to this image
    if (['division', 'category', 'subcategory'].includes(ownerType)) {
      // Create a special event that the parent form can listen for
      const imageDeletedEvent = new CustomEvent('image-deleted', {
        detail: { ownerType, imageId, success: true }
      });
      document.dispatchEvent(imageDeletedEvent);
    }
    
    onImagesChange(updatedImages);

    // Show success message
    setSnackbar({
      open: true,
      message: t('products.images.deleted', 'Image deleted successfully'),
      severity: 'success'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    
    // Check for different "not found" error patterns
    const errorMessage = error?.response?.data?.message || '';
    const isNotFoundError = 
      errorMessage.includes('No division found with image matching') ||
      errorMessage.includes('No category found with image matching')||
      errorMessage.includes('No subcategory found with image matching')||
      errorMessage.includes('For product images, image_id must be a numeric ID of the ProductImage record')||
      errorMessage.includes('No variant found with image matching');
    
    if (isNotFoundError) {
      // Even though API failed, still update the UI by removing the image
      console.log('Image not found on server but removing from UI');
      
      // Update local state
      const updatedImages = images.filter(img => img.id !== imageId);
      
      // If we deleted the default image, set a new default if any images remain
      if (updatedImages.length > 0 && !updatedImages.some(img => img.is_default)) {
        updatedImages[0].is_default = true;
      }
      
      // Inform parent component
      if (['division', 'category', 'subcategory'].includes(ownerType)) {
        const imageDeletedEvent = new CustomEvent('image-deleted', {
          detail: { ownerType, imageId, success: true }
        });
        document.dispatchEvent(imageDeletedEvent);
      }
      
      onImagesChange(updatedImages);
      
    
    } else {
     
    }
  }
};
  // Open edit dialog
  const handleEditClick = (image: ImageData) => {
    setEditingImage(image);
    setEditAltText(image.alt_text);
  };
  
  // Save edited image
  const handleSaveEdit = () => {
    if (!editingImage) return;
    
    const updatedImages = images.map(img => 
      img.id === editingImage.id ? { ...img, alt_text: editAltText } : img
    );
    
    onImagesChange(updatedImages);
    setEditingImage(null);
  };
  
  // Close edit dialog
  const handleCancelEdit = () => {
    setEditingImage(null);
  };

  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Count remaining upload slots
  const remainingSlots = maxImages - images.length;
  
  // Dropzone configuration for AI enhanced image uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: remainingSlots > 0 ? remainingSlots : 1,
    disabled: disabled || images.length >= maxImages,
    onDrop: useCallback(async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      
      // Register files with the ImageUploadRegistry
      const sessionId = imageUploadRegistry.createSession('ImageManager', instanceId.current, ownerType);
      imageUploadRegistry.registerFiles(sessionId, acceptedFiles);
      
      // Convert files to ImageKitItems and open the ImageKit dialog
      const imageKitItems: ImageKitItem[] = Array.from(acceptedFiles).map(file => ({
        url: URL.createObjectURL(file),
        file,
        context: `${ownerType}_${instanceId.current}`,
        sessionId
      }));
      
      setSelectedFilesForImageKit(imageKitItems);
      setImageKitDialogOpen(true);
    }, [ownerType, images.length, maxImages, disabled])
  });
  
  // Get the upload and delete mutation hooks from assets.ts
  const uploadTempImage = useUploadTemporaryImage();
  const deleteImage = useDeleteImage();

  // Handle AI enhanced image from ImageKit
  const handleUseTransformedImage = async (originalImage: ImageKitItem, transformedUrl: string) => {
    try {
      // Convert the transformed URL to a File object
      const response = await fetch(transformedUrl);
      const blob = await response.blob();
      const transformedFile = new File([blob], originalImage.file.name, { type: blob.type });
      
      // Set uploading state in UI if needed
      setSnackbar({
        open: true,
        message: t('products.images.uploading', 'Uploading enhanced image...'),
        severity: 'info'
      });
      
      // Upload to temporary storage first
      const result = await uploadTempImage.mutateAsync({
        file: transformedFile,
        ownerType: ownerType,
        context: `${ownerType}_ai_enhanced`
      });
      
      // Create image data from the temporary upload response
      const newImage: ImageData = {
        id: result.temp_id, // Use the temp_id from the server response
        sort_order: images.length, // Set the sort order to the end of the current list
        original_filename: result.original_filename,
        alt_text: originalImage.file.name.split('.')[0],
        is_default: images.length === 0
      };
      
      // Update the UI with the new image
      handleImageUploaded(newImage);
      
      setSnackbar({
        open: true,
        message: t('products.images.ai_enhanced_success', 'AI-enhanced image uploaded successfully'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Error processing AI-enhanced image:', error);
      setSnackbar({
        open: true,
        message: t('products.images.ai_enhanced_error', 'Failed to process AI-enhanced image'),
        severity: 'error'
      });
    }
  };


  return (
    <ImageKitProvider urlEndpoint="https://ik.imagekit.io/lvioy81zs">
      <Box sx={{ my: 1 }}>
        {/* Header with title and upload button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2">
            {(() => {
              const typeMap = {
                'product': 'Product',
                'variant': 'Variant',
                'category': 'Category',
                'subcategory': 'Subcategory',
                'division': 'Division'
              } as const;
              
              const displayType = typeMap[ownerType as keyof typeof typeMap] || ownerType;
              return t('products.images.title', `${displayType} Images`);
            })()}
            {images.length > 0 && (
              <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                ({images.length}/{maxImages})
              </Typography>
            )}
          </Typography>
          
          
        </Box>
        
        {/* AI-enhanced image upload dropzone */}
        <Paper
          {...getRootProps()}
          className="ai-enhancement-dropzone"
          sx={{
            p: 4, 
            mb: 3,
            border: '2px dashed',
            borderColor: isDragActive ? 'secondary.main' : 'divider',
            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: disabled || images.length >= maxImages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled || images.length >= maxImages ? 0.7 : 1,
            '&:hover': {
              borderColor: disabled || images.length >= maxImages ? 'divider' : 'secondary.main',
            }
          }}
        >
          {/* This input remains hidden and is triggered by the dropzone click */}
          <input {...getInputProps()} />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center',
          }}>

            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />

            <Typography variant="h6" component="p" sx={{ mb: 2 }}>
              {isDragActive
                ? t('products.images.drop_files', 'Drop files here...')
                : t('products.images.drag_drop_here', 'Drag & Drop Files Here')}
            </Typography>

            {/* The "or" text and the "Browse Files" button have been removed. */}

            <Typography variant="caption" color="text.secondary">
              {t('products.images.supports', 'Supports: JPG, PNG, PDF, DOC, MP4 (Max: 10MB)')}
            </Typography>

          </Box>
        </Paper>

        {/* Empty state - only show if no dropzone and no images */}
        {images.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
            {t('products.images.noImages', 'No images added yet. Add images using the options above.')}
          </Typography>
        )}
      
      {/* Image grid with 3 images per row */}
      {/* Image list view */}
      {images.length > 0 && (
          <Grid container spacing={2}>
            {images.map((image) => (
              <Grid size={12} key={image.id}>
                <Paper
                  elevation={2}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    width: '100%',
                    borderColor: image.is_default ? 'primary.main' : 'transparent',
                    borderWidth: 2,
                    borderStyle: 'solid',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {/* Image Preview */}
                  <Box
                    component="img"
                    sx={{
                      width: 70,
                      height: 70,
                      objectFit: 'contain',
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      p: 0.5,
                      mr: 2
                    }}
                    src={(image as any).image ? (image as any).image : `/api/assets/temporary/${image.id}/`}
                    alt={image.alt_text || image.original_filename || 'Product image'}
                  />

                  {/* Image Alt Text / Filename (MODIFIED for better responsiveness) */}
                  <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                      {image.alt_text || image.original_filename || t('products.images.noAltText', 'No description')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        ID: {image.id.substring(0, 10)}...
                    </Typography>
                  </Box>

                  {/* Action Icons */}
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title={image.is_default ? t('products.images.isDefault', 'Default image') : t('products.images.setAsDefault', 'Set as default')}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleSetDefault(image.id)}
                          disabled={image.is_default || disabled}
                          color={image.is_default ? 'warning' : 'default'}
                        >
                          {image.is_default ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    
                    <Tooltip title={t('common.edit', 'Edit')}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(image)}
                        disabled={disabled}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={t('common.delete', 'Delete')}>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(image.id)}
                        disabled={disabled}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      
      {/* Edit dialog */}
      <Dialog open={!!editingImage} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('products.images.editImage', 'Edit Image Details')}
        </DialogTitle>
        <DialogContent>
          {editingImage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={(editingImage as any).image ? (editingImage as any).image : `/api/assets/temporary/${editingImage.id}/`}
                  alt={editingImage.alt_text || editingImage.original_filename || 'Product image'}
                  sx={{
                    height: 150,
                    maxWidth: '100%',
                    objectFit: 'contain'
                  }}
                />
              </Box>
              
              <TextField
                autoFocus
                margin="dense"
                label={t('products.images.altText', 'Alt Text')}
                fullWidth
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                helperText={t('products.images.altTextHelp', 'Describe the image for screen readers and SEO')}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            {t('common.save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* ImageKit.io dialog for AI enhancement */}
      <ImageDialog
        open={imageKitDialogOpen}
        onClose={() => setImageKitDialogOpen(false)}
        images={selectedFilesForImageKit}
        instanceId={instanceId.current}
        onUseOriginal={async (image) => {
          try {
            // Set uploading state in UI
            setSnackbar({
              open: true,
              message: t('products.images.uploading', 'Uploading original image...'),
              severity: 'info'
            });
            
            // Upload the original image to temporary storage first
            const result = await uploadTempImage.mutateAsync({
              file: image.file,
              ownerType: ownerType as 'product' | 'variant' | 'division',
              context: `${ownerType}_original`
            });
            
            // Create image data from the temporary upload response
            handleImageUploaded({
              id: result.temp_id, // Use the temp_id from the server response
              original_filename: result.original_filename,
              alt_text: image.file.name.split('.')[0],
              is_default: images.length === 0,
              sort_order: images.length // Set the sort order to the end of the current list
            });
            
            // Show success notification
            setSnackbar({
              open: true,
              message: t('products.images.upload_success', 'Image uploaded successfully'),
              severity: 'success'
            });
          } catch (error) {
            console.error('Error uploading original image:', error);
            setSnackbar({
              open: true,
              message: t('products.images.upload_error', 'Failed to upload image'),
              severity: 'error'
            });
          }
          setImageKitDialogOpen(false);
        }}
        onUseTransformed={(image, transformedUrl) => {
          // Use the AI-enhanced image
          handleUseTransformedImage(image, transformedUrl);
          setImageKitDialogOpen(false);
        }}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    </ImageKitProvider>
  );
};
