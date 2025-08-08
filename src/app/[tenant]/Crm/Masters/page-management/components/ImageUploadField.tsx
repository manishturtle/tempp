import { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Tooltip,
  CircularProgress,
  Backdrop,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useUploadLandingPageImage,
  useDeleteLandingPageImage,
} from "@/app/hooks/api/admin/landing-page-images";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { ColorPicker } from "@/app/components/common";

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  aspectRatio?: string;
}

export function ImageUploadField({
  label = "",
  value,
  onChange,
  required = false,
  disabled = false,
  aspectRatio = "16/9",
}: ImageUploadFieldProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: "common",
    fallback: (key) => {
      const translations: Record<string, string> = {
        imagePreview: "Image Preview",
        cancel: "Cancel",
        proceed: "Proceed",
        "cropInstructions.desktop":
          "Adjust the crop area for your desktop image (16:9 ratio)",
        "cropInstructions.mobile":
          "Adjust the crop area for your mobile image (4:3 ratio)",
        "cropInstructions.desktopRatio":
          "Desktop images use 16:9 aspect ratio for optimal display",
        "cropInstructions.tabletRatio":
          "Tablet images use 4:3 aspect ratio for optimal display",
        "cropInstructions.mobileRatio":
          "Mobile images use vertical format for optimal display",
        "errors.imageUploadFailed": "Failed to upload image. Please try again.",
        "validations.requiredField": "This field is required",
      };
      return translations[key] || key;
    },
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previousUrl, setPreviousUrl] = useState<string | null>(value || null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempPreviewUrl, setTempPreviewUrl] = useState<string | null>(null);

  // Crop state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [fitToScale, setFitToScale] = useState<boolean>(false);
  const [paddedPreviewUrl, setPaddedPreviewUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("rgb(0, 0, 0)");
  const imgRef = useRef<HTMLImageElement>(null);

  // Update padded preview image when fitToScale or tempPreviewUrl changes
 
  // Get aspect ratio as a number
  const getNumericAspectRatio = useCallback(() => {
    // Default aspect ratios
    if (aspectRatio === "16/9") return 16 / 9;
    if (aspectRatio === "9/16") return 9 / 16;
    if (aspectRatio === "4/3") return 4 / 3;
    if (aspectRatio === "3/4") return 3 / 4;
    if (aspectRatio === "1/1") return 1;

    // Parse custom aspect ratio
    try {
      const [width, height] = aspectRatio.split("/").map(Number);
      if (width && height) return width / height;
    } catch (e) {
      console.error("Invalid aspect ratio format:", aspectRatio);
    }

    return 16 / 9; // Default fallback
  }, [aspectRatio]);

  // Use our image upload and delete mutations
  const uploadMutation = useUploadLandingPageImage();
  const deleteMutation = useDeleteLandingPageImage();

  // Track previous URL to delete when a new image is uploaded
  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  // Function to generate a centered crop with the specified aspect ratio
  const centerAspectCrop = useCallback(
    (mediaWidth: number, mediaHeight: number): Crop => {
      const aspectRatio = getNumericAspectRatio();
      return centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 90,
          },
          aspectRatio,
          mediaWidth,
          mediaHeight
        ),
        mediaWidth,
        mediaHeight
      );
    },
    [getNumericAspectRatio]
  );

  // Function to generate padded preview image
  const generatePaddedPreview = useCallback(
    (imageUrl: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageUrl;

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          const targetAspectRatio = getNumericAspectRatio();
          const { width: imgWidth, height: imgHeight } = image;

          canvas.width = imgWidth;
          canvas.height = imgWidth / targetAspectRatio;

          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const imgAspectRatio = imgWidth / imgHeight;
          let scaledWidth = canvas.width;
          let scaledHeight = scaledWidth / imgAspectRatio;

          if (scaledHeight > canvas.height) {
            scaledHeight = canvas.height;
            scaledWidth = scaledHeight * imgAspectRatio;
          }

          const x = (canvas.width - scaledWidth) / 2;
          const y = (canvas.height - scaledHeight) / 2;

          ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };

        image.onerror = () => {
          resolve(null);
        };
      });
    },
    [getNumericAspectRatio, backgroundColor]
  );

  useEffect(() => {
    if (fitToScale && tempPreviewUrl) {
      generatePaddedPreview(tempPreviewUrl).then((newUrl) => {
        setPaddedPreviewUrl(newUrl);
      });
    } else {
      setPaddedPreviewUrl(null);
    }
  }, [fitToScale, tempPreviewUrl, generatePaddedPreview]);

  // Function to get cropped image as data URL
  const getCroppedImg = useCallback((): Promise<string | null> => {
    if (!imgRef.current || !completedCrop) return Promise.resolve(null);

    const imageRef = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = imageRef.naturalWidth / imageRef.width;
    const scaleY = imageRef.naturalHeight / imageRef.height;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

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

    // Convert canvas to data URL
    return Promise.resolve(canvas.toDataURL("image/jpeg", 0.9));
  }, [completedCrop]);

  // Function to handle image load and set initial crop
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height));
    },
    [centerAspectCrop]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Instead of directly uploading, show the preview modal first
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setTempPreviewUrl(result);
        setSelectedFile(file);
        setIsModalOpen(true);
        // Reset crop when a new image is loaded
        setCrop(undefined);
        setCompletedCrop(undefined);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Function to handle confirm button click in modal
  const handleConfirmUpload = useCallback(async () => {
    if (!selectedFile) return;

    // Store the current image URL to delete it after successful upload
    const imageToDeleteUrl = previewUrl;

    // Close the modal
    setIsModalOpen(false);

    // Get cropped image if available, otherwise use original image
    let imageDataUrl: string | null = null;
    let fileToUpload: File | null = selectedFile;

    try {
      if (completedCrop && imgRef.current) {
        // Get cropped image as data URL
        imageDataUrl = await getCroppedImg();

        if (imageDataUrl) {
          // Convert data URL to file object
          const byteString = atob(imageDataUrl.split(",")[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);

          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }

          // Create a new file with the cropped image data
          const fileExt = selectedFile.name.split(".").pop() || "jpg";
          fileToUpload = new File([ab], `cropped-${selectedFile.name}`, {
            type: `image/${fileExt === "png" ? "png" : "jpeg"}`,
          });

          // Set cropped image as preview
          setPreviewUrl(imageDataUrl);
        }
      } else {
        // If no crop is available, use the original image preview
        setPreviewUrl(tempPreviewUrl);
      }
    } catch (error) {
      console.error("Error creating cropped image:", error);
      // Fall back to using the original file
      setPreviewUrl(tempPreviewUrl);
    }

    setIsUploading(true);

    // Upload the file to the server
    uploadMutation.mutate(fileToUpload, {
      onSuccess: (data) => {
        // Update with the real URL from the server
        setPreviewUrl(data.url);
        onChange(data.url);
        setIsUploading(false);

        // Delete the previous image if it exists and is a GCS URL
        if (
          imageToDeleteUrl &&
          imageToDeleteUrl.includes("storage.googleapis.com")
        ) {
          deleteMutation.mutate(imageToDeleteUrl, {
            onError: (error) => {
              console.error("Failed to delete previous image:", error);
              // Continue regardless of deletion success - this is a background operation
            },
          });
        }
      },
      onError: (error) => {
        console.error("Image upload failed:", error);
        setIsUploading(false);
        // Keep the preview but alert the user
        alert(t("errors.imageUploadFailed"));
      },
    });
  }, [
    selectedFile,
    tempPreviewUrl,
    previewUrl,
    completedCrop,
    getCroppedImg,
    onChange,
    uploadMutation,
    deleteMutation,
    t,
  ]);

  // Function to handle cancel button click in modal
  const handleCancelUpload = useCallback(() => {
    setIsModalOpen(false);
    setTempPreviewUrl(null);
    setSelectedFile(null);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If there's a URL and it's from GCS, delete the image
    if (previewUrl && previewUrl.includes("storage.googleapis.com")) {
      setIsDeleting(true);

      deleteMutation.mutate(previewUrl, {
        onSuccess: () => {
          setPreviewUrl(null);
          onChange("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setIsDeleting(false);
        },
        onError: (error) => {
          console.error("Failed to delete image:", error);
          setIsDeleting(false);
          alert(t("errors.imageDeleteFailed"));
        },
      });
    } else {
      // If no GCS URL or just a preview, simply clear the field
      setPreviewUrl(null);
      onChange("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* --- Enhanced Image Preview Modal --- */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        open={isModalOpen}
      >
        <Paper
          sx={{
            background: "white",
            maxWidth: 800,
            width: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            borderRadius: 2,
            boxShadow: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" component="h2">
              Image Preview
            </Typography>
            <IconButton onClick={handleCancelUpload} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Modal Content */}
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" gutterBottom>
              {aspectRatio === "16/9" || aspectRatio === "4/3"
                ? `Crop your image to fit a ${aspectRatio} aspect ratio (recommended for desktop/tablet)`
                : `Crop your image to fit a 4/3 aspect ratio (recommended for mobile)`}
            </Typography>

            <Box
              sx={{
                mt: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#f5f5f5",
                p: 2,
                borderRadius: 1,
              }}
            >
              {tempPreviewUrl && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={getNumericAspectRatio()}
                  className="reactCropWrapper"
                >
                  <img
                    ref={imgRef}
                    src={paddedPreviewUrl || tempPreviewUrl}
                    alt={label}
                    onLoad={onImageLoad}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "30vh",
                    }}
                  />
                </ReactCrop>
              )}
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 2, textAlign: "center" }}
            >
              {aspectRatio === "16/9"
                ? "Recommended for desktop (16:9 ratio)"
                : aspectRatio === "4/3"
                ? "Recommended for tablets (4:3 ratio)"
                : "Recommended for mobile (1:1 ratio)"}
            </Typography>
          </Box>

          {/* Modal Actions */}
          <Box sx={{ p: 2, pt: 2, pb: 3, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", gap: 1 }}>
            {/* Fit to Scale and Color Picker Row */}
         
              <Box sx={{ display: "flex", gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={fitToScale}
                    onChange={(e) => {
                      e.stopPropagation();
                      setFitToScale(e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    color="primary"
                  />
                }
                label="Fit to Scale"
                onClick={(e) => e.stopPropagation()}
              />
              {fitToScale && (
                <Box sx={{ minWidth: 200 }} onClick={(e) => e.stopPropagation()}>
                  <ColorPicker
                    value={backgroundColor}
                    onChange={setBackgroundColor}
                    size="small"
                    format="rgb"
                    showPreview={true}
                  />
                </Box>
              )}
              </Box>
               {/* Action Buttons Row */}
               <Box
              sx={{
                display: "flex",
                gap: 1,
              }}
            >
              <Button
                onClick={handleCancelUpload}
                variant="outlined"
                color="primary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                variant="contained"
                color="primary"
                disabled={!crop || !completedCrop}
              >
                Proceed
              </Button>
            </Box>
            
        
          </Box>
        </Paper>
      </Backdrop>

      <Typography variant="subtitle2" gutterBottom>
        {label} {required && <span style={{ color: "red" }}>*</span>}
      </Typography>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
        disabled={disabled}
      />

      <Paper
        variant="outlined"
        onClick={handleClick}
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "default" : "pointer",
          borderStyle: "dashed",
          borderColor: "divider",
          backgroundColor: "background.paper",
          "&:hover": {
            borderColor: disabled ? "divider" : "primary.main",
            backgroundColor: disabled ? "background.paper" : "action.hover",
          },
          position: "relative",
          aspectRatio,
          overflow: "hidden",
          width: "100%",
          height: 180, // Increased height for better visibility
          padding: 1,
          "& img": {
            maxHeight: "100%",
            maxWidth: "100%",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          },
        }}
      >
        {isUploading || isDeleting ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <CircularProgress size={32} />
            <Typography variant="caption" sx={{ mt: 1 }}>
              {isUploading ? t("common.uploading") : t("common.deleting")}
            </Typography>
          </Box>
        ) : previewUrl ? (
          <>
            <Box
              component="img"
              src={previewUrl}
              alt={label}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
                borderRadius: 1,
              }}
            />
            {!disabled && (
              <Tooltip title={t("common.delete")}>
                <IconButton
                  size="small"
                  onClick={handleRemove}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "background.paper",
                    "&:hover": {
                      backgroundColor: "background.default",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <ImageIcon fontSize="large" />
            <Typography variant="caption" align="center" sx={{ mt: 1 }}>
              {t("common.clickToUpload")}
            </Typography>
          </Box>
        )}
      </Paper>

      {required && !previewUrl && (
        <Typography variant="caption" color="error">
          {t("validations.requiredField")}
        </Typography>
      )}
    </Box>
  );
}

export default ImageUploadField;
