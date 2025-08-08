"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Grid,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Button,
  Chip,
  Paper,
  useTheme,
  SelectChangeEvent,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  useMediaQuery,
  Theme,
  Drawer,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/app/contexts/SearchContext";
import { Filters } from "@/app/components/Store/plp/Filters";
import { ProductCard } from "@/app/components/Store/plp/ProductCard";
import { HeaderNavigation } from "@/app/components/Store/HeaderNavigation";
import CloseIcon from "@mui/icons-material/Close";
import SortIcon from "@mui/icons-material/Sort";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { MobileSwipeableDrawer } from "@/app/components/common/MobileSwipeableDrawer";

import { useProductListing } from "@/app/hooks/api/store/useProductListing";
import {
  type Product,
  type ProductListingParams,
} from "@/app/types/store/product-listing";
import {
  useAddToCart,
  useAddToWishlist,
} from "@/app/hooks/api/store/useProducts";
import { useWishlist } from "@/app/hooks/api/store/useWishlist";
import { useStoreConfig } from "@/app/[tenant]/store/layout";

interface FilterChip {
  id: number;
  label: string;
  type: string;
  value: string;
}
function notifyCartUpdated() {
  const event = new CustomEvent("cartUpdated");
  document.dispatchEvent(event);
}
/**
 * Product Listing Page component
 * Displays a list of products with filtering and sorting options
 * @returns {React.ReactElement} The Product Listing Page
 */
export default function ProductListingPage(): React.ReactElement {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useSearch();
  const storeConfig = useStoreConfig();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );
  const sortOptions = [
    {
      value: "relevance",
      label: t("products.sortOptions.relevance", "Relevance"),
    },
    {
      value: "price_asc",
      label: t("products.sortOptions.priceLowHigh", "Price: Low to High"),
    },
    {
      value: "price_desc",
      label: t("products.sortOptions.priceHighLow", "Price: High to Low"),
    },
    {
      value: "newest",
      label: t("products.sortOptions.newest", "Newest First"),
    },
    {
      value: "rating",
      label: t("products.sortOptions.rating", "Customer Rating"),
    },
  ];
  // If storeConfig is not available yet (shouldn't happen due to StoreConfigProvider, but good to be safe)
  if (!storeConfig) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const isCard3 = storeConfig.ui_template_settings.product_card_style.toLowerCase() === "card3";
  // Check for access token
  const [hasAccessToken, setHasAccessToken] = React.useState(false);

  React.useEffect(() => {
    // Extract tenant slug from URL path
    const pathParts = window.location.pathname.split("/");
    const tenantSlug = pathParts[1];

    // Use tenant-prefixed token key
    const tokenKey = tenantSlug ? `${tenantSlug}_access_token` : "access_token";
    const token = localStorage.getItem(tokenKey);
    setHasAccessToken(!!token);
  }, []);

  // State for filters, sorting, and pagination
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<ProductListingParams>({});
  const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedFilterChips, setSelectedFilterChips] = useState<
    {
      id: string;
      label: string;
      onDelete: () => void;
    }[]
  >([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Feedback state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Initialize search query and filters from URL on component mount
  useEffect(() => {
    const urlSearchQuery = searchParams.get("search");
    const categoryId = searchParams.get("category");
    const subcategoryId = searchParams.get("subcategory");
    const divisionId = searchParams.get("division");
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");

    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    const newFilters: ProductListingParams = { ...filters };

    // Clear existing filters first
    delete newFilters.category_id;
    delete newFilters.subcategory_id;
    delete newFilters.division_id;
    delete newFilters.price_min;
    delete newFilters.price_max;
    // At the end of the useEffect, after processing URL parameters
    if (divisionId || categoryId || subcategoryId) {
      setShowFilters(true);
    }
    // Set filters based on URL parameters
    if (divisionId) {
      newFilters.division_id = Number(divisionId);
    }

    // Only set one of category/subcategory based on priority (subcategory takes precedence)
    if (subcategoryId) {
      newFilters.subcategory_id = Number(subcategoryId);
    } else if (categoryId) {
      newFilters.category_id = Number(categoryId);
    }

    // Set price filters if they exist in the URL
    if (priceMin) {
      newFilters.price_min = Number(priceMin);
    }

    if (priceMax) {
      newFilters.price_max = Number(priceMax);
    }

    // Update the filter chips when initializing from URL
    const chips: FilterChip[] = [];

    // Add chips for category filters
    if (newFilters.category_id) {
      chips.push({
        id: 0,
        label: `Category: ${newFilters.category_id}`,
        type: "category",
        value: String(newFilters.category_id),
      });
    }

    // Add chips for price filters
    if (priceMin || priceMax) {
      let priceLabel = "";
      let priceValue = "";

      if (priceMin && priceMax) {
        priceLabel = `Price: ₹${Number(priceMin).toLocaleString()}-₹${Number(
          priceMax
        ).toLocaleString()}`;
        priceValue = `${priceMin}-${priceMax}`;
      } else if (priceMin) {
        priceLabel = `Price: ≥ ₹${Number(priceMin).toLocaleString()}`;
        priceValue = `min-${priceMin}`;
      } else if (priceMax) {
        priceLabel = `Price: ≤ ₹${Number(priceMax).toLocaleString()}`;
        priceValue = `max-${priceMax}`;
      }

      chips.push({
        id: chips.length,
        label: priceLabel,
        type: "price",
        value: priceValue,
      });
    }

    setFilters(newFilters);
    setActiveFilters(chips);
  }, [searchParams, setSearchQuery]);

  // Prepare query parameters
  const productListingParams = useMemo(
    () => ({
      sort_by: sortBy,
      page: currentPage,
      ...filters,
      search: searchQuery || undefined,
      // Dynamically fetch delivery parameters from localStorage
      ...(typeof window !== "undefined" ? (() => {
        const pathParts = window.location.pathname.split("/");
        const tenantSlug = pathParts[1] || "";
        const locationKey = `${tenantSlug}_location`;
        const locationRaw = localStorage.getItem(locationKey);
        if (locationRaw) {
          try {
            const locationObj = JSON.parse(locationRaw);
            return {
              pincode: locationObj.pincode || undefined,
              country: locationObj.country || locationObj.countryCode || undefined,
            };
          } catch (e) {
            // Ignore parse error
          }
        }
        return {};
      })() : {}),
      // Dynamically fetch customer_group_selling_channel_id from localStorage
      ...(typeof window !== "undefined" ? (() => {
        const pathParts = window.location.pathname.split("/");
        const tenantSlug = pathParts[1] || "";
        const segmentKey = `${tenantSlug}_segmentdetails`;
        const segmentRaw = localStorage.getItem(segmentKey);
        if (segmentRaw) {
          try {
            const segmentObj = JSON.parse(segmentRaw);
            return {
              customer_group_selling_channel_id: segmentObj.id || undefined,
            };
          } catch (e) {
            // Ignore parse error
          }
        }
        return {};
      })() : {}),
    }),
    [sortBy, currentPage, filters, searchQuery]
  );

  // Fetch products using TanStack Query and the new useProductListing hook
  const { data, isLoading, isError, error } =
    useProductListing(productListingParams);

  // Get wishlist data to check if products are already in wishlist
  const { wishlist, removeFromWishlist } = useWishlist(hasAccessToken);

  // Mutations for cart and wishlist
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

  // Function to check if a product is in the wishlist
  const isInWishlist = (productSku: string): boolean => {
    if (!wishlist || !wishlist.results) return false;
    return wishlist.results.some((item) => item.product_sku === productSku);
  };

  // Function to get wishlist item ID by product SKU
  const getWishlistItemId = (productSku: string): string | null => {
    if (!wishlist || !wishlist.results) return null;
    const item = wishlist.results.find(
      (item) => item.product_sku === productSku
    );
    return item ? item.id.toString() : null;
  };

  // Handle sort change
  const handleSortChange = (event: SelectChangeEvent<string>): void => {
    setSortBy(event.target.value);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle filter change
  const handleFilterChange = (newFilters: ProductListingParams): void => {
    // Preserve search if it exists
    const updatedFilters = searchQuery
      ? { ...newFilters, search: searchQuery }
      : newFilters;

    // Update filter state and reset pagination
    setFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page when filters change

    // Update active filter chips
    const chips: FilterChip[] = [];

    // Add search chip if search query exists
    if (searchQuery) {
      chips.push({
        id: Date.now(),
        label: `Search: ${searchQuery}`,
        type: "search",
        value: searchQuery,
      });
    }

    // Process category filters
    if (newFilters.category_id) {
      const categoryIds = Array.isArray(newFilters.category_id)
        ? newFilters.category_id
        : [newFilters.category_id];
      categoryIds.forEach((category, index) => {
        chips.push({
          id: index,
          label: `Category: ${category}`,
          type: "category",
          value: String(category),
        });
      });
    }

    // Brand filters removed per request

    // Process price range filter - handle any combination of min/max price
    if (
      newFilters.price_min !== undefined ||
      newFilters.price_max !== undefined
    ) {
      let priceLabel = "";
      let priceValue = "";

      if (
        newFilters.price_min !== undefined &&
        newFilters.price_max !== undefined
      ) {
        // Both min and max defined
        priceLabel = `Price: ₹${newFilters.price_min.toLocaleString()}-₹${newFilters.price_max.toLocaleString()}`;
        priceValue = `${newFilters.price_min}-${newFilters.price_max}`;
      } else if (newFilters.price_min !== undefined) {
        // Only min price defined
        priceLabel = `Price: ≥ ₹${newFilters.price_min.toLocaleString()}`;
        priceValue = `min-${newFilters.price_min}`;
      } else if (newFilters.price_max !== undefined) {
        // Only max price defined
        priceLabel = `Price: ≤ ₹${newFilters.price_max.toLocaleString()}`;
        priceValue = `max-${newFilters.price_max}`;
      }

      chips.push({
        id: chips.length,
        label: priceLabel,
        type: "price",
        value: priceValue,
      });
    }

    setActiveFilters(chips);
  };

  // Setup intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load more products when the load more element comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [inView, hasNextPage, isLoading]);


  const router = useRouter();
  const pathname = usePathname();

  // Handle clear all filters
  const handleClearAllFilters = (): void => {
    setFilters({});
    setActiveFilters([]);
    setSortBy("relevance");

    // Clear URL parameters but preserve other query parameters
    const params = new URLSearchParams(searchParams.toString());
    params.delete("division");
    params.delete("category");
    params.delete("subcategory");
    params.delete("search");
    params.delete("price_min");
    params.delete("price_max");

    // Update the URL without triggering a page reload
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // Reset to first page
    setCurrentPage(1);
  };

  // Handle add to cart
  const handleAddToCart = (product: Product): void => {
    addToCart.mutate(
      { productSku: product.sku, quantity: 1 },
      {
        onSuccess: () => {
          notifyCartUpdated();
          setSnackbar({
            open: true,
            message: t("store.product.addedToCart", "Product added to cart"),
            severity: "success",
          });
        },
        onError: (error: any) => {
          let errorMessage = t(
            "store.product.errorAddingToCart",
            "Error adding product to cart"
          );

          // Try to parse the error message if it's a validation error
          try {
            const errorData = JSON.parse(error.message);
            if (errorData.product_sku && Array.isArray(errorData.product_sku)) {
              errorMessage = `${t(
                "store.product.invalidSku",
                "Invalid product SKU"
              )}: ${errorData.product_sku[0]}`;
            }
          } catch (e) {
            // If parsing fails, use the default error message
            console.error("Error parsing API error:", e);
          }

          setSnackbar({
            open: true,
            message: errorMessage,
            severity: "error",
          });
        },
      }
    );
  };

  // Handle toggle wishlist (add or remove)
  const handleToggleWishlist = (product: Product): void => {
    if (!hasAccessToken) {
      setSnackbar({
        open: true,
        message: t(
          "store.product.loginRequired",
          "Please log in to manage your wishlist"
        ),
        severity: "info",
      });
      return;
    }

    // Check if product is already in wishlist
    const productInWishlist = isInWishlist(product.sku);

    if (productInWishlist) {
      // If product is in wishlist, remove it
      const itemId = getWishlistItemId(product.sku);

      if (!itemId) {
        // This shouldn't happen if isInWishlist returned true, but handle it anyway
        setSnackbar({
          open: true,
          message: t(
            "store.product.errorRemovingFromWishlist",
            "Error removing product from wishlist"
          ),
          severity: "error",
        });
        return;
      }

      removeFromWishlist.mutate(itemId, {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: t(
              "store.product.removedFromWishlist",
              "Product removed from wishlist"
            ),
            severity: "success",
          });
        },
        onError: (error: any) => {
          setSnackbar({
            open: true,
            message:
              error.response?.data?.detail ||
              t(
                "store.product.errorRemovingFromWishlist",
                "Error removing product from wishlist"
              ),
            severity: "error",
          });
        },
      });
    } else {
      // If product is not in wishlist, add it
      addToWishlist.mutate(product.sku, {
        onSuccess: (result: any) => {
          // Check if the item was already in the wishlist
          if (result?.isExisting) {
            setSnackbar({
              open: true,
              message: t(
                "store.product.alreadyInWishlist",
                "Product is already in your wishlist"
              ),
              severity: "info",
            });
          } else {
            setSnackbar({
              open: true,
              message: t(
                "store.product.addedToWishlist",
                "Product added to wishlist"
              ),
              severity: "success",
            });
          }
        },
        onError: (error: any) => {
          // Check for token expiration or authentication errors
          if (
            error.response?.status === 401 ||
            error.response?.data?.detail?.toLowerCase().includes("token")
          ) {
            setSnackbar({
              open: true,
              message: t(
                "store.product.loginRequired",
                "Please log in to manage your wishlist"
              ),
              severity: "info",
            });
            return;
          }

          // Handle case where item already exists in wishlist
          if (
            error.response?.data?.detail === "Item already exists in wishlist."
          ) {
            setSnackbar({
              open: true,
              message: t(
                "store.product.alreadyInWishlist",
                "Product is already in your wishlist"
              ),
              severity: "info",
            });
            return;
          }

          // Handle other errors
          setSnackbar({
            open: true,
            message:
              error.response?.data?.detail ||
              t(
                "store.product.errorAddingToWishlist",
                "Error adding product to wishlist"
              ),
            severity: "error",
          });
        },
      });
    }
  };

  // Handle close snackbar
  const handleCloseSnackbar = (): void => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };
  const getSelectedLabel = (value) => {
    const option = sortOptions.find((opt) => opt.value === value);
    return option ? option.label : "";
  };
  // State to store all products as they're loaded from different pages
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Get products from data or empty array if loading/error
  const products = data?.data || [];

  // Check if there's a next page based on the number of products returned
  // If we received a full page of products, assume there might be more
  React.useEffect(() => {
    // Check if there's more pages based on pagination data
    if (data?.pagination) {
      setHasNextPage(
        data.pagination.current_page < data.pagination.total_pages
      );
    } else {
      setHasNextPage(false);
    }

    // If we have no products and it's page 1, clear the list
    if (products.length === 0 && currentPage === 1) {
      setAllProducts([]);
      return;
    }

    // Add new products to our accumulated list
    if (products.length > 0) {
      setAllProducts((prevProducts) => {
        // If we're on page 1, reset the list otherwise append
        if (currentPage === 1) {
          return [...products];
        } else {
          // Filter out any duplicates based on product id
          const newProducts = products.filter(
            (newProduct: Product) =>
              !prevProducts.some(
                (existingProduct) => existingProduct.id === newProduct.id
              )
          );
          return [...prevProducts, ...newProducts];
        }
      });
    }
  }, [products, currentPage, data?.pagination]);

  // Mobile drawer state for sort and filter
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);

  // Toggle filter drawer
  const toggleFilterDrawer = () => {
    setIsFilterDrawerOpen(!isFilterDrawerOpen);
  };


  const handleSortDrawerOpen = () => {
    setSortDrawerOpen(true);
  };

  const handleSortDrawerClose = () => {
    setSortDrawerOpen(false);
  };

  return (
    <>
      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "& .MuiSnackbar-root": {
            top: "24px !important",
            left: "50%",
            transform: "translateX(-50%)",
            width: "auto",
            maxWidth: "90%",
          },
          "& .MuiPaper-root": {
            width: "100%",
            maxWidth: "400px",
            textAlign: "center",
          },
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            "& .MuiAlert-message": {
              width: "100%",
              textAlign: "center",
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <HeaderNavigation />

      <Container
        maxWidth={false}
        disableGutters
        sx={{ width: "100%", pl: isMobile ? 0 : 1.5, pr: isMobile ? 0 : 1.5 }}
      >
        <Grid container spacing={0} sx={{ mt: 1 }}>
          {/* Filters Sidebar - conditionally rendered */}
          {isMobile
            ? null
            : showFilters && (
                <Grid size={{ xs: 12, md: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1,
                      backgroundColor: "white",
                      border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    }}
                  >
                    <Filters
                      key={`filters-${searchParams.get("division") || ""}-${
                        searchParams.get("category") || ""
                      }-${searchParams.get("subcategory") || ""}`}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearAllFilters}
                      onSelectedFiltersChange={setSelectedFilterChips}
                      selectedCategory={
                        searchParams.get("category") || undefined
                      }
                      filterData={data?.filters}
                    />
                  </Paper>
                </Grid>
              )}

          {/* Product Grid Area - adjusts width based on filter visibility */}
          <Grid
            size={{ xs: 12, md: showFilters ? 10 : 12 }}
            sx={{
              pl: { xs: 0, md: showFilters ? 2 : 0 },
              pb: isMobile ? "80px" : 0,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "white",
                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: theme.spacing(2),
                  mb: theme.spacing(1),
                }}
              >
                {/* Left Side: Title and Count */}
                <Box>
                  <Typography
                    variant="h6"
                    component="h1"
                    sx={{
                      mb: 0.5,
                      fontWeight: theme.typography.fontWeightBold,
                    }}
                  >
                    {t("products.title", "Products")}
                  </Typography>
                  {!isLoading && !isError && data && (
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ fontSize: theme.typography.pxToRem(12) }}
                    >
                      {t("products.showing", "Showing")} {allProducts.length}{" "}
                      {t("products.products", "products")}
                    </Typography>
                  )}
                </Box>

                {/* Right Side: Filters and Sort */}
                {!isMobile && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: "center",
                      gap: theme.spacing(2),
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    <FormControl
                      size="small"
                      sx={{
                        minWidth: 220, // Adjusted width to fit the longest text
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      <Select
                        value={sortBy}
                        size="small"
                        onChange={handleSortChange}
                        // The renderValue prop creates the "Sort by: Featured" display
                        renderValue={(selectedValue) =>
                          `Sort by: ${getSelectedLabel(selectedValue)}`
                        }
                        sx={{
                          // You can adjust font size here for a compact look
                          fontSize: "0.9rem", // Using rem units is recommended
                        }}
                      >
                        {/* Map over the options array to create the MenuItems */}
                        {sortOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => setShowFilters(!showFilters)}
                      sx={{ ml: 1 }}
                    >
                      {showFilters
                        ? t("products.hideFilters", "Hide Filters")
                        : t("products.showFilters", "Show Filters")}
                    </Button>
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  mb: theme.spacing(3),
                }}
              >
                {/* Selected Filter Chips Display */}
                {selectedFilterChips.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedFilterChips.map((chip) => (
                      <Chip
                        key={chip.id}
                        label={chip.label}
                        size="small"
                        onDelete={chip.onDelete}
                        sx={{ mb: 1, borderRadius: "4px" }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
              {isLoading && currentPage === 1 ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "50vh",
                    width: "100%",
                  }}
                >
                  <CircularProgress size={40} />
                </Box>
              ) : isError ? (
                <Paper
                  sx={{
                    p: theme.spacing(4),
                    textAlign: "center",
                    minHeight: "200px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h6" color="error" gutterBottom>
                    {t("common.error", "An error occurred")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error instanceof Error
                      ? error.message
                      : t("common.unknownError", "Unknown error")}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={() => window.location.reload()}
                  >
                    {t("common.retry", "Retry")}
                  </Button>
                </Paper>
              ) : allProducts.length === 0 ? (
                <Paper
                  sx={{
                    p: theme.spacing(4),
                    textAlign: "center",
                    minHeight: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {t(
                      "products.noProductsFound",
                      "No products found matching your criteria"
                    )}
                  </Typography>
                </Paper>
              ) : (
                <Box
                  display="flex"
                  flexWrap="wrap"
                  sx={{ mx: -1.5 }} // Compensate for item padding
                >
                  {allProducts.map((product) => (
                    <Box
                      key={product.id}
                      sx={{
                        width: {
                          xs: "100%",
                          sm: isCard3 ? "100%" : showFilters ? "50%" : "25%",
                          md: isCard3
                            ? "100%"
                            : showFilters
                            ? "33.333%"
                            : "20%",
                          lg: isCard3 ? "100%" : showFilters ? "25%" : "20%",
                        },
                        p: 1.5, // This creates spacing between items
                      }}
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={() => handleAddToCart(product)}
                        onAddToWishlist={() => handleToggleWishlist(product)}
                        isInWishlist={isInWishlist(product.sku)}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              {/* Infinite Scroll Loader */}
              <Box
                ref={loadMoreRef}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: theme.spacing(4),
                  mb: theme.spacing(2),
                  width: "100%",
                  py: theme.spacing(2),
                }}
              >
                {isLoading && currentPage > 1 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: theme.spacing(1),
                    }}
                  >
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary">
                      {t("products.loadingMore", "Loading more products...")}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        {/* Mobile Fixed Bottom Buttons */}
        {isMobile && (
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              zIndex: (theme) => theme.zIndex.appBar - 1,
              boxShadow: 3,
              bgcolor: "background.paper",
              // pb: 1, // Add bottom padding for iOS devices
              height: 50,
            }}
          >
            <Button
              variant="outlined"
              onClick={toggleFilterDrawer}
              fullWidth
              sx={{
                flex: 1,
                py: 1.5,
                borderRadius: 0,
                textTransform: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
              startIcon={<FilterAltIcon />}
            >
              {t("products.filters", "Filters")}
            </Button>
            <Button
              variant="contained"
              onClick={handleSortDrawerOpen}
              fullWidth
              sx={{
                flex: 1,
                py: 1.5,
                borderRadius: 0,
                textTransform: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
              startIcon={<SortIcon />}
            >
              {t("products.sort", "Sort")}
            </Button>
          </Box>
        )}
      </Container>

      <Drawer
        anchor="left"
        open={isFilterDrawerOpen}
        onClose={toggleFilterDrawer}
        PaperProps={{
          sx: {
            width: "80%",
            maxWidth: "320px",
            p: 2,
          },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
            }}
          >
            <Typography variant="h6" fontWeight="medium">
              {t("products.filters", "Filters")}
            </Typography>
            <IconButton
              onClick={toggleFilterDrawer}
              aria-label={t("common.close", "Close")}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Filters
            key={`filters-${searchParams.get("division") || ""}-${
              searchParams.get("category") || ""
            }-${searchParams.get("subcategory") || ""}`}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearAllFilters}
            onSelectedFiltersChange={setSelectedFilterChips}
            selectedCategory={searchParams.get("category") || undefined}
            filterData={data?.filters}
          />
        </Box>
      </Drawer>

      {/* Mobile Sort Drawer */}
      {isMobile && (
        <MobileSwipeableDrawer
          open={sortDrawerOpen}
          onOpen={handleSortDrawerOpen}
          onClose={handleSortDrawerClose}
          title={t("products.sortBy", "Sort by")}
        >
          <Box>
            <Box
              onClick={() => {
                handleSortChange({
                  target: { value: "relevance" },
                } as any);
                handleSortDrawerClose();
              }}
              sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography>
                {t("products.sortOptions.relevance", "Relevance")}
              </Typography>
            </Box>
            <Box
              onClick={() => {
                handleSortChange({
                  target: { value: "price_asc" },
                } as any);
                handleSortDrawerClose();
              }}
              sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography>
                {t("products.sortOptions.priceLowHigh", "Price: Low to High")}
              </Typography>
            </Box>
            <Box
              onClick={() => {
                handleSortChange({
                  target: { value: "price_desc" },
                } as any);
                handleSortDrawerClose();
              }}
              sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography>
                {t("products.sortOptions.priceHighLow", "Price: High to Low")}
              </Typography>
            </Box>
            <Box
              onClick={() => {
                handleSortChange({
                  target: { value: "newest" },
                } as any);
                handleSortDrawerClose();
              }}
              sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography>
                {t("products.sortOptions.newest", "Newest First")}
              </Typography>
            </Box>
            <Box
              onClick={() => {
                handleSortChange({
                  target: { value: "rating" },
                } as any);
                handleSortDrawerClose();
              }}
              sx={{ py: 1 }}
            >
              <Typography>
                {t("products.sortOptions.rating", "Customer Rating")}
              </Typography>
            </Box>
          </Box>
        </MobileSwipeableDrawer>
      )}
    </>
  );
}
