import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StoreIcon from "@mui/icons-material/Store";
import { useTranslation } from "react-i18next";

export interface FulfillmentMethodProps {
  onMethodSelected: (method: "home_delivery" | "in_store_pickup") => void;
  selectedMethod?: "home_delivery" | "in_store_pickup";
}

/**
 * Fulfillment Method Selector Component
 * Allows users to choose between home delivery and in-store pickup options
 */
export const FulfillmentMethodSelector: React.FC<FulfillmentMethodProps> = ({
  onMethodSelected,
  selectedMethod = "home_delivery",
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<
    "home_delivery" | "in_store_pickup"
  >(selectedMethod);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as "home_delivery" | "in_store_pickup";
    setSelectedOption(value);
    onMethodSelected(value);
  };

  const handlePaperClick = (value: "home_delivery" | "in_store_pickup") => {
    setSelectedOption(value);
    onMethodSelected(value);
  };

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Typography variant="body2" mb={{ xs: 1, md: 1 }}>
        {t(
          "checkout.fulfillmentMethod.title",
          "Please select how you would like to receive your order:"
        )}
      </Typography>

      <RadioGroup
        value={selectedOption}
        onChange={handleChange}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        {/* Home Delivery Option */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor:
              selectedOption === "home_delivery"
                ? "rgba(25, 118, 210, 0.08)" // Light blue background when selected
                : "background.paper", // Default background
            border: "2px solid transparent", // Keep transparent border for consistent spacing
            transition: "all 0.3s",
            cursor: "pointer",
            "&:hover": {
              bgcolor:
                selectedOption === "home_delivery"
                  ? "rgba(25, 118, 210, 0.12)" // Slightly darker on hover when selected
                  : "action.hover", // Default hover
            },
          }}
          onClick={() => handlePaperClick("home_delivery")}
        >
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Box
              sx={{ display: "flex", alignItems: "flex-start", flexGrow: 1 }}
            >
              <LocalShippingIcon
                color={
                  selectedOption === "home_delivery" ? "primary" : "action"
                }
                sx={{ fontSize: 40, mr: 2 }}
              />
              <Box>
                <Typography variant="body1" component="div">
                  {t(
                    "checkout.fulfillmentMethod.homeDelivery",
                    "Home Delivery"
                  )}
                </Typography>
                <Typography fontSize={12} color="text.secondary">
                  {t(
                    "checkout.fulfillmentMethod.homeDeliveryDescription",
                    "Get your items delivered directly to your doorstep. Standard shipping takes 3-5 business days."
                  )}
                </Typography>
                <FormControlLabel
                  value="home_delivery"
                  control={<Radio size="small" />}
                  label={t(
                    selectedOption === "home_delivery"
                      ? "checkout.fulfillmentMethod.selected"
                      : "checkout.fulfillmentMethod.select",
                    selectedOption === "home_delivery" ? "Selected" : "Select"
                  )}
                  checked={selectedOption === "home_delivery"}
                />
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* In-Store Pickup Option */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor:
              selectedOption === "in_store_pickup"
                ? "rgba(25, 118, 210, 0.08)"
                : "background.paper",
            border: "2px solid transparent",
            transition: "all 0.3s",
            cursor: "pointer",
            "&:hover": {
              bgcolor:
                selectedOption === "in_store_pickup"
                  ? "rgba(25, 118, 210, 0.12)"
                  : "action.hover",
            },
          }}
          onClick={() => handlePaperClick("in_store_pickup")}
        >
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Box
              sx={{ display: "flex", alignItems: "flex-start", flexGrow: 1 }}
            >
              <StoreIcon
                color={
                  selectedOption === "in_store_pickup" ? "primary" : "action"
                }
                sx={{ fontSize: 40, mr: 2 }}
              />
              <Box>
                <Typography variant="body1" component="div">
                  {t(
                    "checkout.fulfillmentMethod.inStorePickup",
                    "In-Store Pickup"
                  )}
                </Typography>
                <Typography fontSize={12} color="text.secondary">
                  {t(
                    "checkout.fulfillmentMethod.inStorePickupDescription",
                    "Pick up your order at one of our locations. Available as soon as 2 hours after placing your order."
                  )}
                </Typography>
                <FormControlLabel
                  value="in_store_pickup"
                  control={<Radio size="small" />}
                  label={t(
                    selectedOption === "in_store_pickup"
                      ? "checkout.fulfillmentMethod.selected"
                      : "checkout.fulfillmentMethod.select",
                    selectedOption === "in_store_pickup" ? "Selected" : "Select"
                  )}
                  checked={selectedOption === "in_store_pickup"}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </RadioGroup>
    </Box>
  );
};

export default FulfillmentMethodSelector;
