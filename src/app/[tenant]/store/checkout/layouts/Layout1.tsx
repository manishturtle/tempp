import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/app/auth/hooks/useAuth";
import { useAddresses } from "@/app/hooks/api/store/useAddresses";
import { useCart } from "@/app/hooks/api/store/useCart";
import { ShippingAddressFormData } from "@/app/types/store/checkout";
import {
  Box,
  useTheme,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ShippingAddressForm } from "@/app/components/Store/checkout/ShippingAddressForm";
import { OrderSummary } from "@/app/components/Store/checkout/OrderSummary";
import UserIdentification from "./components/UserIdentification";
import ShippingAddressSelector from "./components/ShippingAddressSelector";
import BillingAddressSelector from "./components/BillingAddressSelector";
import { PaymentMethodSelector } from "./components/PaymentMethodSelector";
import { useStoreConfig } from "@/app/[tenant]/store/layout";
import GstDetailsForm from "./components/GstDetails";
import DeliveryPreferences, {
  DeliveryPreferences as DeliveryPreferencesType,
} from "./components/DeliveryPreferences";
import RecipientDetailsForm, {
  RecipientData,
  ShippingMethodDisplayData,
} from "./components/recipientDetails";
import { useParams } from "next/navigation";
import {
  Address,
  AddressType,
  CheckoutAddress,
} from "@/app/types/store/addressTypes";

// First, add these imports at the top of Layout1.tsx
import {
  PickupDetailsForm,
  PickupDetails,
} from "./components/PickupDetailsForm";

import { usePlaceOrder } from "@/app/hooks/api/store/useOrder";

/**
 * Default checkout layout component
 * Contains the layout structure for the checkout page
 * Uses a two-column layout with a scrollable content area and a static summary area
 */
function storeLocationInLocalStorage(
  address: any,
  tenantSlug: string,
  queryClient?: any,
  cart?: any,
  onNonDeliverableFound?: (products: any[]) => void
): void {
  if (!tenantSlug || !address) return;

  const locationObj = {
    country: address.country || "",
    pincode: address.postal_code || "",
    state: address.state || "",
  };

  localStorage.setItem(`${tenantSlug}_location`, JSON.stringify(locationObj));

  // If queryClient is provided, refresh cart and log non-deliverable items
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["cart"] });

    // Wait for the cart to refresh and then get the updated data
    setTimeout(async () => {
      try {
        // Get fresh cart data after invalidation
        const freshCartData = queryClient.getQueryData(["cart"]);

        if (freshCartData?.items?.length > 0) {
          const notDeliverable = freshCartData.items.filter(
            (item: any) => item.product_details?.delivery_eligible === false
          );

          // Log only products with delivery_eligible: false
          if (notDeliverable.length > 0) {
            console.log(
              "Products with delivery_eligible: false (UPDATED DATA):"
            );
            notDeliverable.forEach((item: any, index: number) => {
              console.log(`\nProduct ${index + 1}:`);
              console.log(`- Product ID: ${item.product_id || "N/A"}`);
              console.log(
                `- Product Name: ${item.product_details?.name || "N/A"}`
              );
              console.log(`- SKU: ${item.sku || "N/A"}`);
              console.log(
                `- Delivery Eligible: ${item.product_details?.delivery_eligible}`
              );
            });

            // Call callback if provided
            if (onNonDeliverableFound) {
              onNonDeliverableFound(notDeliverable);
            }
          } else {
            console.log(
              "No products with delivery_eligible: false found in updated cart"
            );

            // Call callback with empty array if no non-deliverable products
            if (onNonDeliverableFound) {
              onNonDeliverableFound([]);
            }
          }
        } else {
          console.log("No items found in updated cart or cart is empty");
        }
      } catch (error) {
        console.error("Error getting fresh cart data:", error);
      }
    }, 1000); // Increased timeout to ensure data is refreshed
  }
}

/**
 * Store billing location (country and state only) in localStorage and refresh cart.
 * This function is used for billing address updates and doesn't check for delivery eligibility.
 */
function storeBillingLocationInLocalStorage(
  address: any,
  tenantSlug: string,
  queryClient?: any
): void {
  if (!tenantSlug || !address) return;

  const locationObj = {
    country: address.country || "",
    state: address.state || "",
    pincode: "",
  };

  // Store billing location with a different key
  localStorage.setItem(`${tenantSlug}_location`, JSON.stringify(locationObj));

  // If queryClient is provided, refresh cart
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    console.log("Cart refreshed after billing address selection");
  }
}

const Layout1: React.FC = () => {
  const queryClient = useQueryClient();
  const { cart, removeFromCart, isRemovingFromCart } = useCart();

  // Modal state for non-deliverable products
  const [showNonDeliverableModal, setShowNonDeliverableModal] = useState(false);
  const [nonDeliverableProducts, setNonDeliverableProducts] = useState<any[]>(
    []
  );
  const [pendingShippingAddressData, setPendingShippingAddressData] = useState<
    any | null
  >(null);
  const placeOrder = usePlaceOrder();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const { checkout_configuration } = useStoreConfig();
  React.useEffect(() => {
    console.log(
      "%c[Checkout Config]",
      "color: #4CAF50; font-weight: bold",
      checkout_configuration
    );
  }, [checkout_configuration]);
  const [userData, setUserData] = useState<{
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    isGuest?: boolean;
    customer_group?: {
      type: string;
      id: string;
      name: string;
    };
  } | null>(null);
  const [selectedFulfillmentMethod, setSelectedFulfillmentMethod] = useState<
    "home_delivery" | "in_store_pickup"
  >("home_delivery");
  const [fulfillmentMethodCompleted, setFulfillmentMethodCompleted] =
    useState<boolean>(false);
  const [selectedShippingAddress, setSelectedShippingAddress] =
    useState<Address | null>(null);
  // State for recipient details
  const [recipientDetails, setRecipientDetails] = useState<RecipientData>({
    fullName: "",
    phoneNumber: "",
  });
  const [selectedShippingMethod, setSelectedShippingMethod] =
    useState<string>("standard");
  // State for shipping method display data
  const [selectedShippingMethodData, setSelectedShippingMethodData] = useState<
    ShippingMethodDisplayData | undefined
  >(undefined);
  const [recipientDetailsCompleted, setRecipientDetailsCompleted] =
    useState<boolean>(false);

  // State for payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<"POD">("POD");
  // State for delivery preferences
  const [deliveryPreferences, setDeliveryPreferences] =
    useState<DeliveryPreferencesType>({
      preferredDate: null,
      deliveryInstructions: "",
    });
  const [deliveryPreferencesCompleted, setDeliveryPreferencesCompleted] =
    useState<boolean>(false);
  const [selectedBillingAddress, setSelectedBillingAddress] =
    useState<Address | null>(null);
  const [shippingAddressCompleted, setShippingAddressCompleted] =
    useState<boolean>(false);
  const [billingAddressCompleted, setBillingAddressCompleted] =
    useState<boolean>(false);
  const [showShippingSelector, setShowShippingSelector] =
    useState<boolean>(true);
  const [showBillingSelector, setShowBillingSelector] = useState<boolean>(true);
  // Initialize isAddressFormVisible as true for easier guest checkout experience
  const [isAddressFormVisible, setIsAddressFormVisible] =
    useState<boolean>(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false);
  const [showNewBillingAddressForm, setShowNewBillingAddressForm] =
    useState<boolean>(false);
  const [isBillingInEditMode, setIsBillingInEditMode] = useState<boolean>(false);
  const theme = useTheme();
  const params = useParams();
  const tenantId = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : params?.tenant || "";
  const tokenKey = `${tenantId}_access_token`;
  const userKey = tenantId ? `${tenantId}_auth_user` : "auth_user";
  // Function to prepare and log order payload
  const prepareOrderPayload = () => {
    try {
      const payload = {
        // Required by PlaceOrderPayload
        shippingAddress: selectedShippingAddress,
        billingAddress: selectedBillingAddress,
        fulfillment_details: selectedFulfillmentMethod,
        useShippingAsBilling:
          JSON.stringify(selectedShippingAddress) ===
          JSON.stringify(selectedBillingAddress),
        selectedShippingMethod: {
          id: selectedShippingMethod,
          name: selectedShippingMethodData?.name || "Standard Delivery",
          // Set a default price since it's not available in the ShippingMethodDisplayData
          price: 0,
          estimated_delivery_time:
            selectedShippingMethodData?.estimatedDelivery || "",
          days: selectedShippingMethodData?.days || "",
        },
        selectedPaymentMethod: {
          id: selectedPaymentMethod?.toLowerCase() || "cod",
          name:
            selectedPaymentMethod === "POD"
              ? "Pay on Delivery"
              : "Online Payment",
          type: selectedPaymentMethod === "POD" ? "cod" : "online",
        },
        payment_method_id: selectedPaymentMethod || "cod",
        delivery_preferences: deliveryPreferences,
        recipientDetails,
        pickupDetails,
        userDetails: {
          email: userData?.email || "",
          firstName: userData?.firstName || userData?.first_name || "",
          lastName: userData?.lastName || userData?.last_name || "",
          isGuest: userData?.isGuest || false,
        },
      };

      console.log("Order Payload:", JSON.stringify(payload, null, 2));
      return payload;
    } catch (error) {
      console.error("Error preparing order payload:", error);
      return null;
    }
  };

  // Add these state variables with your other state declarations in Layout1.tsx
  const [pickupDetails, setPickupDetails] = useState<PickupDetails | null>(
    null
  );
  const [pickupDetailsCompleted, setPickupDetailsCompleted] =
    useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize address hooks at the component level
  const { saveShippingAddress, saveBillingAddress } = useAddresses();

  // Check for token and user data on component mount and when currentStep changes
  useEffect(() => {
    if (!tenantId) return;

    // Check for authenticated token
    const authenticated = isAuthenticated();
    setHasToken(authenticated);
    console.log("Authentication status:", authenticated);

    // Define the guest user key
    const guestUserKey = tenantId ? `${tenantId}_guest_user` : "guest_user";
    console.log("Guest user key being checked:", guestUserKey);

    // Get user data from localStorage
    try {
      // First check for guest user data
      const guestUserDataStr = localStorage.getItem(guestUserKey);
      console.log("Raw guest user data:", guestUserDataStr);

      if (guestUserDataStr) {
        const guestUser = JSON.parse(guestUserDataStr);
        console.log("Guest user data found:", guestUser);
        setUserData(guestUser);

        // Since this is a guest user, we want to proceed to shipping step
        // and set address form as visible for the Continue button
        if (currentStep === 1) {
          setCurrentStep(2);
          setIsAddressFormVisible(true); // Always set this to true for guest users
        } else if (currentStep === 2 && guestUser.isGuest) {
          // Also ensure form visibility is set for guest users on step 2
          setIsAddressFormVisible(true);
        }
      } else {
        // Then try with tenant prefix for authenticated user
        const userDataStr = localStorage.getItem(userKey);
        console.log("Auth user key being checked:", userKey);
        console.log("Raw user data from localStorage:", userDataStr);

        if (userDataStr) {
          const user = JSON.parse(userDataStr);
          console.log("Parsed user data:", user);
          setUserData(user);
        } else {
          // Fallback to non-tenant specific key
          const fallbackUserData = localStorage.getItem("");
          console.log("Fallback user data:", fallbackUserData);

          if (fallbackUserData) {
            const user = JSON.parse(fallbackUserData);
            setUserData(user);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    // If authenticated, skip to next step
    if (authenticated && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [currentStep, tenantId, userKey]);

  // Handle proceed to next step from UserIdentification
  // This will only be called after a successful login or when creating a new account
  const handleUserIdentificationNext = () => {
    // Check authentication status and get user data immediately after login
    const authenticated = isAuthenticated();
    setHasToken(authenticated);

    // Get user data from localStorage
    try {
      // First try with tenant prefix
      const userDataStr = localStorage.getItem(userKey);

      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setUserData(user);
      } else {
        // Fallback to non-tenant specific key
        const fallbackUserData = localStorage.getItem("auth_user");

        if (fallbackUserData) {
          const user = JSON.parse(fallbackUserData);
          setUserData(user);
        }
      }

      // Set current step to show shipping address
      setCurrentStep(2);
    } catch (error) {
      console.error("Error parsing user data after login:", error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
      }}
    >
      {/* Box 1: Scrollable Content */}
      <Box
        sx={{
          width: "70%",
          minHeight: "100vh", // Fills 100% of the viewport height
          p: theme.spacing(5, 10, 10, 10), // Keep your padding
        }}
      >
        {/* Show different content based on current step */}
        {currentStep === 1 && !hasToken ? (
          <UserIdentification onNext={handleUserIdentificationNext} />
        ) : null}

        {/* Account section - simplified UI */}
        {/* Step 1: Account and Shipping Address */}
        {userData ? (
          <Box sx={{ width: "100%", mb: 4 }}>
            <Box
              sx={{
                borderTop: `2px solid ${theme.palette.grey[600]}`,
                pt: 2,
                pb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Account
                </Typography>
                <Box display="flex" gap={2}>
                  {userData.isGuest ? (
                    <Typography
                      variant="body2"
                      color="primary.main"
                      fontStyle="italic"
                    >
                      Guest checkout
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Name: {userData.first_name || userData.firstName}{" "}
                      {userData.last_name || userData.lastName}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Email: {userData.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            {checkout_configuration.fulfillment_type !== "none" && (
              <>
                {/* Shipping address section - always visible */}
                {selectedFulfillmentMethod === "home_delivery" && (
                  <>
                    <Box
                      sx={{
                        pb: 3,
                        pt: 2,
                        borderTop: `2px solid ${theme.palette.grey[600]}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            gutterBottom
                          >
                            Fulfilment Details
                          </Typography>
                          {shippingAddressCompleted && (
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              gutterBottom
                            >
                              {selectedFulfillmentMethod === "home_delivery"
                                ? "(Delivery)"
                                : "(Pickup)"}
                            </Typography>
                          )}
                        </Box>
                        {!shippingAddressCompleted && (
                          <RadioGroup
                            row
                            value={selectedFulfillmentMethod}
                            onChange={(e) => {
                              setSelectedFulfillmentMethod(
                                e.target.value as
                                  | "home_delivery"
                                  | "in_store_pickup"
                              );
                              setFulfillmentMethodCompleted(true);
                            }}
                            sx={{ gap: 3, ml: 2 }}
                          >
                            {(checkout_configuration.fulfillment_type ===
                              "both" ||
                              checkout_configuration.fulfillment_type ===
                                "delivery") && (
                              <FormControlLabel
                                value="home_delivery"
                                control={<Radio />}
                                label={"Delivery"}
                              />
                            )}
                            {(checkout_configuration.fulfillment_type ===
                              "both" ||
                              checkout_configuration.fulfillment_type ===
                                "store_pickup") && (
                              <FormControlLabel
                                value="in_store_pickup"
                                control={<Radio />}
                                label={
                                  checkout_configuration?.pickup_method_label
                                }
                              />
                            )}
                          </RadioGroup>
                        )}
                        {shippingAddressCompleted &&
                          selectedShippingAddress &&
                          !showShippingSelector && (
                            <Button
                              color="primary"
                              onClick={() => {
                                setShowShippingSelector(true);
                                setShippingAddressCompleted(false);
                                setBillingAddressCompleted(false);
                                setRecipientDetailsCompleted(false);
                              }}
                            >
                              Change
                            </Button>
                          )}
                      </Box>
                      <>
                        {/* Display compact address view when address is completed */}
                        {shippingAddressCompleted &&
                          selectedShippingAddress &&
                          !showShippingSelector && (
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                {selectedShippingAddress.full_name}
                              </Typography>

                              {/* Address details */}
                              <Typography variant="body2">
                                {selectedShippingAddress.address_line1},
                                {selectedShippingAddress.address_line2 &&
                                  ` ${selectedShippingAddress.address_line2},`}
                                {` ${selectedShippingAddress.city}, ${selectedShippingAddress.state} ${selectedShippingAddress.country} - ${selectedShippingAddress.postal_code}`}
                              </Typography>
                              <Typography variant="body1" fontWeight="bold">
                                Receiver Details
                              </Typography>
                              <Typography variant="body2">
                                {recipientDetails.fullName} •{" "}
                                {recipientDetails.phoneNumber}
                              </Typography>

                              {/* Display shipping method data */}
                              {selectedShippingMethodData && (
                                <>
                                  <Typography
                                    variant="body1"
                                    fontWeight="bold"
                                    sx={{ mt: 1 }}
                                  >
                                    Shipping Method
                                  </Typography>
                                  <Typography variant="body2" color="primary">
                                    {selectedShippingMethodData.name} (
                                    {selectedShippingMethodData.days})
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Est. delivery:{" "}
                                    {
                                      selectedShippingMethodData.estimatedDelivery
                                    }
                                  </Typography>
                                </>
                              )}
                            </Box>
                          )}

                        {/* Address Selection Logic - Simplified structure */}
                        {userData &&
                          (!shippingAddressCompleted || showShippingSelector) &&
                          // First check if addresses exist or if new address form is requested
                          (showNewAddressForm ? (
                            // Show the address form when Add New Address is clicked
                            <Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1 }}
                              >
                                SHIPPING ADDRESS
                              </Typography>
                              <ShippingAddressForm
                                formId="shipping-address-form"
                                isAuthenticated={true}
                                onSubmit={async (addressData) => {
                                  // Create a temporary address object with an ID
                                  const newAddress: Address = {
                                    ...addressData,
                                    id: `temp_${Date.now()}`,
                                    is_default: false,
                                    address_type: AddressType.SHIPPING,
                                  };

                                  // Store the selected address
                                  setSelectedShippingAddress(newAddress);
                                  if (newAddress) {
                                    // Use the selected shipping address data directly
                                    const addressData: ShippingAddressFormData =
                                      {
                                        full_name: newAddress.full_name || "",
                                        address_line1:
                                          newAddress.address_line1 || "",
                                        address_line2:
                                          newAddress.address_line2 || "",
                                        city: newAddress.city || "",
                                        state: newAddress.state || "",
                                        postal_code:
                                          newAddress.postal_code || "",
                                        country: newAddress.country || "",
                                        type: newAddress.type || "",
                                        business_name: newAddress.business_name,
                                        gst_number: newAddress.gst_number,
                                      };
                                    console.log(
                                      "Shipping address data:",
                                      addressData
                                    );
                                    setPendingShippingAddressData(addressData);

                                    // Store location in localStorage and refresh cart
                                    const tenantSlug =
                                      typeof window !== "undefined"
                                        ? window.location.pathname.split("/")[1]
                                        : "";
                                    if (tenantSlug) {
                                      storeLocationInLocalStorage(
                                        newAddress,
                                        tenantSlug,
                                        queryClient,
                                        cart,
                                        async (nonDeliverableItems) => {
                                          if (nonDeliverableItems.length > 0) {
                                            setNonDeliverableProducts(
                                              nonDeliverableItems
                                            );
                                            setShowNonDeliverableModal(true);
                                            // Don't proceed with form completion when non-deliverable products found
                                            return;
                                          }

                                          // Only proceed if no non-deliverable products
                                          if (isAuthenticated()) {
                                            try {
                                              console.log(
                                                "Saving shipping address:",
                                                addressData
                                              );
                                              await saveShippingAddress.mutateAsync(
                                                {
                                                  address_data: {
                                                    ...addressData,
                                                  },
                                                }
                                              );
                                            } catch (error) {
                                              console.error(
                                                "Error saving shipping address:",
                                                error
                                              );
                                              // Continue even if there's an error
                                            }
                                          }

                                          // Complete the form only if no non-deliverable products
                                          setShippingAddressCompleted(true);
                                          setShowShippingSelector(false);
                                          setShowNewAddressForm(false);
                                        }
                                      );
                                    } else {
                                      // No tenant slug, proceed normally
                                      if (isAuthenticated()) {
                                        try {
                                          await saveShippingAddress.mutateAsync(
                                            {
                                              address_data: {
                                                ...addressData,
                                              },
                                            }
                                          );
                                        } catch (error) {
                                          console.error(
                                            "Error saving shipping address:",
                                            error
                                          );
                                          // Continue even if there's an error
                                        }
                                      }
                                      setShippingAddressCompleted(true);
                                      setShowShippingSelector(false);
                                      setShowNewAddressForm(false);
                                    }
                                  }
                                }}
                              />
                              <RecipientDetailsForm
                                formId="recipient-details-form"
                                recipientDetails={recipientDetails}
                                selectedShippingMethod={selectedShippingMethod}
                                allow_user_select_shipping={
                                  checkout_configuration?.allow_user_select_shipping
                                }
                                onSubmit={(data) => {
                                  setRecipientDetails(data.recipientDetails);
                                  setSelectedShippingMethod(
                                    data.shippingMethod
                                  );
                                  setSelectedShippingMethodData(
                                    data.selectedMethodData
                                  );
                                  console.log(
                                    "jjjjjjjjjj",
                                    selectedShippingMethodData
                                  );
                                  setRecipientDetailsCompleted(true);
                                }}
                              />
                              {/* Buttons for Address Form */}
                              <Box
                                mt={2}
                                display="flex"
                                justifyContent="flex-end"
                                gap={2}
                              >
                                {!userData?.isGuest && (
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => {
                                      setShowNewAddressForm(false); // Return to selector view
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={async () => {
                                    // Submit both forms programmatically
                                    const shippingAddressForm =
                                      document.getElementById(
                                        "shipping-address-form"
                                      ) as HTMLFormElement;
                                    const recipientDetailsForm =
                                      document.getElementById(
                                        "recipient-details-form"
                                      ) as HTMLFormElement;

                                    if (
                                      shippingAddressForm &&
                                      recipientDetailsForm
                                    ) {
                                      // Create and dispatch submit events
                                      shippingAddressForm.dispatchEvent(
                                        new Event("submit", {
                                          cancelable: true,
                                          bubbles: true,
                                        })
                                      );
                                      recipientDetailsForm.dispatchEvent(
                                        new Event("submit", {
                                          cancelable: true,
                                          bubbles: true,
                                        })
                                      );

                                      // If delivery preferences are disabled, auto-complete them
                                      if (
                                        !checkout_configuration.enable_delivery_prefs
                                      ) {
                                        setDeliveryPreferencesCompleted(true);
                                      }
                                    }
                                  }}
                                >
                                  {checkout_configuration.enable_delivery_prefs
                                    ? "Continue to Delivery Preferences"
                                    : "Continue to Billing"}{" "}
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            // Show the address selector when not adding a new address
                            <>
                              <ShippingAddressSelector
                                onAddressSelected={(address) => {
                                  setSelectedShippingAddress(address);
                                }}
                                onFormVisibilityChange={(visible) => {
                                  setShowNewAddressForm(visible);
                                }}
                              />
                              <RecipientDetailsForm
                                formId="recipient-details-form"
                                recipientDetails={recipientDetails}
                                allow_user_select_shipping={
                                  checkout_configuration?.allow_user_select_shipping
                                }
                                selectedShippingMethod={selectedShippingMethod}
                                onSubmit={(data) => {
                                  setRecipientDetails(data.recipientDetails);
                                  setSelectedShippingMethod(
                                    data.shippingMethod
                                  );
                                  setSelectedShippingMethodData(
                                    data.selectedMethodData
                                  );
                                  setRecipientDetailsCompleted(true);
                                }}
                              />
                            </>
                          ))}

                        {/* Continue button - only show when not in form view */}
                        {!showNewAddressForm &&
                        !shippingAddressCompleted &&
                        (!userData?.isGuest ||
                          (userData?.isGuest && shippingAddressCompleted)) ? (
                          <Box
                            sx={{
                              mt: 3,
                              display: "flex",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              variant="contained"
                              color="primary"
                              form="recipient-details-form"
                              onClick={() => {
                                // Only execute this if we're not in form mode or new address form (forms have their own submit handler)
                                if (
                                  !isAddressFormVisible &&
                                  !showNewAddressForm &&
                                  selectedShippingAddress
                                ) {
                                  // Find and submit the recipient details form
                                  const recipientForm = document.getElementById(
                                    "recipient-details-form"
                                  ) as HTMLFormElement;
                                  if (recipientForm) {
                                    // Trigger form submission which will call the onSubmit handler
                                    recipientForm.dispatchEvent(
                                      new Event("submit", {
                                        cancelable: true,
                                        bubbles: true,
                                      })
                                    );

                                    // Only switch to compact view when Continue is clicked and form is valid
                                    if (recipientForm.checkValidity()) {
                                      const tenantSlug =
                                        typeof window !== "undefined"
                                          ? window.location.pathname.split(
                                              "/"
                                            )[1]
                                          : "";
                                      if (tenantSlug) {
                                        storeLocationInLocalStorage(
                                          selectedShippingAddress,
                                          tenantSlug,
                                          queryClient,
                                          cart,
                                          (nonDeliverableItems) => {
                                            if (
                                              nonDeliverableItems.length > 0
                                            ) {
                                              setNonDeliverableProducts(
                                                nonDeliverableItems
                                              );
                                              setShowNonDeliverableModal(true);
                                            } else {
                                              // No non-deliverable products, proceed normally
                                              setShippingAddressCompleted(true);
                                              setShowShippingSelector(false);
                                            }
                                          }
                                        );
                                      } else {
                                        // No tenant slug, proceed normally
                                        setShippingAddressCompleted(true);
                                        setShowShippingSelector(false);
                                      }
                                    }
                                  } else {
                                    // If no form, just continue
                                    setShippingAddressCompleted(true);
                                    setShowShippingSelector(false);
                                  }
                                }
                              }}
                            >
                              {checkout_configuration.enable_delivery_prefs
                                ? "Continue to Delivery Preferences"
                                : "Continue to Billing"}
                            </Button>
                          </Box>
                        ) : null}
                      </>
                    </Box>

                    {/* Delivery Preferences Section - Only visible when shipping address is completed and recipient details are completed */}
                    {checkout_configuration.enable_delivery_prefs && (
                      <>
                        <Box
                          sx={{
                            pt: 3,
                            pb: 3,
                            borderTop: `2px solid ${theme.palette.grey[600]}`,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight="bold"
                              gutterBottom
                            >
                              Delivery Preferences
                            </Typography>
                            {deliveryPreferencesCompleted && (
                              <Button
                                size="small"
                                onClick={() =>
                                  setDeliveryPreferencesCompleted(false)
                                }
                              >
                                Change
                              </Button>
                            )}
                          </Box>

                          {shippingAddressCompleted &&
                            recipientDetailsCompleted &&
                            !deliveryPreferencesCompleted && (
                              <>
                                <DeliveryPreferences
                                  preferences={deliveryPreferences}
                                  enable_preferred_date={
                                    checkout_configuration?.enable_preferred_date
                                  }
                                  enable_time_slots={
                                    checkout_configuration?.enable_time_slots
                                  }
                                  onChange={(newPreferences) => {
                                    setDeliveryPreferences(newPreferences);
                                    console.log(
                                      "Updated delivery preferences:",
                                      newPreferences
                                    );
                                  }}
                                />
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                      console.log(
                                        "[Layout1] Continue button clicked with delivery preferences:",
                                        deliveryPreferences
                                      );
                                      setDeliveryPreferencesCompleted(true);
                                    }}
                                  >
                                    Continue to Billing
                                  </Button>
                                </Box>
                              </>
                            )}

                          {/* Show summary when completed */}
                          {deliveryPreferencesCompleted && (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2" color="text.primary">
                                <strong>Delivery Date:</strong>{" "}
                                {deliveryPreferences.preferredDate
                                  ? new Date(
                                      deliveryPreferences.preferredDate
                                    ).toLocaleDateString()
                                  : "Any available date"}
                              </Typography>
                              {Array.isArray(
                                deliveryPreferences.preferredTimeSlots
                              ) &&
                                deliveryPreferences.preferredTimeSlots.length >
                                  0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.primary"
                                  >
                                    <strong>Time Slots:</strong>{" "}
                                    {deliveryPreferences.preferredTimeSlots
                                      .map(
                                        (slot) =>
                                          `${slot.name} (${slot.start_time} - ${slot.end_time})`
                                      )
                                      .join(", ")}
                                  </Typography>
                                )}
                              {deliveryPreferences.deliveryInstructions && (
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  <strong>Instructions:</strong>{" "}
                                  {deliveryPreferences.deliveryInstructions}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      </>
                    )}
                  </>
                )}
                {/* // After the fulfillment method section and before the billing &
            payment section */}
                {fulfillmentMethodCompleted &&
                  selectedFulfillmentMethod === "in_store_pickup" && (
                    <Box
                      sx={{
                        pb: 3,
                        borderBottom: `2px solid ${theme.palette.grey[600]}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            gutterBottom
                          >
                            Fulfilment Details
                          </Typography>
                          {pickupDetailsCompleted && (
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              gutterBottom
                            >
                              {selectedFulfillmentMethod === "in_store_pickup"
                                ? "(Pickup)"
                                : "(Delivery)"}
                            </Typography>
                          )}
                        </Box>
                        {pickupDetailsCompleted && (
                          <Button
                            size="small"
                            onClick={() => setPickupDetailsCompleted(false)}
                          >
                            Change
                          </Button>
                        )}
                        {!pickupDetailsCompleted && (
                          <RadioGroup
                            row
                            value={selectedFulfillmentMethod}
                            onChange={(e) => {
                              setSelectedFulfillmentMethod(
                                e.target.value as
                                  | "home_delivery"
                                  | "in_store_pickup"
                              );
                              setFulfillmentMethodCompleted(true);
                            }}
                            sx={{ gap: 3, ml: 2 }}
                          >
                            {(checkout_configuration.fulfillment_type ===
                              "both" ||
                              checkout_configuration.fulfillment_type ===
                                "delivery") && (
                              <FormControlLabel
                                value="home_delivery"
                                control={<Radio />}
                                label={"Delivery"}
                              />
                            )}
                            {(checkout_configuration.fulfillment_type ===
                              "both" ||
                              checkout_configuration.fulfillment_type ===
                                "store_pickup") && (
                              <FormControlLabel
                                value="in_store_pickup"
                                control={<Radio />}
                                label={
                                  checkout_configuration?.pickup_method_label
                                }
                              />
                            )}
                          </RadioGroup>
                        )}
                      </Box>

                      {!pickupDetailsCompleted ? (
                        <>
                          <PickupDetailsForm
                            formId="pickup-details-form"
                            onSubmit={(details) => {
                              console.log("Pickup details submitted:", details);
                              setPickupDetails(details);
                              setPickupDetailsCompleted(true);
                            }}
                            pickupDetails={pickupDetails || undefined}
                          />
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              mt: 2,
                            }}
                          >
                            <Button
                              variant="contained"
                              color="primary"
                              form="pickup-details-form"
                              type="submit"
                            >
                              Continue
                            </Button>
                          </Box>
                        </>
                      ) : (
                        // Show summary when completed
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {pickupDetails && (
                            <>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.5,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  <strong>Store:</strong>{" "}
                                  {pickupDetails.storeData?.name ||
                                    "Selected Store"}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  <strong>Address:</strong>{" "}
                                  {pickupDetails.storeData
                                    ? `${
                                        pickupDetails.storeData.address_line1
                                      }${
                                        pickupDetails.storeData.address_line2
                                          ? ", " +
                                            pickupDetails.storeData
                                              .address_line2
                                          : ""
                                      }, ${pickupDetails.storeData.city}, ${
                                        pickupDetails.storeData.state
                                      } - ${pickupDetails.storeData.pincode}`
                                    : "-"}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  <strong>Contact Person:</strong>{" "}
                                  {pickupDetails.storeData?.contact_person ||
                                    "-"}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  <strong>Pickup By:</strong>{" "}
                                  {pickupDetails.pickupPerson === "myself"
                                    ? "Myself"
                                    : `Someone else (${
                                        pickupDetails.name || "-"
                                      }, ${pickupDetails.contact || "-"})`}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
              </>
            )}
            {/* Billing Address Section */}
            <Box
              sx={{
                pt: 3,
                pb: 3,
                borderTop: `2px solid ${theme.palette.grey[600]}`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Billing Address
                </Typography>
                {billingAddressCompleted &&
                  selectedBillingAddress &&
                  !showBillingSelector && (
                    <Button
                      color="primary"
                      onClick={() => {
                        setShowBillingSelector(true);
                        setBillingAddressCompleted(false);
                      }}
                    >
                      Change
                    </Button>
                  )}
              </Box>

              {/* Display compact billing address view when address is completed */}
              {billingAddressCompleted &&
                selectedBillingAddress &&
                !showBillingSelector && (
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedBillingAddress.full_name ||
                        selectedBillingAddress.fullName}{" "}
                    </Typography>
                    <Typography variant="body2">
                      {selectedBillingAddress.address_line1 ||
                        selectedBillingAddress.addressLine1}
                      ,
                      {(selectedBillingAddress.address_line2 ||
                        selectedBillingAddress.addressLine2) &&
                        ` ${
                          selectedBillingAddress.address_line2 ||
                          selectedBillingAddress.addressLine2
                        },`}
                      {` ${selectedBillingAddress.city}, ${
                        selectedBillingAddress.state
                      } ${selectedBillingAddress.country} - ${
                        selectedBillingAddress.postal_code ||
                        selectedBillingAddress.postalCode
                      }`}
                    </Typography>
                  </Box>
                )}

              {/* Show billing address form or selector based on state */}
              {(checkout_configuration.fulfillment_type === "none" ||
                (selectedFulfillmentMethod === "home_delivery" &&
                  shippingAddressCompleted &&
                  (deliveryPreferencesCompleted ||
                    !checkout_configuration.enable_delivery_prefs)) ||
                (selectedFulfillmentMethod === "in_store_pickup" &&
                  pickupDetailsCompleted)) &&
                (!billingAddressCompleted || showBillingSelector) &&
                (showNewBillingAddressForm ? (
                  // Show the shipping address form for adding a new billing address
                  <Box>
                    <ShippingAddressForm
                      formId="billing-address-form"
                      isAuthenticated={hasToken}
                      onSubmit={async (newAddress: ShippingAddressFormData) => {
                        // Clone the address but set it as a billing address
                        const billingAddress = {
                          ...newAddress,
                          address_type: AddressType.BILLING,
                        };
                        // Store the selected address first
                        setSelectedBillingAddress(billingAddress);
                        console.log("billingAddress", billingAddress);
                        if (billingAddress) {
                          // Use the selected shipping address data directly
                          const addressData: ShippingAddressFormData = {
                            full_name: billingAddress.full_name || "",
                            address_line1: billingAddress.address_line1 || "",
                            address_line2: billingAddress.address_line2 || "",
                            city: billingAddress.city || "",
                            state: billingAddress.state || "",
                            postal_code: billingAddress.postal_code || "",
                            country: billingAddress.country || "",
                            type: billingAddress.type || "",
                            business_name: billingAddress.business_name,
                            gst_number: billingAddress.gst_number,
                          };
                          console.log("72929", addressData);
                          // First call the billing location function
                          const tenantSlug =
                            typeof window !== "undefined"
                              ? window.location.pathname.split("/")[1]
                              : "";
                          if (tenantSlug && addressData) {
                            storeBillingLocationInLocalStorage(
                              addressData,
                              tenantSlug,
                              queryClient
                            );
                          }

                          // Call save shipping address using the hook
                          if (isAuthenticated()) {
                            try {
                              await saveBillingAddress.mutateAsync({
                                address_data: {
                                  ...addressData,
                                },
                              });
                            } catch (error) {
                              console.error(
                                "Error saving shipping address:",
                                error
                              );
                              // Continue even if there's an error
                            }
                          }
                        }
                        setBillingAddressCompleted(true);
                        setShowBillingSelector(false);
                        setShowNewBillingAddressForm(false);
                      }}
                    />
                    {userData?.customer_group?.type !== "BUSINESS" && (
                      <GstDetailsForm
                        onSubmit={(gstDetails) => {
                          console.log("GST Details submitted:", gstDetails);
                          // Handle GST details submission
                        }}
                      />
                    )}
                    {/* Buttons for Address Form */}
                    <Box
                      mt={2}
                      display="flex"
                      justifyContent="flex-end"
                      gap={2}
                    >
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          setShowNewBillingAddressForm(false); // Return to selector view
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        form="billing-address-form"
                        type="submit"
                      >
                        Continue to Payment
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <BillingAddressSelector
                      onAddressSelected={(address, isFormSubmission) => {
                        // Ensure we update the address in state immediately
                        setSelectedBillingAddress(address);
                        console.log("Selected billing address:", address);

                        // Auto-complete if this is a form submission or a temp address
                        if (
                          isFormSubmission ||
                          (address.id &&
                            typeof address.id === "string" &&
                            address.id.startsWith("temp_"))
                        ) {
                          console.log(
                            "Form submission or new address detected, auto-completing billing section"
                          );
                          // Auto-complete the section for newly added addresses
                          setBillingAddressCompleted(true);

                          setShowBillingSelector(false);
                        }
                        // Otherwise wait for the Continue button
                      }}
                      onFormVisibilityChange={(visible) => {
                        setShowNewBillingAddressForm(visible);
                      }}
                      onEditModeChange={(isEditing) => {
                        setIsBillingInEditMode(isEditing);
                      }}
                      selectedAddressId={selectedBillingAddress?.id}
                      shippingAddress={selectedShippingAddress || undefined}
                      isAuthenticated={hasToken}
                      selectedFulfillmentMethod={selectedFulfillmentMethod}
                    />
                    {userData?.customer_group?.type !== "BUSINESS" && (
                      <GstDetailsForm
                        onSubmit={(gstDetails) => {
                          console.log("GST Details submitted:", gstDetails);
                          // Handle GST details submission
                        }}
                      />
                    )}
                  </>
                ))}

              {/* Continue to Payment button for Billing section - Only show when billing is not completed and not showing new address form and not in edit mode */}
              {!billingAddressCompleted &&
                !showNewBillingAddressForm &&
                !isBillingInEditMode &&
                (checkout_configuration.fulfillment_type === "none" ||
                  (selectedFulfillmentMethod === "home_delivery" &&
                    shippingAddressCompleted &&
                    (deliveryPreferencesCompleted ||
                      !checkout_configuration.enable_delivery_prefs)) ||
                  (selectedFulfillmentMethod === "in_store_pickup" &&
                    pickupDetailsCompleted)) &&
                selectedBillingAddress && (
                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        // First call the billing location function
                        const tenantSlug =
                          typeof window !== "undefined"
                            ? window.location.pathname.split("/")[1]
                            : "";
                        if (tenantSlug && selectedBillingAddress) {
                          storeBillingLocationInLocalStorage(
                            selectedBillingAddress,
                            tenantSlug,
                            queryClient
                          );
                        }

                        // Then set completion states
                        setBillingAddressCompleted(true);
                        setShowBillingSelector(false);
                        // Show the payment section by scrolling to it
                        const paymentSection =
                          document.getElementById("payment-section");
                        if (paymentSection) {
                          paymentSection.scrollIntoView({ behavior: "smooth" });
                        }
                        console.log(
                          "Billing address completed",
                          selectedBillingAddress
                        );
                      }}
                    >
                      Continue to Payment
                    </Button>
                  </Box>
                )}
            </Box>

            {/* Separate Payment Section */}
            <Box
              id="payment-section"
              sx={{
                pt: 3,
                pb: 3,
                borderTop: `2px solid ${theme.palette.grey[600]}`,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Payment Method
              </Typography>

              {/* Payment Method Selector */}
              <Box sx={{ mt: 2 }}>
                {billingAddressCompleted && (
                  <PaymentMethodSelector
                    onPaymentMethodSelected={(method) => {
                      console.log("Selected payment method:", method);
                      setSelectedPaymentMethod(method);
                    }}
                    selectedMethod={selectedPaymentMethod}
                    onPlaceOrder={() => {
                      // This is now handled by the separate Place Order button below
                    }}
                  />
                )}
              </Box>

              {/* Place Order button for Payment section only */}
              {(checkout_configuration.fulfillment_type === "none" ||
                (selectedFulfillmentMethod === "home_delivery" &&
                  shippingAddressCompleted &&
                  (deliveryPreferencesCompleted ||
                    !checkout_configuration.enable_delivery_prefs)) ||
                (selectedFulfillmentMethod === "in_store_pickup" &&
                  pickupDetailsCompleted)) &&
                selectedBillingAddress &&
                billingAddressCompleted && (
                  <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={
                        !selectedBillingAddress || !selectedPaymentMethod
                      }
                      onClick={() => {
                        try {
                          // Prepare and log the order payload
                          const payload = prepareOrderPayload();
                          if (payload) {
                            console.log(
                              "Placing order with payload:",
                              JSON.stringify(payload, null, 2)
                            );
                            placeOrder.mutate(payload);
                          }
                        } catch (error) {
                          console.error("Error in place order handler:", error);
                          // Handle any unexpected errors
                        }
                      }}
                    >
                      Place Order
                    </Button>
                  </Box>
                )}
            </Box>
          </Box>
        ) : null}
        {/* Account login step for non-authenticated users */}
      </Box>

      {/* Box 2: Static Content */}
      <Box
        sx={{
          position: "fixed",
          top: 52,
          right: 0,
          width: "30%",
          height: "100vh", // Fills 100% of the viewport height
          p: theme.spacing(5),
          backgroundColor: theme.palette.background.default,
          overflowY: "auto", // Add scrollbar if summary content is very tall
          boxSizing: "border-box", // Ensures padding is included in the height
        }}
      >
        <OrderSummary />
      </Box>
      {/* Non-deliverable Products Modal */}
      <Dialog
        open={showNonDeliverableModal}
        onClose={() => setShowNonDeliverableModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Products Not Available for Delivery
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The following products cannot be delivered to your selected
            location:
          </Typography>
        </DialogTitle>
        <DialogContent>
          {nonDeliverableProducts.map((item, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.primary">
                {item.product_details?.name || "Unknown Product"}{" "}
                <span style={{ color: "#d32f2f", fontWeight: 500 }}>
                  Quantity: {item.quantity || 1}
                </span>
              </Typography>
            </Box>
          ))}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              These products will be removed from your cart to continue with
              checkout. You can add them back later or choose a different
              delivery location.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowNonDeliverableModal(false)}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log(
                "Removing non-deliverable products:",
                nonDeliverableProducts
              );
              // Remove each non-deliverable product from cart
              nonDeliverableProducts.forEach((product) => {
                if (!isRemovingFromCart) {
                  removeFromCart(product.id);
                }
              });
              setShowNonDeliverableModal(false);
              // Complete the checkout step
              setShippingAddressCompleted(true);
              setShowShippingSelector(false);
              // Also handle new address form if it was open
              if (showNewAddressForm) {
                setShowNewAddressForm(false);
                console.log("New address form closed");
                if (pendingShippingAddressData && isAuthenticated()) {
                  try {
                    saveShippingAddress.mutateAsync({
                      address_data: {
                        ...pendingShippingAddressData,
                      },
                    });
                  } catch (error) {
                    console.error(
                      "Error saving shipping address (modal):",
                      error
                    );
                    // Continue even if there's an error
                  }
                }
              }
            }}
            variant="contained"
            color="primary"
            disabled={isRemovingFromCart}
          >
            Remove Products & Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout1;
