import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  alpha,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Switch,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  TextField as MuiTextField,
  Grid,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  Control,
  Controller,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";

// Import MUI icons
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

// Form data structure for UITemplatesTab
export interface UITemplateFormData {
  uiTemplates: {
    productCardStyle: "card1" | "card2" | "card3";
    pdpLayoutStyle: "classic" | "modern" | "minimalist";
    checkout_layout: "layout1" | "layout2" | "layout3";
  };
  customer_group_selling_channel: number | null;
  is_active: boolean;
}

interface UITemplatesTabProps {
  control: Control<UITemplateFormData>;
  watch: UseFormWatch<UITemplateFormData>;
  setValue?: UseFormSetValue<UITemplateFormData>;
}

// Card 1: Updated with reduced height
const ProductCard1: React.FC<{ image: string }> = ({ image }) => {
  return (
    <Card
      sx={{
        maxWidth: 200,
        margin: "auto",
        borderRadius: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height="80" // THE FIX: Height reduced from 200 to 140
          image={image}
          alt="Sample Product 1"
          sx={{ objectFit: "contain" }}
        />
        <IconButton
          aria-label="add to favorites"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
            },
          }}
        >
          <FavoriteBorderIcon fontSize="small" />
        </IconButton>
      </Box>

      <CardContent sx={{ pt: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component="div"
          sx={{ minHeight: 34 }}
        >
          Elegant Timepiece
        </Typography>
      </CardContent>
      <CardActions>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <Typography variant="h6" component="p">
            $168.00
          </Typography>
          <IconButton
            aria-label="add to cart"
            sx={{
              backgroundColor: "primary.main",
              color: "#fff",
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "primary.dark",
              },
            }}
          >
            <ShoppingCartIcon />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  );
};

// Card 2: Unchanged
const ProductCard2: React.FC<{ image: string }> = ({ image }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        maxWidth: 200,
        margin: "auto",
        borderRadius: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <CardMedia
        component="img"
        height="80"
        image={image}
        alt="Sample Product 2"
        sx={{ objectFit: "contain" }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" sx={{ minHeight: 40 }}>
          Comfort Sneakers
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, minHeight: 40 }}
        >
          These sneakers provide all-day comfort and style.
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
          <Button variant="contained" sx={{ flex: 1 }}>
            Add to Cart
          </Button>
          <IconButton
            aria-label="like"
            sx={{ border: `1px solid ${theme.palette.divider}` }}
          >
            <FavoriteBorderIcon sx={{ color: "red" }} />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  );
};

// Corrected layout for ProductCard3
const ProductCard3: React.FC<{ image: string }> = ({ image }) => {
  const theme = useTheme();
  const mockdata = {
    title:
      "DELL 15 AMD Ryzen 5 Hexa Core 7530U - (16 GB/512 GB SSD/Windows 11 Home) 3535 Laptop",
    price: 44840,
    originalPrice: 56000,
    features: [
      "AMD Ryzen 5 Hexa Core Processor",
      "16 GB DDR4 RAM",
      "Windows 11 Operating System",
      "512 GB SSD",
      "39.62 cm (15.6 Inch) Display",
    ],
  };
  const discount = Math.round(
    ((mockdata.originalPrice - mockdata.price) / mockdata.originalPrice) * 100
  );

  return (
    <Card
      sx={{
        p: 2,
        borderRadius: 2,
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
        width: "100%",
      }}
    >
      <Grid container spacing={3} alignItems="center">
        {/* Left Column: Image */}
        <Grid size={{ xs: 12, md: 3 }}>
          <CardMedia
            component="img"
            image={image}
            alt={mockdata.title}
            sx={{
              height: 250,
              width: "100%",
              maxWidth: 250,
              objectFit: "contain",
            }}
          />
        </Grid>

        {/* Right Column: Details & Actions */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Grid container>
            {/* Details Section */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 500 }}>
                {mockdata.title}
              </Typography>
              <List sx={{ p: 0, mt: 1 }}>
                {mockdata.features.map((feature, index) => (
                  <ListItem key={index} sx={{ p: 0 }}>
                    <ListItemText
                      primary={`• ${feature}`}
                      primaryTypographyProps={{
                        variant: "body2",
                        color: "text.secondary",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Price & Actions Section */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack
                sx={{
                  height: "100%",
                  alignItems: { xs: "flex-start", lg: "flex-end" },
                }}
              >
                <Typography
                  variant="h5"
                  component="p"
                  sx={{ fontWeight: "bold" }}
                >
                  ₹{mockdata.price.toLocaleString("en-IN")}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textDecoration: "line-through" }}
                  >
                    ₹{mockdata.originalPrice.toLocaleString("en-IN")}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    {discount}% off
                  </Typography>
                </Stack>

                {/* Spacer to push buttons to the bottom */}
                <Box sx={{ flexGrow: 1 }} />

                <Stack
                  spacing={1}
                  sx={{ mt: 2, width: { xs: "100%", sm: "auto" } }}
                >
                  <Button variant="contained" size="large">
                    Add to Cart
                  </Button>
                  <Button variant="outlined" size="large">
                    Add to Wishlist
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
};

// ProductCardThumbnail component (Unchanged)
const ProductCardThumbnail: React.FC<{ style: string }> = ({ style }) => {
  const theme = useTheme();
  const commonStyles = {
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    height: 80,
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderRadius: 1,
    p: 0.5,
  };
  if (style === "card1") {
    return (
      <Box sx={commonStyles}>
        {" "}
        <Box
          sx={{
            height: "50%",
            bgcolor: "primary.main",
            opacity: 0.1,
            borderRadius: "4px 4px 0 0",
          }}
        />{" "}
        <Box
          sx={{
            height: "2px",
            width: "80%",
            bgcolor: "text.primary",
            m: "4px auto 0",
          }}
        />{" "}
        <Box
          sx={{
            height: "2px",
            width: "40%",
            bgcolor: "text.secondary",
            m: "4px auto 0",
          }}
        />{" "}
        <Box
          sx={{ display: "flex", justifyContent: "space-between", p: "4px" }}
        >
          {" "}
          <Box
            sx={{ height: "4px", width: "30%", bgcolor: "text.primary" }}
          />{" "}
          <Box
            sx={{
              height: "8px",
              width: "45%",
              bgcolor: "primary.main",
              borderRadius: "4px",
            }}
          />{" "}
        </Box>{" "}
      </Box>
    );
  }
  if (style === "card2") {
    return (
      <Box sx={{ ...commonStyles, display: "flex", gap: 0.5 }}>
        {" "}
        <Box
          sx={{
            height: "100%",
            width: "40%",
            bgcolor: "primary.main",
            opacity: 0.1,
            borderRadius: "4px",
          }}
        />{" "}
        <Stack sx={{ flex: 1, justifyContent: "center" }}>
          {" "}
          <Box
            sx={{
              height: "3px",
              width: "90%",
              bgcolor: "text.primary",
              mb: 0.5,
            }}
          />{" "}
          <Box
            sx={{
              height: "2px",
              width: "60%",
              bgcolor: "text.secondary",
              mb: 1,
            }}
          />{" "}
          <Box
            sx={{
              height: "6px",
              width: "70%",
              bgcolor: "primary.main",
              borderRadius: "2px",
              alignSelf: "flex-end",
            }}
          />{" "}
        </Stack>{" "}
      </Box>
    );
  }
  return (
    <Box
      sx={{
        ...commonStyles,
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
      }}
    >
      {" "}
      <Box
        sx={{
          height: "80%",
          width: "30%",
          bgcolor: "primary.main",
          opacity: 0.1,
          borderRadius: "4px",
        }}
      />{" "}
      <Stack sx={{ flex: 1 }}>
        {" "}
        <Box
          sx={{ height: "4px", width: "90%", bgcolor: "text.primary", mb: 1 }}
        />{" "}
        <Box
          sx={{ height: "3px", width: "40%", bgcolor: "success.main", mb: 1 }}
        />{" "}
        <Box
          sx={{
            height: "2px",
            width: "100%",
            bgcolor: "text.secondary",
            mb: 0.5,
          }}
        />{" "}
        <Box
          sx={{
            height: "2px",
            width: "100%",
            bgcolor: "text.secondary",
            opacity: 0.7,
          }}
        />{" "}
      </Stack>{" "}
    </Box>
  );
};

// PDP Layout thumbnails (Unchanged)
const PDPLayoutThumbnail: React.FC<{ layout: string }> = ({ layout }) => {
  const theme = useTheme();
  const commonStyles = {
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    height: 80,
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderRadius: 1,
    display: "flex",
    flexDirection: layout === "modern" ? "row" : "column",
  };
  const imageStyles = {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...(layout === "classic" && { height: "60%", width: "100%" }),
    ...(layout === "modern" && { height: "100%", width: "50%" }),
    ...(layout === "minimalist" && { height: "70%", width: "100%" }),
  };
  const contentStyles = {
    padding: theme.spacing(0.5),
    ...(layout === "classic" && { height: "40%", width: "100%" }),
    ...(layout === "modern" && { height: "100%", width: "50%" }),
    ...(layout === "minimalist" && { height: "30%", width: "100%" }),
  };
  return (
    <Box sx={commonStyles}>
      {" "}
      <Box sx={imageStyles}>
        {" "}
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: theme.palette.primary.main,
            borderRadius: "50%",
            opacity: 0.6,
          }}
        />{" "}
      </Box>{" "}
      <Box
        sx={contentStyles}
        display="flex"
        flexDirection="column"
        justifyContent="center"
      >
        {" "}
        <Box
          sx={{ height: 3, width: "80%", bgcolor: "text.primary", mb: 0.5 }}
        />{" "}
        <Box
          sx={{ height: 2, width: "60%", bgcolor: "primary.main", mb: 0.5 }}
        />{" "}
        {layout !== "minimalist" && (
          <Box
            sx={{
              height: 2,
              width: "70%",
              bgcolor: "text.secondary",
              opacity: 0.7,
            }}
          />
        )}{" "}
      </Box>{" "}
    </Box>
  );
};

// Sample PDP Layout for preview (Unchanged)
const PDPLayoutPreview: React.FC<{ layout: string }> = ({ layout }) => {
  const theme = useTheme();
  const isModern = layout === "modern";
  const isMinimalist = layout === "minimalist";
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        p: 2,
        transition: "all 0.3s ease-in-out",
      }}
    >
      {" "}
      <Grid container spacing={2} direction={isModern ? "row" : "column"}>
        {" "}
        <Grid size={{ xs: 12, md: isModern ? 6 : 12 }}>
          {" "}
          <Box
            sx={{
              height: 250,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {" "}
            <Typography variant="body1" color="textSecondary">
              Product Gallery
            </Typography>{" "}
          </Box>{" "}
        </Grid>{" "}
        <Grid size={{ xs: 12, md: isModern ? 6 : 12 }}>
          {" "}
          <Stack spacing={isMinimalist ? 1 : 2}>
            {" "}
            <Typography variant="h5" fontWeight={isMinimalist ? 400 : 600}>
              Product Name
            </Typography>{" "}
            <Typography variant="h6" color="primary">
              $149.99
            </Typography>{" "}
            {!isMinimalist && (
              <Typography variant="body2" color="textSecondary">
                This is a sample product description. The length and style of
                this description changes based on the selected layout.
              </Typography>
            )}{" "}
            <Box
              sx={{
                mt: 2,
                height: 40,
                width: isMinimalist ? "50%" : "70%",
                bgcolor: theme.palette.primary.main,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              <Typography color="primary.contrastText">
                Add to Cart
              </Typography>{" "}
            </Box>{" "}
          </Stack>{" "}
        </Grid>{" "}
      </Grid>{" "}
      {!isMinimalist && (
        <Box mt={4}>
          {" "}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Product Details
          </Typography>{" "}
          <Box
            sx={{
              height: 80,
              bgcolor: alpha(theme.palette.background.default, 0.5),
              p: 2,
              borderRadius: 1,
            }}
          >
            {" "}
            <Box
              sx={{
                height: 10,
                width: "100%",
                bgcolor: alpha(theme.palette.text.secondary, 0.2),
                mb: 1,
              }}
            />{" "}
            <Box
              sx={{
                height: 10,
                width: "90%",
                bgcolor: alpha(theme.palette.text.secondary, 0.2),
                mb: 1,
              }}
            />{" "}
            <Box
              sx={{
                height: 10,
                width: "80%",
                bgcolor: alpha(theme.palette.text.secondary, 0.2),
              }}
            />{" "}
          </Box>{" "}
        </Box>
      )}{" "}
    </Paper>
  );
};

// Main Component - UITemplatesTab
export function UITemplatesTab({
  control,
  watch,
  setValue,
}: UITemplatesTabProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: sellingChannels = [] } = useActiveSellingChannels();

  const productCardStyle = watch("uiTemplates.productCardStyle");
  const pdpLayoutStyle = watch("uiTemplates.pdpLayoutStyle");
  const isActive = watch("is_active");

  const previewImages = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80",
  ];

  const renderSelectedCard = (image: string) => {
    switch (productCardStyle) {
      case "card1":
        return <ProductCard1 image={image} />;
      case "card2":
        return <ProductCard2 image={image} />;
      case "card3":
        return <ProductCard3 image={image} />;
      default:
        return <ProductCard1 image={image} />;
    }
  };

  return (
    <Box>
      <Stack spacing={4}>
        {/* Status and Selling Channel Section */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={3}>
            {/* Selling Channel Autocomplete */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="customer_group_selling_channel"
                control={control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    options={sellingChannels}
                    value={
                      sellingChannels.find(
                        (option) => option.id === field.value
                      ) || null
                    }
                    onChange={(event, newValue: SellingChannel | null) => {
                      field.onChange(newValue?.id || null);
                    }}
                    getOptionLabel={(option: SellingChannel) =>
                      option.segment_name
                    }
                    renderInput={(params) => (
                      <MuiTextField
                        {...params}
                        label={t(
                          "configuration.ui.selectChannel",
                          "Select Segment Name"
                        )}
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        placeholder={t(
                          "configuration.ui.selectSellingChannelPlaceholder",
                          "Choose a Segment Name"
                        )}
                      />
                    )}
                    renderOption={(props, option: SellingChannel) => (
                      <li {...props} key={option.id}>
                        {option.segment_name}
                      </li>
                    )}
                  />
                )}
              />
            </Grid>
            {/* Status Toggle */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="is_active"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography
                      variant="body2"
                      color={
                        !field.value
                          ? theme.palette.error.main
                          : "text.secondary"
                      }
                      fontWeight={!field.value ? 600 : 400}
                    >
                      {t("common.inactive", "Inactive")}
                    </Typography>
                    <Switch
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                      color="success"
                      inputProps={{
                        "aria-label": t("configuration.ui.status", "Status"),
                      }}
                    />
                    <Typography
                      variant="body2"
                      color={
                        field.value
                          ? theme.palette.success.main
                          : "text.secondary"
                      }
                      fontWeight={field.value ? 600 : 400}
                    >
                      {t("common.active", "Active")}
                    </Typography>
                  </Box>
                )}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Product Card Style Section */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("configuration.ui.plpTitle", "Product Card Style")}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t(
              "configuration.ui.pdpDescription",
              "Choose how products appear in listings and search results."
            )}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Controller
              name="uiTemplates.productCardStyle"
              control={control}
              defaultValue="card1"
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value}
                  onChange={(_, value) =>
                    value !== null && field.onChange(value)
                  }
                  aria-label="product card style"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                    gap: 2,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: 0,
                      "&:not(:first-of-type)": { borderRadius: 1 },
                      "&:first-of-type": { borderRadius: 1 },
                    },
                  }}
                >
                  <ToggleButton
                    value="card1"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <ProductCardThumbnail style="card1" />
                    <Typography variant="body2">Card 1</Typography>
                  </ToggleButton>
                  <ToggleButton
                    value="card2"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <ProductCardThumbnail style="card2" />
                    <Typography variant="body2">Card 2</Typography>
                  </ToggleButton>
                  <ToggleButton
                    value="card3"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <ProductCardThumbnail style="card3" />
                    <Typography variant="body2">Card 3</Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t("configuration.ui.preview", "Live Preview")}
            </Typography>
            <Box
              sx={{
                p: { xs: 1, sm: 3 },
                bgcolor: alpha(theme.palette.background.default, 0.5),
                borderRadius: 2,
                transition: "all 0.3s ease-in-out",
                mt: 1,
              }}
            >
              <Grid container spacing={3} alignItems="stretch">
                {(productCardStyle === "card3"
                  ? [previewImages[0]]
                  : previewImages
                ).map((img, index) => (
                  <Grid
                    key={index}
                    size={{ xs: 12, md: productCardStyle === "card3" ? 12 : 4 }}
                  >
                    {renderSelectedCard(img)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Paper>

        {/* Product Detail Page Layout Section */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("configuration.ui.pdpTitle", "Product Detail Page Layout")}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t(
              "configuration.ui.pdpDescription",
              "Select the layout for individual product pages."
            )}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Controller
              name="uiTemplates.pdpLayoutStyle"
              control={control}
              defaultValue="classic"
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value}
                  onChange={(_, value) =>
                    value !== null && field.onChange(value)
                  }
                  aria-label="pdp layout style"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                    gap: 2,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: 0,
                      "&:not(:first-of-type)": { borderRadius: 1 },
                      "&:first-of-type": { borderRadius: 1 },
                    },
                  }}
                >
                  <ToggleButton
                    value="classic"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <PDPLayoutThumbnail layout="classic" />
                    <Typography variant="body2">Classic</Typography>
                  </ToggleButton>
                  <ToggleButton
                    value="modern"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <PDPLayoutThumbnail layout="modern" />
                    <Typography variant="body2">Modern</Typography>
                  </ToggleButton>
                  <ToggleButton
                    value="minimalist"
                    sx={{
                      p: 1,
                      flexDirection: "column",
                      gap: 1,
                      height: "auto",
                    }}
                  >
                    <PDPLayoutThumbnail layout="minimalist" />
                    <Typography variant="body2">Minimalist</Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t("configuration.ui.preview", "Live Preview")}
            </Typography>
            <Box sx={{ mt: 1, transition: "all 0.3s ease-in-out" }}>
              <PDPLayoutPreview layout={pdpLayoutStyle} />
            </Box>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
