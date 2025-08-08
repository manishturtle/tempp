"""
URL configuration for Order Management API.

This module defines the URL patterns for the Order Management API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from order_management.products.views import ProductListView, ProductDetailViewSet

from order_management.cart.views import CartViewSet
from order_management.api.views import (
    # ProductViewSet,
    WishlistViewSet,
    CheckoutAddressViewSet,
    CheckoutShippingViewSet,
    CheckoutPaymentViewSet,
    PaymentCallbackView,
    UserProfileView,
    ReturnInitiationView,
    WalletViewSet,
    WalletRechargeInitiationView,
    LoyaltyInfoViewSet,
    CustomerUserManagementViewSet,
    TenantConfigurationView,
    AdminReportingView,
    AdminRMAViewSet,
    FulfillmentUpdateView,
    GuestReturnInitiationView,
    StorePickupViewSet,
    TimeSlotViewSet,
    ShippingMethodViewSet,
    StoreShippingMethodViewSet,
    StoreTimeSlotViewSet,
    PublicStorePickupViewSet,
    CheckoutConfigurationViewSet,
    UITemplateSettingsViewSet,
    FeatureToggleSettingsViewSet,
    GuestConfigViewSet
)

from order_management.api.combined_config_views import (
    CombinedConfigurationView
)

from order_management.api.order_views import (
    GuestOrderDetailView,
    OrderViewSet,
    GuestOrderViewSet,
    OrderItemViewSet,
    OrderHistoryViewSet,
    AdminOrderViewSet,
)

# Set the application namespace
app_name = "order_management_api"

# Create a router and register viewsets
router = DefaultRouter()
# router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"guest/orders", GuestOrderViewSet, basename="guest-order")
router.register(r"order-items", OrderItemViewSet, basename="orderitem")
router.register(r"wishlist", WishlistViewSet, basename="wishlist")
router.register(r"order-history", OrderHistoryViewSet, basename="order-history")
router.register(r"account/wallet", WalletViewSet, basename="wallet")
router.register(r"account/loyalty", LoyaltyInfoViewSet, basename="loyalty")
router.register(
    r"account/manage-users", CustomerUserManagementViewSet, basename="manage-users"
)
router.register(r"admin/orders", AdminOrderViewSet, basename="admin-order")
router.register(r"admin/returns", AdminRMAViewSet, basename="admin-rma")
router.register(r"storepickup", StorePickupViewSet)
router.register(r"timeslots", TimeSlotViewSet, basename="timeslot")
router.register(r"shipping-methods", ShippingMethodViewSet, basename="shipping-method")
router.register(
    r"store-shipping-methods",
    StoreShippingMethodViewSet,
    basename="store-shipping-method",
)
router.register(r"store-timeslots", StoreTimeSlotViewSet, basename="store-timeslot")
router.register(
    r"store-pickup-locations",
    PublicStorePickupViewSet,
    basename="store-pickup-location",
)
router.register(r'checkout-configs', CheckoutConfigurationViewSet, basename='checkout-config')
router.register(r'guest-config', GuestConfigViewSet, basename='guest-config')
router.register(r'UITemplateSettingsViewSet', UITemplateSettingsViewSet, basename='ui-template-settings')
router.register(r'feature-toggle-settings', FeatureToggleSettingsViewSet, basename='feature-toggle-settings')

# URL patterns for the API
urlpatterns = [
    path("", include(router.urls)),
    # Admin reporting endpoint
    path(
        "admin/reports/summary/",
        AdminReportingView.as_view(),
        name="admin-report-summary",
    ),
    # Cart endpoints
    path("cart/", CartViewSet.as_view({"get": "get_cart"}), name="cart-detail"),
    path(
        "cart/items/", CartViewSet.as_view({"post": "add_item"}), name="cart-add-item"
    ),
    path(
        "cart/items/<int:item_pk>/",
        CartViewSet.as_view({"put": "update_item", "delete": "remove_item"}),
        name="cart-item-detail",
    ),
    # Clear cart endpoint
    path("cart/clear/", CartViewSet.as_view({"post": "clear_cart"}), name="cart-clear"),
    # Guest order access endpoints
    path(
        "guest/order/<uuid:guest_access_token>/",
        GuestOrderDetailView.as_view(),
        name="guest-order-by-token",
    ),
    # Explicitly add guest order detail endpoint
    path(
        "guest/orders/<int:pk>/",
        GuestOrderViewSet.as_view({"get": "retrieve"}),
        name="guest-order-detail",
    ),
    # Checkout address endpoints
    path(
        "checkout/addresses/",
        CheckoutAddressViewSet.as_view({"get": "list_saved_addresses"}),
        name="checkout-addresses",
    ),
    path(
        "checkout/shipping-address/",
        CheckoutAddressViewSet.as_view({"post": "set_shipping_address"}),
        name="checkout-shipping-address",
    ),
    path(
        "checkout/billing-address/",
        CheckoutAddressViewSet.as_view({"post": "set_billing_address"}),
        name="checkout-billing-address",
    ),
    path(
        "checkout/update-address/",
        CheckoutAddressViewSet.as_view({"patch": "update_address"}),
        name="checkout-update-address",
    ),
    # Checkout shipping endpoints
    path(
        "checkout/shipping-methods/",
        CheckoutShippingViewSet.as_view({"get": "get_shipping_methods"}),
        name="checkout-shipping-methods",
    ),
    path(
        "checkout/shipping-method/",
        CheckoutShippingViewSet.as_view({"post": "select_shipping_method"}),
        name="checkout-select-shipping-method",
    ),
    # Checkout payment endpoints
    path(
        "checkout/payment-methods/",
        CheckoutPaymentViewSet.as_view({"get": "get_payment_methods"}),
        name="checkout-payment-methods",
    ),
    path(
        "checkout/initiate-payment/",
        CheckoutPaymentViewSet.as_view({"post": "initiate_payment"}),
        name="checkout-initiate-payment",
    ),
    path(
        "checkout/payment-callback/",
        CheckoutPaymentViewSet.as_view({"get": "payment_callback"}),
        name="payment-callback",
    ),
    # Payment webhook callback endpoint
    path(
        "payment-callback/webhook/",
        PaymentCallbackView.as_view(),
        name="payment-callback-webhook",
    ),
    # Fulfillment webhook callback endpoint
    path(
        "callbacks/fulfillment/",
        FulfillmentUpdateView.as_view(),
        name="fulfillment-callback",
    ),
    # Returns endpoints
    path("returns/initiate/", ReturnInitiationView.as_view(), name="return-initiate"),
    # Guest Return Initiation endpoint
    path(
        "guest/returns/initiate/<uuid:guest_access_token>/",
        GuestReturnInitiationView.as_view(),
        name="guest-return-initiate",
    ),
    # User profile endpoint
    path("account/profile/", UserProfileView.as_view(), name="user-profile"),
    # Wallet recharge endpoint
    path(
        "account/wallet/recharge/initiate/",
        WalletRechargeInitiationView.as_view(),
        name="wallet-recharge-initiate",
    ),
    # Tenant Admin Configuration endpoint
    path(
        "admin/configuration/",
        TenantConfigurationView.as_view(),
        name="tenant-configuration",
    ),
    path("storefront/products/", ProductListView.as_view(), name="storefront-products"),
    path("storefront/product-details/<str:sku>/", ProductDetailViewSet.as_view({'get': 'retrieve'}), name="storefront-product-details"),
    # Combined configuration endpoint
    path(
        "combined-config/",
        CombinedConfigurationView.as_view(),
        name="combined-configuration",
    ),
]
