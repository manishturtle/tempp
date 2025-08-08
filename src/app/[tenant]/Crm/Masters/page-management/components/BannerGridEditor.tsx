"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Grid,
  Button,
  Divider,
  useTheme,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  DialogContentText,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import BannerCard from "./BannerCard";
import ImageUploadField from "./ImageUploadField";
import {
  useCreateContentBlock,
  useUpdateContentBlock,
} from "@/app/hooks/api/admin/landing-pages";

interface Banner {
  id: string;
  imageUrl?: string;
  altText: string;
  actionType: string;
  actionValue: string;
}

interface BannerGridData {
  layout: string;
  banners: Banner[];
}

interface BannerGridEditorProps {
  mainData: any;
  initialData?: any // Add is_active as an optional property
  onClose: () => void;
  onSave?: (data: BannerGridData) => void;
  onSaveSuccess?: () => void;
}

/**
 * Generate a unique ID for a banner
 * @param index Optional index to make the ID more unique
 * @returns A unique string ID
 */
const generateUniqueBannerId = (index: number = 0): string => {
  // Create a random letter (a-z) to add uniqueness
  const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return `${new Date().getTime()}_${index}_${randomLetter}`;
};

/**
 * Create one or more empty banner objects with unique IDs
 * @param count Number of banners to create
 * @returns Array of empty banner objects
 */
const createEmptyBanners = (count: number = 1): Banner[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: generateUniqueBannerId(index),
    altText: "",
    actionType: "URL_LINK",
    actionValue: "",
  }));
};

const BannerGridEditor: React.FC<BannerGridEditorProps> = ({
  mainData,
  initialData,
  onClose,
  onSave,
  onSaveSuccess,
}) => {
  const { t } = useTranslation("common");
  const theme = useTheme();

  // Extract banner grid data from initialData if available
  const extractInitialData = () => {
    console.log(initialData);
    if (initialData?.apiBlock?.content) {
      console.log(initialData.apiBlock.content);
      const content = initialData.apiBlock.content;
      let banners = [];
      if (Array.isArray(content.banners)) {
        banners = content.banners.map((banner) => ({
          id: banner.id,
          altText: banner.alt_text,
          actionType: banner.cta_action_type,
          actionValue: banner.action_value,
          imageUrl: banner.image_url,
        }));
      }
      return {
        layout: content.layout_style || "twoColumns",
        banners: banners,
      };
    }
    return {
      layout: "twoColumns",
      banners: createEmptyBanners(2),
    };
  };

  const [data, setData] = useState<BannerGridData>(extractInitialData());

  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [showLayoutConfirmation, setShowLayoutConfirmation] =
    useState<boolean>(false);
  const [pendingLayout, setPendingLayout] = useState<string | null>(null);

  // API integration states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // API mutations
  const createContentBlockMutation = useCreateContentBlock();
  const updateContentBlockMutation = useUpdateContentBlock();

  // Check if banners have data filled in
  const bannersHaveData = useCallback(() => {
    return data.banners.some(
      (banner) =>
        (banner.imageUrl && banner.imageUrl !== "") ||
        (banner.altText && banner.altText !== "") ||
        (banner.actionValue && banner.actionValue !== "")
    );
  }, [data.banners]);

  const handleLayoutChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLayout = event.target.value;

    // If current layout is different and banners have data, show confirmation
    if (data.layout !== newLayout && bannersHaveData()) {
      setPendingLayout(newLayout);
      setShowLayoutConfirmation(true);
      return;
    }

    // Otherwise, apply the layout change directly
    applyLayoutChange(newLayout);
  };

  const applyLayoutChange = (layout: string) => {
    // Create new banners based on the selected layout
    let newBanners: Banner[] = [];

    // Explicitly create the exact number of banners needed for each layout
    switch (layout) {
      case "oneColumn":
        newBanners = createEmptyBanners(1);
        break;
      case "twoColumns":
        newBanners = createEmptyBanners(2);
        break;
      case "threeColumns":
        newBanners = createEmptyBanners(3);
        break;
      case "fourColumns":
        newBanners = createEmptyBanners(4);
        break;
      default:
        newBanners = [];
        break;
    }
    console.log(newBanners);
    // Create a new data object that preserves other properties but replaces layout and banners
    setData({
      ...data, // Preserve any other properties
      layout,
      banners: newBanners,
    });
  };

  const handleBannerUpdate = (id: string, updatedFields: Partial<Banner>) => {
    setData({
      ...data,
      banners: data.banners.map((banner) =>
        banner.id === id ? { ...banner, ...updatedFields } : banner
      ),
    });
  };

  const handleBannerDelete = (id: string) => {
    setData({
      ...data,
      banners: data.banners.filter((banner) => banner.id !== id),
    });
  };

  const handleImageUpload = (id: string) => {
    setSelectedBannerId(id);
    setShowImageUpload(true);
  };

  const handleImageSelected = useCallback(
    (imageUrl: string) => {
      if (selectedBannerId) {
        handleBannerUpdate(selectedBannerId, { imageUrl });
      }
      setShowImageUpload(false);
      setSelectedBannerId(null);
    },
    [selectedBannerId]
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate that banners have required fields
      const hasValidBanners = data.banners.some((banner) => banner.imageUrl);
      if (!hasValidBanners) {
        setSuccessMessage(
          t(
            "bannerGrid.addAtLeastOneImage",
            "Please add at least one banner with an image."
          )
        );
        setIsSaving(false);
        return;
      }

      // Transform banners to API format
      const apiBanners = data.banners.map((banner) => ({
        id: banner.id,
        image_url: banner.imageUrl || "",
        alt_text: banner.altText,
        cta_action_type: banner.actionType,
        action_value: banner.actionValue,
      }));

      // Explicitly type the payload to avoid TypeScript errors
      const payload: {
        page: number;
        block_type: "BANNER_AD_GRID";
        title: string;
        content: {
          layout_style: string;
          banners: Array<{
            id: string;
            image_url: string;
            alt_text: string;
            cta_action_type: string;
            action_value: string;
          }>;
        };
        order: number;
        is_active: boolean;
      } = {
        page: mainData?.id,
        block_type: "BANNER_AD_GRID" as const,
        title: initialData?.apiBlock?.title || "Banner Grid",
        content: {
          layout_style: data.layout,
          banners: apiBanners,
        },
        order: initialData?.order || 0,
        is_active: true, // Default to active
      };

      // Safely handle is_active if it exists in initialData
      if (
        initialData?.apiBlock &&
        "is_active" in initialData.apiBlock &&
        initialData.apiBlock.is_active !== undefined
      ) {
        payload.is_active = Boolean(initialData.apiBlock.is_active);
      }

      // Save using the appropriate mutation based on whether we're updating or creating
      if (initialData?.apiBlock?.id) {
        await updateContentBlockMutation.mutateAsync({
          id: initialData.apiBlock.id,
          payload: payload,
        });
      } else {
        await createContentBlockMutation.mutateAsync(payload);
      }

      // Show success message
      setSuccessMessage(
        t("bannerGrid.saveSuccess", "Banner grid saved successfully!")
      );

      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      // Call optional success callback
      if (onSaveSuccess) onSaveSuccess();

      // If onSave prop is provided, call it with the data
      if (onSave) onSave(data);

      // Close the editor after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to save banner grid:", error);
      setSuccessMessage(
        t(
          "bannerGrid.saveError",
          "Failed to save banner grid. Please try again."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t("bannerGrid.title", "Edit Banner Grid")}
        </Typography>
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}
        >
          <Button variant="outlined" onClick={onClose} disabled={isSaving}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={
              isSaving && <CircularProgress size={20} color="inherit" />
            }
          >
            {isSaving
              ? t("common.saving", "Saving...")
              : t("common.save", "Save")}
          </Button>
        </Box>
      </Box>

      {/* Global Block Settings */}
      <Card
        elevation={0}
        sx={{ mb: 4, border: `1px solid ${theme.palette.divider}` }}
      >
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            {t("bannerGrid.globalSettings", "Global Block Settings")}
          </Typography>
          <TextField
            select
            label={t("bannerGrid.layoutStyle", "Layout Style")}
            value={data.layout}
            onChange={handleLayoutChange}
            variant="outlined"
            fullWidth
            size="small"
            helperText={t(
              "bannerGrid.layoutHelp",
              "Select how banners should be arranged on the page"
            )}
          >
            <MenuItem value="oneColumn">
              {t("bannerGrid.layouts.oneColumn", "One Column")}
            </MenuItem>
            <MenuItem value="twoColumns">
              {t("bannerGrid.layouts.twoColumns", "Two Columns")}
            </MenuItem>
            <MenuItem value="threeColumns">
              {t("bannerGrid.layouts.threeColumns", "Three Columns")}
            </MenuItem>
            <MenuItem value="fourColumns">
              {t("bannerGrid.layouts.fourColumns", "Four Columns")}
            </MenuItem>
          </TextField>
        </CardContent>
      </Card>

      {/* Banner Configurations */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          {t("bannerGrid.configurations", "Banner Configurations")}
        </Typography>
        <Grid container spacing={3}>
          {data.banners.map((banner) => {
            // Set grid sizing based on layout
            let xs = 12;
            let md = 12;
            let lg = 12;

            switch (data.layout) {
              case "oneColumn":
                xs = 12;
                md = 12;
                lg = 12;
                break;
              case "twoColumns":
                xs = 12;
                md = 6;
                lg = 6;
                break;
              case "threeColumns":
                xs = 12;
                md = 4;
                lg = 4;
                break;
              case "fourColumns":
                xs = 12;
                md = 3;
                lg = 3;
                break;
            }

            return (
              <Grid key={banner.id} item xs={xs} md={md} lg={lg}>
                <BannerCard
                  banner={banner}
                  onUpdate={handleBannerUpdate}
                  onDelete={handleBannerDelete}
                  onImageUpload={handleImageUpload}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Action Buttons */}
      <Divider sx={{ mb: 3 }} />

      {/* Success/Error Messages */}
      {successMessage && (
        <Box sx={{ mb: 2 }}>
          <Alert
            severity={successMessage.includes("Failed") ? "error" : "success"}
            onClose={() => setSuccessMessage("")}
          >
            {successMessage}
          </Alert>
        </Box>
      )}

      {/* Bottom Action Buttons */}

      {/* Image Upload Dialog */}
      <Dialog
        open={showImageUpload}
        onClose={() => {
          setShowImageUpload(false);
          setSelectedBannerId(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {showImageUpload && (
            <ImageUploadField
              label={t("bannerGrid.uploadImage", "Upload Banner Image")}
              value=""
              onChange={handleImageSelected}
              aspectRatio="16/9"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowImageUpload(false);
              setSelectedBannerId(null);
            }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Layout Change Confirmation Dialog */}
      <Dialog
        open={showLayoutConfirmation}
        onClose={() => setShowLayoutConfirmation(false)}
      >
        <DialogTitle>
          {t("bannerGrid.layoutChangeConfirmation", "Change Layout?")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(
              "bannerGrid.layoutChangeWarning",
              "Changing the layout will reset all banner data. Are you sure you want to continue?"
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLayoutConfirmation(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={() => {
              if (pendingLayout) {
                applyLayoutChange(pendingLayout);
                setPendingLayout(null);
              }
              setShowLayoutConfirmation(false);
            }}
            variant="contained"
            color="primary"
            autoFocus
          >
            {t("common.confirm", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BannerGridEditor;
