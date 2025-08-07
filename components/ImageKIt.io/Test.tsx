'use client';

import { useState, useRef } from 'react';
import { Button, Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ImageKitProvider } from '@imagekit/next';
import ImageDialog, { ImageItem } from './ImageDialog';

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newImages: ImageItem[] = Array.from(files).map(file => ({
        url: URL.createObjectURL(file),
        file: file
      }));
      setSelectedImages(newImages);
      console.log(newImages);
      setDialogOpen(true);
      
      // Reset the file input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <ImageKitProvider urlEndpoint="https://ik.imagekit.io/dg0viwk3la">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        p: 4
      }}>
      <input
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
      <Button
        variant="contained"
        startIcon={<CloudUploadIcon />}
        onClick={handleButtonClick}
        sx={{ mb: 2 }}
      >
        Select Images
      </Button>
      
      <ImageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        images={selectedImages}
      />
    </Box>
    </ImageKitProvider>
  );
}