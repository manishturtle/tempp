"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Avatar,
  Box,
  Typography,
  IconButton,
  Grid,
  InputAdornment,
  ButtonGroup,
  Chip,
  Divider,
  Card,
  CardContent,
  Collapse,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import PercentIcon from "@mui/icons-material/Percent";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  getAllDivisions,
  getAllCategories,
  getAllSubcategories,
  useAllTaxRates,
  useTaxRateProfile,
} from "@/app/hooks/api/orders";
import { ProductLineItem, ProductLineItemTax } from "./ProductDetails";

// Extended Product type that matches the sample data structure provided
interface ExtendedProduct {
  id: number;
  name: string;
  division: number;
  division_details?: {
    id: number;
    name: string;
  };
  category: number;
  category_details?: {
    id: number;
    name: string;
  };
  subcategory: number;
  subcategory_details?: {
    id: number;
    name: string;
  };
  uom_details?: {
    name: string;
    symbol: string;
  };
  images?: Array<{
    id: number;
    image: string;
    is_default: boolean;
  }>;
  display_price: string;
  sku: string;
  default_tax_rate_profile?: number;
}

interface Division {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  division?: number;
}

interface Subcategory {
  id: number;
  name: string;
  category?: number;
}

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  onAddProduct: (product: ProductLineItem) => void;
  products: ExtendedProduct[];
  lineItems?: ProductLineItem[];
  editMode?: boolean;
  editingItem?: ProductLineItem | null;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  onClose,
  onAddProduct,
  products,
  lineItems,
  editMode = false,
  editingItem = null,
}) => {
  const { t } = useTranslation();

  // State for loading indicators
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // State for catalog data
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // State for selected values
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<ExtendedProduct | null>(null);

  // State for form fields
  const [hsnSacCode, setHsnSacCode] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [rate, setRate] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">(
    "PERCENTAGE"
  );

  // State for showing/hiding filters
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // State for tax configuration
  const [selectedTaxRates, setSelectedTaxRates] = useState<any[]>([]);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(false);

  // Hooks for tax data
  const { data: allTaxRates = [], isLoading: loadingTaxRates } =
    useAllTaxRates();
  const { data: taxRateProfile, isLoading: loadingTaxProfile } =
    useTaxRateProfile(selectedProduct?.default_tax_rate_profile || null);

  // Filtered data based on selections
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);
  const [filteredProducts, setFilteredProducts] =
    useState<ExtendedProduct[]>(products);

  // Load all divisions on dialog open
  useEffect(() => {
    if (open) {
      const fetchDivisions = async () => {
        try {
          setLoadingDivisions(true);
          const data = await getAllDivisions();
          setDivisions(data);
        } catch (error) {
          console.error("Error fetching divisions:", error);
        } finally {
          setLoadingDivisions(false);
        }
      };

      const fetchCategories = async () => {
        try {
          setLoadingCategories(true);
          const data = await getAllCategories();
          setCategories(data);
        } catch (error) {
          console.error("Error fetching categories:", error);
        } finally {
          setLoadingCategories(false);
        }
      };

      const fetchSubcategories = async () => {
        try {
          setLoadingSubcategories(true);
          const data = await getAllSubcategories();
          setSubcategories(data);
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        } finally {
          setLoadingSubcategories(false);
        }
      };

      fetchDivisions();
      fetchCategories();
      fetchSubcategories();
    }
  }, [open]);

  // Filter categories based on selected division
  useEffect(() => {
    if (selectedDivision) {
      const filtered = categories.filter(
        (category) => category.division === selectedDivision.id
      );
      setFilteredCategories(filtered);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedProduct(null);
    } else {
      setFilteredCategories([]);
    }
  }, [selectedDivision, categories]);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (selectedCategory) {
      const filtered = subcategories.filter(
        (subcategory) => subcategory.category === selectedCategory.id
      );
      setFilteredSubcategories(filtered);
      setSelectedSubcategory(null);
      setSelectedProduct(null);
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategory, subcategories]);

  // Initialize filteredProducts with all products when dialog opens
  useEffect(() => {
    if (open) {
      setFilteredProducts(products);
    }
  }, [open, products]);

  // Filter products based on selections (progressive filtering)
  useEffect(() => {
    let filtered = products;

    // Filter by division if selected
    if (selectedDivision) {
      filtered = filtered.filter(
        (product) => product.division === selectedDivision.id
      );
    }

    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory.id
      );
    }

    // Filter by subcategory if selected
    if (selectedSubcategory) {
      filtered = filtered.filter(
        (product) => product.subcategory === selectedSubcategory.id
      );
    }

    setFilteredProducts(filtered);
    setSelectedProduct(null);
  }, [selectedDivision, selectedCategory, selectedSubcategory, products]);

  // Calculate discount amount based on discount type
  const calculateDiscountAmount = (): number => {
    const rateValue = parseFloat(rate) || 0;
    const quantityValue = parseFloat(quantity) || 0;
    const discountValue = parseFloat(discount) || 0;
    const totalAmount = rateValue * quantityValue;

    if (discountType === "PERCENTAGE") {
      return (totalAmount * discountValue) / 100;
    } else {
      return discountValue;
    }
  };

  // Calculate base amount (qty * rate)
  const calculateBaseAmount = (): number => {
    const rateValue = parseFloat(rate) || 0;
    const quantityValue = parseFloat(quantity) || 0;
    return rateValue * quantityValue;
  };

  // Calculate subtotal after discount
  const calculateSubtotal = (): number => {
    return calculateBaseAmount() - calculateDiscountAmount();
  };

  // Calculate individual tax amounts
  const calculateTaxBreakdown = () => {
    const subtotal = calculateSubtotal();
    return selectedTaxRates.map((taxRate: any) => ({
      id: taxRate.id,
      name: taxRate.rate_name,
      rate: taxRate.rate_percentage,
      amount: (subtotal * taxRate.rate_percentage) / 100,
    }));
  };

  // Calculate total tax amount
  const calculateTotalTaxAmount = (): number => {
    return calculateTaxBreakdown().reduce(
      (total, tax) => total + tax.amount,
      0
    );
  };

  // Calculate final total
  const calculateTotalAmount = (): number => {
    return calculateSubtotal() + calculateTotalTaxAmount();
  };

  // Auto-fill rate when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.display_price) {
      setRate(selectedProduct.display_price.toString());
    }
  }, [selectedProduct]);

  // Handle tax rate profile changes and preselect tax rates
  useEffect(() => {
    if (editMode || editingItem) {
      return;
    }
    if (taxRateProfile && allTaxRates.length > 0 && !editMode && !editingItem) {
      // Extract unique tax_rate IDs from outcomes in rules
      const taxRateIds = new Set<number>();

      taxRateProfile?.rules?.forEach((rule: any) => {
        rule.outcomes.forEach((outcome: any) => {
          taxRateIds.add(outcome.tax_rate);
        });
      });

      // Find the corresponding tax rates from allTaxRates
      const preselectedTaxRates = allTaxRates.filter((taxRate: any) =>
        taxRateIds.has(taxRate.id)
      );

      setSelectedTaxRates(preselectedTaxRates);
    } else {
      setSelectedTaxRates([]);
    }
  }, [taxRateProfile, allTaxRates, selectedProduct?.default_tax_rate_profile]);

  // Effect to prefill form data when in edit mode
  useEffect(() => {
    if (editMode && editingItem && open) {
      // Find the product from the products array
      const product = products.find((p) => p.id === editingItem.product);
      if (product) {
        setSelectedProduct(product);
      }

      // Set form fields
      setHsnSacCode(editingItem.hsn_sac_code || "");
      setDescription(editingItem.description || "");
      setQuantity(editingItem.quantity.toString());
      setRate(editingItem.unit_price.toString());
      setDiscount(
        editingItem.discount_percentage?.toString() ||
          editingItem.discount_amount.toString() ||
          ""
      );
      setDiscountType(
        editingItem.discount_type === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT"
      );

      // Set tax rates from the taxes array
      if (
        editingItem.taxes &&
        editingItem.taxes.length > 0 &&
        allTaxRates.length > 0
      ) {
        const editTaxRates = allTaxRates.filter((taxRate: any) =>
          editingItem.taxes.some((tax) => tax.tax_id === taxRate.id)
        );
        setSelectedTaxRates(editTaxRates);
      }
    }
  }, [editMode, editingItem, open, products, allTaxRates]);

  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
    // Reset all selections when toggling filters
    if (!showFilters) {
      setSelectedDivision(null);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedProduct(null);
    }
  };

  const resetDialog = () => {
    setSelectedDivision(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    setHsnSacCode("");
    setDescription("");
    setQuantity("");
    setRate("");
    setDiscount("");
    setDiscountType("PERCENTAGE");
    setSelectedTaxRates([]);
    setShowTaxBreakdown(false);
    setShowFilters(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;

    const quantityValue = parseFloat(quantity) || 1;
    const rateValue =
      parseFloat(rate) || parseFloat(selectedProduct.display_price);
    const discountAmount = calculateDiscountAmount();
    const totalTaxAmount = calculateTotalTaxAmount();
    const totalAmount = calculateTotalAmount();

    // Calculate taxes array for each selected tax rate
    const taxBreakdown = calculateTaxBreakdown();
    const taxes = selectedTaxRates.map((taxRate) => {
      const taxInfo = taxBreakdown.find((t) => t.id === taxRate.id);
      return {
        tax_id: taxRate.id,
        tax_code: taxRate.tax_type_code,
        tax_rate: taxRate.rate_percentage?.toFixed(2) || 0,
        tax_amount: taxInfo?.amount?.toFixed(2) || 0,
        tax_name: taxRate.rate_name,
      };
    });

    const order = lineItems?.length || 0;

    const newProductLineItem: ProductLineItem = {
      item_order: order + 1,
      product_sku: selectedProduct.sku,
      product_name: selectedProduct.name,
      product: selectedProduct.id,
      quantity: quantityValue,
      unit_price: parseFloat(rateValue?.toFixed(2)) || 0,
      description: description || undefined,
      hsn_sac_code: hsnSacCode || undefined,
      discount_type: discountType,
      discount_percentage:
        discountType === "PERCENTAGE" ? parseFloat(discount) || 0 : undefined,
      discount_amount: parseFloat(discountAmount?.toFixed(2)) || 0,
      taxes: taxes,
      total_price: parseFloat(totalAmount?.toFixed(2)) || 0,
      uom_symbol: selectedProduct.uom_details?.symbol,
    };

    onAddProduct(newProductLineItem);
    handleClose();
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editMode ? t("orders.editProduct") : t("orders.addProduct")}
      </DialogTitle>
      <DialogContent dividers>
        <>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography sx={{ fontSize: "16px", mb: "0px" }}>
                {t("orders.productInformation")}
              </Typography>
            </Grid>
            {showFilters && (
              <>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    options={divisions}
                    loading={loadingDivisions}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    getOptionKey={(option) => option.id.toString()}
                    value={selectedDivision}
                    onChange={(_, newValue) => setSelectedDivision(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("orders.division")}
                        variant="outlined"
                        fullWidth
                        sx={{ mb: "0px" }}
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loadingDivisions ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    options={filteredCategories}
                    loading={loadingCategories}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    getOptionKey={(option) => option.id.toString()}
                    value={selectedCategory}
                    onChange={(_, newValue) => setSelectedCategory(newValue)}
                    disabled={!selectedDivision}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("orders.category")}
                        variant="outlined"
                        sx={{ mb: "0px" }}
                        fullWidth
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loadingCategories ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    options={filteredSubcategories}
                    loading={loadingSubcategories}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    getOptionKey={(option) => option.id.toString()}
                    value={selectedSubcategory}
                    onChange={(_, newValue) => setSelectedSubcategory(newValue)}
                    disabled={!selectedCategory}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("orders.subcategory")}
                        variant="outlined"
                        sx={{ mb: "0px" }}
                        fullWidth
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loadingSubcategories ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </>
            )}
            <Grid size={12}>
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Autocomplete
                    options={filteredProducts}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    getOptionKey={(option) => option.id.toString()}
                    value={selectedProduct}
                    onChange={(_, newValue) => setSelectedProduct(newValue)}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <li key={key} {...otherProps}>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ marginRight: 1 }}>
                              {option.images && option.images.length > 0 ? (
                                <img
                                  src={option.images[0].image}
                                  alt={option.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                getInitials(option.name)
                              )}
                            </Avatar>
                            <Typography>{option.name}</Typography>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("orders.product")}
                        variant="outlined"
                        sx={{ mb: "0px" }}
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Box>
                <IconButton
                  onClick={handleToggleFilters}
                  sx={{
                    backgroundColor: showFilters ? "primary.main" : "default",
                    color: showFilters ? "white" : "primary.main",
                  }}
                >
                  <TuneIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t("orders.description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t("orders.hsnSacCode")}
                value={hsnSacCode}
                onChange={(e) => setHsnSacCode(e.target.value)}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                type="number"
                // Prevent mousewheel from incrementing/decrementing the number
                onWheel={(e) =>
                  e.target instanceof HTMLElement && e.target.blur()
                }
                slotProps={{
                  input: {
                    inputProps: {
                      onWheel: (e) => e.preventDefault(),
                    },
                  },
                }}
              />
            </Grid>
            <Grid size={12}>
              <Typography sx={{ fontSize: "16px", mb: "0px", mt: 2 }}>
                {t("orders.pricingQuantity")}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField
                label={t("orders.quantity")}
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow positive numbers
                  if (!value || Number(value) >= 0) {
                    setQuantity(value);
                  }
                }}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                type="number"
                // Prevent mousewheel from incrementing/decrementing the number
                onWheel={(e) =>
                  e.target instanceof HTMLElement && e.target.blur()
                }
                slotProps={{
                  input: {
                    inputProps: {
                      onWheel: (e) => e.preventDefault(),
                      min: "0",
                      step: "1",
                    },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t("orders.rate")}
                value={rate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow positive numbers
                  if (!value || Number(value) >= 0) {
                    setRate(value);
                  }
                }}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                type="number"
                // Prevent mousewheel from incrementing/decrementing the number
                onWheel={(e) =>
                  e.target instanceof HTMLElement && e.target.blur()
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CurrencyRupeeIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: selectedProduct?.uom_details?.symbol ? (
                      <InputAdornment position="end">
                        /{selectedProduct.uom_details.symbol}
                      </InputAdornment>
                    ) : null,
                    inputProps: {
                      min: "0",
                      step: "0.01",
                    },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t("orders.discount")}
                value={discount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validate based on discount type
                  if (!value || Number(value) >= 0) {
                    if (discountType === "PERCENTAGE" && Number(value) > 100) {
                      return; // Don't update if percentage > 100
                    }
                    setDiscount(value);
                  }
                }}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                type="number"
                helperText={
                  discountType === "PERCENTAGE" && discount
                    ? `${t(
                        "orders.discountAmount"
                      )}: ₹${calculateDiscountAmount().toFixed(2)}`
                    : ""
                }
                onWheel={(e) =>
                  e.target instanceof HTMLElement && e.target.blur()
                }
                slotProps={{
                  input: {
                    inputProps: {
                      onWheel: (e) => e.preventDefault(),
                      min: "0",
                      max: discountType === "PERCENTAGE" ? "100" : undefined,
                      step: "0.01",
                    },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <ButtonGroup
                variant="outlined"
                size="small"
                fullWidth
                sx={{ height: "37px" }}
              >
                <Button
                  onClick={() => setDiscountType("PERCENTAGE")}
                  variant={
                    discountType === "PERCENTAGE" ? "contained" : "outlined"
                  }
                  startIcon={<PercentIcon />}
                />
                <Button
                  onClick={() => setDiscountType("AMOUNT")}
                  variant={discountType === "AMOUNT" ? "contained" : "outlined"}
                  startIcon={<CurrencyRupeeIcon />}
                />
              </ButtonGroup>
            </Grid>
            <Grid size={12}>
              <Typography sx={{ fontSize: "16px", mb: "0px", mt: 2 }}>
                {t("orders.taxConfig")}
              </Typography>
            </Grid>
            <Grid size={12}>
              <Autocomplete
                multiple
                options={allTaxRates}
                loading={loadingTaxRates}
                getOptionLabel={(option) => option.rate_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionKey={(option) => option.id.toString()}
                value={selectedTaxRates}
                onChange={(_, newValue) => setSelectedTaxRates(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        variant="outlined"
                        label={option.rate_name}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("orders.selectTaxRates")}
                    variant="outlined"
                    fullWidth
                    sx={{ mb: "0px" }}
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {loadingTaxRates ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Typography sx={{ fontSize: "16px", mb: "0px", mt: 2 }}>
                {t("orders.amountSummary")}
              </Typography>
            </Grid>
            <Grid size={12}>
              <Card variant="outlined" sx={{ bgcolor: "#f5f5f5" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {/* Base Amount */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {t("orders.baseAmount")}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ₹ {calculateBaseAmount().toFixed(2)}
                      </Typography>
                    </Box>

                    {/* Discount Amount */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {t("orders.discountAmount")}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "success.main" }}
                      >
                        - ₹ {calculateDiscountAmount().toFixed(2)}
                      </Typography>
                    </Box>

                    {/* Tax Amount */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {t("orders.taxAmount")}
                        </Typography>
                        {selectedTaxRates.length > 0 && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              setShowTaxBreakdown(!showTaxBreakdown)
                            }
                            sx={{ p: 0.25 }}
                          >
                            {showTaxBreakdown ? (
                              <RemoveIcon fontSize="small" />
                            ) : (
                              <AddIcon fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ₹ {calculateTotalTaxAmount().toFixed(2)}
                      </Typography>
                    </Box>

                    {/* Tax Breakdown */}
                    <Collapse in={showTaxBreakdown}>
                      <Box sx={{ pl: 2, pt: 1 }}>
                        {calculateTaxBreakdown().map((tax, index) => (
                          <Box
                            key={tax.id}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {tax.name} ({tax.rate}%)
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 500 }}
                            >
                              ₹ {tax.amount.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                        {calculateTaxBreakdown().length > 1 && (
                          <>
                            <Divider sx={{ my: 0.5 }} />
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600 }}
                              >
                                {t("orders.totalTax")}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600 }}
                              >
                                ₹ {calculateTotalTaxAmount().toFixed(2)}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                    </Collapse>

                    <Divider sx={{ my: 1 }} />

                    {/* Total Amount */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: "primary.main" }}
                      >
                        {t("orders.totalItemAmount")}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: "primary.main" }}
                      >
                        ₹ {calculateTotalAmount().toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button
          onClick={handleAddProduct}
          color="primary"
          variant="contained"
          disabled={!selectedProduct}
        >
          {editMode ? t("orders.updateProduct") : t("orders.addProduct")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDialog;
