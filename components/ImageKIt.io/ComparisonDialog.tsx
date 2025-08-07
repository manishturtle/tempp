'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  Box,
  Stack,
  Typography,
  Slider,
  Paper
} from '@mui/material';
import { Image as ImageKitImage } from '@imagekit/next';
import CloseIcon from '@mui/icons-material/Close';
import CompareIcon from '@mui/icons-material/Compare';

interface ComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  originalImageUrl: string;
  transformedImageUrl: string;
  transformationDetails?: string[];
}

const ComparisonDialog = ({ 
  open, 
  onClose, 
  originalImageUrl, 
  transformedImageUrl,
  transformationDetails = []
}: ComparisonDialogProps) => {
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setSliderPosition(newValue as number);
  };

  const toggleComparisonMode = () => {
    setComparisonMode(prev => prev === 'side-by-side' ? 'slider' : 'side-by-side');
  };

  // Determine if original URL is a blob URL or an ImageKit URL
  const isOriginalBlob = originalImageUrl.startsWith('blob:');
  const cleanOriginalUrl = isOriginalBlob ? originalImageUrl : originalImageUrl.replace(/^https:\/\/ik\.imagekit\.io\/[^/]+\//i, '/');
  const cleanTransformedUrl = transformedImageUrl.replace(/^https:\/\/ik\.imagekit\.io\/[^/]+\//i, '/');

  return (
    <Dialog
      open={open}
      maxWidth="lg"
      fullWidth
      onClose={onClose}
    >
      <DialogTitle>
        Image Comparison
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
        <IconButton
          aria-label="toggle comparison mode"
          onClick={toggleComparisonMode}
          sx={{
            position: 'absolute',
            right: 48,
            top: 8,
          }}
        >
          <CompareIcon />
          <Typography variant="caption" sx={{ ml: 1 }}>
            {comparisonMode === 'side-by-side' ? 'Slider View' : 'Side by Side'}
          </Typography>
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {comparisonMode === 'side-by-side' ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>Original</Typography>
                <Paper elevation={3} sx={{ 
                  p: 1, 
                  width: { xs: '100%', md: 400 }, 
                  height: { xs: 300, md: 400 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isOriginalBlob ? (
                    <img
                      src={cleanOriginalUrl}
                      alt="Original image"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain' 
                      }}
                    />
                  ) : (
                    <ImageKitImage
                      src={cleanOriginalUrl}
                      width={380}
                      height={380}
                      alt="Original image"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain' 
                      }}
                    />
                  )}
                </Paper>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>Transformed</Typography>
                <Paper elevation={3} sx={{ 
                  p: 1, 
                  width: { xs: '100%', md: 400 }, 
                  height: { xs: 300, md: 400 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ImageKitImage
                    src={cleanTransformedUrl}
                    width={380}
                    height={380}
                    alt="Transformed image"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain' 
                    }}
                  />
                </Paper>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ position: 'relative', width: '100%', height: 500 }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <ImageKitImage
                  src={cleanTransformedUrl}
                  fill
                  alt="Transformed image"
                  style={{ objectFit: 'contain' }}
                />
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${sliderPosition}%`,
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                {isOriginalBlob ? (
                  <img
                    src={cleanOriginalUrl}
                    alt="Original image"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain' 
                    }}
                  />
                ) : (
                  <ImageKitImage
                    src={cleanOriginalUrl}
                    fill
                    alt="Original image"
                    style={{ objectFit: 'contain' }}
                  />
                )}
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPosition}%`,
                  width: 4,
                  backgroundColor: 'primary.main',
                  transform: 'translateX(-50%)',
                  cursor: 'ew-resize',
                  zIndex: 1,
                }}
              />
              <Slider
                value={sliderPosition}
                onChange={handleSliderChange}
                aria-labelledby="comparison-slider"
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                }}
              />
            </Box>
          )}
          
          {/* Transformation details */}
          {transformationDetails.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Applied Transformations</Typography>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Stack spacing={1}>
                  {transformationDetails.map((detail, index) => (
                    <Typography key={index} variant="body2">• {detail}</Typography>
                  ))}
                </Stack>
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ComparisonDialog;
