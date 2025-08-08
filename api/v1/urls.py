"""URL configuration for API v1.

This module defines the URL patterns for version 1 of the API,
including router registration for all viewsets and direct path registrations.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from order_management.api.combined_config_views import CombinedConfigurationView
from payment_method.views import PaymentMethodViewSet, StorePaymentMethodViewSet
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

# Create a router for API viewsets
router = DefaultRouter()

# Register viewsets with the router here
from customers.views import (
    AccountViewSet,
    ContactViewSet,
    CustomerGroupViewSet,
    AddressViewSet,
    GuestAccountViewSet,
    CustomerGroupSellingChannelFilteredView,
    ContactListAPIView,
    CustomerGroupSellingChannelSegmentView,
    WebSellingChannelSegmentsView,
    CustomerGroupSellingChannelInternalReadOnlyViewSet,
)
from ecomm_auth.views import EcommUserViewSet, EcommNewSignupView
from activities.views import TaskViewSet, ActivityViewSet
from products.views import (
    ProductViewSet,
    ProductImageViewSet,
    ProductVariantViewSet,
    KitComponentViewSet,
)
from site_config.views import HeaderConfigurationView, AdminHeaderConfigurationView

from pages.views import (
    LandingPageView,
    AdminLandingPageViewSet,
    AdminContentBlockViewSet,
    BatchProductsView,
)
from products.catalogue.views import (
    ActiveDivisionHierarchyView,
    CategoryCustomerGroupSellingChannelsView,
)

from order_management.cart.views import CartViewSet
from order_management.api.views import (
    # ProductViewSet as OMProductViewSet,
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
    StorePickupViewSet,
    TimeSlotViewSet,
    ShippingMethodViewSet,
    StoreShippingMethodViewSet,
    StoreTimeSlotViewSet,
    PublicStorePickupViewSet,
    CheckoutConfigurationViewSet,
    UITemplateSettingsViewSet,
    FeatureToggleSettingsViewSet,
    GuestConfigViewSet,
)

from order_management.api.order_views import (
    GuestOrderViewSet,
    OrderViewSet,
    OrderItemViewSet,
    OrderHistoryViewSet,
    AdminOrderViewSet,
)

from opportunities.views import LookupDataViewSet

# Import invoices URLs
from invoices import urls as invoices_urls
from order_management.products.views import ProductListView, ProductDetailViewSet
from opportunities import urls as opportunities_urls
from shipping_zones import urls as shipping_zones_urls

# Customer app viewsets
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"contacts", ContactViewSet, basename="contact")
router.register(r"customer-groups", CustomerGroupViewSet, basename="customer-group")
# Addresses will be accessed through a direct path pattern
# rather than through the router to properly handle the tenant slug

# E-commerce auth viewsets
router.register(r"ecomm-users", EcommUserViewSet, basename="ecomm-user")

# Activities viewsets
router.register(r"activities", ActivityViewSet, basename="activity")
router.register(r"tasks", TaskViewSet, basename="task")

# Payment Method viewsets
router.register(r"payment-methods", PaymentMethodViewSet, basename="payment-method")

# Products viewsets
router.register(r"products", ProductViewSet, basename="product")
router.register(r"products/images", ProductImageViewSet, basename="product-image")
router.register(r"products/variants", ProductVariantViewSet, basename="product-variant")
router.register(
    r"products/kit-components", KitComponentViewSet, basename="product-kitcomponent"
)

# Order Management viewsets
# router.register(r"om/products", OMProductViewSet, basename="om-product")
router.register(r"om/orders", OrderViewSet, basename="om-order")
router.register(
    r"<slug:tenant_slug>/om/guest/orders", GuestOrderViewSet, basename="om-guest-order"
)
# Checkout Configuration viewset registration
router.register(
    r"checkout-configs", CheckoutConfigurationViewSet, basename="checkout-config"
)
# UI Template Settings viewset registration
router.register(
    r"ui-template-settings", UITemplateSettingsViewSet, basename="ui-template-settings"
)
# Feature Toggle Settings viewset registration
router.register(
    r"feature-toggle-settings",
    FeatureToggleSettingsViewSet,
    basename="feature-toggle-settings",
)
router.register(r"guest-config", GuestConfigViewSet, basename="guest-config")

router.register(r"om/order-items", OrderItemViewSet, basename="om-orderitem")
router.register(
    r"<slug:tenant_slug>/om/wishlist", WishlistViewSet, basename="om-wishlist"
)
router.register(r"om/order-history", OrderHistoryViewSet, basename="om-order-history")
router.register(r"om/account/wallet", WalletViewSet, basename="om-wallet")
router.register(r"om/account/loyalty", LoyaltyInfoViewSet, basename="om-loyalty")
router.register(
    r"om/account/manage-users",
    CustomerUserManagementViewSet,
    basename="om-manage-users",
)
router.register(r"om/admin/orders", AdminOrderViewSet, basename="om-admin-order")
router.register(r"om/admin/returns", AdminRMAViewSet, basename="om-admin-rma")

# Pages admin viewsets
router.register(
    r"pages/admin/pages", AdminLandingPageViewSet, basename="admin-landing-page"
)
router.register(
    r"pages/admin/content-blocks",
    AdminContentBlockViewSet,
    basename="admin-content-block",
)
router.register(
    r'customer-group-selling-channels',
    CustomerGroupSellingChannelInternalReadOnlyViewSet,
    basename='customer-group-selling-channels'
)
# Import the image upload and delete views
from pages.views import LandingPageImageUploadView, LandingPageImageDeleteView

# URL patterns for API v1
urlpatterns = [
    # Onboarding endpoints - requires super admin access
    path("onboarding/", include("onboarding.urls", namespace="onboarding")),
    # Dynamic tenant-specific endpoints
    path(
        "<slug:tenant_slug>/addresses/",
        AddressViewSet.as_view({"get": "list", "post": "create"}),
        name="tenant-addresses-list",
    ),
    path(
        "<slug:tenant_slug>/addresses/my-addresses/",
        AddressViewSet.as_view({"get": "my_addresses"}),
        name="my-addresses",
    ),
    path(
        "<slug:tenant_slug>/addresses/<int:pk>/",
        AddressViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="tenant-addresses-detail",
    ),
    # Combined configuration endpoint for tenant
    path(
        "<slug:tenant_slug>/combined-config/",
        CombinedConfigurationView.as_view(),
        name="tenant-combined-config",
    ),
    # Guest accounts endpoint
    path(
        "<slug:tenant_slug>/guest/accounts",
        GuestAccountViewSet.as_view({"post": "create"}),
        name="guest-account-create",
    ),
    path(
        "<slug:tenant_slug>/customer-group-selling-channel-filtered/",
        CustomerGroupSellingChannelFilteredView.as_view(),
        name="customer-group-selling-channel-filtered",
    ),
    path(
        "<slug:tenant_slug>/customer-group-selling-channel-segment/",
        CustomerGroupSellingChannelSegmentView.as_view(),
        name="customer-group-selling-channel-segment",
    ),
    path(
        "<slug:tenant_slug>/web-selling-channel-segments/",
        WebSellingChannelSegmentsView.as_view(),
        name="web-selling-channel-segments",
    ),
    path(
        "<slug:tenant_slug>/contacts/",
        ContactListAPIView.as_view(),
        name="contact-list",
    ),
    # Include router URLs
    path("", include(router.urls)),
    # Shipping Zones
    path(
        "shipping/",
        include((shipping_zones_urls, "shipping_zones"), namespace="shipping-zones"),
    ),
    # Invoices endpoints
    path("", include((invoices_urls, "invoices"), namespace="invoices")),
    path(
        "<slug:tenant_slug>/opportunities/",
        include((opportunities_urls, "opportunities"), namespace="opportunities"),
    ),
    # Image upload endpoint for landing pages
    path(
        "pages/admin/upload-image/",
        LandingPageImageUploadView.as_view(),
        name="admin-upload-image",
    ),
    # Image delete endpoint for landing pages
    path(
        "pages/admin/delete-image/",
        LandingPageImageDeleteView.as_view(),
        name="landing-page-image-delete",
    ),
    # Storepickup endpoints
    path(
        "store-pickup/",
        StorePickupViewSet.as_view({"get": "list", "post": "create"}),
        name="store-pickup-list",
    ),
    # Customer group selling channels endpoint
    path(
        "exclusions-channels/",
        CategoryCustomerGroupSellingChannelsView.as_view(),
        name="category-customer-group-selling-channels",
    ),
    path(
        "store-pickup/<int:pk>/",
        StorePickupViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="store-pickup-detail",
    ),
    # Timeslots endpoints
    path(
        "timeslots/",
        TimeSlotViewSet.as_view({"get": "list", "post": "create"}),
        name="timeslots-list",
    ),
    path(
        "timeslots/<int:pk>/",
        TimeSlotViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="timeslots-detail",
    ),
    # GuestConfig direct endpoints
    path(
        "guest-config/",
        GuestConfigViewSet.as_view({"get": "list", "post": "create"}),
        name="guest-config-list-create",
    ),
    path(
        "guest-config/<int:pk>/",
        GuestConfigViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy"
        }),
        name="guest-config-detail",
    ),
    path(
        "guest-config/bulk-update/",
        GuestConfigViewSet.as_view({"patch": "bulk_update_action"}),
        name="guest-config-bulk-update",
    ),
    # Shipping Methods
    path(
        "shipping-methods/",
        ShippingMethodViewSet.as_view({"get": "list", "post": "create"}),
        name="shipping-method-list",
    ),
    path(
        "shipping-methods/<int:pk>/",
        ShippingMethodViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="shipping-method-detail",
    ),
    # Auth endpoints
    path(
        "auth/new-signup/<str:tenant_slug>/",
        EcommNewSignupView.as_view(),
        name="auth-new-signup",
    ),
    # Alternative: Include all auth URLs from ecomm_auth.urls
    # path('auth/', include('ecomm_auth.urls', namespace='auth')),
    # Schema URLs for API documentation
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "schema/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path(
        "<slug:tenant_slug>/shared/",
        include("shared.urls"),
    ),
    path(
        "<slug:tenant_slug>/lookup-data/",
        include(
            [
                path(
                    "accounts/",
                    LookupDataViewSet.as_view({"get": "get_accounts"}),
                    name="lookup-accounts",
                ),
                path(
                    "contacts/",
                    LookupDataViewSet.as_view({"get": "get_contacts"}),
                    name="lookup-contacts",
                ),
                path(
                    "staff-users/",
                    LookupDataViewSet.as_view({"get": "get_staff_users"}),
                    name="lookup-staff-users",
                ),
                path(
                    "contact-addresses/",
                    LookupDataViewSet.as_view({"get": "get_contact_addresses"}),
                    name="lookup-contact-addresses",
                ),
                path(
                    "selling-channels/",
                    LookupDataViewSet.as_view({"get": "get_selling_channels"}),
                    name="lookup-selling-channels",
                ),
                path(
                    "tax-rates/",
                    LookupDataViewSet.as_view({"get": "get_tax_rates"}),
                    name="lookup-tax-rates",
                ),
                path(
                    "payment-methods/",
                    LookupDataViewSet.as_view({"get": "get_payment_methods"}),
                    name="lookup-payment-methods",
                ),
            ]
        ),
    ),
]

# Add guest account endpoint to urlpatterns
urlpatterns += [
    path(
        "<slug:tenant_slug>/guest/accounts/",
        GuestAccountViewSet.as_view({"post": "create"}),
        name="guest-accounts",
    ),
    path(
        "<slug:tenant_slug>/store-payment-methods/",
        StorePaymentMethodViewSet.as_view({"get": "list"}),
        name="store-payment-methods",
    ),
]

# Order Management non-viewset endpoints
urlpatterns += [
    # Admin reporting endpoint
    path(
        "om/admin/reports/summary/",
        AdminReportingView.as_view(),
        name="om-admin-report-summary",
    ),
    path(
        "<slug:tenant_slug>/om/storefront/products/",
        ProductListView.as_view(),
        name="storefront-products",
    ),
    path(
        "<slug:tenant_slug>/om/storefront/product-details/<str:sku>/",
        ProductDetailViewSet.as_view({"get": "retrieve"}),
        name="storefront-product-details",
    ),
    # Cart endpoints
    path(
        "<slug:tenant_slug>/om/cart/",
        CartViewSet.as_view({"get": "get_cart"}),
        name="om-cart-detail",
    ),
    # ... (rest of the code remains the same)
    path(
        "<slug:tenant_slug>/om/shipping-method/",
        StoreShippingMethodViewSet.as_view({"get": "list"}),
        name="store-shipping-methods",
    ),
    path(
        "<slug:tenant_slug>/om/timeslot/",
        StoreTimeSlotViewSet.as_view({"get": "list"}),
        name="om-timeslots",
    ),
    path(
        "<slug:tenant_slug>/om/storepickups/",
        PublicStorePickupViewSet.as_view({"get": "list"}),
        name="store-pickup-locations",
    ),
    path(
        "<slug:tenant_slug>/om/cart/items/",
        CartViewSet.as_view({"post": "add_item"}),
        name="om-cart-add-item",
    ),
    path(
        "<slug:tenant_slug>/om/cart/items/<int:item_pk>/",
        CartViewSet.as_view({"put": "update_item", "delete": "remove_item"}),
        name="om-cart-item-detail",
    ),
    path(
        "<slug:tenant_slug>/om/cart/clear/",
        CartViewSet.as_view({"post": "clear_cart"}),
        name="om-cart-clear",
    ),
    # Checkout address endpoints
    path(
        "<slug:tenant_slug>/om/checkout/addresses/",
        CheckoutAddressViewSet.as_view({"get": "list_saved_addresses"}),
        name="om-checkout-addresses",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/shipping-address/",
        CheckoutAddressViewSet.as_view({"post": "set_shipping_address"}),
        name="om-checkout-shipping-address",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/billing-address/",
        CheckoutAddressViewSet.as_view({"post": "set_billing_address"}),
        name="om-checkout-billing-address",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/update-address/",
        CheckoutAddressViewSet.as_view({"patch": "update_address"}),
        name="om-checkout-update-address",
    ),
    # Checkout shipping endpoints
    path(
        "<slug:tenant_slug>/om/checkout/shipping-methods/",
        CheckoutShippingViewSet.as_view({"get": "get_shipping_methods"}),
        name="om-checkout-shipping-methods",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/shipping-method/",
        CheckoutShippingViewSet.as_view({"post": "select_shipping_method"}),
        name="om-checkout-select-shipping-method",
    ),
    # Checkout payment endpoints
    path(
        "<slug:tenant_slug>/om/checkout/payment-methods/",
        CheckoutPaymentViewSet.as_view({"get": "get_payment_methods"}),
        name="om-checkout-payment-methods",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/initiate-payment/",
        CheckoutPaymentViewSet.as_view({"post": "initiate_payment"}),
        name="om-checkout-initiate-payment",
    ),
    path(
        "<slug:tenant_slug>/om/checkout/payment-callback/",
        CheckoutPaymentViewSet.as_view({"get": "payment_callback"}),
        name="om-payment-callback",
    ),
    # Payment webhook callback endpoint
    path(
        "<slug:tenant_slug>/om/payment-callback/webhook/",
        PaymentCallbackView.as_view(),
        name="om-payment-callback-webhook",
    ),
    # Fulfillment webhook callback endpoint
    path(
        "om/callbacks/fulfillment/",
        FulfillmentUpdateView.as_view(),
        name="om-fulfillment-update",
    ),
    # Return initiation endpoint
    path(
        "om/returns/initiate/",
        ReturnInitiationView.as_view(),
        name="om-return-initiate",
    ),
    # Wallet recharge endpoint
    path(
        "om/wallet/recharge/",
        WalletRechargeInitiationView.as_view(),
        name="om-wallet-recharge",
    ),
    # User profile endpoint
    path("om/account/profile/", UserProfileView.as_view(), name="om-user-profile"),
    # Tenant configuration endpoint
    path(
        "om/admin/configuration/",
        TenantConfigurationView.as_view(),
        name="om-tenant-configuration",
    ),
    # Site configuration endpoints
    path(
        "<slug:tenant_slug>/site-config/header/",
        HeaderConfigurationView.as_view(),
        name="site-config-header",
    ),
    path(
        "site-config/admin/header/",
        AdminHeaderConfigurationView.as_view(),
        name="site-config-admin-header",
    ),
    # Pages endpoints
    path(
        "<slug:tenant_slug>/pages/<int:page_id>/",
        LandingPageView.as_view(),
        name="landing-page-detail",
    ),
    path("pages/batch-products/", BatchProductsView.as_view(), name="batch-products"),
    # Products catalogue hierarchy endpoint
    path(
        "<slug:tenant_slug>/products/catalogue/active-division-hierarchy/",
        ActiveDivisionHierarchyView.as_view(),
        name="active-division-hierarchy",
    ),
]
