"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  FC,
} from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Radio,
  RadioGroup,
  FormHelperText,
  Snackbar,
  Alert,
  Autocomplete,
  Tooltip,
  AlertColor,
  FormLabel,
  FormControl,
  Switch,
} from "@mui/material";
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  useForm,
  useFieldArray,
  Resolver as HookFormResolver,
  Controller,
  ControllerRenderProps,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import {
  ProductFormData,
  ProductType,
  PublicationStatus,
  ProductDetail,
  ProductAttributeValue,
  AttributeValueInput,
  TemporaryImageData,
} from "@/app/types/products";
import { formSchema } from "./ProductForm.schema";
import AttributeValueManager from "./AttributeValueManager";
import VariantTable from "./VariantTable";
import { ImageManager } from "./ImageManager";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
// --- API HOOKS ---
import { useCreateProduct, useUpdateProduct } from "@/app/hooks/api/products";
import { useQueryClient } from "@tanstack/react-query";
import EntityAutocomplete from "@/app/components/common/Autocomplete/EntityAutocomplete";
import { entityEndpoints } from "@/app/components/common/Autocomplete/apiEndpoints";
import { SellingChannelsAutocomplete } from "@/app/components/admin/products/components/SellingChannelsAutocomplete";
import { ShippingZoneRestrictions } from "@/app/components/admin/products/components/ShippingZoneRestrictions";
import { AttributeValueProvider } from "@/app/contexts/AttributeValueContext";
import { useProductEnhancement } from "@/app/hooks/api/ai/productEnhance";

/**
 * Utility function to convert API product images to the format expected by ImageManager
 */
const convertApiImagesToUiFormat = (apiImages: any[] = []): any[] => {
  if (!apiImages || !Array.isArray(apiImages) || apiImages.length === 0) {
    return [];
  }

  return apiImages.map((apiImage) => ({
    // Common fields
    id: apiImage.id?.toString() || "",
    alt_text: apiImage.alt_text || "",
    sort_order:
      typeof apiImage.sort_order === "number" ? apiImage.sort_order : 0,
    is_default: !!apiImage.is_default,

    // API specific fields - pass through directly
    image: apiImage.image || "",
    product: apiImage.product,
    variant: apiImage.variant,
    created_at: apiImage.created_at,
    updated_at: apiImage.updated_at,
    client_id: apiImage.client_id,
    company_id: apiImage.company_id,
  }));
};

interface ProductFormProps {
  productId?: string;
  onSubmit?: (result: ProductDetail) => Promise<void>;
  defaultValues?: ProductDetail;
  isEditMode?: boolean;
  attributes?: Array<{
    id: number;
    name: string;
    code: string;
    data_type: string;
    validation_rules?: Record<string, any>;
  }>;
  initialViewMode?: boolean;
}

// Extended form data type
interface FormData extends Omit<ProductFormData, "temp_images"> {
  attributes: Record<string, ProductAttributeValue>;
  attribute_values_input: AttributeValueInput[];
  temp_images: TemporaryImageData[];
  parent_temp_images: TemporaryImageData[];
  attribute_groups: number[];
  variant_defining_attributes: number[];
  organizationTags: string[];
  active_from_date: Date | null;
  active_to_date: Date | null;
}

interface ExtendedProductDetail extends ProductDetail {
  attribute_groups?: number[];
  key_features?: string[];
  active_from_date?: string;
  active_to_date?: string;
  // Inventory management fields
  low_stock_count?: number | string;
  min_count?: number | string;
  max_count?: number | string;
  cost_price?: number | string;
}

const ProductForm = ({
  productId,
  onSubmit,
  defaultValues,
  isEditMode = false,
  attributes = [],
  initialViewMode = false,
}: ProductFormProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateFormat = "dd/MM/yyyy";

  // State for selected division and category - used for hierarchical filtering
  const [selectedDivision, setSelectedDivision] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  // State for notification
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // State to control view/edit mode
  const [viewMode, setViewMode] = useState<boolean>(
    initialViewMode || !!productId
  );

  // Ref to track the last attribute values to prevent infinite loops
  const lastAttributeValuesRef = useRef<string>("");

  // State to track the current product ID (from props or after creation)
  const [currentProductId, setCurrentProductId] = useState<string | undefined>(
    productId
  );

  // Update currentProductId when productId prop changes
  useEffect(() => {
    if (productId) {
      setCurrentProductId(productId);
    }
  }, [productId]);

  // Set category and subcategory when default values change
  useEffect(() => {
    if (defaultValues) {
      setSelectedCategory(
        typeof defaultValues.category === "object"
          ? (defaultValues.category as any)?.id || null
          : defaultValues.category || null
      );
      setSelectedSubcategory(
        typeof defaultValues.subcategory === "object"
          ? (defaultValues.subcategory as any)?.id || null
          : defaultValues.subcategory || null
      );

      // Initialize product images from API data
      if (defaultValues.images && Array.isArray(defaultValues.images)) {
        // Convert API image format to UI component format
        const formattedImages = convertApiImagesToUiFormat(
          defaultValues.images
        );
        console.log("Loading product images from API:", defaultValues.images);
        console.log("Formatted images for UI:", formattedImages);
        setProductImages(formattedImages);
      }
    }
  }, [defaultValues]);
  const { mutate: enhanceProduct, isEnhancing } = useProductEnhancement({
    onSuccess: (data) => {
      console.log("AI Enhancement successful:", data);
      // Update form fields with enhanced data
      if (data.data) {
        // Set main description
        if (data.data.product_description) {
          methods.setValue("description", data.data.product_description);
        }

        // Set short description
        if (data.data.short_summary) {
          methods.setValue("short_description", data.data.short_summary);
        }

        // Set SEO fields
        if (data.data.seo_meta_title) {
          methods.setValue("seo_title", data.data.seo_meta_title);
        }

        if (data.data.seo_meta_description) {
          methods.setValue("seo_description", data.data.seo_meta_description);
        }

        // Set key features if the field exists in the form
        if (data.data.key_features && Array.isArray(data.data.key_features)) {
          methods.setValue("key_features", data.data.key_features);
        }
      }

      setNotification({
        open: true,
        message: "Product enhanced successfully!",
        severity: "success",
      });
    },
    onError: (error) => {
      console.error("AI Enhancement failed:", error);
      setNotification({
        open: true,
        message: `Failed to enhance product: ${error.message}`,
        severity: "error",
      });
    },
  });
  // State for subcategory selection
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null
  );

  // State for product images
  const [productImages, setProductImages] = useState<
    Array<{
      id: string;
      alt_text: string;
      sort_order: number;
      is_default: boolean;
      original_filename?: string;
    }>
  >([]);

  // API mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct(
    productId ? parseInt(productId) : 0
  );

  // Map product details to form data
  const mapProductDetailsToFormData = (
    details: ExtendedProductDetail
  ): FormData => {
    const attributeValues: Record<string, ProductAttributeValue> = {};

    // Safely handle attribute values
    if (details.attribute_values) {
      details.attribute_values.forEach((av) => {
        // Use type assertion to handle the API response format
        const apiValue = av as any;

        // Handle both formats: attribute as object or as number
        const attributeId =
          typeof apiValue.attribute === "object"
            ? apiValue.attribute.id
            : apiValue.attribute;

        if (attributeId) {
          // Determine the actual value based on attribute type
          let actualValue = apiValue.value;
          const attributeType =
            typeof apiValue.attribute === "object"
              ? apiValue.attribute.data_type || ""
              : apiValue.attribute_type || "";

          // Use type-specific values if available
          if (
            attributeType === "TEXT" &&
            apiValue.value_text !== undefined &&
            apiValue.value_text !== null
          ) {
            actualValue = apiValue.value_text;
          } else if (
            attributeType === "NUMBER" &&
            apiValue.value_number !== undefined &&
            apiValue.value_number !== null
          ) {
            actualValue = apiValue.value_number;
          } else if (
            attributeType === "BOOLEAN" &&
            apiValue.value_boolean !== undefined &&
            apiValue.value_boolean !== null
          ) {
            actualValue = apiValue.value_boolean;
          } else if (
            attributeType === "DATE" &&
            apiValue.value_date !== undefined &&
            apiValue.value_date !== null
          ) {
            actualValue = apiValue.value_date;
          } else if (
            (attributeType === "SELECT" || attributeType === "MULTI_SELECT") &&
            apiValue.value_option !== undefined &&
            apiValue.value_option !== null
          ) {
            actualValue = apiValue.value_option;
          } else if (
            actualValue &&
            typeof actualValue === "object" &&
            "id" in actualValue
          ) {
            // Handle case where value is an object with an id (for SELECT types)
            actualValue = actualValue.id;
          }

          console.log(
            `Processing attribute ${attributeId} (${attributeType}): `,
            {
              raw: apiValue.value,
              text: apiValue.value_text,
              number: apiValue.value_number,
              boolean: apiValue.value_boolean,
              date: apiValue.value_date,
              option: apiValue.value_option,
              final: actualValue,
            }
          );

          attributeValues[attributeId.toString()] = {
            id: apiValue.id || 0,
            attribute_id: attributeId,
            attribute_name:
              typeof apiValue.attribute === "object"
                ? apiValue.attribute.name || ""
                : apiValue.attribute_name || "",
            attribute_code:
              typeof apiValue.attribute === "object"
                ? apiValue.attribute.code || ""
                : apiValue.attribute_code || "",
            attribute_type: attributeType,
            value: actualValue,
            use_variant: apiValue.use_variant ?? false,
          };
        }
      });
    }

    console.log("Mapped attribute values:", attributeValues);

    return {
      // Basic product info
      name: details.name || "",
      product_type: details.product_type || ProductType.REGULAR,
      description: details.description || "",
      short_description: details.short_description || "",
      active_from_date: details.active_from_date
        ? new Date(details.active_from_date)
        : new Date(),
      active_to_date: details.active_to_date
        ? new Date(details.active_to_date)
        : null,

      // References
      division:
        typeof details.division === "object"
          ? (details.division as any)?.id || 0
          : details.division || 0,
      category:
        typeof details.category === "object"
          ? (details.category as any)?.id || 0
          : details.category || 0,
      subcategory:
        typeof details.subcategory === "object"
          ? (details.subcategory as any)?.id || 0
          : details.subcategory || 0,
      productstatus:
        typeof details.productstatus === "object"
          ? (details.productstatus as any)?.id || 0
          : details.productstatus || 0,
      uom_id:
        typeof details.uom === "object"
          ? (details.uom as any)?.id || 0
          : details.uom || 0,

      // Status and flags
      is_active: details.is_active ?? true,
      is_tax_exempt: details.is_tax_exempt ?? false,
      allow_reviews: details.allow_reviews ?? true,

      // Pricing
      currency_code: details.currency_code || "INR",
      display_price:
        typeof details.display_price === "number"
          ? details.display_price
          : details.display_price
          ? parseFloat(details.display_price)
          : 0,
      compare_at_price:
        typeof details.compare_at_price === "number"
          ? details.compare_at_price
          : details.compare_at_price
          ? parseFloat(details.compare_at_price)
          : null,
      default_tax_rate_profile:
        typeof details.default_tax_rate_profile === "object"
          ? (details.default_tax_rate_profile as any)?.id || null
          : details.default_tax_rate_profile || null,

      // Inventory
      sku: details.sku || "",
      inventory_tracking_enabled: details.inventory_tracking_enabled ?? false,
      quantity_on_hand: details.quantity_on_hand || 0,
      is_serialized: details.is_serialized ?? false,
      is_lotted: details.is_lotted ?? false,
      backorders_allowed: details.backorders_allowed ?? false,

      // Inventory management fields
      low_stock_count:
        typeof details.low_stock_count === "number"
          ? details.low_stock_count
          : details.low_stock_count
          ? parseInt(details.low_stock_count.toString())
          : undefined,
      min_count:
        typeof details.min_count === "number"
          ? details.min_count
          : details.min_count
          ? parseInt(details.min_count.toString())
          : undefined,
      max_count:
        typeof details.max_count === "number"
          ? details.max_count
          : details.max_count
          ? parseInt(details.max_count.toString())
          : undefined,
      cost_price:
        typeof details.cost_price === "number"
          ? details.cost_price
          : details.cost_price
          ? parseFloat(details.cost_price.toString())
          : undefined,

      // Pre-order
      pre_order_available: details.pre_order_available ?? false,
      pre_order_date: details.pre_order_date || null,

      // SEO
      seo_title: details.seo_title || "",
      seo_description: details.seo_description || "",
      seo_keywords: details.seo_keywords || "",

      // Attributes
      attributes: attributeValues,
      attribute_values_input:
        details.attribute_values
          ?.filter(
            (av) =>
              av &&
              av.attribute &&
              av.attribute.id &&
              av.value !== null &&
              av.value !== undefined
          )
          .map(
            (av) =>
              ({
                attribute: av.attribute.id,
                value: av.value,
              } as AttributeValueInput)
          ) || [],
      variant_defining_attributes: details.variant_defining_attributes || [],
      attribute_groups: details.attribute_groups || [],

      // Additional fields
      faqs: details.faqs || [],
      key_features: details.key_features || [],
      tags: details.tags || [],
      organizationTags: [], // New field for organization tags
      temp_images: [],
      parent_temp_images: [],
      publication_status: details.publication_status || PublicationStatus.DRAFT,
      slug: details.slug || "",
    };
  };

  // Initialize form methods with proper typing
  const methods = useForm<FormData>({
    mode: "onBlur",
    resolver: zodResolver(formSchema) as unknown as HookFormResolver<FormData>,
    defaultValues: defaultValues
      ? {
          ...mapProductDetailsToFormData(defaultValues),
          category:
            typeof defaultValues.category === "object"
              ? (defaultValues.category as any)?.id || 0
              : defaultValues.category,
          subcategory:
            typeof defaultValues.subcategory === "object"
              ? (defaultValues.subcategory as any)?.id || 0
              : defaultValues.subcategory,
          productstatus:
            typeof defaultValues.status === "object"
              ? (defaultValues.status as any)?.id || 0
              : defaultValues.status || 0,
        }
      : {
          name: "",
          category: selectedCategory || 0,
          subcategory: selectedSubcategory || 0,
          product_type: ProductType.REGULAR,
          active_from_date: new Date(),
          active_to_date: null,
          description: "",
          short_description: "",
          division: 0,
          productstatus: 0,
          uom_id: 0,
          is_active: true,
          is_tax_exempt: false,
          allow_reviews: true,
          currency_code: "INR",
          display_price: 0,
          compare_at_price: null,
          default_tax_rate_profile: null,
          sku: "",
          inventory_tracking_enabled: false,
          quantity_on_hand: 0,
          is_serialized: false,
          is_lotted: false,
          backorders_allowed: false,
          pre_order_available: false,
          pre_order_date: null,
          seo_title: "",
          seo_description: "",
          seo_keywords: "",
          tags: [],
          faqs: [],
          attributes: {},
          attribute_values_input: [],
          variant_defining_attributes: [],
          attribute_groups: [],
          temp_images: [],
          parent_temp_images: [],
          organizationTags: [],
          publication_status: PublicationStatus.DRAFT,
          slug: "",
        },
  });
  const preOrderAvailable = methods.watch("pre_order_available");
  const productType = methods.watch("product_type");

  // Update form temp_images when productImages change
  const handleProductImagesChange = (
    images: Array<{
      id: string;
      alt_text: string;
      sort_order: number;
      is_default: boolean;
      original_filename?: string;
    }>
  ) => {
    setProductImages(images);
    // Directly set the temp_images value in the form
    methods.setValue("temp_images", images);
    console.log("Updated form temp_images with:", images);
  };

  // FAQ fields
  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray<FormData>({
    control: methods.control,
    name: "faqs",
  });

  // Render tag input field with proper typing - generic version for any string array field
  const renderTagInput = ({
    field,
    label,
    helperText,
  }: {
    field: { value: string[]; onChange: (value: string[]) => void };
    label: string;
    helperText: string;
  }) => (
    <Autocomplete<string, true, boolean, true>
      multiple
      freeSolo
      options={[]}
      value={field.value || []}
      onChange={(event, value, reason, details) => {
        // In view mode, prevent changes to the tags
        if (!viewMode) {
          field.onChange(value as string[]);
        }
      }}
      // Disable chip deletion in view mode
      clearOnBlur={!viewMode}
      disableClearable={viewMode}
      readOnly={viewMode}
      // Use custom renderTags only when in view mode
      {...(viewMode && {
        renderTags: (value, getTagProps) =>
          value.map((option, index) => {
            // Get the tag props first
            const tagProps = getTagProps({ index });

            // In view mode, create a chip without delete functionality
            return (
              <Chip
                {...tagProps}
                label={option}
                // Override onDelete to disable deletion in view mode
                onDelete={undefined}
              />
            );
          }),
      })}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText}
          variant="outlined"
          fullWidth
          disabled={viewMode}
        />
      )}
    />
  );

  // Add FAQ
  const handleAddFaq = () => {
    appendFaq({
      question: "",
      answer: "",
    });
  };

  // Remove FAQ
  const handleRemoveFaq = (index: number) => {
    removeFaq(index);
  };

  // Effect to set form values when product details are available
  useEffect(() => {
    if (defaultValues) {
      const formData = mapProductDetailsToFormData(defaultValues);
      Object.entries(formData).forEach(([key, value]) => {
        methods.setValue(key as keyof FormData, value);
      });

      // If we have a productId and defaultValues, set the selected category
      if (productId && defaultValues.category) {
        setSelectedCategory(defaultValues.category);
      }
    }
  }, [defaultValues, methods.setValue, productId]);

  // Watch values for conditional logic
  const isInventoryTrackingEnabled = methods.watch(
    "inventory_tracking_enabled"
  );

  // Watch temp_images for debugging
  useEffect(() => {
    const subscription = methods.watch((value, { name }) => {
      if (name === "temp_images") {
        console.log("temp_images changed:", value.temp_images);
      }
    });
    return () => subscription.unsubscribe();
  }, [methods.watch]);

  return (
    <>
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          {/* Form Actions */}
          <Box
            sx={{ mb: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            {/* Edit button - should appear when in view mode */}
            {viewMode && (
              <Button
                type="button"
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => {
                  console.log("Edit button clicked - switching to edit mode");
                  setViewMode(false);
                  console.log("After setViewMode(false):", {
                    viewMode: false,
                    productId,
                  });
                }}
              >
                {t("products.form.edit", "Edit Product")}
              </Button>
            )}

            {/* Save button - different versions for create vs update */}
            {!viewMode &&
              // Debug which condition is being evaluated
              (console.log("Button rendering condition:", {
                productId,
                currentProductId,
                productIdType: typeof currentProductId,
                productIdTruthy: !!currentProductId,
                viewMode,
                productIdNumberCheck: currentProductId
                  ? parseInt(currentProductId) > 0
                  : false,
              }),
              // Check if we have a valid product ID (for update)
              // Use currentProductId which tracks both initial productId and newly created IDs
              !!currentProductId && currentProductId !== "0" ? (
                // Update button for existing products
                <Button
                  type="button"
                  variant="contained"
                  color="success"
                  disabled={methods.formState.isSubmitting}
                  startIcon={
                    methods.formState.isSubmitting ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  onClick={async () => {
                    // Debug which button was clicked
                    console.log(
                      "UPDATE button clicked for existing product with ID:",
                      productId
                    );
                    console.log("Update button clicked");

                    try {
                      // Get current form values
                      const formData = methods.getValues();
                      console.log("Current form values for update:", formData);

                      // Process attribute values directly - ensure they match the backend's expected format
                      const processedAttributeValues = Object.entries(
                        formData.attributes || {}
                      )
                        .filter(([attributeId, attr]) => {
                          // Skip deleted attributes
                          if (attr.is_deleted) return false;

                          // Skip null/undefined values
                          if (attr.value === null || attr.value === undefined)
                            return false;

                          // Skip empty strings
                          if (attr.value === "") return false;

                          // Skip variant-defining attributes
                          const attrId = Number(attributeId);
                          if (
                            formData.variant_defining_attributes &&
                            formData.variant_defining_attributes.includes(
                              attrId
                            )
                          ) {
                            return false;
                          }

                          return true;
                        })
                        .map(([attributeId, attr]) => {
                          // Convert to simple format with just attribute ID and value
                          // This is what the backend expects in attribute_values_input
                          return {
                            attribute: Number(attributeId),
                            value: attr.value,
                          };
                        });

                      // Transfer parent_temp_images to temp_images if needed
                      if (
                        formData.parent_temp_images &&
                        formData.parent_temp_images.length > 0
                      ) {
                        formData.temp_images = [...formData.parent_temp_images];
                      }

                      // Add images from productImages state to temp_images for updates too
                      if (productImages.length > 0) {
                        formData.temp_images = [
                          ...(formData.temp_images || []),
                          ...productImages,
                        ];
                        console.log(
                          "Adding product images to update submission:",
                          productImages
                        );
                      }

                      // Create a clean payload without parent_temp_images and organizationTags
                      const {
                        parent_temp_images,
                        organizationTags,
                        ...cleanFormData
                      } = formData;

                      // Create a clean payload that matches exactly what the backend expects
                      const apiPayload = {
                        ...cleanFormData,
                        // Use the processed attribute values from the form - ensure correct format
                        attribute_values_input: processedAttributeValues.map(
                          (av) => ({
                            attribute: av.attribute, // Just the ID
                            value: av.value, // Just the value
                          })
                        ),
                        // Only include IDs for variant defining attributes, not objects
                        variant_defining_attributes: (
                          formData.variant_defining_attributes || []
                        ).map((id) =>
                          typeof id === "object" && id !== null && "id" in id
                            ? (id as any).id
                            : id
                        ),
                        // Only include IDs for attribute groups, not objects
                        attribute_groups: (formData.attribute_groups || []).map(
                          (id) =>
                            typeof id === "object" && id !== null && "id" in id
                              ? (id as any).id
                              : id
                        ),
                        publication_status: PublicationStatus.ACTIVE,
                      };

                      console.log("Update API payload:", apiPayload);

                      // Double check that we have a valid product ID
                      const updateId = currentProductId
                        ? parseInt(currentProductId)
                        : productId
                        ? parseInt(productId)
                        : 0;
                      console.log("Updating product with ID:", updateId);

                      // Use the mutation from react-query (which includes auth tokens)
                      const result = await updateProductMutation.mutateAsync(
                        apiPayload
                      );

                      // Invalidate queries to refresh data
                      queryClient.invalidateQueries({ queryKey: ["products"] });
                      queryClient.invalidateQueries({
                        queryKey: ["product", updateId],
                      });

                      console.log("Update successful, result:", result);

                      // Show success message
                      setNotification({
                        open: true,
                        message: t(
                          "products.form.updateSuccess",
                          "Product updated successfully"
                        ),
                        severity: "success",
                      });

                      // Set view mode after successful update
                      setViewMode(true);

                      // Call onSubmit callback if provided
                      if (onSubmit && result) {
                        await onSubmit(result);
                      }
                    } catch (error) {
                      console.error("Update failed:", error);
                      setNotification({
                        open: true,
                        message: t(
                          "products.form.error",
                          "An error occurred while updating the product"
                        ),
                        severity: "error",
                      });
                    }
                  }}
                >
                  {methods.formState.isSubmitting
                    ? t("products.form.editing", "Editing...")
                    : t("products.form.update", "Save Changes")}
                </Button>
              ) : (
                // Create button for new products
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  disabled={methods.formState.isSubmitting}
                  startIcon={
                    methods.formState.isSubmitting ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  onClick={async () => {
                    // Debug which button was clicked
                    console.log(
                      "CREATE button clicked for new product (no ID)"
                    );
                    console.log("Save button clicked manually");

                    // Get current form values
                    const formData = methods.getValues();

                    // Validate required fields
                    const requiredFields = [
                      { field: "name", label: "Name" },
                      { field: "slug", label: "Slug" },
                      { field: "category", label: "Category" },
                      { field: "division", label: "Division" },
                      { field: "uom_id", label: "Unit of Measure" },
                      { field: "productstatus", label: "Product Status" },
                      { field: "currency_code", label: "Currency" },
                      { field: "sku", label: "SKU" },
                    ];

                    const missingFields = requiredFields
                      .filter((item) => {
                        const value = formData[item.field];
                        // Handle different field types
                        if (item.field === "uom_id") {
                          // UOM ID should be a number and not 0
                          return (
                            value === null || value === undefined || value === 0
                          );
                        }
                        // For string fields
                        if (typeof value === "string")
                          return !value || value.trim() === "";
                        // For object fields (like category, division)
                        if (typeof value === "object" && value !== null) {
                          return !value.id && value.id !== 0;
                        }
                        // For other fields
                        return !value;
                      })
                      .map((item) => item.label);

                    // Show error and stop processing if required fields are missing
                    if (missingFields.length > 0) {
                      setNotification({
                        open: true,
                        message: `Please fill in all required fields: ${missingFields.join(
                          ", "
                        )}`,
                        severity: "error",
                      });
                      return;
                    }

                    try {
                      console.log("Current form values:", formData);

                      // Process attribute values directly
                      const processedAttributeValues = Object.entries(
                        formData.attributes || {}
                      )
                        .filter(([attributeId, attr]) => {
                          // Skip deleted attributes
                          if (attr.is_deleted) return false;

                          // Skip null/undefined values
                          if (attr.value === null || attr.value === undefined)
                            return false;

                          // Skip empty strings
                          if (attr.value === "") return false;

                          // Skip variant-defining attributes
                          const attrId = Number(attributeId);
                          if (
                            formData.variant_defining_attributes &&
                            formData.variant_defining_attributes.includes(
                              attrId
                            )
                          ) {
                            return false;
                          }

                          return true;
                        })
                        .map(([attributeId, attr]) => ({
                          attribute: Number(attributeId),
                          value: attr.value,
                        }));

                      console.log(
                        "Processed attribute values:",
                        processedAttributeValues
                      );

                      // Transfer parent_temp_images to temp_images if needed
                      if (
                        formData.parent_temp_images &&
                        formData.parent_temp_images.length > 0
                      ) {
                        formData.temp_images = [...formData.parent_temp_images];
                      }

                      // Add images from productImages state to temp_images
                      if (productImages.length > 0) {
                        formData.temp_images = [
                          ...(formData.temp_images || []),
                          ...productImages,
                        ];
                      }

                      // Create a clean payload without parent_temp_images and organizationTags
                      const {
                        parent_temp_images,
                        organizationTags,
                        ...cleanFormData
                      } = formData;

                      const apiPayload = {
                        ...cleanFormData,
                        attribute_values_input: processedAttributeValues,
                        variant_defining_attributes:
                          formData.variant_defining_attributes || [],
                        attribute_groups: formData.attribute_groups || [],
                        publication_status: PublicationStatus.ACTIVE,
                      };

                      const result = await createProductMutation.mutateAsync(
                        apiPayload
                      );

                      // Show success message for the main product operation
                      setNotification({
                        open: true,
                        message: productId
                          ? t(
                              "products.form.updateSuccess",
                              "Product updated successfully"
                            )
                          : t(
                              "products.form.createSuccess",
                              "Product created successfully"
                            ),
                        severity: "success",
                      });

                      // Handle post-save actions
                      if (result && result.id) {
                        if (!productId) {
                          // This was a new product creation
                          console.log(
                            "New product created with ID:",
                            result.id
                          );
                          // Store the new product ID so we can use it for editing
                          setCurrentProductId(result.id.toString());
                        } else {
                          // This was an update to existing product
                          console.log("Product updated with ID:", result.id);
                        }

                        // Get tenant slug from URL parameters
                        const params = new URLSearchParams(
                          window.location.search
                        );
                        const tenant = window.location.pathname.split("/")[1]; // Get tenant from URL

                        // Set view mode after successful save (both for create and update)
                        setViewMode(true);

                        // Navigate to the CRM products page after successful save with tenant slug
                        router.push(`/${tenant}/Crm/Masters/products/`);

                        // Show success notification
                        setNotification({
                          open: true,
                          message: t(
                            "products.form.redirectingToCrm",
                            "Product saved successfully. Redirecting to CRM..."
                          ),
                          severity: "success",
                        });

                        // Update URL if needed - this would typically be handled by the parent component
                        // through the onSubmit callback

                        // Invalidate queries to refresh product data
                        queryClient.invalidateQueries({
                          queryKey: ["products"],
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["product", result.id],
                        });
                      }

                      // Call onSubmit callback if provided
                      if (onSubmit && result) {
                        await onSubmit(result);
                      }
                    } catch (error) {
                      console.error("Direct API call failed:", error);
                      setNotification({
                        open: true,
                        message: t(
                          "products.form.error",
                          "An error occurred while saving the product"
                        ),
                        severity: "error",
                      });
                    }
                  }}
                >
                  {methods.formState.isSubmitting
                    ? t("products.form.saving", "Saving...")
                    : t("products.form.save", "Save Product")}
                </Button>
              ))}
          </Box>

          {/* Main Content Grid (70/30 split) */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              {/* General Information Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("productGeneralInfo")}
                </Typography>
                {/* Inner grid for smaller fields */}
                <Grid container spacing={2}>
                  {/* Product Name */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="name"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productNameRequired")}
                          placeholder={t("productNamePlaceholder")}
                          fullWidth
                          required
                          size="small"
                          error={!!methods.formState.errors.name}
                          helperText={methods.formState.errors.name?.message}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>

                  {/* Slug */}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Controller
                      name="slug"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productSlug")}
                          placeholder={t("productSlugPlaceholder")}
                          fullWidth
                          size="small"
                          error={!!methods.formState.errors.slug}
                          // helperText={
                          //   methods.formState.errors.slug?.message ||
                          //   t(
                          //     "products.helpers.slug",
                          //     "Unique URL identifier (auto-generated suggested)"
                          //   )
                          // }
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                  {/* SKU */}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Controller
                      name="sku"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productSkuLabel")}
                          fullWidth
                          size="small"
                          required={
                            productType === ProductType.REGULAR ||
                            productType === ProductType.KIT
                          }
                          error={!!methods.formState.errors.sku}
                          // helperText={
                          //   methods.formState.errors.sku?.message ||
                          //   t(
                          //     "products.helpers.sku",
                          //     "Unique per tenant. May be auto-generated."
                          //   )
                          // }
                          value={field.value ?? ""}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                  {/* === Division (Autocomplete) === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="division"
                      control={methods.control}
                      label={t("productDivisionRequired")}
                      apiEndpoint={entityEndpoints.divisions}
                      required={true}
                      error={!!methods.formState.errors.division}
                      helperText={methods.formState.errors.division?.message}
                      disabled={viewMode}
                      onChange={(newValue) => {
                        // Clear category and subcategory when division changes
                        methods.setValue("category", 0);
                        methods.setValue("subcategory", 0);
                        setSelectedDivision(newValue);
                        setSelectedCategory(null);
                      }}
                    />
                  </Grid>

                  {/* === Category (Autocomplete) === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="category"
                      control={methods.control}
                      label={t("productCategoryLabel")}
                      apiEndpoint={entityEndpoints.categories({
                        division: selectedDivision?.id,
                        isActive: true,
                        paginate: false,
                      })}
                      required={true}
                      error={!!methods.formState.errors.category}
                      helperText={methods.formState.errors.category?.message}
                      onChange={(newValue) => {
                        methods.setValue("subcategory", 0);
                        setSelectedCategory(newValue);
                      }}
                      disabled={!selectedDivision || viewMode}
                      key={`category-${selectedDivision?.id || "all"}`} // Force re-render when division changes
                    />
                  </Grid>

                  {/* === Subcategory (Autocomplete) === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="subcategory"
                      control={methods.control}
                      label={t("productSubcategoryLabel")}
                      apiEndpoint={entityEndpoints.subcategories}
                      error={!!methods.formState.errors.subcategory}
                      helperText={methods.formState.errors.subcategory?.message}
                      disabled={!selectedCategory || viewMode}
                      dependsOn={{
                        field: "id",
                        param: "category",
                      }}
                      onChange={(newValue) => {
                        if (newValue) {
                          console.log("Selected Subcategory:", newValue);
                          setSelectedSubcategory(newValue); // Only pass the ID
                        } else {
                          setSelectedSubcategory(null); // Handle the case when value is cleared
                        }
                      }}
                      value={selectedCategory || methods.getValues("category")}
                      key={`subcategory-${selectedCategory?.id || "none"}`} // Force re-render when category changes
                    />
                  </Grid>
                  {/* === Unit of Measure (UOM) (Autocomplete) === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="uom_id"
                      control={methods.control}
                      label={t("productUomLabel")}
                      apiEndpoint={entityEndpoints.unitOfMeasures}
                      required={true}
                      error={!!methods.formState.errors.uom_id}
                      helperText={methods.formState.errors.uom_id?.message}
                      disabled={viewMode}
                    />
                  </Grid>
                  {/* === Selling Channels (Fixed Options Autocomplete) === */}
                  <Grid size={{ xs: 12 }}>
                    <SellingChannelsAutocomplete
                      name="customer_group_selling_channel_ids"
                      control={methods.control}
                      label={t("excludedSegmentName")}
                      disabled={viewMode}
                      selectedCategory={selectedCategory}
                      selectedSubcategory={selectedSubcategory}
                      productId={
                        currentProductId
                          ? parseInt(currentProductId, 10)
                          : undefined
                      }
                    />
                  </Grid>

                  {/* Description */}
                  <Grid size={12}>
                    <Controller
                      name="description"
                      control={methods.control}
                      rules={{
                        maxLength: {
                          value: 2000, // Adjust this based on your requirements
                          message: t("validation.maxLength", { max: 2000 }),
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={t("productDescription")}
                          placeholder={t("productDescriptionPlaceholder")}
                          fullWidth
                          multiline
                          rows={4}
                          size="small"
                          disabled={viewMode}
                          error={!!error}
                          helperText={
                            error?.message ||
                            `${field.value?.length || 0}/2000 ${t(
                              "characters"
                            )}`
                          }
                          inputProps={{
                            maxLength: 2000,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Short Description / Summary */}
                  <Grid size={12}>
                    <Controller
                      name="short_description"
                      control={methods.control}
                      rules={{
                        maxLength: {
                          value: 500,
                          message: t("validation.maxLength", { max: 500 }),
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={t("productShortDescription")}
                          placeholder={t("productShortDescriptionPlaceholder")}
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                          disabled={viewMode}
                          error={!!error}
                          helperText={
                            error?.message ||
                            `${field.value?.length || 0}/500 ${t("characters")}`
                          }
                          inputProps={{
                            maxLength: 500,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Key Features */}
                  <Grid size={12}>
                    <Controller
                      name="key_features"
                      control={methods.control}
                      render={({ field: { onChange, value = [] } }) => (
                        <div>
                          <TextField
                            label={t("keyFeatures", "Key Features")}
                            placeholder={t(
                              "keyFeaturesPlaceholder",
                              "Enter key features"
                            )}
                            fullWidth
                            size="small"
                            disabled={viewMode}
                            onKeyDown={(
                              e: React.KeyboardEvent<HTMLInputElement>
                            ) => {
                              const input = e.target as HTMLInputElement;
                              if (e.key === "Enter" && input.value.trim()) {
                                e.preventDefault();
                                const newFeature = input.value.trim();
                                if (!value.includes(newFeature)) {
                                  onChange([...value, newFeature]);
                                }
                                input.value = "";
                              }
                            }}
                            helperText={t("keyFeaturesHelper")}
                          />
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              mt: 1,
                            }}
                          >
                            {Array.isArray(value) &&
                              value.map((feature, index) => (
                                <Chip
                                  key={index}
                                  label={feature}
                                  onDelete={
                                    viewMode
                                      ? undefined
                                      : () => {
                                          onChange(
                                            value.filter((_, i) => i !== index)
                                          );
                                        }
                                  }
                                  sx={{ m: 0.5 }}
                                />
                              ))}
                          </Box>
                        </div>
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* --- Other Left Column Sections Remain Here --- */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t("products.sections.pricingAndTax", "Pricing & Tax")}
                </Typography>
                <Grid container spacing={2}>
                  {/* === Currency (Autocomplete) - NEW === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="currency_code"
                      control={methods.control}
                      label={t("productCurrencyRequired")}
                      apiEndpoint={entityEndpoints.currencies}
                      filterParams={{ is_active: true }}
                      required={true}
                      error={!!methods.formState.errors.currency_code}
                      helperText={
                        methods.formState.errors.currency_code?.message
                      }
                      valueField="code"
                      getOptionLabel={(option: any) =>
                        `${option.code} - ${option.name}`
                      }
                      disabled={viewMode}
                    />
                  </Grid>

                  {/* === Display Price === */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Controller
                      name="display_price"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productDisplayPrice")}
                          type="number"
                          size="small"
                          InputProps={{
                            inputProps: { min: 0, step: "0.01" },
                          }}
                          fullWidth
                          required={
                            productType === ProductType.REGULAR ||
                            productType === ProductType.KIT
                          }
                          error={!!methods.formState.errors.display_price}
                          helperText={
                            methods.formState.errors.display_price?.message ||
                            t(
                              "products.helpers.displayPrice",
                              "Price in selected currency"
                            )
                          }
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : Number(value));
                          }}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Controller
                      name="cost_price"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value);
                            field.onChange(value);
                          }}
                          label={t("products.fields.costPrice", "Cost Price")}
                          type="number"
                          size="small"
                          fullWidth
                          disabled={viewMode}
                          InputProps={{
                            inputProps: { min: 0, step: 0.01 },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {/* === Default Tax Rate Profile (Autocomplete) - UPDATED === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <EntityAutocomplete
                      name="default_tax_rate_profile"
                      control={methods.control}
                      label={t("productTaxProfile")}
                      apiEndpoint={entityEndpoints.taxRateProfiles}
                      filterParams={{ is_active: true }}
                      error={
                        !!methods.formState.errors.default_tax_rate_profile
                      }
                      helperText={
                        methods.formState.errors.default_tax_rate_profile
                          ?.message ||
                        t(
                          "products.helpers.taxProfile",
                          "Optional. Overrides category/global defaults."
                        )
                      }
                      disabled={viewMode}
                      getOptionLabel={(option) =>
                        option.profile_name || "Unknown"
                      }
                    />
                  </Grid>

                  {/* === Compare At Price === */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="compare_at_price"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productCompareAtPrice")}
                          type="number"
                          size="small"
                          InputProps={{
                            inputProps: { min: 0, step: "0.01" },
                          }}
                          fullWidth
                          error={!!methods.formState.errors.compare_at_price}
                          helperText={
                            methods.formState.errors.compare_at_price
                              ?.message ||
                            t(
                              "products.helpers.compareAtPrice",
                              "Optional. To show a sale price."
                            )
                          }
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : Number(value));
                          }}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>

                  {/* === Is Tax Exempt  === */}
                  <Grid
                    size={{ xs: 12, sm: 6 }}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Controller
                      name="is_tax_exempt"
                      control={methods.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => field.onChange(e.target.checked)}
                              size="small"
                            />
                          }
                          label={t("productIsTaxExempt")}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Attribute Values Section */}
              <Paper sx={{ mb: 3, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t("products.attributeValues")}
                </Typography>
                <AttributeValueProvider>
                  <AttributeValueManager
                    control={methods.control}
                    setValue={methods.setValue}
                    watch={methods.watch}
                    selectedGroupIds={methods.watch("attribute_groups")}
                    variantDefiningAttributeIds={methods.watch(
                      "variant_defining_attributes"
                    )}
                    isVariableProduct={
                      methods.getValues("product_type") ===
                        ProductType.VARIANT ||
                      methods.getValues("product_type") === ProductType.PARENT
                    }
                    defaultValues={
                      defaultValues?.attribute_values
                        ? defaultValues.attribute_values.map((av: any) => ({
                            attribute:
                              typeof av.attribute === "object"
                                ? av.attribute.id
                                : av.attribute,
                            value: av.value,
                            value_text: av.value_text,
                            value_number: av.value_number,
                            value_boolean: av.value_boolean,
                            value_date: av.value_date,
                            value_option: av.value_option,
                            use_variant: av.use_variant,
                          }))
                        : []
                    }
                    onValuesChange={(vals) => {
                      // Prevent infinite loops by using a ref to track the last values
                      const currentValsStr = JSON.stringify(vals);
                      const lastValsStr = lastAttributeValuesRef.current;

                      // Only update if values have actually changed
                      if (
                        vals &&
                        vals.length > 0 &&
                        currentValsStr !== lastValsStr
                      ) {
                        console.log("Setting attribute_values_input:", vals);

                        // Update the ref with the new values
                        lastAttributeValuesRef.current = currentValsStr;

                        // Use shouldDirty: false to prevent unnecessary form state changes
                        methods.setValue("attribute_values_input", vals, {
                          shouldDirty: false,
                          shouldTouch: false,
                        });
                      }
                    }}
                    viewMode={viewMode}
                    onVariantToggle={(attribute, isSelected) => {
                      // Update variant_defining_attributes when an attribute is toggled
                      const currentVariantAttributes =
                        methods.getValues("variant_defining_attributes") || [];
                      if (
                        isSelected &&
                        !currentVariantAttributes.includes(attribute.id)
                      ) {
                        methods.setValue("variant_defining_attributes", [
                          ...currentVariantAttributes,
                          attribute.id,
                        ]);
                      } else if (
                        !isSelected &&
                        currentVariantAttributes.includes(attribute.id)
                      ) {
                        methods.setValue(
                          "variant_defining_attributes",
                          currentVariantAttributes.filter(
                            (id) => id !== attribute.id
                          )
                        );
                      }
                    }}
                  />
                </AttributeValueProvider>
              </Paper>

              {/* Variant Table Section - Only show for products with variant attributes */}

              {methods.watch("product_type") === ProductType.PARENT && (
                <Paper sx={{ mb: 3, p: 3 }}>
                  <VariantTable
                    productId={productId ? parseInt(productId) : undefined}
                    variantDefiningAttributes={methods.watch(
                      "variant_defining_attributes"
                    )}
                    viewMode={viewMode}
                    onEditModeRequest={() => {
                      // Put the form in edit mode when requested by VariantTable
                      console.log(
                        "Entering edit mode from VariantTable request"
                      );
                      // Ensure we're in edit mode and not view mode
                      setViewMode(false);

                      // Log the current state to debug
                      console.log("Form state after edit mode request:", {
                        viewMode: false,
                        currentProductId,
                        productId,
                        shouldShowEditButton:
                          !!currentProductId && currentProductId !== "0",
                      });
                    }}
                    onProductIdChange={(id) => {
                      // Update the currentProductId when a product is created or selected in VariantTable
                      console.log(
                        "Updating currentProductId from VariantTable:",
                        id
                      );
                      setCurrentProductId(id.toString());

                      // Log the updated state
                      console.log(
                        "Updated form state after product ID change:",
                        {
                          newProductId: id,
                          currentProductId: id.toString(),
                          viewMode: false,
                          shouldShowEditButton: true,
                        }
                      );
                    }}
                  />
                </Paper>
              )}

              {/* SEO Information Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("productSeo")}
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Controller
                      name="seo_title"
                      control={methods.control}
                      rules={{
                        maxLength: {
                          value: 70,
                          message: t(
                            "seoTitleMaxLengthError",
                            "SEO title must be 70 characters or less"
                          ),
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={t("productMetaTitle")}
                          fullWidth
                          size="small"
                          helperText={
                            error?.message || t("productMetaTitleHelper")
                          }
                          error={!!error}
                          inputProps={{ maxLength: 70 }}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Controller
                      name="seo_description"
                      control={methods.control}
                      rules={{
                        maxLength: {
                          value: 160,
                          message: t(
                            "seoTitleMaxLengthError",
                            "SEO title must be 70 characters or less"
                          ),
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t("productMetaDescription")}
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                          helperText={t("productMetaDescriptionHelper")}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Controller
                      name="tags"
                      control={methods.control}
                      defaultValue={[]}
                      render={({ field, fieldState: { error } }) => {
                        const tags = field.value || [];
                        return renderTagInput({
                          field,
                          label: t("products.form.fields.tags.label", "Tags"),
                          helperText:
                            error?.message ||
                            t(
                              tags.length > 0
                                ? t("tagsHelperAdded")
                                : t("tagsHelperEmpty"),
                              tags.length > 0
                                ? t(
                                    "tagsHelperAdded",
                                    `Press enter to add tag (${tags.length} tags added)`
                                  )
                                : t(
                                    "tagsHelperEmpty",
                                    "Type and press enter to add tags"
                                  )
                            ),
                        });
                      }}
                      disabled={viewMode}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* FAQs Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {t("products.faqs.title")}
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddFaq}
                    variant="outlined"
                    size="small"
                    disabled={viewMode}
                  >
                    {t("products.faqs.add")}
                  </Button>
                </Box>

                {faqFields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: "1px solid #eee",
                      borderRadius: 1,
                      position: "relative",
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid size={12} sx={{ textAlign: "right" }}>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFaq(index)}
                          aria-label={t("products.faqs.remove")}
                          disabled={viewMode}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                      <Grid size={12}>
                        <Controller
                          name={`faqs.${index}.question`}
                          control={methods.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={t("productFaqsQuestion")}
                              fullWidth
                              size="small"
                              error={
                                !!methods.formState.errors.faqs?.[index]
                                  ?.question
                              }
                              helperText={
                                methods.formState.errors.faqs?.[index]?.question
                                  ?.message
                              }
                              disabled={viewMode}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={12}>
                        <Controller
                          name={`faqs.${index}.answer`}
                          control={methods.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={t("productFaqsAnswer")}
                              fullWidth
                              size="small"
                              multiline
                              rows={3}
                              error={
                                !!methods.formState.errors.faqs?.[index]?.answer
                              }
                              helperText={
                                methods.formState.errors.faqs?.[index]?.answer
                                  ?.message
                              }
                              disabled={viewMode}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Paper>
            </Grid>

            {/* === Right Column (30%) === */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("productStatus")}
                </Typography>
                <Grid container spacing={2}>
                  {/* Status Select */}
                  <Grid size={{ xs: 12 }}>
                    <EntityAutocomplete
                      name="productstatus"
                      control={methods.control}
                      label={t(
                        "products.fields.productStatus",
                        "Product Status"
                      )}
                      apiEndpoint={entityEndpoints.productStatuses}
                      required={true}
                      error={!!methods.formState.errors.productstatus}
                      helperText={
                        methods.formState.errors.productstatus?.message
                      }
                      disabled={viewMode}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="active_from_date"
                      control={methods.control}
                      render={({ field }) => (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DateTimePicker
                            label={t("Active From", "Active From")}
                            value={field.value || null}
                            onChange={(newValue) => field.onChange(newValue)}
                            format={dateFormat}
                            disabled={viewMode}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small",
                                error:
                                  !!methods.formState.errors.active_from_date,
                                helperText:
                                  methods.formState.errors.active_from_date
                                    ?.message,
                              },
                            }}
                          />
                        </LocalizationProvider>
                      )}
                    />
                  </Grid>

                  {/* Active To Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="active_to_date"
                      control={methods.control}
                      render={({ field }) => (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DateTimePicker
                            label={t("Active To", "Active To")}
                            value={field.value || null}
                            onChange={(newValue) => field.onChange(newValue)}
                            format={dateFormat}
                            disabled={viewMode}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small",
                                error:
                                  !!methods.formState.errors.active_to_date,
                                helperText:
                                  methods.formState.errors.active_to_date
                                    ?.message,
                              },
                            }}
                          />
                        </LocalizationProvider>
                      )}
                    />
                  </Grid>

                  {/* Is Active  */}
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="is_active"
                      control={methods.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => field.onChange(e.target.checked)}
                              size="small"
                            />
                          }
                          label={t("productIsActive")}
                          labelPlacement="start"
                          sx={{
                            justifyContent: "space-between",
                            ml: 0,
                            width: "100%",
                          }}
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("aiEnhancement", "AI-Powered Product Enhancement")}
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {t(
                        "aiEnhancementNote",
                        "Boost your product visibility with our AI assistant. Let it automatically refine your product titles, descriptions, and tags for better engagement and search engine optimization."
                      )}
                    </Typography>

                    <Tooltip
                      title={
                        viewMode
                          ? t(
                              "aiEnhancementDisabledTooltip",
                              "AI enhancement is not available in view mode"
                            )
                          : !selectedDivision ||
                            !selectedCategory ||
                            !methods.getValues("name")?.trim()
                          ? t(
                              "aiEnhancementIncompleteTooltip",
                              "Please select division, category and enter product name to enable AI enhancement"
                            )
                          : t(
                              "aiEnhancementTooltip",
                              "Click to automatically enhance product details using AI"
                            )
                      }
                      placement="bottom"
                      arrow
                      componentsProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            "& .MuiTooltip-arrow": {
                              color: "primary.main",
                            },
                          },
                        },
                      }}
                    >
                      <span>
                        <Button
                          variant="contained"
                          startIcon={
                            isEnhancing ? (
                              <CircularProgress size={20} />
                            ) : (
                              <AutoAwesomeIcon />
                            )
                          }
                          onClick={async () => {
                            if (isEnhancing) return; // Prevent multiple clicks

                            const formData = methods.getValues();
                            const productName = formData.name;
                            const divisionName = selectedDivision?.name;
                            const categoryName = selectedCategory?.name;
                            const subcategoryName = selectedSubcategory?.name;

                            const enhancementData: ProductEnhancementPayload = {
                              name: productName,
                              incoming_url: `${window.location.origin}/api/ai/webhook`,
                              webhook_context:
                                "Enhancing product details via AI",
                              allowed_ips: [],
                              prompt_config: {
                                type: "create_auto",
                              },
                              input_data: {
                                product_name: productName,
                                category: categoryName,
                                division: divisionName,
                                sub_category: subcategoryName,
                                enhancement_type: "all",
                                target_audience: "general",
                                language: "en",
                              },
                            };

                            enhanceProduct(enhancementData);
                            console.log("enhancementData", enhancementData);
                          }}
                          disabled={
                            isEnhancing || // Disable when loading
                            viewMode ||
                            !selectedDivision ||
                            !selectedCategory ||
                            !methods.getValues("name")?.trim()
                          }
                          sx={{
                            opacity:
                              isEnhancing || // Keep the same styling when loading
                              viewMode ||
                              !selectedDivision ||
                              !selectedCategory ||
                              !methods.getValues("name")?.trim()
                                ? 0.6
                                : 1,
                            pointerEvents:
                              isEnhancing || // Disable pointer events when loading
                              viewMode ||
                              !selectedDivision ||
                              !selectedCategory ||
                              !methods.getValues("name")?.trim()
                                ? "none"
                                : "auto",
                            minWidth: 150, // Ensure consistent width
                            "& .MuiButton-startIcon": {
                              marginRight: isEnhancing ? 1.5 : 1, // Add more space for the spinner
                            },
                          }}
                        >
                          {isEnhancing
                            ? t("enhancing", "Enhancing...")
                            : t("enhanceWithAI", "Enhance with AI")}
                        </Button>
                      </span>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, mb: 3 }}>
                <ImageManager
                  images={productImages}
                  onImagesChange={handleProductImagesChange}
                  ownerType="product"
                  disabled={viewMode}
                  maxImages={10}
                />
              </Paper>

              {/* Settings Section - Simplified */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("productSettings")}
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="pre_order_available"
                      control={methods.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => field.onChange(e.target.checked)}
                              size="small"
                            />
                          }
                          label={t("productPreOrderEnabled")}
                          sx={{
                            justifyContent: "space-between",
                            ml: 0,
                            width: "100%",
                          }}
                          labelPlacement="start"
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="pre_order_date"
                      control={methods.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t(
                            "products.fields.preOrderDate",
                            "Pre-order Date"
                          )}
                          type="date"
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          disabled={!preOrderAvailable || viewMode}
                          sx={{
                            mt: 1,
                            transition: "opacity 0.3s ease-in-out",
                            opacity: preOrderAvailable ? 1 : 0.5,
                          }}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="allow_reviews"
                      control={methods.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => field.onChange(e.target.checked)}
                              size="small"
                            />
                          }
                          label={t("productAllowReviews")}
                          sx={{
                            justifyContent: "space-between",
                            ml: 0,
                            width: "100%",
                          }}
                          labelPlacement="start"
                          disabled={viewMode}
                        />
                      )}
                    />
                  </Grid>

                  {/* Inventory Tracking Enabled - Conditional Visibility */}
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={methods.watch("inventory_tracking_enabled")}
                          onChange={(e) =>
                            methods.setValue(
                              "inventory_tracking_enabled",
                              e.target.checked
                            )
                          }
                          disabled={viewMode}
                          color="primary"
                        />
                      }
                      label={t("productTrackInventory", "Track Inventory")}
                      labelPlacement="start"
                      sx={{
                        justifyContent: "space-between",
                        ml: 0,
                        width: "100%",
                      }}
                    />
                  </Grid>
                  {methods.watch("inventory_tracking_enabled") && (
                    <>
                      <Grid size={{ xs: 12 }} sx={{ mb: 1 }}>
                        <FormControl component="fieldset">
                          <FormLabel
                            component="legend"
                            sx={{
                              fontSize: "0.875rem",
                              color: "text.secondary",
                            }}
                          >
                            {t(
                              "inventoryTrackingType",
                              "Inventory Tracking Type"
                            )}
                          </FormLabel>
                          <RadioGroup
                            row
                            value={
                              methods.watch("is_serialized")
                                ? "serialized"
                                : methods.watch("is_lotted")
                                ? "lotted"
                                : "regular"
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              methods.setValue(
                                "is_serialized",
                                value === "serialized"
                              );
                              methods.setValue("is_lotted", value === "lotted");
                            }}
                          >
                            <FormControlLabel
                              value="regular"
                              control={<Radio size="small" />}
                              label={t("regular", "Regular")}
                              disabled={viewMode}
                              sx={{ mr: 2 }}
                            />
                            <FormControlLabel
                              value="serialized"
                              control={<Radio size="small" />}
                              label={t("serialized", "Serialized")}
                              disabled={viewMode}
                              sx={{ mr: 2 }}
                            />
                            <FormControlLabel
                              value="lotted"
                              control={<Radio size="small" />}
                              label={t("lotted", "Lotted")}
                              disabled={viewMode}
                            />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      {/* Backorders Allowed - Conditional Visibility */}
                      <Grid size={{ xs: 12 }}>
                        <Controller
                          name="backorders_allowed"
                          control={methods.control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.value}
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>
                                  ) => field.onChange(e.target.checked)}
                                  disabled={!isInventoryTrackingEnabled}
                                  size="small"
                                />
                              }
                              label={t("productAllowBackorders")}
                              disabled={viewMode}
                              sx={{
                                justifyContent: "space-between",
                                ml: 0,
                                width: "100%",
                              }}
                              labelPlacement="start"
                            />
                          )}
                        />
                      </Grid>

                      {/* Inventory Advanced Fields */}
                      <Grid size={{ xs: 12 }}>
                        <Controller
                          name="low_stock_count"
                          control={methods.control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value =
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value);
                                field.onChange(value);
                              }}
                              label={t(
                                "products.fields.lowStockCount",
                                "Low Stock Threshold"
                              )}
                              type="number"
                              size="small"
                              fullWidth
                              disabled={viewMode}
                              InputProps={{ inputProps: { min: 0 } }}
                            />
                          )}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="min_count"
                      control={methods.control}
                      render={({ field, fieldState: { error } }) => {
                        const maxCount = methods.watch("max_count");
                        const hasValidationError =
                          field.value && maxCount && field.value >= maxCount;

                        return (
                          <TextField
                            {...field}
                            value={field.value || 1}
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? 1
                                  : Number(e.target.value);
                              field.onChange(value);
                            }}
                            label={t("products.fields.minCount", "Min Count")}
                            type="number"
                            size="small"
                            fullWidth
                            disabled={viewMode}
                            helperText={
                              hasValidationError
                                ? field.value === maxCount
                                  ? t(
                                      "products.validation.minCountEqualsMax",
                                      "Min count and max count cannot be equal"
                                    )
                                  : t(
                                      "products.validation.minCountExceedsMax",
                                      "Min count cannot exceed max count"
                                    )
                                : error?.message
                            }
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="max_count"
                      control={methods.control}
                      render={({ field, fieldState: { error } }) => {
                        const minCount = methods.watch("min_count");
                        const hasValidationError =
                          field.value && minCount && minCount >= field.value;

                        return (
                          <TextField
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value);
                              field.onChange(value);
                            }}
                            label={t("products.fields.maxCount", "Max Count")}
                            type="number"
                            size="small"
                            fullWidth
                            disabled={viewMode}
                            helperText={
                              hasValidationError
                                ? field.value === minCount
                                  ? t(
                                      "products.validation.minCountEqualsMax",
                                      "Min count and max count cannot be equal"
                                    )
                                  : t(
                                      "products.validation.maxCountBelowMin",
                                      "Max count cannot be less than min count"
                                    )
                                : error?.message
                            }
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        );
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
              {/* Product Organization Section - Simplified */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("productOrganization")}
                </Typography>
                <Grid container spacing={2}>
                  {/* Organization Tags - separate from regular tags */}
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="organizationTags"
                      control={methods.control}
                      defaultValue={[]}
                      render={({ field, fieldState: { error } }) => {
                        const tags = field.value || [];
                        return renderTagInput({
                          field,
                          label: t("organizationTags"),
                          helperText:
                            error?.message ||
                            t(
                              tags.length > 0
                                ? "products.form.fields.organizationTags.helperAdded"
                                : "products.form.fields.organizationTags.helperEmpty",
                              tags.length > 0
                                ? `Press enter to add tag (${tags.length} tags added)`
                                : "Type and press enter to add tags"
                            ),
                        });
                      }}
                      disabled={viewMode}
                    />
                  </Grid>
                  {/* Category, Subcategory, UOM Removed - Moved to General */}
                </Grid>
              </Paper>

              {/* Shipping Zone Restrictions Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t("product.shippingRestrictions", "Shipping Restrictions")}
                </Typography>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {t(
                      "product.shippingRestrictionsDescription",
                      "Restrict which shipping zones this product can be shipped to or excluded from."
                    )}
                  </Typography>
                  <Controller
                    name="zone_restrictions_input"
                    control={methods.control}
                    defaultValue={
                      defaultValues?.zone_restrictions?.map((r: any) => ({
                        zone: r.zone,
                        restriction_mode: r.restriction_mode,
                      })) || []
                    }
                    render={({ field }) => (
                      <ShippingZoneRestrictions
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                    disabled={viewMode}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </form>
      </FormProvider>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// Export with dynamic to prevent SSR hydration issues
export default dynamic(() => Promise.resolve(ProductForm), { ssr: false });
