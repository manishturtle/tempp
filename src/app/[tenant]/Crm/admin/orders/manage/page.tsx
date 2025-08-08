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
} from "@mui/material";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { useTranslation } from "react-i18next";
import CustomerDetails from "@/app/components/admin/shared/CustomerDetails";
import OrderSettings from "@/app/components/admin/shared/OrderSettings";
import ProductDetails, {
  ProductLineItem,
} from "@/app/components/admin/shared/ProductDetails";
import OrderSummary from "@/app/components/admin/shared/OrderSummary";
import DeliveryDetails from "@/app/components/admin/shared/DeliveryDetails";
import BillingDetails from "@/app/components/admin/shared/BillingDetails";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { OrderData, OrderMode, discountSettings } from "@/app/types/order";
import {
  getAllProducts,
  getAllStorePickups,
  getAccountsList,
  getAccountContacts,
  getSellingChannels,
  useCreateOrder,
  useUpdateOrder,
  getOrder,
  getStaffUsers,
} from "@/app/hooks/api/orders";
import { Product } from "@/app/types/store/product";

const OrderManagementPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = typeof params?.tenant === "string" ? params.tenant : "";

  // Determine the current mode based on query params
  const mode = (searchParams.get("mode") as OrderMode) || OrderMode.VIEW;

  // Get orderId from URL if in EDIT or VIEW mode
  const orderId = searchParams.get("id");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any>({});
  const [contacts, setContacts] = useState<any[]>([]);
  const [sellingChannels, setSellingChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Only fetch order data after supporting APIs have loaded, and only for EDIT/VIEW modes

  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);

  // Order API hooks
  const createOrder = useCreateOrder();
  const updateOrder = orderId ? useUpdateOrder(orderId) : null;

  // Order state
  const [orderData, setOrderData] = useState<any>({
    account_id: undefined,
    account_name: "",
    contact_id: undefined,
    contact_person_name: "",
    selling_channel_id: undefined,
    customer_group_id: undefined,
    account: undefined,
    order_id: "",
    order_date: new Date().toISOString(),
    status: "DRAFT",
    responsible_person: undefined,
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
  });

  const [addresses, setAddresses] = useState<any[]>([]);

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
            setOrderData({
              ...orderData,
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
          orderId
        ) {
          fetchOrderData(orderId, accountsData.value);
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
    const customerGroupId = orderData?.customer_group_id;
    const sellingChannelId = orderData?.selling_channel_id;

    if (!customerGroupId || !sellingChannelId) return;

    let isMounted = true;

    const fetchData = async () => {
      setLoading2(true);
      setProductsError(null);
      setStorePickupsError(null);

      try {
        // Fetch products and store pickups in parallel
        const [productData, storePickupData] = await Promise.allSettled([
          getAllProducts(customerGroupId, sellingChannelId),
          getAllStorePickups(customerGroupId, sellingChannelId),
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
  }, [orderData?.customer_group_id, orderData?.selling_channel_id]);

  useEffect(() => {
    const fetchAccountContacts = async () => {
      const accountId = orderData?.account_id;
      if (!accountId) {
        setContacts([]);
        return;
      }

      try {
        const contactsData = await getAccountContacts(accountId);
        setContacts(contactsData);
      } catch (error) {
        console.error("Error fetching account contacts:", error);
        showNotification("Error fetching account contacts", "error");
        setContacts([]);
      }
    };

    fetchAccountContacts();
  }, [orderData.account_id]);

  const fetchOrderData = async (orderId: string, accountsData: any) => {
    if (!orderId) return;
    try {
      setIsLoadingOrder(true);
      const order = await getOrder(orderId);
      const transformedOrderData = transformOrderResponse(order);
      setOrderData(transformedOrderData);

      const matchedAccount = accountsData.find(
        (account: any) => account.id === order.account_id
      );
      if (matchedAccount) {
        setAddresses(matchedAccount.addresses);
      }
    } catch (error) {
      console.error("Error fetching order data:", error);
      showNotification("Error fetching order data", "error");
    } finally {
      setIsLoadingOrder(false);
    }
  };

  // Handle actual product deletion after confirmation
  const handleConfirmDelete = React.useCallback(() => {
    const { itemIndex } = deleteConfirmDialog;

    setOrderData((prev: any) => ({
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

  const transformOrderResponse = (orderResponse: any) => {
    // Transform discount settings
    const discountSettings: discountSettings = {
      discount_type: orderResponse.discount_type,
      discount_percentage:
        orderResponse.discount_type === "PERCENTAGE"
          ? toSafeFloat(orderResponse.discount_percentage)
          : undefined,
      discount_amount:
        orderResponse.discount_type === "AMOUNT"
          ? toSafeFloat(orderResponse.discount_amount)
          : undefined,
    };

    // Transform line items
    const items: ProductLineItem[] = orderResponse.items.map((item: any) => ({
      id: item.id,
      product: item.product_id,
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
      name: orderResponse.recipient_details?.name || "",
      phone: orderResponse.recipient_details?.phone || "",
    };

    // Create the transformed orderData object
    return {
      order_id: orderResponse.order_id,
      status: orderResponse.status,
      responsible_person: orderResponse.responsible_person,
      order_date: orderResponse.order_date,
      selling_channel_id: orderResponse.selling_channel,
      account_id: orderResponse.account_id,
      account_name: orderResponse.account_name,
      contact_id: orderResponse?.customer_details?.contact_id,
      contact_person_name: orderResponse.contact_person_name,
      customer_group_id: orderResponse?.customer_details?.customer_group_id,
      account: undefined,
      fulfillment_type: orderResponse.fulfillment_type || "Delivery",
      recipient_details: recipientDetails,
      shipping_address: orderResponse.shipping_address,
      billing_address: orderResponse.billing_address,
      subtotal_amount: toSafeFloat(orderResponse.subtotal_amount) || 0,
      tax_amount: toSafeFloat(orderResponse.tax_amount) || 0,
      total_amount: toSafeFloat(orderResponse.total_amount) || 0,
      discountSettings,
      items,
      same_as_shipping: orderResponse.same_as_shipping,
      pickup_details: orderResponse.pickup_details,
      storepickup: orderResponse.storepickup,
    };
  };

  const generateOrderPayload = (): OrderData => {
    // Start with current order data
    const payload = {
      account_id: orderData?.account_id,
      account_name: orderData?.account_name,
      contact_id: orderData?.contact_id,
      contact_person_name: orderData?.contact_person_name,
      selling_channel: orderData?.selling_channel_id,
      order_date: orderData?.order_date,
      status: orderData?.status,
      responsible_person: orderData?.responsible_person,
      discount_type: orderData?.discountSettings?.discount_type,
      discount_percentage: toSafeFloat(
        orderData?.discountSettings?.discount_percentage
      ),
      discount_amount: toSafeFloat(
        orderData?.discountSettings?.discount_amount
      ),
      billing_address: orderData?.billing_address,
      shipping_address: orderData.shipping_address,
      recipient_details: orderData.recipient_details,
      fulfillment_type: orderData.fulfillment_type,
      items: orderData.items,
      currency: "INR",
      tax_amount: toSafeFloat(orderData?.tax_amount),
      total_amount: toSafeFloat(orderData?.total_amount),
      subtotal_amount: toSafeFloat(orderData?.subtotal_amount),
      same_as_shipping: orderData?.same_as_shipping,
      pickup_details: orderData.pickup_details,
      storepickup: orderData.storepickup,
    };

    // Log the payload for review (as requested)
    console.log("Generated order payload:", payload);
    return payload;
  };

  const validateOrderPayload = (payload: OrderData): string[] => {
    const issues: string[] = [];

    // Check for required customer details
    if (!payload?.account_id) {
      issues.push("Missing account_id in customer details");
    }

    // Check items
    if (!payload?.items || payload.items.length === 0) {
      issues.push("Order must contain at least one item");
    }

    // Check for shipping address when fulfillment type is Delivery
    if (
      payload?.fulfillment_type === "Delivery" &&
      !payload?.shipping_address
    ) {
      issues.push("Shipping address is required for delivery orders");
    }

    return issues;
  };

  const handleSaveOrder = async () => {
    try {
      const payload = generateOrderPayload();

      // Validate payload
      const validationIssues = validateOrderPayload(payload);
      if (validationIssues.length > 0) {
        validationIssues.forEach((issue) => showWarning(issue));
        return;
      }

      // Create or update the order
      if (mode?.toLowerCase() === OrderMode.CREATE) {
        const result = await createOrder.mutateAsync(payload);
        showNotification(t("orders.createSuccess"), "success");
        // Redirect to edit mode with new order ID
        if (result && typeof result === "object" && "account_id" in result) {
          router.push(`/${tenantSlug}/Crm/admin/orders`);
        }
      } else if (mode?.toLowerCase() === OrderMode.EDIT && orderId) {
        const response = await updateOrder?.mutateAsync(payload);
        showNotification(t("orders.updateSuccess"), "success");
        console.log("response", response);
        if (response && typeof response === "object" && "id" in response) {
          router.push(`/${tenantSlug}/Crm/admin/orders`);
        }
      }
    } catch (error) {
      console.error("Error saving order:", error);
      showNotification(
        t("orders.saveFailed") + ": " + (error as Error).message,
        "error"
      );
    }
  };

  // Show loading spinner while waiting for order data in EDIT/VIEW modes
  const isWaitingForOrderData =
    (mode?.toLowerCase() === OrderMode.EDIT.toLowerCase() ||
      mode?.toLowerCase() === OrderMode.VIEW.toLowerCase()) &&
    (loading || isLoadingOrder);

  const handleBack = () => {
    router.push(`/${tenantSlug}/Crm/admin/orders`);
  };

  const handleEdit = () => {
    router.push(
      `/${tenantSlug}/Crm/admin/orders/manage?mode=EDIT&id=${orderId}`
    );
  };

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
            {mode?.toLowerCase() === OrderMode.CREATE &&
              t("orders.create.title")}
            {mode?.toLowerCase() === OrderMode.EDIT && t("orders.edit.title")}
            {mode?.toLowerCase() === OrderMode.VIEW && t("orders.view.title")}
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
            <Button variant="outlined" color="primary" onClick={handleBack}>
              {t("Back")}
            </Button>

            {(mode?.toLowerCase() === OrderMode.CREATE ||
              mode?.toLowerCase() === OrderMode.EDIT) && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveOrder}
                disabled={
                  createOrder.isPending || (updateOrder?.isPending ?? false)
                }
              >
                {createOrder.isPending || (updateOrder?.isPending ?? false)
                  ? t("Saving...")
                  : t("Save")}
              </Button>
            )}

            {mode?.toLowerCase() === OrderMode.VIEW && (
              <Button variant="contained" color="primary" onClick={handleEdit}>
                {t("Edit")}
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
                  orderData={orderData}
                  setOrderData={setOrderData}
                  mode={mode}
                  setAddresses={setAddresses}
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <ProductDetails
                  mode={mode}
                  orderData={orderData}
                  setOrderData={setOrderData}
                  products={products}
                  showNotification={showNotification}
                  showWarning={showWarning}
                />
              </Box>
              <Box sx={{ mt: 3, display: "flex", gap: 3 }}>
                <Box sx={{ width: "50%" }}>
                  <DeliveryDetails
                    mode={mode}
                    orderData={orderData}
                    setOrderData={setOrderData}
                    addresses={addresses}
                    setAddresses={setAddresses}
                    accounts={accounts}
                    setAccounts={setAccounts}
                    storePickups={storePickups}
                    showNotification={showNotification}
                  />
                </Box>
                <Box sx={{ width: "50%" }}>
                  <BillingDetails
                    mode={mode}
                    orderData={orderData}
                    setOrderData={setOrderData}
                    addresses={addresses}
                    setAddresses={setAddresses}
                    accounts={accounts}
                    setAccounts={setAccounts}
                    showNotification={showNotification}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box>
                <OrderSettings
                  mode={mode}
                  orderData={orderData}
                  setOrderData={setOrderData}
                  staffUsers={staffUsers}
                  isLoadingStaffUsers={loading}
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <OrderSummary
                  mode={mode}
                  orderData={orderData}
                  setOrderData={setOrderData}
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

export default OrderManagementPage;
