'use client';

import { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Grid, 
  Paper,
  IconButton,
  Stack
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useUploadTemporaryImage } from '@/app/hooks/api/assets';

/**
 * Interface for image data that works with both temporary uploads and API responses
 */
export interface ImageData {
  // Common fields
  id: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
  
  // Fields for temporary uploads
  original_filename?: string;
  
  // Fields from API response
  image?: string;        // Full URL to image from API/GCS
  product?: number;      // Product ID reference from API
  variant?: number;      // Variant ID reference from API
  created_at?: string;   // Timestamp from API
  updated_at?: string;   // Timestamp from API
  client_id?: number;    // Client ID from API
  company_id?: number;   // Company ID from API
}

export interface ImageUploaderProps {
  onImageUploaded: (imageData: ImageData) => void;
  ownerType: 'product' | 'variant' | 'division';
  existingImages?: ImageData[];
  disabled?: boolean;
  maxImages?: number;
  context?: string;
  /**
   * Optional custom render function for the upload button
   * @param openFileDialog Function to trigger file selection dialog
   */
  renderUploadButton?: (openFileDialog: () => void) => React.ReactNode;
}

/**
 * Component for uploading images for products or variants
 */
export const ImageUploader = ({
  onImageUploaded,
  ownerType,
  existingImages = [],
  disabled = false,
  maxImages = 10,
  context = 'default',
  renderUploadButton
}: ImageUploaderProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Use the upload mutation from assets.ts
  const uploadMutation = useUploadTemporaryImage();

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          continue;
        }
        
        // Check if we've reached the maximum number of images
        if (existingImages.length >= maxImages) {
          console.warn(`Maximum number of images (${maxImages}) reached`);
          break;
        }
        
        // Upload the file
        const result = await uploadMutation.mutateAsync({
          file,
          ownerType: ownerType as 'product' | 'variant' | 'division',
          context
        });
        
        // Create image data object
        const imageData: ImageData = {
          id: result.temp_id,
          alt_text: '',
          sort_order: existingImages.length,
          is_default: existingImages.length === 0,
          original_filename: result.original_filename
        };
        
        // Notify parent component
        onImageUploaded(imageData);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Open file dialog
  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading || existingImages.length >= maxImages}
      />
      
      {/* Render custom upload button if provided, otherwise use default */}
      {renderUploadButton ? (
        renderUploadButton(handleClickUpload)
      ) : (
        <Box>
          {!isUploading && (
            <Typography variant="subtitle1" gutterBottom>
              {ownerType === 'division' 
                ? t('catalogue.division.images', 'Division Image')
                : t(`products.${ownerType === 'product' ? 'product' : 'variants'}.images`, `${ownerType === 'product' ? 'Product' : 'Variant'} Images`)}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="primary"
            startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            onClick={handleClickUpload}
            disabled={disabled || isUploading || existingImages.length >= maxImages}
            sx={{ mb: 2 }}
          >
            {isUploading
              ? t('common.uploading', 'Uploading...')
              : t('products.images.addImages', 'Add Images')}
            {!isUploading && maxImages > 0 && existingImages.length < maxImages && 
              ` (${maxImages - existingImages.length} ${t('products.images.remaining', 'remaining')})`
            }
          </Button>
          
          {/* Display existing images count */}
          {existingImages.length > 0 && !isUploading && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('products.images.count', '{{count}} images uploaded', { count: existingImages.length })}
              {maxImages > 0 && ` (${t('products.images.maximum', 'Maximum: {{max}}', { max: maxImages })})`}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
