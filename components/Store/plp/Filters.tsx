"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  Box,
  Typography,
  Divider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  type ProductFilters,
  type ProductListingParams,
} from "@/app/types/store/product-listing";

interface FilterOption {
  id: number | string;
  name: string;
  count: number;
}

interface FiltersProps {
  onFilterChange?: (filters: ProductListingParams) => void;
  onClearFilters?: () => void;
  selectedCategory?: string;
  onSelectedFiltersChange?: (
    chips: {
      id: string;
      label: string;
      onDelete: () => void;
    }[]
  ) => void;
  filterData?: {
    divisions?: Array<{
      division__id: number;
      division__name: string;
      count: number;
    }>;
    categories?: Array<{
      category__id: number;
      category__name: string;
      count: number;
    }>;
    subcategories?: Array<{
      subcategory__id: number;
      subcategory__name: string;
      count: number;
    }>;
    attributes?: Record<
      string,
      Array<{
        id: number;
        count: number;
        label: string;
      }>
    >;
    price_range?: {
      min: number;
      max: number;
    };
  };
}

export function Filters({
  onSelectedFiltersChange,
  onFilterChange,
  onClearFilters,
  selectedCategory,
  filterData,
}: FiltersProps): React.ReactElement {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const searchParams = useSearchParams();

  // Check URL parameters to conditionally hide sections (hierarchical logic)
  const hasDivisionParam = searchParams.get("division") !== null;
  const hasCategoryParam = searchParams.get("category") !== null;
  const hasSubcategoryParam = searchParams.get("subcategory") !== null;

  // Hierarchical hiding logic:
  // - If subcategory exists: hide all 3 (divisions, categories, subcategories)
  // - If category exists: hide divisions and categories
  // - If division exists: hide only divisions
  const shouldHideDivisions =
    hasDivisionParam || hasCategoryParam || hasSubcategoryParam;
  const shouldHideCategories = hasCategoryParam || hasSubcategoryParam;
  const shouldHideSubcategories = hasSubcategoryParam;

  // States for different filter types
  const [selectedDivisions, setSelectedDivisions] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>(
    []
  );
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, number[]>
  >({});
  const [showAllDivisions, setShowAllDivisions] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  // Flag to track if filters were manually cleared
  const [filtersCleared, setFiltersCleared] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<number[]>([
    filterData?.price_range?.min || 0,
    filterData?.price_range?.max || 10000,
  ]);

  // Set up accordion expanded states
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    divisions: true,
    categories: true,
    subcategories: true,
    price: true,
  });

  // Initialize filters from URL if present and auto-select divisions and categories
  useEffect(() => {
    // If filter data is not available yet, skip until it's loaded
    if (!filterData) return;

    // Skip initialization if filters were manually cleared
    if (filtersCleared) return;

    // Get filters from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlDivision = urlParams.get("division");
    const urlSubcategory = urlParams.get("subcategory");
    const urlCategory = selectedCategory;
    const urlPriceMin = urlParams.get("price_min");
    const urlPriceMax = urlParams.get("price_max");
    // Handle division filter if present
    if (urlDivision && filterData.divisions) {
      // Handle both single division and multiple divisions from URL
      const divisionIds = urlDivision.split(",").map((id) => parseInt(id, 10));
      const validDivisions = divisionIds.filter((divId) =>
        filterData.divisions?.some((div) => div.division__id === divId)
      );

      if (validDivisions.length > 0) {
        setSelectedDivisions(validDivisions);
      }
    }

    // Handle filter hierarchy using switch-case
    switch (true) {
      // Case 1: Subcategory is in URL
      case Boolean(urlSubcategory): {
        const subcategoryId = parseInt(urlSubcategory!, 10);
        setSelectedSubcategories([subcategoryId]);

        // Find subcategory and set related category and division
        const selectedSubcat = filterData.subcategories?.find(
          (s) => s.subcategory__id === subcategoryId
        );

        if (selectedSubcat) {
          // Auto-select parent category if available in filter data
          if (filterData.categories && filterData.categories.length > 0) {
            // Select the first available category (assuming it's the parent)
            const parentCategory = filterData.categories[0];
            setSelectedCategories([parentCategory.category__id]);
          }

          // Auto-select parent division if not already set from URL
          if (!urlDivision && filterData.divisions && filterData.divisions.length > 0) {
            // Select the first available division (assuming it's the parent)
            const parentDivision = filterData.divisions[0];
            setSelectedDivisions([parentDivision.division__id]);
          }
        }
        break;
      }

      // Case 2: Category is in URL but no subcategory
      case Boolean(urlCategory): {
        const categoryId = parseInt(urlCategory!, 10);
        setSelectedCategories([categoryId]);

        // Auto-select parent division if not already set from URL
        if (!urlDivision && filterData.divisions && filterData.divisions.length > 0) {
          // Select the first available division (assuming it's the parent)
          const parentDivision = filterData.divisions[0];
          setSelectedDivisions([parentDivision.division__id]);
        }
        break;
      }

      // Default case: No specific filter hierarchy to set
      default:
        // No additional actions needed
        break;
    }

    // Handle price range from URL
    const minPrice = filterData?.price_range?.min || 0;
    const maxPrice = filterData?.price_range?.max || 10000;

    let updatedPriceRange = [...priceRange];
    let priceRangeUpdated = false;

    if (urlPriceMin) {
      const parsedMin = parseInt(urlPriceMin, 10);
      if (!isNaN(parsedMin) && parsedMin !== minPrice) {
        updatedPriceRange[0] = parsedMin;
        priceRangeUpdated = true;
      }
    }

    if (urlPriceMax) {
      const parsedMax = parseInt(urlPriceMax, 10);
      if (!isNaN(parsedMax) && parsedMax !== maxPrice) {
        updatedPriceRange[1] = parsedMax;
        priceRangeUpdated = true;
      }
    }

    if (priceRangeUpdated) {
      setPriceRange(updatedPriceRange);
    }
  }, [selectedCategory, filterData, filtersCleared, priceRange]);

  // Update price range when price_range from API changes
  useEffect(() => {
    if (filterData?.price_range) {
      setPriceRange([
        filterData.price_range.min || 0,
        filterData.price_range.max || 10000,
      ]);
    }
  }, [filterData?.price_range]);

  // Handle accordion toggle
  const handleAccordionChange =
    (section: string) =>
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded({ ...expanded, [section]: isExpanded });
    };

  // Handle division selection
  const handleDivisionChange = (id: number) => {
    if (selectedDivisions.includes(id)) {
      setSelectedDivisions(selectedDivisions.filter((divId) => divId !== id));
    } else {
      setSelectedDivisions([...selectedDivisions, id]);
      // Clear category and subcategory selections when division changes
      setSelectedCategories([]);
      setSelectedSubcategories([]);
    }
  };

  // Handle category selection
  const handleCategoryChange = (id: number) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((catId) => catId !== id));
      // Clear subcategories related to this category
      setSelectedSubcategories([]);
    } else {
      setSelectedCategories([...selectedCategories, id]);
      // Clear subcategory selections when category changes
      setSelectedSubcategories([]);
      
      // Auto-select parent division when category is selected
      if (filterData?.divisions && filterData.divisions.length > 0 && selectedDivisions.length === 0) {
        const parentDivision = filterData.divisions[0];
        setSelectedDivisions([parentDivision.division__id]);
      }
    }
  };

  // Handle subcategory selection
  const handleSubcategoryChange = (id: number) => {
    if (selectedSubcategories.includes(id)) {
      setSelectedSubcategories(
        selectedSubcategories.filter((subId) => subId !== id)
      );
    } else {
      setSelectedSubcategories([...selectedSubcategories, id]);
      
      // Auto-select parent category and division when subcategory is selected
      if (filterData?.categories && filterData.categories.length > 0 && selectedCategories.length === 0) {
        const parentCategory = filterData.categories[0];
        setSelectedCategories([parentCategory.category__id]);
      }
      
      if (filterData?.divisions && filterData.divisions.length > 0 && selectedDivisions.length === 0) {
        const parentDivision = filterData.divisions[0];
        setSelectedDivisions([parentDivision.division__id]);
      }
    }
  };

  // Handle attribute selection
  const handleAttributeChange = (attributeName: string, valueId: number) => {
    setSelectedAttributes((prev) => {
      const currentValues = prev[attributeName] || [];

      // If value is already selected, remove it
      if (currentValues.includes(valueId)) {
        const newValues = currentValues.filter((id) => id !== valueId);

        if (newValues.length === 0) {
          // Remove the attribute key if no values are selected
          const { [attributeName]: _, ...rest } = prev;
          return rest;
        }

        return { ...prev, [attributeName]: newValues };
      }

      // Add new value
      return {
        ...prev,
        [attributeName]: [...currentValues, valueId],
      };
    });
  };

  // Handle price range changes
  const handlePriceRangeChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    setPriceRange(newValue as number[]);
  };

  // Clear all filters
  const handleClearAll = () => {
    // Mark filters as cleared to prevent re-initialization from URL
    setFiltersCleared(true);

    // Reset all filter states
    setSelectedDivisions([]);
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedAttributes({});

    // Reset price range to default values
    const defaultMinPrice = filterData?.price_range?.min || 0;
    const defaultMaxPrice = filterData?.price_range?.max || 10000;
    setPriceRange([defaultMinPrice, defaultMaxPrice]);

    // Force a UI update by calling onFilterChange with empty filters
    if (onFilterChange) {
      onFilterChange({});
    }

    // Call any additional clear handlers
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Debounced filter application
  const debouncedApplyFilters = useDebouncedCallback(() => {
    if (!onFilterChange) return;

    const filters: ProductListingParams = {};

    // Apply division filter if selected
    if (selectedDivisions.length > 0) {
      filters.division_id =
        selectedDivisions.length === 1
          ? selectedDivisions[0]
          : selectedDivisions;
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filters.category_id =
        selectedCategories.length === 1
          ? selectedCategories[0]
          : selectedCategories;
    }

    // Apply subcategory filter (takes precedence over category)
    if (selectedSubcategories.length > 0) {
      filters.subcategory_id =
        selectedSubcategories.length === 1
          ? selectedSubcategories[0]
          : selectedSubcategories;
    }

    // Apply price range filter
    const defaultMinPrice = filterData?.price_range?.min || 0;
    if (priceRange[0] !== defaultMinPrice) {
      filters.price_min = priceRange[0];
    }

    const defaultMaxPrice = filterData?.price_range?.max || 10000;
    if (priceRange[1] !== defaultMaxPrice) {
      filters.price_max = priceRange[1];
    }

    // Apply attribute filters
    if (Object.keys(selectedAttributes).length > 0) {
      Object.entries(selectedAttributes).forEach(([attrName, selectedIds]) => {
        if (selectedIds.length > 0) {
          // Convert attribute name to snake_case for API
          const apiKey = `attribute_${attrName
            .toLowerCase()
            .replace(/\s+/g, "_")}`;
          filters[apiKey] = selectedIds.join(",");
        }
      });
    }

    onFilterChange(filters);
  }, 400); // 400ms debounce delay

  // Trigger debounced filter application when filter state changes
  useEffect(() => {
    debouncedApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivisions, selectedCategories, selectedSubcategories, selectedAttributes, priceRange]);

  // Generate a list of selected filters for display
  const selectedFiltersChips = useMemo(() => {
    const chips: {
      id: string;
      label: string;
      onDelete: () => void;
    }[] = [];

    // Add division chips
    if (selectedDivisions.length > 0) {
      selectedDivisions.forEach((divisionId) => {
        const division = filterData?.divisions?.find(
          (d) => d.division__id === divisionId
        );
        if (division) {
          chips.push({
            id: `div-${divisionId}`,
            label: `${t("filters.divisions")}: ${division.division__name}`,
            onDelete: () => handleDivisionChange(divisionId),
          });
        }
      });
    }

    // Add category chips
    selectedCategories.forEach((catId) => {
      const category = filterData?.categories?.find(
        (c) => c.category__id === catId
      );
      if (category) {
        chips.push({
          id: `cat-${catId}`,
          label: `${t("filters.categories")}: ${category.category__name}`,
          onDelete: () => handleCategoryChange(catId),
        });
      }
    });

    // Add subcategory chips
    selectedSubcategories.forEach((subId) => {
      const subcategory = filterData?.subcategories?.find(
        (s) => s.subcategory__id === subId
      );
      if (subcategory) {
        chips.push({
          id: `subcat-${subId}`,
          label: `${t("filters.subcategories")}: ${
            subcategory.subcategory__name
          }`,
          onDelete: () => handleSubcategoryChange(subId),
        });
      }
    });

    // Add attribute chips
    Object.entries(selectedAttributes).forEach(([attrName, valueIds]) => {
      valueIds.forEach((valueId) => {
        const attrValue = filterData?.attributes?.[attrName]?.find(
          (v) => v.id === valueId
        );
        if (attrValue) {
          chips.push({
            id: `attr-${attrName}-${valueId}`,
            label: `${attrName}: ${attrValue.label}`,
            onDelete: () => handleAttributeChange(attrName, valueId),
          });
        }
      });
    });

    // Add price range chips with more detailed handling
    const defaultMin = filterData?.price_range?.min || 0;
    const defaultMax = filterData?.price_range?.max || 10000;

    // Check if either min or max prices differ from defaults
    const minDiffers = priceRange[0] !== defaultMin;
    const maxDiffers = priceRange[1] !== defaultMax;

    if (minDiffers || maxDiffers) {
      let label = "";

      // Generate appropriate label based on which values differ
      if (minDiffers && maxDiffers) {
        // Both min and max price are different from defaults
        label = `${t(
          "filters.priceRange"
        )}: ₹${priceRange[0].toLocaleString()} - ₹${priceRange[1].toLocaleString()}`;
      } else if (minDiffers) {
        // Only min price differs
        label = `${t(
          "filters.priceRange"
        )}: ≥ ₹${priceRange[0].toLocaleString()}`;
      } else {
        // Only max price differs
        label = `${t(
          "filters.priceRange"
        )}: ≤ ₹${priceRange[1].toLocaleString()}`;
      }

      chips.push({
        id: "price-range",
        label,
        onDelete: () => setPriceRange([defaultMin, defaultMax]),
      });
    }

    return chips;
  }, [
    selectedCategories,
    selectedSubcategories,
    selectedAttributes,
    priceRange,
    filterData,
    t,
  ]);

  // Pass selectedFiltersChips to parent component if callback is provided
  useEffect(() => {
    if (onSelectedFiltersChange) {
      onSelectedFiltersChange(selectedFiltersChips);
    }
  }, [selectedFiltersChips, onSelectedFiltersChange]);

  return (
    <Box sx={{ p: theme.spacing(1) }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: theme.typography.fontWeightBold }}
        >
          {t("filters.title", "Filters")}
        </Typography>
        {selectedFiltersChips.length > 0 && (
          <Button
            variant="text"
            size="small"
            onClick={handleClearAll}
            sx={{ fontSize: theme.typography.pxToRem(12) }}
          >
            {t("filters.clearAll", "Clear All")}
          </Button>
        )}
      </Box>

      {/* Selected filter chips
      {selectedFiltersChips.length > 0 && (
        <Box sx={{ mb: theme.spacing(2) }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedFiltersChips.map((chip) => (
              <Chip
                key={chip.id}
                label={chip.label}
                size="small"
                onDelete={chip.onDelete}
                sx={{ mb: 1, borderRadius: "4px" }}
              />
            ))}
          </Stack>
        </Box>
      )} */}

      <Divider sx={{ my: theme.spacing(1) }} />

      {/* Divisions */}
      {!shouldHideDivisions &&
        filterData?.divisions &&
        filterData.divisions.length > 0 && (
          <>
            <Accordion
              expanded={expanded.divisions}
              onChange={handleAccordionChange("divisions")}
              disableGutters
              elevation={0}
              sx={{
                border: "none",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  padding: 0,
                  minHeight: "auto",
                  "& .MuiAccordionSummary-content": { margin: 0 },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: theme.typography.fontWeightMedium,
                    fontSize: "0.875rem",
                  }}
                >
                  {t("filters.divisions", "Divisions")}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ padding: 0, mt: theme.spacing(1) }}>
                <FormGroup>
                  {filterData.divisions
                    .slice(0, showAllDivisions ? undefined : 5)
                    .map((division) => (
                      <FormControlLabel
                        key={`div-${division.division__id}`}
                        control={
                          <Checkbox
                            checked={selectedDivisions.includes(
                              division.division__id
                            )}
                            onChange={() =>
                              handleDivisionChange(division.division__id)
                            }
                            size="small"
                            sx={{
                              p: "3px 3px 3px 0px",
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {division.division__name.length > 27
                              ? division.division__name.slice(0, 27) + "..."
                              : division.division__name}{" "}
                            ({division.count})
                          </Typography>
                        }
                        sx={{ marginBottom: "4px", ml: 0, width: "100%" }}
                      />
                    ))}
                  {filterData.divisions.length > 5 && (
                    <Button
                      onClick={() => setShowAllDivisions(!showAllDivisions)}
                      size="small"
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        justifyContent: "flex-start",
                        pl: 0,
                        color: theme.palette.primary.main,
                        "&:hover": {
                          backgroundColor: "transparent",
                          textDecoration: "underline",
                        },
                      }}
                      startIcon={
                        showAllDivisions ? (
                          <ExpandMoreIcon
                            sx={{ transform: "rotate(180deg)" }}
                          />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                    >
                      {showAllDivisions
                        ? "Show less"
                        : `+${filterData.divisions.length - 5} more`}
                    </Button>
                  )}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
            <Divider sx={{ my: theme.spacing(1) }} />
          </>
        )}

      {/* Categories */}
      {!shouldHideCategories && (
        <>
          <Accordion
            expanded={expanded.categories}
            onChange={handleAccordionChange("categories")}
            disableGutters
            elevation={0}
            sx={{
              border: "none",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                padding: 0,
                minHeight: "auto",
                "& .MuiAccordionSummary-content": { margin: 0 },
              }}
            >
              <Typography
                sx={{
                  fontWeight: theme.typography.fontWeightMedium,
                  fontSize: "0.875rem",
                }}
              >
                {t("filters.categories", "Categories")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0, mt: theme.spacing(1) }}>
              <FormGroup>
                {filterData?.categories
                  ?.slice(0, showAllCategories ? undefined : 5)
                  .map((category) => (
                    <FormControlLabel
                      key={`cat-${category.category__id}`}
                      control={
                        <Checkbox
                          checked={selectedCategories.includes(
                            category.category__id
                          )}
                          onChange={() =>
                            handleCategoryChange(category.category__id)
                          }
                          size="small"
                          sx={{ p: "3px 3px 3px 0px" }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: "0.75rem" }}>
                          {category.category__name.length > 27
                            ? category.category__name.slice(0, 27) + "..."
                            : category.category__name}{" "}
                          ({category.count})
                        </Typography>
                      }
                      sx={{ marginBottom: "4px", ml: 0, width: "100%" }}
                    />
                  ))}
                {filterData?.categories && filterData.categories.length > 5 && (
                  <Button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontSize: "0.75rem",
                      justifyContent: "flex-start",
                      pl: 0,
                      color: theme.palette.primary.main,
                      "&:hover": {
                        backgroundColor: "transparent",
                        textDecoration: "underline",
                      },
                    }}
                    startIcon={
                      showAllCategories ? (
                        <ExpandMoreIcon sx={{ transform: "rotate(180deg)" }} />
                      ) : (
                        <ExpandMoreIcon />
                      )
                    }
                  >
                    {showAllCategories
                      ? "Show less"
                      : `+${filterData.categories.length - 5} more`}
                  </Button>
                )}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
          <Divider sx={{ my: theme.spacing(1) }} />
        </>
      )}

      {/* Subcategories */}
      {!shouldHideSubcategories &&
        filterData?.subcategories &&
        filterData.subcategories.length > 0 && (
          <>
            <Accordion
              expanded={expanded.subcategories}
              onChange={handleAccordionChange("subcategories")}
              disableGutters
              elevation={0}
              sx={{
                border: "none",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  padding: 0,
                  minHeight: "auto",
                  "& .MuiAccordionSummary-content": { margin: 0 },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: theme.typography.fontWeightMedium,
                    fontSize: "0.875rem",
                  }}
                >
                  {t("filters.subcategories", "Subcategories")}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ padding: 0, mt: theme.spacing(1) }}>
                <FormGroup>
                  {filterData.subcategories
                    .slice(0, showAllSubcategories ? undefined : 5)
                    .map((subcategory) => (
                      <FormControlLabel
                        key={`subcat-${subcategory.subcategory__id}`}
                        control={
                          <Checkbox
                            checked={selectedSubcategories.includes(
                              subcategory.subcategory__id
                            )}
                            onChange={() =>
                              handleSubcategoryChange(
                                subcategory.subcategory__id
                              )
                            }
                            size="small"
                            sx={{ p: "3px 3px 3px 0px" }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {subcategory.subcategory__name.length > 27
                              ? subcategory.subcategory__name.slice(0, 27) +
                                "..."
                              : subcategory.subcategory__name}{" "}
                            ({subcategory.count})
                          </Typography>
                        }
                        sx={{ marginBottom: "4px", ml: 0, width: "100%" }}
                      />
                    ))}
                  {filterData.subcategories.length > 5 && (
                    <Button
                      onClick={() =>
                        setShowAllSubcategories(!showAllSubcategories)
                      }
                      size="small"
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        justifyContent: "flex-start",
                        pl: 0,
                        color: theme.palette.primary.main,
                        "&:hover": {
                          backgroundColor: "transparent",
                          textDecoration: "underline",
                        },
                      }}
                      startIcon={
                        showAllSubcategories ? (
                          <ExpandMoreIcon
                            sx={{ transform: "rotate(180deg)" }}
                          />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                    >
                      {showAllSubcategories
                        ? "Show less"
                        : `+${filterData.subcategories.length - 5} more`}
                    </Button>
                  )}
                </FormGroup>
              </AccordionDetails>
            </Accordion>

            <Divider sx={{ my: theme.spacing(1) }} />
          </>
        )}

      {/* Dynamic Attributes */}
      {filterData?.attributes &&
        Object.entries(filterData.attributes).map(([attrName, values]) => (
          <React.Fragment key={`attr-${attrName}`}>
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: "none",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  padding: 0,
                  minHeight: "auto",
                  "& .MuiAccordionSummary-content": { margin: 0 },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: theme.typography.fontWeightMedium,
                    fontSize: "0.875rem",
                  }}
                >
                  {attrName}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ padding: 0, mt: theme.spacing(1) }}>
                <FormGroup>
                  {values.map((value) => (
                    <FormControlLabel
                      key={`attr-${attrName}-${value.id}`}
                      control={
                        <Checkbox
                          checked={(
                            selectedAttributes[attrName] || []
                          ).includes(value.id)}
                          onChange={() =>
                            handleAttributeChange(attrName, value.id)
                          }
                          size="small"
                          sx={{
                            p: "3px 3px 3px 0px",
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: "0.75rem" }}>
                          {value.label} ({value.count})
                        </Typography>
                      }
                      sx={{ marginBottom: "4px", ml: 0, width: "100%" }}
                    />
                  ))}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
            <Divider sx={{ my: theme.spacing(1) }} />
          </React.Fragment>
        ))}

      {/* Price Range - Non-collapsible */}
      <Box sx={{ mb: theme.spacing(2) }}>
        <Typography
          sx={{
            fontWeight: theme.typography.fontWeightMedium,
            fontSize: "0.875rem",
          }}
        >
          {t("filters.priceRange", "Price Range")}
        </Typography>
        <Box sx={{ px: 1, mt: 1 }}>
          <Slider
            value={priceRange}
            onChange={handlePriceRangeChange}
            valueLabelDisplay="off"
            min={filterData?.price_range?.min || 0}
            max={filterData?.price_range?.max || 10000}
            step={(filterData?.price_range?.max || 10000) / 20}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              ₹{priceRange[0].toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ₹{priceRange[1].toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: theme.spacing(2) }} />

      {/* Note: Apply button removed - filters now apply automatically with debounce */}
    </Box>
  );
}
