"use client";

import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  useTheme,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  Theme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { DetailedProduct } from "@/app/hooks/api/store/useProduct";
import ListItemIcon from "@mui/material/ListItemIcon";
import Circle from "@mui/icons-material/Circle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
interface ProductTabsProps {
  product: DetailedProduct;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Tab panel component for displaying content of selected tab
 */
const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * Product tabs component for product detail page
 * Displays description, specifications, and reviews in tabbed interface
 *
 * @param props - Component props
 * @returns React component
 */
export const ProductTabs = ({
  product,
}: ProductTabsProps): React.ReactElement => {
  console.log("rtyuioiuytfghu", product.faqs);
  const { t } = useTranslation("common");
  const theme = useTheme();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );
  const [tabValue, setTabValue] = useState(0);
  console.log("product detail page", product);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Function to parse key features
  const parseKeyFeatures = (
    features: string | string[] | undefined
  ): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    try {
      // Handle both stringified array and comma-separated strings
      if (features.startsWith("[") && features.endsWith("]")) {
        return JSON.parse(features.replace(/'/g, '"'));
      }
      return features.split(",").map((f) => f.trim());
    } catch (e) {
      console.error("Error parsing key features:", e);
      return [];
    }
  };
  const keyFeatures = parseKeyFeatures(product.key_features);
  const getDisplayValue = (spec: any) => {
    // Check each value type in order of priority
    if (spec.value_option !== null && spec.value_option !== undefined) {
      return spec.value_option;
    }
    if (spec.value_text !== null && spec.value_text !== undefined) {
      return spec.value_text;
    }
    if (spec.value_number !== null && spec.value_number !== undefined) {
      return spec.value_number.toString();
    }
    if (spec.value_boolean !== null && spec.value_boolean !== undefined) {
      return spec.value_boolean ? 'Yes' : 'No';
    }
    if (spec.value_date !== null && spec.value_date !== undefined) {
      return new Date(spec.value_date).toLocaleDateString();
    }
    // Fallback to empty string if no value is found
    return '';
  };
  return (
    <Box sx={{ width: "100%", marginBottom: 4, marginTop: isMobile ? 0 : 4 }}>
      {!isMobile ? (
        // Desktop view with tabs
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="product information tabs"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "1rem",
                  minWidth: 120,
                  "&.Mui-selected": {
                    color: theme.palette.primary.main,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: theme.palette.primary.main,
                  height: 3,
                },
              }}
            >
              <Tab
                label={t("store.product.description", "Description")}
                id="product-tab-0"
                aria-controls="product-tabpanel-0"
              />
              <Tab
                label={t("store.product.specifications", "Specifications")}
                id="product-tab-1"
                aria-controls="product-tabpanel-1"
              />
              {keyFeatures.length > 0 && (
                <Tab
                  label={t("store.product.keyFeatures", "Key Features")}
                  id="product-tab-2"
                  aria-controls="product-tabpanel-2"
                />
              )}
              {product.faqs && product.faqs.length > 0 && (
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box component="span" mr={0.5}>
                        {t("store.product.faqs", "FAQs")}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: theme.palette.grey[200],
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {product.faqs.length}
                      </Box>
                    </Box>
                  }
                  id="product-tab-3"
                  aria-controls="product-tabpanel-3"
                />
              )}
            </Tabs>
          </Box>

          {/* Description Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>
          </TabPanel>

          {/* Specifications Tab */}
          <TabPanel value={tabValue} index={1}>
            {(product.attribute_values ?? []).length > 0 ? (
              product.attribute_values?.map((spec, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    mb: 1.5,
                    "&:hover": {
                      backgroundColor: (theme) => theme.palette.action.hover,
                    },
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      width: { xs: "100%", sm: "30%", md: "20%" },
                      fontWeight: 500,
                      color: (theme) => theme.palette.text.secondary,
                      wordBreak: "break-word",
                    }}
                  >
                    {spec.attribute_name}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      width: { xs: "100%", sm: "70%", md: "80%" },
                      wordBreak: "break-word",
                    }}
                  >
                    {getDisplayValue(spec)}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body1" color="text.secondary">
                {t(
                  "store.product.noSpecifications",
                  "No specifications available for this product."
                )}
              </Typography>
            )}
          </TabPanel>

          {keyFeatures.length > 0 && (
            <TabPanel value={tabValue} index={2}>
              <List dense>
                {keyFeatures.map((feature, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Circle sx={{ fontSize: 8 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          )}
          {/* FAQs Tab */}
          {product.faqs && product.faqs.length > 0 && (
            <TabPanel value={tabValue} index={3}>
              <Box>
                {product.faqs.map((faq, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderBottom: "1px solid",
                      borderColor: "#ccc",
                      "&:last-of-type": {
                        borderBottom: "none", // remove border from last item
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="p"
                      gutterBottom
                      sx={{
                        fontWeight: 600,
                        color: (theme) => theme.palette.text.primary,
                      }}
                    >
                      Q: {faq.question}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="p"
                      sx={{
                        color: (theme) => theme.palette.text.secondary,
                        wordBreak: "break-word",
                      }}
                    >
                      A: {faq.answer}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </TabPanel>
          )}
        </>
      ) : (
        // Mobile view with accordions
        <Box>
          {/* Description Accordion */}
          <Accordion defaultExpanded sx={{ boxShadow: "none" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="description-content"
              id="description-header"
              sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="subtitle1" fontWeight={500}>
                {t("store.product.description", "Description")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                {product.description}
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Specifications Accordion */}
          <Accordion sx={{ boxShadow: "none" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="specifications-content"
              id="specifications-header"
              sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="subtitle1" fontWeight={500}>
                {t("store.product.specifications", "Specifications")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(product.attribute_values ?? []).length > 0 ? (
                product.attribute_values?.map((spec, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      mb: 1.5,
                      pb: 1,
                      borderBottom:
                        index < (product.attribute_values?.length || 0) - 1
                          ? `1px solid ${theme.palette.divider}`
                          : "none",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                        mb: 0.5,
                      }}
                    >
                      {spec.attribute_name}
                    </Typography>
                    <Typography variant="body1">
                      {getDisplayValue(spec)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body1" color="text.secondary">
                  {t(
                    "store.product.noSpecifications",
                    "No specifications available for this product."
                  )}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Key Features Accordion - only shown if features exist */}
          {keyFeatures.length > 0 && (
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="keyfeatures-content"
                id="keyfeatures-header"
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={500}>
                  {t("store.product.keyFeatures", "Key Features")}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense disablePadding>
                  {keyFeatures.map((feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Circle sx={{ fontSize: 8 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* FAQs Accordion - only shown if FAQs exist */}
          {product.faqs && product.faqs.length > 0 && (
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="faqs-content"
                id="faqs-header"
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {t("store.product.faqs", "FAQs")}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.palette.grey[300],
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    {product.faqs.length}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {product.faqs && product.faqs.length > 0 ? (
                    product.faqs.map((faq, index) => (
                      <Box
                        key={index}
                        sx={{
                          py: 1.5,
                          borderBottom:
                            index < product.faqs!.length - 1
                              ? `1px solid ${theme.palette.divider}`
                              : "none",
                        }}
                      >
                      <Typography
                        variant="body2"
                        component="p"
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                        }}
                      >
                        Q: {faq.question}
                      </Typography>
                      <Typography
                        variant="body2"
                        component="p"
                        sx={{
                          color: theme.palette.text.secondary,
                        }}
                      >
                        A: {faq.answer}
                      </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No FAQs available for this product.
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}
    </Box>
  );
};
