'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControlLabel, 
  Checkbox, 
  ImageList, 
  ImageListItem, 
  ImageListItemBar,
  CircularProgress,
  Paper,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  AutoFixHigh as EnhanceIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDropzone, type FileRejection, type DropEvent } from 'react-dropzone';
import imageUploadRegistry from '@/app/services/ImageUploadRegistry';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageKitProvider } from '@imagekit/next';

// Import API hooks
import { 
  useFetchProductImages, 
  useUpdateProductImage, 
  useDeleteProductImage 
} from '@/app/hooks/api/products';

// Import temporary upload hook
import { useUploadTemporaryImage } from '@/app/hooks/api/assets';

// Import ImageKit components
import ImageDialog, { ImageItem as ImageKitItem } from '@/app/components/ImageKIt.io/ImageDialog';

// Define types and interfaces

/**
 * Upload status type
 */
type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

/**
 * Interface for existing product image from the server
 */
interface ExistingProductImage {
  id: number;
  image: string;
  thumbnail_url: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
}

/**
 * Interface for temporary image data
 */
interface TemporaryImage {
  id: string; // This will be the temp_id from the server
  file: File;
  original_filename: string;
  thumbnail_url: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
  upload_status: UploadStatus;
  progress: number;
  error?: string;
  file_size?: number;
  content_type?: string;
}

/**
 * Union type for images that can be either existing or temporary
 */
type ImageItem = ExistingProductImage | TemporaryImage;



/**
 * Props for the ImageManager component
 */
interface ImageManagerProps {
  ownerType: 'product' | 'variant';
  ownerId?: number;
  onTempImagesChange: (tempImages: Array<{id: string; alt_text: string; sort_order: number; is_default: boolean}>) => void;
  initialImages?: ExistingProductImage[];
  instanceId?: string; // Optional unique ID to distinguish between multiple instances
}

/**
 * Props for the SortableImage component
 */
interface SortableImageProps {
  id: string | number;
  image: ImageItem;
  onEdit: (image: ImageItem) => void;
  onDelete: (image: ImageItem) => void;
  onSetDefault: (image: ImageItem) => void;
  onRetry?: (image: TemporaryImage) => void;
}

/**
 * Props for the ImageEditDialog component
 */
interface ImageEditDialogProps {
  open: boolean;
  image: ImageItem | null;
  onClose: () => void;
  onSave: (image: ImageItem) => void;
}

/**
 * Helper function to check if an image is a temporary image
 */
const isTemporaryImage = (image: ImageItem): image is TemporaryImage => {
  return 'upload_status' in image;
};

/**
 * Helper function to check if an image is an existing product image
 */
const isExistingProductImage = (image: ImageItem): image is ExistingProductImage => {
  return 'image' in image && !('upload_status' in image);
};

/**
 * SortableImage component for drag-and-drop functionality
 */
const SortableImage = ({ id, image, onEdit, onDelete, onSetDefault, onRetry }: SortableImageProps): React.ReactElement => {
  const { t } = useTranslation();
  const isTemp = isTemporaryImage(image);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Prevent event propagation and call the handler
  const safeHandler = (handler: (img: ImageItem) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Calling handler for image:', image);
    handler(image);
  };

  // Determine if this is a temporary image with an error
  const hasError = isTemp && image.upload_status === 'error';
  
  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners} sx={{ position: 'relative', width: '110px', height: '100px', margin: '8px' }}>
      <ImageListItem>
        <img
          src={image.thumbnail_url}
          alt={image.alt_text || t('admin.products.images.no_alt_text')}
          loading="lazy"
          style={{ 
            opacity: hasError ? 0.5 : 1,
            filter: hasError ? 'grayscale(100%)' : 'none',
            width: '110px',
            height: '100px',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        <ImageListItemBar
          title={image.alt_text || t('admin.products.images.no_alt_text')}
          actionIcon={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* Default/Star icon */}
              <IconButton
                sx={{ color: 'primary.main' }}
                onClick={safeHandler(onSetDefault)}
                title={t('admin.products.images.set_as_default')}
              >
                {image.is_default ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
              
              {/* Edit icon */}
              <IconButton
                sx={{ color: 'primary.main' }}
                onClick={safeHandler(onEdit)}
                title={t('admin.products.images.edit')}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              
              {/* Delete icon */}
              <IconButton
                sx={{ color: 'primary.main' }}
                onClick={safeHandler(onDelete)}
                title={t('admin.products.images.delete')}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              
              {/* Retry icon for failed uploads */}
              {hasError && onRetry && (
                <IconButton
                  sx={{ color: 'primary.main' }}
                  onClick={safeHandler(onRetry as (img: ImageItem) => void)}
                  title={t('admin.products.images.retry_upload')}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          }
          position="bottom"
          sx={{
            background: 'rgba(0, 0, 0, 0.5)',
            width: '100%',
            height: '50%',
            '.MuiImageListItemBar-titleWrap': {
              display: 'none' // Hide the title
            }
          }}
        />
        
        {/* Upload progress indicator for temporary images */}
        {isTemp && image.upload_status === 'uploading' && (
          <LinearProgress 
            variant="determinate" 
            value={image.progress} 
            sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          />
        )}
        
        {/* Error indicator */}
        {hasError && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: 'error.main'
            }}
          >
            <ErrorIcon fontSize="large" />
          </Box>
        )}
      </ImageListItem>
    </Box>
  );
};

/**
 * ImageEditDialog component for editing image metadata
 */
const ImageEditDialog = ({ open, image, onClose, onSave }: ImageEditDialogProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const [editedImage, setEditedImage] = useState<ImageItem | null>(null);
  
  // Initialize the edited image when the dialog opens
  useEffect(() => {
    if (open && image) {
      setEditedImage({ ...image });
    }
  }, [open, image]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!editedImage) return;
    
    const { name, value, type, checked } = e.target;
    setEditedImage({
      ...editedImage,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle save
  const handleSave = (): void => {
    if (editedImage) {
      onSave(editedImage);
    }
    onClose();
  };
  
  if (!editedImage) return null;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('admin.products.images.edit_image')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <img 
            src={editedImage.thumbnail_url} 
            alt={editedImage.alt_text || t('admin.products.images.no_alt_text')} 
            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
          />
          
          <TextField
            label={t('admin.products.images.alt_text')}
            name="alt_text"
            value={editedImage.alt_text || ''}
            onChange={handleChange}
            fullWidth
            helperText={t('admin.products.images.alt_text_help')}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                name="is_default"
                checked={editedImage.is_default}
                onChange={handleChange}
              />
            }
            label={t('admin.products.images.set_as_default')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main ImageManager component
 */
const ImageManager = ({
  ownerType,
  ownerId,
  onTempImagesChange,
  initialImages = [],
  instanceId = 'default'
}: ImageManagerProps): React.ReactElement => {
  const { t } = useTranslation();
  
  // State for images
  const [existingImages, setExistingImages] = useState<ExistingProductImage[]>(initialImages);
  const [tempImages, setTempImages] = useState<TemporaryImage[]>([]);
  const [allImages, setAllImages] = useState<ImageItem[]>([]);
  
  // Refs to track previous values and prevent infinite loops
  const tempImagesRef = useRef<string>('');
  
  // State for dialogs
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  
  // State for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // API hooks
  const { data: serverImages, isLoading: isLoadingImages } = useFetchProductImages({ 
    productId: ownerType === 'product' ? ownerId : undefined, 
    variantId: ownerType === 'variant' ? ownerId : undefined 
  });
  
  const { mutateAsync: uploadTempImage } = useUploadTemporaryImage();
  
  // Create update and delete image mutations with dummy imageId that will be replaced during calls
  // Only create these hooks when we have an ownerId to avoid the "Either productId or variantId must be provided" error
  const updateImageMutation = ownerId ? useUpdateProductImage({ 
    productId: ownerType === 'product' ? ownerId : undefined, 
    variantId: ownerType === 'variant' ? ownerId : undefined,
    imageId: 0 
  }) : { mutateAsync: async () => ({}) };
  
  const deleteImageMutation = ownerId ? useDeleteProductImage({
    productId: ownerType === 'product' ? ownerId : undefined, 
    variantId: ownerType === 'variant' ? ownerId : undefined,
    imageId: 0
  }) : { mutateAsync: async () => ({}) };
  
  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Initialize existing images from server
  useEffect(() => {
    if (serverImages && serverImages.length > 0) {
      setExistingImages(serverImages as ExistingProductImage[]);
    }
  }, [serverImages]);
  
  // Combine existing and temporary images
  useEffect(() => {
    const combined = [...existingImages, ...tempImages];
    
    // Sort by sort_order
    combined.sort((a, b) => a.sort_order - b.sort_order);
    
    setAllImages(combined);
    
    // Notify parent component of temporary image changes
    if (tempImages.length > 0) {
      const tempData = tempImages
        .filter(img => img.upload_status === 'uploaded')
        .map(img => ({
          id: img.id,
          alt_text: img.alt_text,
          is_default: img.is_default,
          sort_order: img.sort_order
        }));
      
      const tempDataJson = JSON.stringify(tempData);
      if (tempImagesRef.current !== tempDataJson) {
        tempImagesRef.current = tempDataJson;
        // Add logging before calling the callback
        console.log(`ImageManager[${instanceId}] Log: Calling onTempImagesChange for ownerType='${ownerType}', ownerId='${ownerId || 'undefined'}' with data:`, tempData);
        onTempImagesChange(tempData);
      }
    } else if (tempImagesRef.current !== '[]') {
      // If there are no temporary images, notify parent with empty array
      tempImagesRef.current = '[]';
      console.log(`ImageManager[${instanceId}] Log: Calling onTempImagesChange with empty array`);
      onTempImagesChange([]);
    }
  }, [existingImages, tempImages, onTempImagesChange, ownerType, ownerId, instanceId]);
  
  // State for ImageKit.io dialog
  const [imageKitDialogOpen, setImageKitDialogOpen] = useState<boolean>(false);
  const [selectedFilesForImageKit, setSelectedFilesForImageKit] = useState<ImageKitItem[]>([]);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
    const nativeEvent = event && (event as any).nativeEvent;
    if (nativeEvent) {
      nativeEvent.stopPropagation?.();
      nativeEvent.preventDefault?.();
    }
    console.log(`ImageManager[${instanceId}]: Handling file drop in ${ownerType} with ID ${ownerId || 'new'}`);
    console.log(`ImageManager[${instanceId}]: Event received for file drop. Instance details - ownerType: ${ownerType}, ownerId: ${ownerId || 'new'}, instanceId: ${instanceId}`);
    if (!acceptedFiles.length) return;
    
    // Register files with the ImageUploadRegistry
    const sessionId = imageUploadRegistry.createSession('ImageManager', instanceId, ownerType, ownerId);
    imageUploadRegistry.registerFiles(sessionId, acceptedFiles);
    
    // Convert files to ImageKitItems and open the ImageKit dialog
    const imageKitItems: ImageKitItem[] = Array.from(acceptedFiles).map(file => ({
      url: URL.createObjectURL(file),
      file: file,
      // Add context information to each file
      context: `${ownerType}-${instanceId}`,
      sessionId: sessionId // Store the session ID with the image
    }));
    
    setSelectedFilesForImageKit(imageKitItems);
    setImageKitDialogOpen(true);
  }, [ownerType, ownerId, instanceId]);

  // Handle direct upload of original images (without AI enhancement)
  const handleUploadOriginalImages = async (files: File[]) => {
    if (!files.length) return;
    
    // Process each file
    const newTempImages: TemporaryImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `temp_${Date.now()}_${i}`;
      
      // Create a temporary URL for preview
      const previewUrl = URL.createObjectURL(file);
      
      // Create a new temporary image
      const newTempImage: TemporaryImage = {
        id: tempId,
        file,
        original_filename: file.name,
        thumbnail_url: previewUrl,
        alt_text: file.name.split('.')[0], // Default alt text is filename without extension
        sort_order: allImages.length + i,
        is_default: allImages.length === 0 && i === 0, // First image is default if no images exist
        upload_status: 'pending',
        progress: 0
      };
      
      newTempImages.push(newTempImage);
    }
    
    // Add new temporary images to state
    setTempImages(prev => [...prev, ...newTempImages]);
    
    // Start uploading each image
    for (const tempImage of newTempImages) {
      try {
        // Update status to uploading
        setTempImages(prev => 
          prev.map(img => 
            img.id === tempImage.id 
              ? { ...img, upload_status: 'uploading' } 
              : img
          )
        );
        
        // Upload the image with context information
        const response = await uploadTempImage({
          file: tempImage.file,
          context: `${ownerType}-${instanceId}`
        });
        
        // Update the temporary image with the response data
        setTempImages(prev => 
          prev.map(img => 
            img.id === tempImage.id 
              ? { 
                  ...img, 
                  id: response.temp_id,
                  upload_status: 'uploaded',
                  progress: 100,
                  original_filename: response.original_filename,
                  file_size: response.file_size,
                  content_type: response.content_type
                } 
              : img
          )
        );
      } catch (error) {
        console.error('Error uploading image:', error);
        
        // Update status to error
        setTempImages(prev => 
          prev.map(img => 
            img.id === tempImage.id 
              ? { 
                  ...img, 
                  upload_status: 'error',
                  error: 'Failed to upload image'
                } 
              : img
          )
        );
        
        // Show error notification
        setSnackbar({
          open: true,
          message: t('admin.products.images.upload_error'),
          severity: 'error'
        });
      }
    }
  };
  
  // Handle upload of transformed images from ImageKit.io
  const handleUploadTransformedImage = async (originalFile: File, transformedUrl: string) => {
    try {
      // Convert the transformed URL to a File object
      const response = await fetch(transformedUrl);
      const blob = await response.blob();
      const transformedFile = new File([blob], originalFile.name, { type: blob.type });
      
      console.log(`ImageManager[${instanceId}]: Uploading transformed image in ${ownerType} with ID ${ownerId || 'new'}`);
      
      // Upload the transformed file
      await handleUploadOriginalImages([transformedFile]);
      
      setSnackbar({
        open: true,
        message: t('admin.products.images.ai_enhanced_success'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Error processing transformed image:', error);
      setSnackbar({
        open: true,
        message: t('admin.products.images.ai_enhanced_error'),
        severity: 'error'
      });
    }
  };
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });
  
  // Handle drag end (reordering)
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setAllImages(items => {
        const oldIndex = items.findIndex(item => 
          item.id.toString() === active.id.toString()
        );
        const newIndex = items.findIndex(item => 
          item.id.toString() === over.id.toString()
        );
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order for all items
        const updated = reordered.map((item, index) => ({
          ...item,
          sort_order: index
        }));
        
        // Split back into existing and temporary images
        const updatedExisting = updated.filter(
          item => !isTemporaryImage(item)
        ) as ExistingProductImage[];
        
        const updatedTemp = updated.filter(
          isTemporaryImage
        );
        
        setExistingImages(updatedExisting);
        setTempImages(updatedTemp);
        
        return updated;
      });
    }
  };
  
  // Handle opening edit dialog
  const handleOpenEditDialog = (image: ImageItem): void => {
    setSelectedImage(image);
    setEditDialogOpen(true);
  };
  
  // Handle closing edit dialog
  const handleCloseEditDialog = (): void => {
    setEditDialogOpen(false);
    setSelectedImage(null);
  };
  
  // Handle saving edited image
  const handleSaveImage = (editedImage: ImageItem): void => {
    if (isTemporaryImage(editedImage)) {
      // Update temporary image
      setTempImages(prev => 
        prev.map(img => 
          img.id === editedImage.id ? editedImage as TemporaryImage : img
        )
      );
    } else {
      // Update existing image
      setExistingImages(prev => 
        prev.map(img => 
          img.id === editedImage.id ? editedImage as ExistingProductImage : img
        )
      );
      
      // If this is a server image and we have an ownerId, update it on the server
      if (ownerId && !isTemporaryImage(editedImage)) {
        // Create a new instance of useUpdateProductImage with the correct imageId
        const { mutateAsync: updateImageWithId } = useUpdateProductImage({ 
          productId: ownerType === 'product' ? ownerId : undefined, 
          variantId: ownerType === 'variant' ? ownerId : undefined,
          imageId: editedImage.id as number 
        });
        
        // Call the mutation with the correct data format
        updateImageWithId({
          alt_text: editedImage.alt_text,
          is_default: editedImage.is_default,
          sort_order: editedImage.sort_order
        }).catch(error => {
          console.error('Error updating image:', error);
          setSnackbar({
            open: true,
            message: t('admin.products.images.update_error'),
            severity: 'error'
          });
        });
      } else if (!ownerId) {
        // If there is no ownerId, do nothing
      }
    }
    
    setEditDialogOpen(false);
    setSelectedImage(null);
  };
  
  // Handle setting an image as default
  const handleSetDefault = (image: ImageItem): void => {
    // Skip if already default
    if (image.is_default) return;
    
    // Update all images to set the selected one as default
    if (isTemporaryImage(image)) {
      // Update temporary images
      setTempImages(prev => 
        prev.map(img => ({
          ...img,
          is_default: img.id === image.id
        }))
      );
      
      // Also update existing images to remove default flag
      setExistingImages(prev => 
        prev.map(img => ({
          ...img,
          is_default: false
        }))
      );
    } else {
      // Update existing images
      setExistingImages(prev => 
        prev.map(img => ({
          ...img,
          is_default: img.id === image.id
        }))
      );
      
      // Also update temporary images to remove default flag
      setTempImages(prev => 
        prev.map(img => ({
          ...img,
          is_default: false
        }))
      );
      
      // If this is a server image and we have an ownerId, update it on the server
      if (ownerId && !isTemporaryImage(image)) {
        // Create a new instance of useUpdateProductImage with the correct imageId
        const { mutateAsync: updateImageWithId } = useUpdateProductImage({ 
          productId: ownerType === 'product' ? ownerId : undefined, 
          variantId: ownerType === 'variant' ? ownerId : undefined,
          imageId: image.id as number 
        });
        
        // Call the mutation with the correct data format
        updateImageWithId({
          alt_text: image.alt_text,
          is_default: true,
          sort_order: image.sort_order
        }).catch(error => {
          console.error('Error updating image:', error);
          setSnackbar({
            open: true,
            message: t('admin.products.images.update_error'),
            severity: 'error'
          });
        });
      } else if (!ownerId) {
        // If there is no ownerId, do nothing
      }
    }
  };
  
  // Handle opening delete dialog
  const handleOpenDeleteDialog = (image: ImageItem): void => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };
  
  // Handle closing delete dialog
  const handleCloseDeleteDialog = (): void => {
    setDeleteDialogOpen(false);
    setSelectedImage(null);
  };
  
  // Handle deleting an image
  const handleDeleteImage = (): void => {
    if (!selectedImage) return;
    
    if (isTemporaryImage(selectedImage)) {
      // Remove temporary image
      setTempImages(prev => 
        prev.filter(img => img.id !== selectedImage.id)
      );
      
      // Release object URL to prevent memory leaks
      if ('thumbnail_url' in selectedImage) {
        URL.revokeObjectURL(selectedImage.thumbnail_url);
      }
    } else {
      // Remove existing image
      setExistingImages(prev => 
        prev.filter(img => img.id !== selectedImage.id)
      );
      
      // If this is a server image and we have an ownerId, delete it on the server
      if (ownerId && !isTemporaryImage(selectedImage)) {
        // Create a new instance of useDeleteProductImage with the correct imageId
        const { mutateAsync: deleteImageWithId } = useDeleteProductImage({
          productId: ownerType === 'product' ? ownerId : undefined, 
          variantId: ownerType === 'variant' ? ownerId : undefined,
          imageId: selectedImage.id as number
        });
        
        // Call the mutation (with no parameters since the imageId is already set in the hook)
        deleteImageWithId().catch(error => {
          console.error('Error deleting image:', error);
          setSnackbar({
            open: true,
            message: t('admin.products.images.delete_error'),
            severity: 'error'
          });
        });
      } else if (!ownerId) {
        // If there is no ownerId, do nothing
      }
    }
    
    setDeleteDialogOpen(false);
    setSelectedImage(null);
  };
  
  // Handle retrying a failed upload
  const handleRetryUpload = (image: TemporaryImage): void => {
    // Reset status and error
    setTempImages(prev => 
      prev.map(img => 
        img.id === image.id 
          ? { ...img, upload_status: 'pending', error: undefined, progress: 0 } 
          : img
      )
    );
    
    // Start upload with context information
    uploadTempImage({
      file: image.file,
      context: `${ownerType}-${instanceId}-retry`
    })
      .then(response => {
        // Update the temporary image with the response data
        setTempImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { 
                  ...img, 
                  id: response.temp_id,
                  upload_status: 'uploaded',
                  progress: 100,
                  original_filename: response.original_filename,
                  file_size: response.file_size,
                  content_type: response.content_type
                } 
              : img
          )
        );
      })
      .catch(error => {
        console.error('Error uploading image:', error);
        
        // Update status to error
        setTempImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { 
                  ...img, 
                  upload_status: 'error',
                  error: 'Failed to upload image'
                } 
              : img
          )
        );
        
        // Show error notification
        setSnackbar({
          open: true,
          message: t('admin.products.images.upload_error'),
          severity: 'error'
        });
      });
  };
  
  // Handle closing snackbar
  const handleCloseSnackbar = (): void => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  return (
    <ImageKitProvider urlEndpoint="https://ik.imagekit.io/lvioy81zs">
      <Box sx={{ width: '100%' }}>
        {/* Dropzone for uploading images */}
        <Paper
          {...getRootProps()}
          sx={{
            p: 2,
            mb: 2,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
          <input {...getInputProps()} />
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center',
            p: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <EnhanceIcon sx={{ fontSize: 36, color: 'secondary.main' }} />
            </Box>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', width: '100%' }}>
              {isDragActive
                ? t('admin.products.images.drop_files')
                : t('admin.products.images.drag_drop')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', width: '100%', mb: 2 }}>
              {t('admin.products.images.file_requirements')}
            </Typography>
            <Typography variant="body2" color="secondary" sx={{ textAlign: 'center', width: '100%', mb: 2 }}>
              {t('admin.products.images.ai_enhancement_available')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ alignSelf: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                // Trigger the hidden file input click event
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) {
                  fileInput.click();
                }
              }}
            >
              {t('admin.products.images.browse_files')}
            </Button>
          </Box>
        </Paper>
      
      {/* Loading indicator */}
      {isLoadingImages && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Image grid */}
      {allImages.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', width: '100%' }}>
            {t('admin.products.images.current_images')}
          </Typography>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allImages.map(img => img.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <ImageList cols={3} sx={{ 
                overflow: 'hidden', 
                gap: 2, 
                width: 'auto', 
                margin: 0,
                justifyContent: 'center',
                gridTemplateColumns: 'repeat(3, 1fr) !important'
              }}>
                {allImages.map(image => (
                  <SortableImage
                    key={image.id.toString()}
                    id={image.id.toString()}
                    image={image}
                    onEdit={handleOpenEditDialog}
                    onDelete={handleOpenDeleteDialog}
                    onSetDefault={handleSetDefault}
                    onRetry={isTemporaryImage(image) ? handleRetryUpload : undefined}
                  />
                ))}
              </ImageList>
            </SortableContext>
          </DndContext>
        </Box>
      )}
      
      {/* No images message */}
      {allImages.length === 0 && !isLoadingImages && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            {t('admin.products.images.no_images')}
          </Typography>
        </Box>
      )}
      
      {/* Edit Dialog */}
      <ImageEditDialog
        open={editDialogOpen}
        image={selectedImage}
        onClose={handleCloseEditDialog}
        onSave={handleSaveImage}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>{t('admin.products.images.delete_confirmation')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.products.images.delete_warning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleDeleteImage} 
            color="error" 
            variant="contained"
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ImageKit.io Dialog */}
      <ImageDialog
        open={imageKitDialogOpen}
        onClose={() => {
          setImageKitDialogOpen(false);
          // Clean up object URLs to prevent memory leaks
          selectedFilesForImageKit.forEach(item => {
            if (item.url.startsWith('blob:')) {
              URL.revokeObjectURL(item.url);
            }
          });
          setSelectedFilesForImageKit([]);
        }}
        images={selectedFilesForImageKit.map(fileItem => ({
          ...fileItem,
          context: `${ownerType}-${ownerId || 'new'}-${instanceId}`
        }))}
        instanceId={instanceId} // Pass the instance ID to the dialog
        onUseOriginal={(imageItem) => {
          // Check if the file belongs to this instance using the registry
          const belongsToInstance = imageUploadRegistry.fileMatchesInstance(imageItem.file, ownerType, instanceId);
          const imageContext = imageItem.context || 'unknown';
          
          console.log(`ImageManager[${instanceId}]: Using original image in ${ownerType} with ID ${ownerId || 'new'}, image context: ${imageContext}`);
          console.log(`ImageManager[${instanceId}]: File belongs to this instance: ${belongsToInstance}`);
          
          // Only process the image if it belongs to this instance according to the registry
          if (belongsToInstance) {
            // Upload the original image directly
            handleUploadOriginalImages([imageItem.file]);
            // Close the dialog
            setImageKitDialogOpen(false);
          } else {
            console.warn(`ImageManager[${instanceId}]: Ignoring image with mismatched ownership`);
          }
        }}
        onUseTransformed={(imageItem, transformedUrl) => {
          // Check if the file belongs to this instance using the registry
          const belongsToInstance = imageUploadRegistry.fileMatchesInstance(imageItem.file, ownerType, instanceId);
          const imageContext = imageItem.context || 'unknown';
          
          console.log(`ImageManager[${instanceId}]: Using transformed image in ${ownerType} with ID ${ownerId || 'new'}, image context: ${imageContext}`);
          console.log(`ImageManager[${instanceId}]: File belongs to this instance: ${belongsToInstance}`);
          
          // Only process the image if it belongs to this instance according to the registry
          if (belongsToInstance) {
            // Upload the transformed image
            handleUploadTransformedImage(imageItem.file, transformedUrl);
            // Close the dialog
            setImageKitDialogOpen(false);
          } else {
            console.warn(`ImageManager[${instanceId}]: Ignoring transformed image with mismatched ownership`);
          }
        }}
      />
      </Box>
    </ImageKitProvider>
  );
};

export default ImageManager;
