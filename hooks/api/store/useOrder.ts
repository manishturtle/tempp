"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderContext } from "@/app/contexts/OrderContext";
import api from "@/lib/storeapi";
import AuthService from "@/app/auth/services/authService";
import { createInvoice, InvoicePayload } from "./invoiceService";
import { format } from "date-fns";
import CartService from "@/app/auth/services/cartService";
import { useCart } from "./useCart";
import { isAuthenticated } from "@/app/auth/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import {COCKPIT_API_BASE_URL} from "@/utils/constants";

const getTenantSchema = (): string => {
  // Handle server-side rendering with a default tenant schema
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || "default";
  }

  try {
    // Get tenant slug from URL
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const tenantSlug = pathParts[0] || "";

    if (!tenantSlug) {
      return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || "default";
    }

    // Try to get tenant info from localStorage with tenant prefix
    const tenantInfoKey = `${tenantSlug}_tenantInfo`;
    const tenantInfo = localStorage.getItem(tenantInfoKey);

    if (!tenantInfo) {
      return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || "default";
    }

    const tenantData = JSON.parse(tenantInfo);
    if (!tenantData?.tenant_schema) {
      return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || "default";
    }

    return tenantData.tenant_schema;
  } catch (error) {
    console.error("Error getting tenant schema from session storage:", error);
    // Fallback to a default tenant schema on error
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || "default";
  }
};

export type FulfillmentType = "home_delivery" | "store_pickup";

interface UserDetails {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface StorePickupLocation {
  id: number;
  name: string;
  contact_person?: string;
  contact_number?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  google_place_id?: string;
  operating_hours?: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number | null;
  customer_group_selling_channels?: any[];
}

interface PickupDetails {
  pickupPerson: "myself" | "someone_else";
  name?: string;
  contact?: string;
  storeData?: StorePickupLocation;
}

interface PlaceOrderPayload {
  shippingAddress: Address;
  billingAddress: Address;
  useShippingAsBilling: boolean;
  selectedShippingMethod: {
    id: string;
    name: string;
    price: number;
    estimated_delivery_time: string;
  };
  selectedPaymentMethod: {
    id: string;
    name: string;
    type: string;
  };
  delivery_preferences: {
    preferredDate: string | null;
    preferredTimeSlots: string;
    deliveryInstructions: string;
  };
  recipientDetails: {
    fullName: string;
    phoneNumber: string;
  };
  userDetails: UserDetails;
  fulfillment_details: FulfillmentType;
  points_to_redeem?: number;
  guestEmail?: string;
  isGuest?: boolean;
  pickupDetails?: PickupDetails;
}

interface Address {
  address_line1: string;
  address_line2: string;
  address_type: string;
  type: "home" | "business" | "other";
  business_name?: string;
  city: string;
  country: string;
  full_name: string;
  id: number;
  is_default: boolean;
  phone_number: string;
  postal_code: string;
  state: string;
}

interface PlaceOrderResponse {
  order_id: string;
  status: "pending" | "completed" | "failed";
  redirect_url?: string;
  message?: string;
  cart_data?: any;
}

/**
 * Hook for placing orders and handling payment flow
 * @returns Mutation for placing an order
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient(); // Get router for navigation and order context for storing order ID
  const router = useRouter();
  const { setOrderId } = useOrderContext();
  const { cart, isLoading, isError, error } = useCart();

  return useMutation({
    mutationFn: async (payload: PlaceOrderPayload) => {
      try {
        // Use cart data from useCart hook (already called at top level)
        if (!cart) {
          throw new Error("Cart data not available");
        }
        console.log("Cart data retrieved from useCart hook:", cart);

        // Determine if this is a guest order
        const isGuest = !isAuthenticated();

        // Use exact values from the cart data response
        const subtotalAmount = parseFloat(cart?.subtotal_amount || "0");
        const totalTaxAmount = parseFloat(cart?.total_tax || "0");
        const totalAmount = parseFloat(cart?.total_amount || "0");
        const shippingAmount = 0; // No shipping amount in cart data

        console.log("Using cart amounts:", {
          subtotalAmount,
          totalTaxAmount,
          totalAmount,
          shippingAmount,
        });

        // Convert the checkout data to the required API format using the new payload structure
        const orderPayload = {
          billing_address: {
            address_type: "BILLING",
            street_1:
              payload.billingAddress?.address_line1 ||
              payload.shippingAddress?.address_line1 ||
              "",
            street_2:
              payload.billingAddress?.address_line2 ||
              payload.shippingAddress?.address_line2 ||
              "",
            street_3: "", // Not available in current address structure
            city:
              payload.billingAddress?.city ||
              payload.shippingAddress?.city ||
              "",
            state_province:
              payload.billingAddress?.state ||
              payload.shippingAddress?.state ||
              "",
            postal_code:
              payload.billingAddress?.postal_code ||
              payload.shippingAddress?.postal_code ||
              "",
            country:
              payload.billingAddress?.country ||
              payload.shippingAddress?.country ||
              "India",
            full_name:
              payload.billingAddress?.full_name ||
              payload.shippingAddress?.full_name ||
              "",
            phone_number:
              payload.billingAddress?.phone_number ||
              payload.shippingAddress?.phone_number ||
              "",
            business_name:
              payload.billingAddress?.business_name ||
              payload.shippingAddress?.business_name ||
              "",
            gst_number: "", // Not available in current address structure
            address_category: (payload.billingAddress?.type ||
              payload.shippingAddress?.type ||
              "business") as "home" | "business" | "other",
          },
          shipping_address: {
            address_type: "SHIPPING",
            street_1: payload.shippingAddress?.address_line1 || "",
            street_2: payload.shippingAddress?.address_line2 || "",
            street_3: "", // Not available in current address structure
            city: payload.shippingAddress?.city || "",
            state_province: payload.shippingAddress?.state || "",
            postal_code: payload.shippingAddress?.postal_code || "",
            country: payload.shippingAddress?.country || "India",
            full_name: payload.shippingAddress?.full_name || "",
            phone_number: payload.shippingAddress?.phone_number || "",
            business_name: payload.shippingAddress?.business_name || "",
            gst_number: "", // Not available in current address structure
            address_category: (payload.shippingAddress?.type || "business") as
              | "home"
              | "business"
              | "other",
          },
          order_date: new Date().toISOString(),
          currency: "INR",
          status: "DRAFT",
          payment_status: "PENDING",
          shipping_method_name: payload.selectedShippingMethod?.name,
          shipping_method: parseInt(payload.selectedShippingMethod?.id),
          subtotal_amount: subtotalAmount.toString(),
          tax_amount: totalTaxAmount.toString(),
          total_amount: totalAmount.toString(),
          same_as_shipping: payload.useShippingAsBilling,
          recipient_details: {
            name:
              payload.recipientDetails?.fullName ||
              "",
            phone:
              payload.recipientDetails?.phoneNumber ||
              "",
          },
          delivery_preferences: {
            preferredDate: payload.delivery_preferences?.preferredDate,
            deliveryInstructions:
              payload.delivery_preferences?.deliveryInstructions,
            preferredTimeSlots:
              payload.delivery_preferences?.preferredTimeSlots, // Not available in current structure
          },
          fulfillment_type:
            payload.fulfillment_details === "home_delivery"
              ? "Delivery"
              : "Pickup",
          pickup_details: {
            name: payload.pickupDetails?.pickupPerson === "someone_else"
              ? payload.pickupDetails?.name || ""
              : payload.pickupDetails?.storeData?.contact_person || "",
            phone: payload.pickupDetails?.pickupPerson === "someone_else"
              ? payload.pickupDetails?.contact || ""
              : payload.pickupDetails?.storeData?.contact_number || "",
          },
          storepickup: payload.pickupDetails?.storeData?.id?.toString() || "",
          customer_group_selling_channel_id: 1, // Default customer group
          items:
            cart?.items?.map((item: any, index: number) => {
              const unitPrice = parseFloat(item.product_details?.price);
              const quantity = item.quantity;

              return {
                product: item.product_details?.id,
                product_sku: item.product_sku,
                product_name: item.product_details?.name,
                quantity: quantity,
                unit_price: unitPrice.toFixed(2),
                item_order: index + 1,
                uom_symbol: item.product_details?.unit_name,
                taxes:
                  item.taxes?.map((tax: any) => ({
                    tax_id: tax.tax_id,
                    tax_code: tax.tax_code,
                    tax_rate: tax.tax_rate,
                    tax_amount: tax.tax_amount,
                  })) || [],
              };
            }) || [],
        };

        console.log("Placing order with payload:", orderPayload);

        const orderEndpoint = isGuest ? `/om/guest/orders/` : "/om/orders/";

        // Only pass token for authenticated orders, not for guest orders
        const orderResponse = await api.post(orderEndpoint, orderPayload, {
          headers: isGuest
            ? {}
            : {
                Authorization: `Bearer ${AuthService.getToken()}`,
              },
          withCredentials: true,
        });
        console.log("Order created:", orderResponse.data);

        // Clear the session ID cookie af ter successful order creation
        // Call order processed API only for turtlesoftware tenant (not erp_turtle)
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const tenantSlug = pathParts[0] || "";
        const tenantInfoKey = `${tenantSlug}_tenantInfo`;
        const tenantInfo = JSON.parse(
          localStorage.getItem(tenantInfoKey) || "{}"
        );

        if (tenantInfo?.tenant_schema === "turtlesoftware") {
          console.log(
            "Calling order processed API with order ID:",
            orderResponse.data.id
          );
          
          // Use the CartItem type from store types
          // Extract product IDs from the cart items
          const productIds = cart.items.map((item) => item.product_details.id);
          console.log("Product IDs extracted:", productIds);

          const orderId = orderResponse.data?.id;

          if (!orderId) {
            console.error("Order ID is undefined from API response");
            return;
          }

          // Fire and forget - make API call without waiting for response
          const requestBody = {
            order_id: orderId,
            product_ids: productIds,
            tenant_schema: getTenantSchema(),
          };

          // Trigger API call and continue with flow immediately
          fetch(`${COCKPIT_API_BASE_URL}/platform-admin/tenants/`, {

            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // 'Authorization': `Bearer ${AuthService.getToken()}`
            },
            body: JSON.stringify(requestBody),
          })
            .then((response) => {
              if (!response.ok) {
                response.text().then((text) => {
                  console.error("Error calling order processed API:", text);
                });
              } else {
                console.log("Order processed API called successfully");
              }
            })
            .catch((processError) => {
              console.error("Error calling order processed API:", processError);
            });

          // Continue with the main flow without waiting for the API response
        } else {
          console.log(
            "Skipping order processed API call for non-erp_turtle tenant"
          );
        }
        // Set the order ID in context
        setOrderId(orderResponse.data.id);

        try {
          console.log("Clearing cart after successful order placement");
          await CartService.clearCart();
          console.log("Cart cleared successfully");

          // Clear cart-related queries from the cache
          queryClient.invalidateQueries({ queryKey: ["cart"] });
        } catch (clearCartError) {
          console.error("Error clearing cart after order:", clearCartError);
          // Don't fail the order if cart clearing fails
        }

        // Get the tenant slug from the URL or session storage
        const currentTenantSlug =
          window.location.pathname.split("/")[1] || getTenantSchema();

        // Redirect to order confirmation page with the tenant slug
        router.push(`/${currentTenantSlug}/store/order-confirmation/`);

        return {
          status: "completed",
          order_id: orderResponse.data.id,
          redirect_url: undefined,
        } as PlaceOrderResponse;
      } catch (error: any) {
        console.error(
          "Error placing order:",
          error.response?.data || error.message
        );
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate cart and related queries after successful submission
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
