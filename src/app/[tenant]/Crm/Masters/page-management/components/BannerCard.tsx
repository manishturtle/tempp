"use client";

import React from "react";
import {
  Card,
  CardContent,
  Box,
  IconButton,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  TextField,
  SelectChangeEvent,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import ImageUploadField from "./ImageUploadField";

// Define the props interface for type safety
interface BannerCardProps {
  banner: {
    id: string;
    imageUrl?: string;
    altText: string;
    actionType: "URL_LINK" | "INTERNAL_PAGE" | "NO_ACTION";
    actionValue: string;
  };
  onUpdate: (
    id: string,
    updatedBanner: Partial<BannerCardProps["banner"]>
  ) => void;
  onDelete: (id: string) => void;
  onImageUpload: (id: string) => void;
}

export const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  onUpdate,
}) => {
  const { t } = useTranslation("common");
  const { id, imageUrl, altText, actionType, actionValue } = banner;

  // Handle text input changes
  const handleTextChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (name) {
      onUpdate(id, { [name]: value });
    }
  };

  // Handle select changes for action type
  const handleActionTypeChange = (
    event: SelectChangeEvent<"URL_LINK" | "INTERNAL_PAGE" | "NO_ACTION">
  ) => {
    const { value } = event.target;
    onUpdate(id, {
      actionType: value as "URL_LINK" | "INTERNAL_PAGE" | "NO_ACTION",
    });
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <IconButton
            size="small"
            sx={{ backgroundColor: "grey.100" }}
            title={t("banner.infoTooltip", "Banner information")}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            sx={{ backgroundColor: 'grey.100' }}
            onClick={() => onDelete(id)}
            title={t('banner.deleteTooltip', 'Delete banner')}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box> */}

        <Box mb={2}>
          <ImageUploadField
            value={imageUrl || ""}
            onChange={(value) => onUpdate(id, { imageUrl: value })}
            aspectRatio="16/9"
            required={false}
          />
        </Box>

        <TextField
          label={t("banner.altText", "Image Alt Text")}
          name="altText"
          value={altText}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
          size="small"
        />

        <FormControl fullWidth size="small">
          <InputLabel id={`action-type-label-${id}`}>
            {t("banner.actionType", "Action Type")}
          </InputLabel>
          <Select
            labelId={`action-type-label-${id}`}
            label={t("banner.actionType", "Action Type")}
            value={actionType}
            onChange={handleActionTypeChange}
          >
            <MenuItem value="URL_LINK">
              {t("banner.actionTypes.urlLink", "URL Link")}
            </MenuItem>
            <MenuItem value="INTERNAL_PAGE">
              {t("banner.actionTypes.internalPage", "Internal Landing Page")}
            </MenuItem>
            <MenuItem value="NO_ACTION">
              {t("banner.actionTypes.noAction", "No Action")}
            </MenuItem>
          </Select>
          <FormHelperText>
            {t(
              "banner.actionTypeHelp",
              "Select what happens when banner is clicked"
            )}
          </FormHelperText>
        </FormControl>

        {actionType !== "NO_ACTION" && (
          <TextField
            label={
              actionType === "URL_LINK"
                ? t("banner.actionValueUrl", "External URL")
                : t("banner.actionValuePage", "Landing Page Path")
            }
            name="actionValue"
            value={actionValue}
            onChange={handleTextChange}
            variant="outlined"
            fullWidth
            size="small"
            placeholder={
              actionType === "URL_LINK"
                ? "https://example.com"
                : "/landing/special-offer"
            }
            helperText={
              actionType === "URL_LINK"
                ? t(
                    "banner.actionValueHelp.url",
                    "Enter the full URL including https://"
                  )
                : t(
                    "banner.actionValueHelp.internalPage",
                    "Enter the relative path of the landing page"
                  )
            }
          />
        )}
      </CardContent>
    </Card>
  );
};

export default BannerCard;
