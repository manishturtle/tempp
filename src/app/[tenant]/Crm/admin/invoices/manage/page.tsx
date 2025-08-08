"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Backdrop,
  Grid,
  TextField,
} from "@mui/material";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { useTranslation } from "react-i18next";
import CustomerDetails from "@/app/components/admin/shared/CustomerDetails";
import InvoiceSettings from "@/app/components/admin/shared/InvoiceSettings";
import ProductDetails, {
  ProductLineItem,
} from "@/app/components/admin/shared/ProductDetails";
import OrderSummary from "@/app/components/admin/shared/OrderSummary";
import DeliveryDetails from "@/app/components/admin/shared/DeliveryDetails";
import BillingDetails from "@/app/components/admin/shared/BillingDetails";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { InvoiceData, OrderMode, discountSettings } from "@/app/types/order";
import {
  getAllProducts,
  getAllStorePickups,
  getAccountsList,
  getAccountContacts,
  getSellingChannels,
  useCreateInvoice,
  useUpdateInvoice,
  getInvoice,
  getStaffUsers,
  getUnpaidInvoices,
  getSegment,
  getInvoiceConfigs,
} from "@/app/hooks/api/orders";
import { Product } from "@/app/types/store/product";

const InvoiceManagementPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = typeof params?.tenant === "string" ? params.tenant : "";

  // Determine the current mode based on query params
  const mode = (searchParams.get("mode") as OrderMode) || OrderMode.VIEW;

  // Get orderId from URL if in EDIT or VIEW mode
  const invoiceId = searchParams.get("id");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any>({});
  const [contacts, setContacts] = useState<any[]>([]);
  const [sellingChannels, setSellingChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any>({});
  const [segment, setSegment] = useState<any>({});
  const [invoiceConfigs, setInvoiceConfigs] = useState<any>({});
  const [paymentTerms, setPaymentTerms] = useState<any>([]);
  const [numType, setNumType] = useState<any>("");
  const [roundingMethod, setRoundingMethod] = useState<any>("");
  const [allowBackDatedInvoiceGeneration, setAllowBackDatedInvoiceGeneration] =
    useState<any>(null);

  // Order API hooks
  const createInvoice = useCreateInvoice();
  const updateInvoice = invoiceId ? useUpdateInvoice(invoiceId) : null;

  // Order state
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    account_id: undefined,
    account_name: "",
    contact_id: undefined,
    contact_person_name: "",
    selling_channel_id: undefined,
    customer_group_id: undefined,
    account: undefined,
    responsible_person: undefined,
    invoice_number: "",
    reference_number: "",
    place_of_supply: "",
    gst_treatment: "BUSINESS_GST",
    issue_date: new Date().toISOString(),
    payment_terms: "",
    payment_terms_label: "",
    payment_status: "UNPAID",
    due_date: new Date().toISOString(),
    discountSettings: {
      discount_type: "PERCENTAGE",
      discount_percentage: 0,
      discount_amount: 0,
    },
    items: [] as ProductLineItem[],
    fulfillment_type: "Delivery",
    recipient_details: {
      name: "",
      phone: "",
    },
    storepickup: undefined,
    pickup_details: {
      name: "",
      phone: "",
    },
    shipping_address: undefined,
    billing_address: undefined,
    same_as_shipping: false,
    subtotal_amount: 0,
    tax_amount: 0,
    total_amount: 0,
    rounded_delta: 0,
    rounding_sign: "",
    currency: "INR",
    notes: "",
    terms: "",
    invoice_status: "DRAFT",
    invoice_type: "STANDARD",
  });

  const [addresses, setAddresses] = useState<any[]>([]);

  // State for terms and notes editing
  const [isEditingTerms, setIsEditingTerms] = useState<boolean>(false);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  // State for products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);

  // State for store pickups
  const [storePickups, setStorePickups] = useState<any[]>([]);
  const [storePickupsError, setStorePickupsError] = useState<string | null>(
    null
  );

  const [loading2, setLoading2] = useState<boolean>(false);

  // Use the notification hook
  const { notification, showNotification, hideNotification, showWarning } =
    useNotification();

  // State for delete confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    itemIndex: number;
    productName: string;
  }>({ open: false, itemIndex: -1, productName: "" });

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [accountsData, channelsData, staffData] =
          await Promise.allSettled([
            getAccountsList(),
            getSellingChannels(),
            getStaffUsers(),
          ]);

        if (!isMounted) return;

        // Handle accounts response
        if (accountsData.status === "fulfilled") {
          setAccounts(accountsData.value);
        } else {
          console.error("Error fetching accounts:", accountsData.reason);
          showNotification("Error fetching accounts", "error");
        }

        // Handle selling channels response
        if (channelsData.status === "fulfilled") {
          setSellingChannels(channelsData.value);
        } else {
          console.error(
            "Error fetching selling channels:",
            channelsData.reason
          );
          showNotification("Error fetching selling channels", "error");
        }

        // Handle staff users response
        if (staffData.status === "fulfilled") {
          setStaffUsers(staffData.value);
          if (mode.toLowerCase() === OrderMode.CREATE) {
            setInvoiceData({
              ...invoiceData,
              responsible_person: staffData.value?.current_user,
            });
          }
        } else {
          console.error("Error fetching staff users:", staffData.reason);
          showNotification("Error fetching staff users", "error");
        }

        if (
          (mode.toLowerCase() === OrderMode.EDIT ||
            mode.toLowerCase() === OrderMode.VIEW) &&
          invoiceId
        ) {
          fetchInvoiceData(invoiceId, accountsData.value);
        }
      } catch (error) {
        console.error("Error in fetchInitialData:", error);
        showNotification("An error occurred while loading data", "error");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products and store pickups when both customer_group_id and selling_channel_id are available
  useEffect(() => {
    const customerGroupId = invoiceData?.customer_group_id;
    const sellingChannelId = invoiceData?.selling_channel_id;

    if (!customerGroupId || !sellingChannelId) return;

    let isMounted = true;

    const fetchData = async () => {
      setLoading2(true);
      setProductsError(null);
      setStorePickupsError(null);

      try {
        // Fetch products and store pickups in parallel
        const [productData, storePickupData, segmentData] =
          await Promise.allSettled([
            getAllProducts(customerGroupId, sellingChannelId),
            getAllStorePickups(customerGroupId, sellingChannelId),
            getSegment(customerGroupId, sellingChannelId),
          ]);

        if (!isMounted) return;

        // Handle products response
        if (productData.status === "fulfilled") {
          setProducts(productData.value);
          console.log("Products fetched:", productData.value.length);
        } else {
          console.error("Error fetching products:", productData.reason);
          setProductsError("Failed to load products. Please try again.");
          setProducts([]);
        }

        // Handle store pickups response
        if (storePickupData.status === "fulfilled") {
          setStorePickups(storePickupData.value);
          console.log("Store pickups fetched:", storePickupData.value.length);
        } else {
          console.error(
            "Error fetching store pickups:",
            storePickupData.reason
          );
          setStorePickupsError("Failed to load store pickup locations.");
          setStorePickups([]);
        }

        // Handle segment response
        if (segmentData.status === "fulfilled") {
          const segment = segmentData.value;
          setSegment(segment.segment);
          console.log("Segment fetched:", segment);
        } else {
          console.error("Error fetching segment:", segmentData.reason);
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        // Set appropriate error states
        setProductsError("An unexpected error occurred.");
        setStorePickupsError("An unexpected error occurred.");
      } finally {
        if (isMounted) {
          setLoading2(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [invoiceData?.customer_group_id, invoiceData?.selling_channel_id]);

  useEffect(() => {
    const fetchAccountData = async () => {
      const accountId = invoiceData?.account_id;
      if (!accountId) {
        setContacts([]);
        setUnpaidInvoices({});
        return;
      }

      try {
        // Fetch contacts for the selected account
        const contactsData = await getAccountContacts(accountId);
        setContacts(contactsData);

        // Fetch unpaid invoices data for the selected account
        const unpaidData = await getUnpaidInvoices(accountId);
        setUnpaidInvoices(unpaidData);
      } catch (error) {
        console.error("Error fetching account data:", error);
        showNotification("Error fetching account data", "error");
        setContacts([]);
        setUnpaidInvoices({});
      }
    };

    fetchAccountData();
  }, [invoiceData.account_id]);

  useEffect(() => {
    if (segment.id && invoiceData.invoice_type) {
      fetchInvoiceConfigs(invoiceData.invoice_type, segment.id);
    }
  }, [segment, invoiceData.invoice_type]);

  const fetchInvoiceData = async (invoiceId: string, accountsData: any) => {
    if (!invoiceId) return;
    try {
      setIsLoadingInvoice(true);
      const invoice = await getInvoice(invoiceId);
      const transformedInvoiceData = transformInvoiceResponse(invoice);
      setInvoiceData(transformedInvoiceData);

      const matchedAccount = accountsData.find(
        (account: any) => account.id === invoice.account
      );
      if (matchedAccount) {
        setAddresses(matchedAccount.addresses);
      }
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      showNotification("Error fetching invoice data", "error");
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const fetchInvoiceConfigs = async (type: string, segment_id: number) => {
    if (!type || !segment_id) return;
    let name;
    if (type === "STANDARD") name = "Standard";
    else if (type === "PROFORMA") name = "Proforma";
    else if (type === "SALES_RECEIPT") name = "Sales Receipt";
    else if (type === "RECURRING") name = "Recurring";
    else name = "Standard";
    try {
      const invoiceConfigs = await getInvoiceConfigs(
        "Invoice",
        name,
        segment_id
      );
      setInvoiceConfigs(invoiceConfigs);

      // Extract specific configuration values from config_values array
      if (invoiceConfigs?.config_values) {
        invoiceConfigs.config_values.forEach((config: any) => {
          const key = config.setting_def_name;
          let value = config.configured_value;

          switch (key) {
            case "GEN_ROUNDING_METHOD":
              setRoundingMethod(value);
              break;
            case "GEN_TERMS_AND_CONDITIONS":
              setInvoiceData((prev) => ({ ...prev, terms: value }));
              break;
            case "GEN_CUSTOMER_NOTES":
              setInvoiceData((prev) => ({ ...prev, notes: value }));
              break;
            case "GEN_PAYMENT_TERMS_LIST":
              if (key === "GEN_PAYMENT_TERMS_LIST") {
                try {
                  const validJsonString = value.replace(/'/g, '"');
                  value = JSON.parse(validJsonString);
                } catch (e) {
                  value = [];
                }
              }
              // Add custom option
              const customOption = {
                label: "Custom",
                days: 0,
                id: Date.now() + Math.random(), // Generate unique ID
              };
              setPaymentTerms([...value, customOption]);
              break;
            case "NUM_TYPE":
              setNumType(value);
              break;
            case "GEN_ALLOW_BACKDATED_INVOICE":
              if (value === "True") {
                setAllowBackDatedInvoiceGeneration(true);
              } else {
                setAllowBackDatedInvoiceGeneration(false);
              }
              break;
            default:
              break;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching invoice configs:", error);
      showNotification("Error fetching invoice configs", "error");
    }
  };

  // Handle actual product deletion after confirmation
  const handleConfirmDelete = React.useCallback(() => {
    const { itemIndex } = deleteConfirmDialog;

    setInvoiceData((prev: any) => ({
      ...prev,
      items: prev.items?.filter((_: any, i: any) => i !== itemIndex) || [],
    }));

    showNotification(t("orders.productDeletedSuccess"), "success");
    setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));
  }, [deleteConfirmDialog, showNotification, t]);

  // Handle cancel deletion
  const handleCancelDelete = React.useCallback(() => {
    setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));
  }, []);

  // Helper function to safely convert values to float with 2 decimal places
  const toSafeFloat = (value: any): number | undefined => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    const floatValue = parseFloat(value);
    if (isNaN(floatValue)) {
      return undefined;
    }
    return parseFloat(floatValue.toFixed(2));
  };

  const transformInvoiceResponse = (invoiceResponse: any) => {
    // Transform discount settings
    const discountSettings: discountSettings = {
      discount_type: invoiceResponse.discount_type,
      discount_percentage:
        invoiceResponse.discount_type === "PERCENTAGE"
          ? toSafeFloat(invoiceResponse.discount_percentage)
          : undefined,
      discount_amount:
        invoiceResponse.discount_type === "AMOUNT"
          ? toSafeFloat(invoiceResponse.discount_amount)
          : undefined,
    };

    // Transform line items
    const items: ProductLineItem[] = invoiceResponse.items.map((item: any) => ({
      id: item.id,
      product: item.product,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: toSafeFloat(item.unit_price) || 0,
      total_price: toSafeFloat(item.total_price) || 0,
      hsn_sac_code: item.hsn_sac_code,
      item_order: item.item_order,
      description: item.description,
      discount_type: item.discount_type,
      discount_percentage:
        item.discount_type === "PERCENTAGE"
          ? toSafeFloat(item.discount_percentage)
          : undefined,
      discount_amount: toSafeFloat(item.discount_amount),
      taxes: item.taxes.map((tax: any) => ({
        id: tax.id,
        tax_id: tax.tax_id,
        tax_code: tax.tax_code,
        tax_rate: toSafeFloat(tax.tax_rate) || 0,
        tax_amount: toSafeFloat(tax.tax_amount) || 0,
      })),
      uom_symbol: item.uom_symbol,
    }));

    // Transform recipient details
    const recipientDetails = {
      name: invoiceResponse.recipient_details?.name || "",
      phone: invoiceResponse.recipient_details?.phone || "",
    };

    // Create the transformed invoiceData object
    return {
      invoice_id: invoiceResponse.invoice_id,
      invoice_number: invoiceResponse.invoice_number,
      reference_number: invoiceResponse.reference_number,
      invoice_type: invoiceResponse.invoice_type,
      invoice_status: invoiceResponse.invoice_status,
      issue_date: invoiceResponse.issue_date,
      payment_terms: invoiceResponse.payment_terms,
      payment_terms_label: invoiceResponse.payment_terms_label,
      payment_status: invoiceResponse.payment_status,
      due_date: invoiceResponse.due_date,
      place_of_supply: invoiceResponse.place_of_supply,
      gst_treatment: invoiceResponse.gst_treatment,
      responsible_person: invoiceResponse.responsible_person,
      selling_channel_id: invoiceResponse.selling_channel,
      customer_group_id: invoiceResponse?.customer_details?.customer_group_id,
      account_id: invoiceResponse.account,
      account_name: invoiceResponse.account_name,
      contact_id: invoiceResponse?.contact,
      contact_person_name: invoiceResponse.contact_person_name,
      account: undefined,
      recipient_details: recipientDetails,
      shipping_address: invoiceResponse.shipping_address,
      billing_address: invoiceResponse.billing_address,
      subtotal_amount: toSafeFloat(invoiceResponse.subtotal_amount) || 0,
      tax_amount: toSafeFloat(invoiceResponse.tax_amount) || 0,
      total_amount: toSafeFloat(invoiceResponse.total_amount) || 0,
      discountSettings,
      items,
      same_as_shipping: invoiceResponse.same_as_shipping,
      notes: invoiceResponse.notes,
      terms: invoiceResponse.terms,
      currency: invoiceResponse.currency || "INR",
      fulfillment_type: invoiceResponse.fulfillment_type,
      pickup_details: invoiceResponse.pickup_details,
      storepickup: invoiceResponse.storepickup,
    };
  };

  const generateInvoicePayload = () => {
    const isCreateMode = mode?.toLowerCase() === OrderMode.CREATE;
    // Start with current invoice data
    const payload = {
      account: invoiceData?.account_id,
      account_name: invoiceData?.account_name,
      contact: invoiceData?.contact_id,
      contact_person_name: invoiceData?.contact_person_name,
      selling_channel: invoiceData?.selling_channel_id,
      responsible_person: invoiceData?.responsible_person,
      customer_group_id: invoiceData?.customer_group_id,
      // Invoice specific fields
      invoice_number: invoiceData?.invoice_number,
      reference_number: invoiceData?.reference_number,
      invoice_type: invoiceData?.invoice_type,
      invoice_status: isCreateMode ? "ISSUED" : invoiceData?.invoice_status,
      issue_date: invoiceData?.issue_date
        ? new Date(invoiceData.issue_date).toISOString().split("T")[0]
        : undefined,
      payment_terms: invoiceData?.payment_terms,
      payment_terms_label: invoiceData?.payment_terms_label,
      payment_status: isCreateMode ? "UNPAID" : invoiceData?.payment_status,
      due_date: invoiceData?.due_date
        ? new Date(invoiceData.due_date).toISOString().split("T")[0]
        : undefined,
      gst_treatment: invoiceData?.gst_treatment,
      // Discount settings
      discount_type: invoiceData?.discountSettings?.discount_type,
      discount_percentage: invoiceData?.discountSettings?.discount_percentage,
      discount_amount: toSafeFloat(
        invoiceData?.discountSettings?.discount_amount
      ),
      // Address information
      billing_address: invoiceData?.billing_address,
      shipping_address: invoiceData?.shipping_address,
      recipient_details: invoiceData?.recipient_details,
      same_as_shipping: invoiceData?.same_as_shipping,
      place_of_supply: invoiceData?.billing_address?.state_province,
      // Line items and totals
      items: invoiceData?.items,
      currency: "INR",
      tax_amount: toSafeFloat(invoiceData?.tax_amount),
      total_amount: toSafeFloat(invoiceData?.total_amount),
      subtotal_amount: toSafeFloat(invoiceData?.subtotal_amount),
      // Additional fields
      notes: invoiceData?.notes,
      terms: invoiceData?.terms,
      fulfillment_type: invoiceData?.fulfillment_type,
      storepickup: invoiceData?.storepickup,
      pickup_details: invoiceData?.pickup_details,
      rounding_sign: invoiceData?.rounding_sign,
      rounded_delta: invoiceData?.rounded_delta,
    };

    // Log the payload for review (as requested)
    console.log("Generated invoice payload:", payload);
    return payload;
  };

  const validateInvoicePayload = (payload: any): string[] => {
    const issues: string[] = [];

    // Check for required customer details
    if (!payload?.account) {
      issues.push("Missing account_id in customer details");
    }

    const NUM_TYPE = invoiceConfigs?.config_values?.find(
      (item: any) => item.setting_def_name === "NUM_TYPE"
    )?.configured_value;
    if (
      NUM_TYPE === "MANUAL" &&
      (!payload?.invoice_number || payload.invoice_number.trim() === "")
    ) {
      issues.push("Invoice number is required");
    }

    if (!payload?.issue_date) {
      issues.push("Issue date is required");
    }

    if (!payload?.invoice_status) {
      issues.push("Invoice status is required");
    }

    if (!payload?.invoice_type) {
      issues.push("Invoice type is required");
    }

    // Check items
    if (!payload?.items || payload.items.length === 0) {
      issues.push("Invoice must contain at least one item");
    }

    // Check for billing address
    if (!payload?.billing_address) {
      issues.push("Billing address is required for invoices");
    }

    return issues;
  };

  const handleSaveInvoice = async () => {
    try {
      const payload = generateInvoicePayload();

      // Validate payload
      const validationIssues = validateInvoicePayload(payload);
      if (validationIssues.length > 0) {
        validationIssues.forEach((issue: string) => showWarning(issue));
        return;
      }

      // Create or update the invoice
      if (mode?.toLowerCase() === OrderMode.CREATE) {
        // Create new invoice
        const createResponse = await createInvoice.mutateAsync(payload);
        if (createResponse) {
          showNotification(
            t("invoices.createSuccess", "Invoice created successfully"),
            "success"
          );
          router.push(`/${tenantSlug}/Crm/admin/invoices`);
        }
      } else if (mode?.toLowerCase() === OrderMode.EDIT && invoiceId) {
        // Update existing invoice
        if (updateInvoice) {
          const updateResponse = await updateInvoice.mutateAsync(payload);
          if (updateResponse) {
            showNotification(
              t("invoices.updateSuccess", "Invoice updated successfully"),
              "success"
            );
            router.push(`/${tenantSlug}/Crm/admin/invoices`);
          }
        }
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      showNotification(
        t("invoices.saveFailed", "Failed to save invoice") +
          ": " +
          (error as Error).message,
        "error"
      );
    }
  };

  // Show loading spinner while waiting for order data in EDIT/VIEW modes
  const isWaitingForOrderData =
    (mode?.toLowerCase() === OrderMode.EDIT.toLowerCase() ||
      mode?.toLowerCase() === OrderMode.VIEW.toLowerCase()) &&
    (loading || isLoadingInvoice);

  const handleBack = () => {
    router.push(`/${tenantSlug}/Crm/admin/invoices`);
  };

  const handleCancelInvoice = async () => {
    if (!(mode?.toLowerCase() === OrderMode.EDIT) || !invoiceId) {
      return;
    }
    const payload = {
      invoice_status: "CANCELLED",
    };
    if (updateInvoice) {
      const updateResponse = await updateInvoice.mutateAsync(payload);
      if (updateResponse) {
        showNotification(
          t("invoices.updateSuccess", "Invoice cancelled successfully"),
          "success"
        );
        router.push(`/${tenantSlug}/Crm/admin/invoices`);
      }
    }
  };

  const isReadOnly = mode?.toLowerCase() === OrderMode.VIEW.toLowerCase();

  return (
    <>
      {/* Loading backdrop while waiting for order data */}
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isWaitingForOrderData}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4" gutterBottom>
            {mode?.toLowerCase() === OrderMode.CREATE && t("invoices.create")}
            {mode?.toLowerCase() === OrderMode.EDIT && t("invoices.edit")}
            {mode?.toLowerCase() === OrderMode.VIEW && t("invoices.view")}
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
            {(mode?.toLowerCase() === OrderMode.VIEW ||
              mode?.toLowerCase() === OrderMode.EDIT) && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCancelInvoice}
                >
                  {t("Cancel Invoice")}
                </Button>
              </>
            )}

            <Button variant="outlined" color="primary" onClick={handleBack}>
              {t("Back")}
            </Button>

            {(mode?.toLowerCase() === OrderMode.CREATE ||
              mode?.toLowerCase() === OrderMode.EDIT) && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveInvoice}
                disabled={
                  createInvoice.isPending || (updateInvoice?.isPending ?? false)
                }
              >
                {createInvoice.isPending || (updateInvoice?.isPending ?? false)
                  ? t("Saving...")
                  : t("Save")}
              </Button>
            )}
          </Box>
        </Box>

        <Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8.5 }}>
              <Box>
                <CustomerDetails
                  accounts={accounts}
                  isLoadingAccounts={loading}
                  contacts={contacts}
                  sellingChannels={sellingChannels}
                  orderData={invoiceData}
                  setOrderData={setInvoiceData}
                  mode={mode}
                  setAddresses={setAddresses}
                  unpaidInvoices={unpaidInvoices}
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <ProductDetails
                  mode={mode}
                  orderData={invoiceData}
                  setOrderData={setInvoiceData}
                  products={products}
                  showNotification={showNotification}
                  showWarning={showWarning}
                />
              </Box>
              <Box sx={{ mt: 3, display: "flex", gap: 3 }}>
                <Box sx={{ width: "50%" }}>
                  <DeliveryDetails
                    mode={mode}
                    orderData={invoiceData}
                    setOrderData={setInvoiceData}
                    addresses={addresses}
                    setAddresses={setAddresses}
                    accounts={accounts}
                    setAccounts={setAccounts}
                    storePickups={storePickups}
                    type="invoice"
                    showNotification={showNotification}
                  />
                </Box>
                <Box sx={{ width: "50%" }}>
                  <BillingDetails
                    mode={mode}
                    orderData={invoiceData}
                    setOrderData={setInvoiceData}
                    addresses={addresses}
                    setAddresses={setAddresses}
                    accounts={accounts}
                    setAccounts={setAccounts}
                    type="invoice"
                    showNotification={showNotification}
                  />
                </Box>
              </Box>
              {/* Terms & Conditions Section */}
              <Box
                sx={{
                  mt: 3,
                  backgroundColor: "#fff",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {!isEditingTerms &&
                (!invoiceData?.terms || invoiceData.terms.trim() === "") ? (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{
                      cursor: "pointer",
                      mb: 1,
                      opacity: isReadOnly ? 0.5 : 1,
                    }}
                    onClick={() => isReadOnly ? null : setIsEditingTerms(true)}
                  >
                    +{" "}
                    <span style={{ textDecoration: "underline" }}>
                      {t("invoices.addTerms", "Add Terms & Conditions")}
                    </span>
                  </Typography>
                ) : (
                  <TextField
                    label={t("invoices.terms", "Terms & Conditions")}
                    value={invoiceData?.terms || ""}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, terms: e.target.value })
                    }
                    onBlur={() => {
                      if (
                        !invoiceData?.terms ||
                        invoiceData.terms.trim() === ""
                      ) {
                        setIsEditingTerms(false);
                      }
                    }}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    placeholder={t(
                      "invoices.termsPlaceholder",
                      "Enter payment terms, warranty information, return policy, or any other terms and conditions for this invoice..."
                    )}
                    autoFocus
                    sx={{ mb: 2 }}
                    disabled={isReadOnly}
                  />
                )}

                {!isEditingNotes &&
                (!invoiceData?.notes || invoiceData.notes.trim() === "") ? (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{
                      cursor: "pointer",
                      opacity: isReadOnly ? 0.5 : 1,
                    }}
                    onClick={() => isReadOnly ? null : setIsEditingNotes(true)}
                  >
                    +{" "}
                    <span style={{ textDecoration: "underline" }}>
                      {t("invoices.addNotes", "Add Notes")}
                    </span>
                  </Typography>
                ) : (
                  <TextField
                    label={t("invoices.notes", "Notes")}
                    value={invoiceData?.notes || ""}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, notes: e.target.value })
                    }
                    onBlur={() => {
                      if (
                        !invoiceData?.notes ||
                        invoiceData.notes.trim() === ""
                      ) {
                        setIsEditingNotes(false);
                      }
                    }}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    placeholder={t(
                      "invoices.notesPlaceholder",
                      "Add internal notes, delivery instructions, or any additional information about this invoice..."
                    )}
                    autoFocus
                    sx={{ mb: "0px" }}
                    disabled={isReadOnly}
                  />
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box>
                <InvoiceSettings
                  mode={mode}
                  invoiceData={invoiceData}
                  setInvoiceData={setInvoiceData}
                  staffUsers={staffUsers}
                  loading={loading}
                  numType={numType}
                  paymentTerms={paymentTerms}
                  allowBackDatedInvoiceGeneration={
                    allowBackDatedInvoiceGeneration
                  }
                />
              </Box>
              {/* <Box sx={{ mt: 3 }}>
                <PaymentDetails
                  mode={mode}
                  invoiceData={invoiceData}
                  setInvoiceData={setInvoiceData}
                />
              </Box> */}
              <Box sx={{ mt: 3 }}>
                <OrderSummary
                  mode={mode}
                  orderData={invoiceData}
                  setOrderData={setInvoiceData}
                  roundingMethod={roundingMethod}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
        title={notification.title}
      />

      <ConfirmDialog
        open={deleteConfirmDialog.open}
        title={t("orders.confirmDeleteProduct")}
        content={t("orders.confirmDeleteProductContent", {
          productName: deleteConfirmDialog.productName,
        })}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={t("delete")}
        cancelText={t("cancel")}
      />
    </>
  );
};

export default InvoiceManagementPage;
