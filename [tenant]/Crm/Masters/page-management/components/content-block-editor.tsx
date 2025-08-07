"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import type { Identifier } from "dnd-core";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useMockTranslation } from "@/app/hooks/useMockTranslation";
import { useCreateContentBlock } from "@/app/hooks/api/admin/landing-pages";
import {
  useUpdateContentBlock,
  ContentBlock as ApiContentBlock,
  BlockType,
} from "@/app/hooks/api/admin/landing-pages";
import ImageUploadField from "./ImageUploadField";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
  styled,
  CircularProgress,
  InputAdornment,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  CalendarToday as CalendarTodayIcon,
} from "@mui/icons-material";

// Assuming i18next is configured elsewhere in your app
// For standalone demonstration, a mock t function is used.
const useMockTranslation = () => ({
  t: (key: string, options?: { [key: string]: string }) => {
    const translations: { [key: string]: string } = {
      "heroCarousel.pageTitle": "Edit Hero Carousel Block",
      "heroCarousel.addNewSlide": "Add New Slide",
      "heroCarousel.cancel": "Cancel",
      "heroCarousel.saveBlock": "Save Block",
      "heroCarousel.saving": "Saving...",
      "heroCarousel.saveSuccess": "Content block saved successfully!",
      "heroCarousel.deleteSlide": "Delete Slide",
      "heroCarousel.toggleDetails": "Toggle Details",
      "heroCarousel.images": "IMAGES",
      "heroCarousel.desktopImage": "Desktop Image",
      "heroCarousel.mobileImage": "Mobile Image",
      "heroCarousel.replace": "Replace",
      "heroCarousel.remove": "Remove",
      "heroCarousel.recommended": "Recommended: {{dimensions}}",
      "heroCarousel.content": "CONTENT",
      "heroCarousel.heading": "Heading",
      "heroCarousel.subheading": "Subheading",
      "heroCarousel.ctaButtonText": "CTA Button Text",
      "heroCarousel.ctaButtonLink": "CTA Button Link",
      "heroCarousel.schedulingVisibility": "SCHEDULING & VISIBILITY",
      "heroCarousel.slideIsActive": "Slide is Active",
      "heroCarousel.publishStart": "Publish Start",
      "heroCarousel.publishEnd": "Publish End",
      "heroCarousel.loading": "Loading Slides...",
      "heroCarousel.addAtLeastOneImage":
        "Please add at least one slide with an image.",
      "heroCarousel.saveError":
        "Failed to save content block. Please try again.",
    };
    let translation = translations[key] || key;
    if (options) {
      Object.keys(options).forEach((optKey) => {
        translation = translation.replace(`{{${optKey}}}`, options[optKey]);
      });
    }
    return translation;
  },
});

// --- TYPES ---
interface Slide {
  id: string;
  title: string;
  desktopImage?: string;
  mobileImage?: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  publishStart: string;
  publishEnd: string;
  desktopAspectRatio?: string;
  mobileAspectRatio?: string;
}

// --- UTILITY FUNCTIONS ---
/**
 * Extracts the GCS object path from a full signed URL or returns the path as-is if already relative
 * Example: 
 * Input: "https://storage.googleapis.com/bucket/catalogue-images/landingpage/1/images/file.jpg?X-Goog-Algorithm=..."
 * Output: "landingpage/1/images/file.jpg"
 */
const extractGCSPath = (url: string): string => {
  if (!url || url.trim() === '') return '';
  
  // If it's already a relative path (doesn't start with http), return as-is
  if (!url.startsWith('http')) {
    // Also remove catalogue-images/ prefix if it exists in relative paths
    return url.startsWith('catalogue-images/') ? url.replace('catalogue-images/', '') : url;
  }
  
  try {
    // Parse the URL to extract the pathname
    const urlObj = new URL(url);
    
    // For GCS URLs, the path starts after the bucket name
    // Format: https://storage.googleapis.com/bucket-name/catalogue-images/path/to/file
    const pathname = urlObj.pathname;
    
    // Remove leading slash and bucket name (first segment)
    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    
    // Skip the bucket name (first segment) and join the rest
    if (pathSegments.length > 1) {
      let path = pathSegments.slice(1).join('/');
      
      // Remove catalogue-images/ prefix if it exists
      if (path.startsWith('catalogue-images/')) {
        path = path.replace('catalogue-images/', '');
      }
      
      return path;
    }
    
    // Fallback: return the pathname without leading slash
    let fallbackPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    // Remove catalogue-images/ prefix if it exists
    if (fallbackPath.startsWith('catalogue-images/')) {
      fallbackPath = fallbackPath.replace('catalogue-images/', '');
    }
    
    return fallbackPath;
  } catch (error) {
    console.error('Error parsing GCS URL:', error);
    // Fallback: return the original URL
    return url;
  }
};

// --- MOCK API ---
const initialSlidesData: Slide[] = [];

const fetchSlides = async (): Promise<Slide[]> => {
  console.log("Fetching slides...");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return JSON.parse(JSON.stringify(initialSlidesData));
};

const saveSlides = async (slides: Slide[]): Promise<Slide[]> => {
  console.log("Saving slides...", slides);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return slides;
};

// --- STYLED COMPONENTS ---
const SectionTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "first",
})<{ first?: boolean }>(({ theme, first }) => ({
  textTransform: "uppercase",
  fontWeight: 500,
  fontSize: "0.75rem", // 12px
  color: theme.palette.text.secondary,
  letterSpacing: "0.03em",
  marginBottom: theme.spacing(1.5),
  marginTop: first ? theme.spacing(1) : theme.spacing(4),
}));

const ImageUploadBox = styled(Box)(({ theme }) => ({
  border: `1px dashed ${theme.palette.grey[400]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  textAlign: "center",
  backgroundColor: "#F9FAFB", // a specific light grey
  height: "180px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

// --- DRAGGABLE SLIDE ITEM ---
interface DraggableSlideItemProps {
  slide: Slide;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  moveSlide: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (updatedSlide: Slide) => void;
  onDelete: (slideId: string) => void;
  globalDesktopAspectRatio: string;
  globalMobileAspectRatio: string;
}

const DraggableSlideItem: React.FC<DraggableSlideItemProps> = ({
  slide,
  index,
  isExpanded,
  onToggle,
  moveSlide,
  onUpdate,
  onDelete,
  globalDesktopAspectRatio,
  globalMobileAspectRatio,
}) => {
  const { t } = useMockTranslation();
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    { index: number },
    void,
    { handlerId: Identifier | null }
  >({
    accept: "slide",
    collect(monitor) {
      return { handlerId: monitor.getHandlerId() };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveSlide(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "slide",
    item: () => ({ id: slide.id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drop(ref);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onUpdate({ ...slide, [event.target.name]: event.target.value });
  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ ...slide, [event.target.name]: event.target.checked });
  const handleImageAction = (
    type: "desktop" | "mobile",
    action: "remove" | "replace"
  ) => {
    const key = type === "desktop" ? "desktopImage" : "mobileImage";
    if (action === "remove") onUpdate({ ...slide, [key]: undefined });
    else alert("Replace functionality not implemented.");
  };

  return (
    <div
      ref={ref}
      id={`slide-${slide.id}`}
      style={{
        opacity: isDragging ? 0.3 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
      data-handler-id={handlerId}
    >
      <Card variant="outlined" sx={{ overflow: "visible" }}>
        <CardHeader
          avatar={
            <Box
              ref={drag}
              sx={{
                cursor: "move",
                touchAction: "none",
                display: "flex",
                color: "text.disabled",
                ml: -0.5,
              }}
            >
              <DragIndicatorIcon />
            </Box>
          }
          title={
            <Typography variant="subtitle1" fontWeight={500}>
              {slide.heading || slide.title}
            </Typography>
          }
          action={
            <>
              <IconButton
                onClick={onToggle}
                aria-label={t("heroCarousel.toggleDetails")}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton
                onClick={() => onDelete(slide.id)}
                aria-label={t("heroCarousel.deleteSlide")}
                sx={{
                  color: theme.palette.grey[500],
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </>
          }
          sx={{ backgroundColor: "#F9FAFB" }}
        />
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <SectionTitle first>{t("heroCarousel.images")}</SectionTitle>
            <Grid container spacing={2.5}>
              {[
                {
                  type: "desktop",
                  label: t("heroCarousel.desktopImage"),
                  image: slide.desktopImage,
                },
                {
                  type: "mobile",
                  label: t("heroCarousel.mobileImage"),
                  image: slide.mobileImage,
                },
              ].map((imgInfo) => (
                <Grid size={{ xs: 12, md: 6 }} key={imgInfo.type}>
                  <ImageUploadField
                    label={imgInfo.label}
                    value={imgInfo.image || ""}
                    onChange={(value) => {
                      const key =
                        imgInfo.type === "desktop"
                          ? "desktopImage"
                          : "mobileImage";
                      onUpdate({ ...slide, [key]: value });
                    }}
                    aspectRatio={imgInfo.type === "desktop" ? globalDesktopAspectRatio : globalMobileAspectRatio}
                    required={false}
                  />
                </Grid>
              ))}
            </Grid>

            <SectionTitle>{t("heroCarousel.content")}</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 12 }}>
                {" "}
                <TextField
                  label={t("heroCarousel.heading")}
                  name="heading"
                  value={slide.heading}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                />{" "}
              </Grid>
              <Grid size={{ xs: 12, md: 12 }}>
                {" "}
                <TextField
                  label={t("heroCarousel.subheading")}
                  name="subheading"
                  value={slide.subheading}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                />{" "}
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                {" "}
                <TextField
                  label={t("heroCarousel.ctaButtonText")}
                  name="ctaText"
                  value={slide.ctaText}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                />{" "}
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                {" "}
                <TextField
                  label={t("heroCarousel.ctaButtonLink")}
                  name="ctaLink"
                  value={slide.ctaLink}
                  onChange={handleChange}
                  fullWidth
                  type="url"
                  variant="outlined"
                />{" "}
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label={t("heroCarousel.publishStart")}
                  name="publishStart"
                  type="datetime-local"
                  value={slide.publishStart}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarTodayIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label={t("heroCarousel.publishEnd")}
                  name="publishEnd"
                  type="datetime-local"
                  value={slide.publishEnd}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarTodayIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <SectionTitle>
              {t("heroCarousel.schedulingVisibility")}
            </SectionTitle>
            <Stack spacing={2.5}>
              <Paper
                elevation={0}
                sx={{
                  p: "4px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  bgcolor: "#F9FAFB",
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.grey[300]}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {t("heroCarousel.slideIsActive")}
                </Typography>
                <Switch
                  name="isActive"
                  checked={slide.isActive}
                  onChange={handleSwitchChange}
                />
              </Paper>
            </Stack>
          </CardContent>
        </Collapse>
      </Card>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
interface ContentBlockEditorProps {
  onClose: () => void;
  blockData?: any;
  onSaveSuccess?: () => void;
  mainData?: any;
}

const ContentBlockEditor: React.FC<ContentBlockEditorProps> = ({
  onClose,
  blockData,
  onSaveSuccess,
  mainData,
}) => {
  const { t } = useMockTranslation();
  const theme = useTheme();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [expandedSlides, setExpandedSlides] = useState<Record<string, boolean>>(
    {}
  );
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Global aspect ratio settings for all slides
  const [globalDesktopAspectRatio, setGlobalDesktopAspectRatio] = useState<string>("16/9");
  const [globalMobileAspectRatio, setGlobalMobileAspectRatio] = useState<string>("9/16");
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'desktop' | 'mobile';
    newValue: string;
  }>({ open: false, type: 'desktop', newValue: '' });

  const queryClient = useQueryClient();

  const { data: fetchedSlides, isLoading } = useQuery({
    queryKey: ["slides"],
    queryFn: fetchSlides,
  });

  const createContentBlockMutation = useCreateContentBlock();
  const updateContentBlockMutation = useUpdateContentBlock();

  useEffect(() => {
    if (blockData?.apiBlock) {
      const blockContent = blockData.apiBlock.content || {};
      
      // Load global aspect ratios from saved content
      if (blockContent.globalDesktopAspectRatio) {
        setGlobalDesktopAspectRatio(blockContent.globalDesktopAspectRatio);
      }
      if (blockContent.globalMobileAspectRatio) {
        setGlobalMobileAspectRatio(blockContent.globalMobileAspectRatio);
      }

      if (blockContent.slides && blockContent.slides.length > 0) {
        setSlides(
          blockContent.slides.map((slide: any, index: number) => ({
            id: `slide-${index}-${Date.now()}`,
            title: slide.title || `Slide ${index + 1}`,
            desktopImage: slide.desktop_image_url || "",
            mobileImage: slide.mobile_image_url || "",
            heading: slide.heading || "",
            subheading: slide.subheading || "",
            ctaText: slide.cta_text || "",
            ctaLink: slide.cta_url || "",
            isActive: slide.is_active !== false,
            publishStart: slide.publish_start || "",
            publishEnd: slide.publish_end || "",
          }))
        );
      } else {
        setSlides([
          {
            id: `slide-${Date.now()}`,
            title: "Slide 1",
            desktopImage: "",
            mobileImage: "",
            heading: "",
            subheading: "",
            ctaText: "",
            ctaLink: "",
            isActive: true,
            publishStart: "",
            publishEnd: "",
          },
        ]);
      }
    } else {
      setSlides([
        {
          id: `slide-${Date.now()}`,
          title: "Slide 1",
          desktopImage: "",
          mobileImage: "",
          heading: "",
          subheading: "",
          ctaText: "",
          ctaLink: "",
          isActive: true,
          publishStart: "",
          publishEnd: "",
        },
      ]);
    }
  }, [blockData]);

  const handleToggleExpand = (slideId: string) => {
    setExpandedSlides((prev) => ({ ...prev, [slideId]: !prev[slideId] }));
  };

  const moveSlide = useCallback((dragIndex: number, hoverIndex: number) => {
    setSlides((prev) => {
      const newSlides = [...prev];
      const [moved] = newSlides.splice(dragIndex, 1);
      newSlides.splice(hoverIndex, 0, moved);
      return newSlides;
    });
  }, []);

  const handleUpdateSlide = (updatedSlide: Slide) =>
    setSlides((curr) =>
      curr.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
    );
  const handleDeleteSlide = (slideId: string) =>
    setSlides((curr) => curr.filter((s) => s.id !== slideId));
  // Helper function to check if any slides have images of a specific type
  const hasImagesOfType = (type: 'desktop' | 'mobile'): boolean => {
    return slides.some(slide => {
      const imageUrl = type === 'desktop' ? slide.desktopImage : slide.mobileImage;
      return imageUrl && imageUrl.trim() !== '';
    });
  };

  // Helper function to clear all images of a specific type
  const clearImagesOfType = (type: 'desktop' | 'mobile') => {
    setSlides(currentSlides => 
      currentSlides.map(slide => ({
        ...slide,
        [type === 'desktop' ? 'desktopImage' : 'mobileImage']: ''
      }))
    );
  };

  // Handle aspect ratio change with confirmation
  const handleAspectRatioChange = (type: 'desktop' | 'mobile', newValue: string) => {
    const hasImages = hasImagesOfType(type);
    
    if (hasImages) {
      // Show confirmation dialog
      setConfirmDialog({
        open: true,
        type,
        newValue
      });
    } else {
      // No images, change directly
      if (type === 'desktop') {
        setGlobalDesktopAspectRatio(newValue);
      } else {
        setGlobalMobileAspectRatio(newValue);
      }
    }
  };

  // Handle confirmation dialog response
  const handleConfirmAspectRatioChange = (confirmed: boolean) => {
    if (confirmed) {
      // Clear images and change aspect ratio
      clearImagesOfType(confirmDialog.type);
      if (confirmDialog.type === 'desktop') {
        setGlobalDesktopAspectRatio(confirmDialog.newValue);
      } else {
        setGlobalMobileAspectRatio(confirmDialog.newValue);
      }
    }
    
    // Close dialog
    setConfirmDialog({ open: false, type: 'desktop', newValue: '' });
  };

  const handleAddNewSlide = () => {
    const newId = `new-${Date.now()}`;
    const newSlide: Slide = {
      id: newId,
      title: `New Slide ${slides.length + 1}`,
      heading: "",
      subheading: "",
      ctaText: "",
      ctaLink: "",
      desktopImage: "",
      mobileImage: "",
      isActive: true,
      publishStart: "",
      publishEnd: "",
    };
    setSlides([...slides, newSlide]);

    const newExpansionState: Record<string, boolean> = {};
    slides.forEach((slide) => {
      newExpansionState[slide.id] = false;
    });
    newExpansionState[newId] = true;
    setExpandedSlides(newExpansionState);

    setTimeout(() => {
      const newSlideElement = document.getElementById(`slide-${newId}`);
      if (newSlideElement) {
        newSlideElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const hasValidSlide = slides.some(
        (slide) => slide.desktopImage || slide.mobileImage
      );
      if (!hasValidSlide) {
        setSuccessMessage(
          t("heroCarousel.addAtLeastOneImage") ||
            "Please add at least one slide with an image."
        );
        setIsSaving(false);
        return;
      }

      const apiSlides = slides.map((slide) => ({
        desktop_image_url: extractGCSPath(slide.desktopImage || ""),
        mobile_image_url: extractGCSPath(slide.mobileImage || slide.desktopImage || ""),
        heading: slide.heading,
        subheading: slide.subheading,
        cta_text: slide.ctaText,
        cta_url: slide.ctaLink,
        is_active: slide.isActive,
        publish_start: slide.publishStart || null,
        publish_end: slide.publishEnd || null,
      }));

      const payload = {
        page: mainData?.id || "1",
        block_type: "HERO_CAROUSEL" as BlockType,
        title: blockData?.apiBlock?.title || "Hero Carousel",
        content: {
          slides: apiSlides,
          dots: true,
          arrows: true,
          autoplay: true,
          autoplaySpeed: 5000,
          columns: 1,
          mobile_columns: 1,
          heading: blockData?.apiBlock?.title || "Hero Carousel",
          subheading: "",
          globalDesktopAspectRatio: globalDesktopAspectRatio,
          globalMobileAspectRatio: globalMobileAspectRatio,
        },
        order: blockData?.order || 0,
      };
      console.log("Payload:", payload);

      if (blockData?.apiBlock?.id) {
        await updateContentBlockMutation.mutateAsync({
          id: blockData.apiBlock.id,
          payload: payload,
        });
      } else {
        await createContentBlockMutation.mutateAsync(payload);
      }

      setSuccessMessage(
        t("heroCarousel.saveSuccess") || "Content block saved successfully!"
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      if (onSaveSuccess) onSaveSuccess();

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to save content block:", error);
      setSuccessMessage(
        t("heroCarousel.saveError") ||
          "Failed to save content block. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        {successMessage && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" onClose={() => setSuccessMessage("")}>
              {successMessage}
            </Alert>
          </Box>
        )}
        <Stack spacing={3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h5" fontWeight={600}>
              {t("heroCarousel.pageTitle")}
            </Typography>

            <Stack direction="row" spacing={1.5}>
              <Button
                onClick={() => {
                  onClose();
                }}
                disabled={isSaving}
                variant="outlined"
                sx={{ textTransform: "none" }}
              >
                {t("heroCarousel.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={isSaving}
                startIcon={
                  isSaving && <CircularProgress size={20} color="inherit" />
                }
                sx={{ textTransform: "none" }}
              >
                {isSaving
                  ? t("heroCarousel.saving")
                  : t("heroCarousel.saveBlock")}
              </Button>
            </Stack>
          </Box>

          {/* Global Aspect Ratio Selectors */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mb: 3,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Image Aspect Ratios (applies to all slides)
            </Typography>
            
            {/* Desktop Aspect Ratio Selector */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="subtitle2" sx={{ minWidth: 120 }}>
                Desktop View:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[
                  { value: "16/9", label: "Wide (16:9)" },
                  { value: "4/3", label: "Standard (4:3)" },
                  { value: "1/1", label: "Square (1:1)" },
                ].map(({ value, label }) => (
                  <Chip
                    key={`desktop-${value}`}
                    label={label}
                    variant={globalDesktopAspectRatio === value ? "filled" : "outlined"}
                    color={globalDesktopAspectRatio === value ? "primary" : "default"}
                    onClick={() => handleAspectRatioChange('desktop', value)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Mobile Aspect Ratio Selector */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="subtitle2" sx={{ minWidth: 120 }}>
                Mobile View:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[
                  { value: "9/16", label: "Portrait (9:16)" },
                  { value: "3/4", label: "Tall (3:4)" },
                  { value: "1/1", label: "Square (1:1)" },
                ].map(({ value, label }) => (
                  <Chip
                    key={`mobile-${value}`}
                    label={label}
                    variant={globalMobileAspectRatio === value ? "filled" : "outlined"}
                    color={globalMobileAspectRatio === value ? "primary" : "default"}
                    onClick={() => handleAspectRatioChange('mobile', value)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <Stack spacing={2}>
                {slides.map((slide, i) => (
                  <DraggableSlideItem
                    key={slide.id}
                    index={i}
                    slide={slide}
                    isExpanded={!!expandedSlides[slide.id]}
                    onToggle={() => handleToggleExpand(slide.id)}
                    moveSlide={moveSlide}
                    onUpdate={handleUpdateSlide}
                    onDelete={handleDeleteSlide}
                    globalDesktopAspectRatio={globalDesktopAspectRatio}
                    globalMobileAspectRatio={globalMobileAspectRatio}
                  />
                ))}
              </Stack>
            </DndProvider>
          )}

          <Stack spacing={2.5} sx={{ mt: 3 }}>
            <Paper
              onClick={handleAddNewSlide}
              elevation={0}
              sx={{
                p: 3,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#F9FAFB",
                borderRadius: 1,
                border: `1px dashed ${theme.palette.grey[400]}`,
                cursor: "pointer",
                height: 50,
                "&:hover": {
                  bgcolor: "#F0F4F8",
                },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AddIcon /> {t("heroCarousel.addNewSlide")}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => handleConfirmAspectRatioChange(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Change Aspect Ratio
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Changing the {confirmDialog.type} aspect ratio will delete all existing {confirmDialog.type} images from all slides.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to continue? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => handleConfirmAspectRatioChange(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleConfirmAspectRatioChange(true)}
            variant="contained"
            color="error"
          >
            Yes, Delete Images
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Export the ContentBlockEditor component as default
export default ContentBlockEditor;
