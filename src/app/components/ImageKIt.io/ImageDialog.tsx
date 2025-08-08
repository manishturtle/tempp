"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Card,
  CardMedia,
  Modal,           // Changed from Dialog
  Backdrop, 
  Box,
  Stack,
  Chip,
  TextField,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Tooltip,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageUploadRegistry from "@/app/services/ImageUploadRegistry";
import { Image as ImageKitImage } from "@imagekit/next";
import CloseIcon from "@mui/icons-material/Close";
import CompareIcon from "@mui/icons-material/Compare";
import ComparisonDialog from "./ComparisonDialog";
import { transformImage } from "@/app/actions/imagekit";

export interface ImageItem {
  url: string;
  file: File;
  isEnhancing?: boolean;
  transformedUrl?: string;
  context?: string; // Add context to identify which ImageManager instance this item belongs to
  sessionId?: string; // Session ID from the ImageUploadRegistry
}

interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  images: ImageItem[];
  instanceId?: string; // Add instanceId prop to identify which ImageManager instance is using this dialog
  onUseOriginal?: (image: ImageItem) => void;
  onUseTransformed?: (image: ImageItem, transformedUrl: string) => void;
}
const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '600px',
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  outline: 'none',
  display: 'flex',          // Added for flex layout
  flexDirection: 'column',  // Arrange children (header, content) vertically
  maxHeight: '90vh',        // Set a maximum height
};
const ImageDialog = ({
  open,
  onClose,
  images: initialImages,
  instanceId = "unknown",
  onUseOriginal,
  onUseTransformed,
}: ImageDialogProps) => {
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [activeTabs, setActiveTabs] = useState<{ [key: number]: number }>({});
  const [crops, setCrops] = useState<{ [key: number]: Crop }>({});
  const [completedCrops, setCompletedCrops] = useState<{ [key: number]: PixelCrop }>({});
  // Fixed 1:1 aspect ratio (square)
  const [aspectRatio] = useState<number>(1);
  const imgRefs = useRef<{ [key: number]: HTMLImageElement }>({});

  // Update images state when initialImages prop changes
  useEffect(() => {
    setImages(initialImages);

    // Get context from first image if available, otherwise use instanceId
    const contextFromImage = initialImages[0]?.context || "unknown";
    const effectiveInstanceId = contextFromImage || instanceId;

    // Log received images and verify their registration with the registry if they have files
    console.log(
      `ImageDialog[${effectiveInstanceId}]: Received images:`,
      initialImages
    );

    // Check each image to verify its ownership in the registry
    initialImages.forEach((img) => {
      if (img.file) {
        const session = imageUploadRegistry.getSessionForFile(img.file);
        if (session) {
          console.log(
            `ImageDialog: Image ${img.file.name} belongs to ${session.ownerType}/${session.instanceId}`
          );
        } else {
          console.warn(
            `ImageDialog: Image ${img.file.name} has no registered session!`
          );
        }
      }
    });
  }, [initialImages, instanceId]);
  const handleTabChange = (index: number, newValue: number) => {
    setActiveTabs((prev) => ({ ...prev, [index]: newValue }));
  };

  // Function to generate a centered crop with the specified aspect ratio
  const centerAspectCrop = (
    mediaWidth: number,
    mediaHeight: number,
    aspect: number | undefined
  ): Crop => {
    if (!aspect) {
      // If no aspect ratio, use a default centered crop that covers 80% of the image
      return {
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80
      };
    }
    
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  };
  
  // Function to handle crop change
  const handleCropChange = (index: number, crop: Crop) => {
    setCrops((prev) => ({ ...prev, [index]: crop }));
  };
  
  // Function to handle crop complete
  const handleCropComplete = (index: number, crop: PixelCrop) => {
    setCompletedCrops((prev) => ({ ...prev, [index]: crop }));
  };
  
  // NOTE: Aspect ratio is fixed at 1:1 (square) and cannot be changed
  // This function is kept for reference but no longer used in the UI
  const handleAspectRatioChange = () => {
    // Aspect ratio is fixed at 1:1, so this function does nothing
    return;
  };
  
  // Function to load image and set initial crop
  const onImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    imgRefs.current[index] = e.currentTarget;
    
    // Always initialize with 1:1 fixed aspect ratio (square) crop
    // This ensures all images have the same square crop regardless of previous state
    setCrops(prev => ({
      ...prev,
      [index]: centerAspectCrop(width, height, 1) // Force 1:1 ratio
    }));
  };
  
  // Get the cropped image as a data URL
  const getCroppedImg = (imageRef: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.naturalWidth / imageRef.width;
      const scaleY = imageRef.naturalHeight / imageRef.height;
      
      const pixelRatio = window.devicePixelRatio;
      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }
      
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';
      
      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;
      
      ctx.drawImage(
        imageRef,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
      
      // Convert canvas to data URL and resolve the promise
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
  };
  return (
    <Modal
      aria-labelledby="image-edit-modal-title"
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          {/* The main modal content is now the scrollable area */}
          <Box sx={{ overflowY: 'auto', p: 2 }}>
            <Stack spacing={2}>
              {images.map((image, index) => {
                const activeTab = activeTabs[index] || 0;

                return (
                  <Box key={index} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    
                    {/* ========================================================== */}
                    {/* === THIS IS THE UPDATED TABS + ICON SECTION === */}
                    {/* ========================================================== */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                      <Tabs value={activeTab} onChange={(e, newValue) => handleTabChange(index, newValue)} variant="fullWidth" sx={{ flexGrow: 1 }}>
                        <Tab label="Original" />
                        <Tab label="Generate with AI" />
                      </Tabs>
                      <IconButton aria-label="close" onClick={onClose} sx={{ mr: 1 }}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    
                    {/* Tab 1: Original View */}
                    {activeTab === 0 && (
                      <Stack spacing={2} sx={{ p: 2 }}>
                        <Box sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ReactCrop
                            crop={crops[index]}
                            onChange={(_, percentCrop) => handleCropChange(index, percentCrop)}
                            onComplete={(c) => handleCropComplete(index, c)}
                            aspect={aspectRatio}
                            circularCrop={false}
                          >
                            <img
                              src={image.url}
                              alt={`Selected image ${index + 1}`}
                              onLoad={(e) => onImageLoad(index, e)}
                              style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                            />
                          </ReactCrop>
                        </Box>
                        
                        {/* 1:1 aspect ratio is enforced in code but not shown in UI */}
                        
                        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            onClick={async () => {
                              try {
                                // Get the image reference and completed crop for this index
                                const imageRef = imgRefs.current[index];
                                const crop = completedCrops[index];
                                
                                if (imageRef && crop) {
                                  // Get the cropped image data URL
                                  const croppedImageUrl = await getCroppedImg(imageRef, crop);
                                  
                                  // Create a new file from the cropped image
                                  const response = await fetch(croppedImageUrl);
                                  const blob = await response.blob();
                                  const croppedFile = new File([blob], image.file.name, { type: 'image/jpeg' });
                                  
                                  // Create a modified image item with the cropped file
                                  const croppedImage: ImageItem = {
                                    ...image,
                                    url: croppedImageUrl,
                                    file: croppedFile
                                  };
                                  
                                  // Log which context is handling the image selection
                                  console.log(`ImageDialog: Using cropped image with context: ${image.context || instanceId}`);
                                  
                                  // Verify this file's ownership in the registry
                                  const session = imageUploadRegistry.getSessionForFile(image.file);
                                  if (session) {
                                    console.log(`ImageDialog: Using image from session ${session.id} (${session.ownerType}/${session.instanceId})`);
                                  }
                                  
                                  onUseOriginal && onUseOriginal(croppedImage);
                                } else {
                                  // If no crop is selected, use the original image
                                  console.log(`ImageDialog: No crop selected, using original image with context: ${image.context || instanceId}`);
                                  onUseOriginal && onUseOriginal(image);
                                }
                              } catch (error) {
                                console.error('Error processing cropped image:', error);
                                // Fallback to using the original image
                                onUseOriginal && onUseOriginal(image);
                              }
                            }}
                            sx={{ textTransform: 'none', fontSize: '1rem', py: 1.2 }}
                          >
                            Continue
                          </Button>
                        </Stack>
                      </Stack>
                    )}

                    {/* Tab 2: Enhance AI View */}
                    {activeTab === 1 && (
                      <Box sx={{ p: 2 }}>
                        <EnhanceAIView
                          imageUrl={image.url}
                          file={image.file}
                          onBack={() => handleTabChange(index, 0)}
                          onUseTransformed={(transformedUrl) => {
                            if (onUseTransformed) {
                              onUseTransformed(image, transformedUrl);
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

// AI Enhancement View Component
interface EnhanceAIViewProps {
  imageUrl: string;
  onBack: () => void;
  file?: File;
  onUseTransformed?: (transformedUrl: string) => void;
}

const enhancementOptions = [
  { label: "Remove Bg", value: "remove_bg" },
  { label: "Blur Bg", value: "blur_bg" },
  { label: "Auto Tone", value: "auto_tone" },
  { label: "Polish", value: "polish" },
  { label: "Upscale", value: "upscale" },
  { label: "Enhance Faces", value: "enhance_faces" },
  { label: "Generate Variations", value: "generate_variations" },
];

const aspectRatioOptions = [
  { label: "Original", value: "" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "3:2", value: "3:2" },
  { label: "2:3", value: "2:3" },
];

const cropModeOptions = [
  { label: "Maintain Ratio", value: "maintain_ratio" },
  { label: "Pad Resize", value: "pad_resize" },
  { label: "Force Crop", value: "force" },
  { label: "Extract", value: "extract" },
  { label: "Max Size", value: "at_max" },
  { label: "Min Size", value: "at_least" },
];

const focusOptions = [
  { label: "Center", value: "center" },
  { label: "Top", value: "top" },
  { label: "Left", value: "left" },
  { label: "Bottom", value: "bottom" },
  { label: "Right", value: "right" },
  { label: "Face", value: "face" },
];

const EnhanceAIView = ({
  imageUrl,
  onBack,
  file,
  onUseTransformed,
}: EnhanceAIViewProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [variationId, setVariationId] = useState<number>(1);
  const [variations, setVariations] = useState<string[]>([]);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [appliedTransformations, setAppliedTransformations] = useState<string[]>([]);
  
  // Image cropping related states
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  // Fixed 1:1 aspect ratio (square) for cropping
  const [cropAspectRatio] = useState<number>(1);
  const imgRef = useRef<HTMLImageElement>(null);

  // Aspect ratio and cropping options
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("");
  const [selectedCropMode, setSelectedCropMode] =
    useState<string>("maintain_ratio");
  const [selectedFocus, setSelectedFocus] = useState<string>("center");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");

  const handleOptionToggle = (value: string) => {
    setSelectedOptions((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleGenerateWithAI = useCallback(async () => {
    // Allow processing if either options are selected OR a prompt is provided
    if (selectedOptions.length === 0 && (!prompt || prompt.trim() === "")) {
      setError(
        "Please select at least one enhancement option or enter a prompt"
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // If we have a crop, apply it first
      let sourceImageUrl = imageUrl;
      let sourceBlob: Blob;
      
      if (imgRef.current && completedCrop) {
        try {
          // Get the cropped image data URL
          const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
          sourceImageUrl = croppedImageUrl;
          
          // Convert data URL to blob for further processing
          const response = await fetch(croppedImageUrl);
          sourceBlob = await response.blob();
        } catch (error) {
          console.error('Error applying crop before AI processing:', error);
          // Fall back to original image if cropping fails
          const response = await fetch(imageUrl);
          sourceBlob = await response.blob();
        }
      } else {
        // Use original image if no crop is applied
        const response = await fetch(imageUrl);
        sourceBlob = await response.blob();
      }
      
      // Convert image to base64
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;

          // Prepare transformation parameters
          const transformParams: any = {
            imageData: base64data,
            transformations: selectedOptions,
            prompt: prompt.trim() || undefined,
            variationId: selectedOptions.includes("generate_variations")
              ? variationId
              : undefined,
          };

          // Add aspect ratio and cropping parameters if resize_crop is selected
          if (selectedOptions.includes("resize_crop")) {
            if (width) transformParams.width = Number(width);
            if (height) transformParams.height = Number(height);
            if (selectedAspectRatio)
              transformParams.aspectRatio = selectedAspectRatio;
            if (selectedCropMode) transformParams.cropMode = selectedCropMode;
            if (selectedFocus) transformParams.focus = selectedFocus;
          }

          // Call the server action to transform the image
          const transformedImageUrl = await transformImage(transformParams);

          setTransformedUrl(transformedImageUrl);

          // Build a list of applied transformations for the comparison dialog
          const transformationsList = [];

          if (selectedOptions.includes("remove_bg")) {
            transformationsList.push("Background Removal");
          }

          if (selectedOptions.includes("blur_bg")) {
            transformationsList.push("Background Blur");
          }

          if (selectedOptions.includes("auto_tone")) {
            transformationsList.push("Auto Tone");
          }

          if (selectedOptions.includes("polish")) {
            transformationsList.push("Polish (Quality Enhancement)");
          }

          if (selectedOptions.includes("upscale")) {
            transformationsList.push("Upscale");
          }

          if (selectedOptions.includes("enhance_faces")) {
            transformationsList.push("Face Enhancement");
          }

          if (selectedOptions.includes("generate_variations")) {
            transformationsList.push("Variation Generation");
          }

          if (selectedOptions.includes("resize_crop")) {
            let resizeDetails = "Resize & Crop";
            if (width && height) {
              resizeDetails += ` (${width}x${height})`;
            }
            if (selectedAspectRatio) {
              resizeDetails += `, Aspect Ratio: ${selectedAspectRatio}`;
            }
            if (selectedCropMode) {
              resizeDetails += `, Crop Mode: ${selectedCropMode.replace(
                "_",
                " "
              )}`;
            }
            transformationsList.push(resizeDetails);
          }

          if (prompt && prompt.trim()) {
            transformationsList.push(`Prompt: "${prompt.trim()}"`);
          }

          setAppliedTransformations(transformationsList);

          // If generating variations, create additional variations
          if (selectedOptions.includes("generate_variations")) {
            const newVariations = [];
            // Generate 3 variations with different IDs
            for (let i = 2; i <= 4; i++) {
              // Prepare transformation parameters for variations
              const variantParams: any = {
                imageData: base64data,
                transformations: selectedOptions,
                prompt: prompt.trim() || undefined,
                variationId: i,
              };

              // Add aspect ratio and cropping parameters if resize_crop is selected
              if (selectedOptions.includes("resize_crop")) {
                if (width) variantParams.width = Number(width);
                if (height) variantParams.height = Number(height);
                if (selectedAspectRatio)
                  variantParams.aspectRatio = selectedAspectRatio;
                if (selectedCropMode) variantParams.cropMode = selectedCropMode;
                if (selectedFocus) variantParams.focus = selectedFocus;
              }

              const variantUrl = await transformImage(variantParams);
              newVariations.push(variantUrl);
            }
            setVariations(newVariations);
          } else {
            setVariations([]);
          }

          setIsProcessing(false);
        } catch (err) {
          console.error("Error processing image:", err);
          setError("Failed to process image. Please try again.");
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(sourceBlob);
    } catch (err) {
      console.error("Error preparing image:", err);
      setError("Failed to prepare image. Please try again.");
      setIsProcessing(false);
    }
  }, [imageUrl, selectedOptions, prompt]);

  const handleCloseError = () => {
    setError(null);
  };

  // Function to generate a centered crop with the specified aspect ratio
  const centerAspectCrop = (
    mediaWidth: number,
    mediaHeight: number,
    aspect: number | undefined
  ): Crop => {
    if (!aspect) {
      // If no aspect ratio, use a default centered crop that covers 80% of the image
      return {
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80
      };
    }
    
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  };
  
  // Function to load image and set initial crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (imgRef.current) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, cropAspectRatio));
    }
  };
  
  // Aspect ratio is fixed at 1:1, no change handler needed
  // When we need to update crop with the fixed aspect ratio
  const updateCropWithFixedRatio = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, 1)); // Always use 1:1 ratio
    }
  };
  
  // Get the cropped image as a data URL
  const getCroppedImg = (imageElement: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const scaleX = imageElement.naturalWidth / imageElement.width;
      const scaleY = imageElement.naturalHeight / imageElement.height;
      
      const pixelRatio = window.devicePixelRatio;
      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }
      
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';
      
      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;
      
      ctx.drawImage(
        imageElement,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
      
      // Convert canvas to data URL and resolve the promise
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
  };
  
  return (
    <>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <
      >
        {/* Success notification for variations */}
        {variations.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Generated {variations.length + 1} variations of the image
          </Alert>
        )}
        {/* First row: Image Crop and Chips side by side */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 200,
              height: 200,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "grey.100",
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {transformedUrl ? (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                  "&:hover": {
                    "& .comparison-overlay": {
                      opacity: 1,
                    },
                  },
                }}
                onClick={() => setComparisonDialogOpen(true)}
              >
                <ImageKitImage
                  src={transformedUrl.replace(
                    /^https:\/\/ik\.imagekit\.io\/[^/]+\//i,
                    "/"
                  )}
                  width={200}
                  height={200}
                  alt="Enhanced image"
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
                <Box
                  className="comparison-overlay"
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                >
                  <Tooltip title="Compare before and after">
                    <CompareIcon sx={{ color: "white", fontSize: 40 }} />
                  </Tooltip>
                </Box>
              </Box>
            ) : (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspectRatio}
                circularCrop={false}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Image to enhance"
                  onLoad={onImageLoad}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "250px",
                    maxHeight: "250px",
                    objectFit: "contain",
                  }}
                />
              </ReactCrop>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {enhancementOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => handleOptionToggle(option.value)}
                color={
                  selectedOptions.includes(option.value) ? "primary" : "default"
                }
                variant={
                  selectedOptions.includes(option.value) ? "filled" : "outlined"
                }
              />
            ))}
          </Box>
        </Box>

        {/* Fixed 1:1 aspect ratio is enforced in code (UI controls removed) */}
        
        {/* Second row: Text field */}
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Tell AI what do you want to do with the image"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          size="small"
          sx={{
            bgcolor: "background.default",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
            },
          }}
        />

        {/* Aspect ratio and cropping options (only shown when resize_crop is selected) */}
        {selectedOptions.includes("resize_crop") && (
          <Box          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Resize & Crop Options
            </Typography>

            {/* Width and Height inputs */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="Width"
                type="number"
                size="small"
                value={width}
                onChange={(e) =>
                  setWidth(e.target.value ? Number(e.target.value) : "")
                }
                InputProps={{ inputProps: { min: 1 } }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Height"
                type="number"
                size="small"
                value={height}
                onChange={(e) =>
                  setHeight(e.target.value ? Number(e.target.value) : "")
                }
                InputProps={{ inputProps: { min: 1 } }}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Aspect Ratio selection */}
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Aspect Ratio
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {aspectRatioOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() => setSelectedAspectRatio(option.value)}
                  color={
                    selectedAspectRatio === option.value ? "primary" : "default"
                  }
                  variant={
                    selectedAspectRatio === option.value ? "filled" : "outlined"
                  }
                  size="small"
                />
              ))}
            </Box>

            {/* Crop Mode selection */}
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Crop Mode
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {cropModeOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() => setSelectedCropMode(option.value)}
                  color={
                    selectedCropMode === option.value ? "primary" : "default"
                  }
                  variant={
                    selectedCropMode === option.value ? "filled" : "outlined"
                  }
                  size="small"
                />
              ))}
            </Box>

            {/* Focus selection */}
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Focus
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap",mb:2 }}>
              {focusOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() => setSelectedFocus(option.value)}
                  color={selectedFocus === option.value ? "primary" : "default"}
                  variant={
                    selectedFocus === option.value ? "filled" : "outlined"
                  }
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Third row: Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              flex: 1,
            }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateWithAI}
            disabled={
              isProcessing ||
              (selectedOptions.length === 0 &&
                (!prompt || prompt.trim() === ""))
            }
            sx={{
              borderRadius: 1,
              textTransform: "none",
              flex: 1,
            }}
          >
            {isProcessing ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Generate with AI"
            )}
          </Button>

          {transformedUrl && (
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() =>
                onUseTransformed && onUseTransformed(transformedUrl)
              }
              sx={{
                borderRadius: 1,
                textTransform: "none",
                flex: 1,
              }}
            >
              Use Enhanced
            </Button>
          )}
        </Stack>

        {/* Variations section */}
        {variations.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Image Variations
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {/* First variation (already shown in the main image) */}
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "grey.100",
                  border: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                <ImageKitImage
                  src={
                    transformedUrl?.replace(
                      /^https:\/\/ik\.imagekit\.io\/Yashyp\//i,
                      "/"
                    ) || ""
                  }
                  width={120}
                  height={120}
                  alt="Variation 1"
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              </Box>

              {/* Other variations */}
              {variations.map((varUrl, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "grey.100",
                    cursor: "pointer",
                    position: "relative",
                    "&:hover": {
                      "& .comparison-overlay": {
                        opacity: 1,
                      },
                    },
                  }}
                  onClick={() => {
                    setTransformedUrl(varUrl);
                    setVariationId(index + 2); // Variation IDs start from 2 for the additional variations
                  }}
                >
                  <ImageKitImage
                    src={
                      varUrl.replace(
                        /^https:\/\/ik\.imagekit\.io\/[^/]+\//i,
                        "/"
                      ) || ""
                    }
                    width={120}
                    height={120}
                    alt={`Variation ${index + 2}`}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                  <Box
                    className="comparison-overlay"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "white", fontWeight: "bold" }}
                    >
                      Select
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </>

      {/* Comparison Dialog */}
      <ComparisonDialog
        open={comparisonDialogOpen}
        onClose={() => setComparisonDialogOpen(false)}
        originalImageUrl={imageUrl}
        transformedImageUrl={transformedUrl || ""}
        transformationDetails={appliedTransformations}
      />
    </>
  );
};

export default ImageDialog;
