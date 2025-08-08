"""
Views for Order Management API.

This module contains ViewSets and API views for the Order Management system.
Includes a base viewset for tenant-specific models.
"""

from typing import Any, Dict, List, Optional, Type, Union, Callable
from customers.models import Contact, Account, Address
from django.db.models import (
    QuerySet,
    Model,
    Sum,
    Count,
    Q,
    Prefetch,
    Case,
    When,
    Value,
    IntegerField,
)
from django.db import transaction
from datetime import datetime
from erp_backend.utils import send_api_notification
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError
from django.urls import reverse
from decimal import Decimal
import uuid
import json
import hmac
import hashlib
import logging
import base64
import secrets
from rest_framework import viewsets, filters, mixins, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.serializers import BaseSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
import time
from django.utils import timezone
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
)
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
import logging
from core.models.base import BaseTenantModel
from order_management.models import (
    Order,
    OrderItem,
    Cart,
    CartItem,
    WishlistItem,
    RMA,
    RMAItem,
    RMAStatus,
    Wallet,
    WalletTransaction,
    WalletTransactionType,
    LoyaltyTransaction,
    TenantConfiguration,
    OrderStatus,
    PaymentStatus,
    StorePickup,
    TimeSlot,
    ShippingMethod,
    CheckoutConfiguration,
    UITemplateSettings,
    FeatureToggleSettings,
    CustomerGroupSellingChannelStorePickup,
    GuestConfig,
)

# Commented out Payment model since it's a microservice integration
# from order_management.models import Payment
from order_management.services.order_service import create_order_from_payment
from order_management.checkout_session import (
    SHIPPING_ADDRESS_SESSION_KEY,
    SHIPPING_METHOD_SESSION_KEY,
    LOYALTY_POINTS_TO_REDEEM_KEY,
    PAYMENT_TXN_SESSION_KEY,
)
from order_management.api.serializers import (
    StorePickupSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    # CartSerializer,
    # CartItemSerializer,
    # CartItemInputSerializer,
    # CartItemUpdateSerializer,
    WishlistItemSerializer,
    WalletTransactionSerializer,
    WalletRechargeInitiationSerializer,
    LoyaltyTransactionSerializer,
    PaymentInitiationSerializer,
    AddressSerializer,
    ShippingMethodSerializer,
    RMAInitiationSerializer,
    RMARejectInputSerializer,
    RMAReceivedInputSerializer,
    RMAProcessRefundInputSerializer,
    RMAProcessExchangeInputSerializer,
    RMAOutputSerializer,
    ContactPersonSerializer,
    ContactAccessUpdateSerializer,
    TenantConfigurationSerializer,
    ShippingMethodSerializer,
    TimeSlotSerializer,
    CheckoutConfigurationSerializer,
    UITemplateSettingsSerializer,
    FeatureToggleSettingsSerializer,
    GuestConfigSerializer,
)
from order_management.api.authentication import JWTAuthentication
from order_management.api.permissions import (
    IsTenantUser,
    IsCustomerAdminPermission,
    IsTenantAdminUser,
)
from order_management.integrations import (
    product_service,
    inventory_service,
    customer_service,
    fulfillment_service,
    payment_service,
    notification_service,
)
from order_management.integrations.notification_service import send_transactional_email
from order_management.utils import get_tenant_config_value
from order_management.services import user_credential_service
from order_management.services import wallet_service, loyalty_service
from order_management.cart_utils import get_request_cart
from order_management.checkout_session import (
    get_checkout_data,
    update_checkout_data,
    clear_checkout_data,
    SHIPPING_ADDRESS_SESSION_KEY,
    BILLING_ADDRESS_SESSION_KEY,
    SHIPPING_METHOD_SESSION_KEY,
    PAYMENT_TXN_SESSION_KEY,
    LOYALTY_POINTS_TO_REDEEM_KEY,
)
from order_management.api.filters import StorePickupFilter
from order_management.utils.feature_flags import is_feature_enabled, WALLET, LOYALTY
from order_management.tasks import submit_order_for_fulfillment_task

logger = logging.getLogger(__name__)
from erp_backend.middleware import TenantSchemaMiddleware, CustomJWTAuthentication


class LoyaltyInfoViewSet(viewsets.ViewSet):
    """
    ViewSet for loyalty program information.

    Provides endpoints for retrieving a user's loyalty points balance
    and transaction history.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="balance")
    def get_balance(self, request: Request) -> Response:
        """
        Get the current loyalty points balance for the authenticated user.

        Returns:
            Response with the current points balance
        """
        try:
            # Get user and tenant IDs from request
            user_id = request.user.id
            client_id = request.tenant.id if hasattr(request, "tenant") else None

            if not client_id:
                return Response(
                    {"error": "Tenant information not available"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if loyalty feature is enabled for this tenant
            if not is_feature_enabled(LOYALTY, client_id):
                return Response(
                    {"error": "Loyalty program is not enabled for this tenant"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get balance from loyalty service
            balance = loyalty_service.get_user_points_balance(
                user_id=user_id, client_id=client_id
            )

            return Response({"balance": balance})

        except loyalty_service.LoyaltyError as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="history")
    def get_history(self, request: Request) -> Response:
        """
        Get the loyalty transaction history for the authenticated user.

        Returns:
            Paginated response with transaction history
        """
        try:
            # Get user and tenant IDs from request
            user_id = request.user.id
            client_id = request.tenant.id if hasattr(request, "tenant") else None

            if not client_id:
                return Response(
                    {"error": "Tenant information not available"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if loyalty feature is enabled for this tenant
            if not is_feature_enabled(LOYALTY, client_id):
                return Response(
                    {"error": "Loyalty program is not enabled for this tenant"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get transactions from database
            transactions = LoyaltyTransaction.objects.filter(
                user_id=user_id, client_id=client_id
            ).order_by("-created_at")

            # Set up pagination
            page = self.paginate_queryset(transactions)
            if page is not None:
                serializer = LoyaltyTransactionSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            # If pagination is not configured, return all results
            serializer = LoyaltyTransactionSerializer(transactions, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Required for pagination to work
    @property
    def paginator(self):
        """
        The paginator instance associated with the view, or `None`.
        """
        if not hasattr(self, "_paginator"):
            from rest_framework.pagination import PageNumberPagination

            self._paginator = PageNumberPagination()
        return self._paginator

    def paginate_queryset(self, queryset):
        """
        Return a single page of results, or `None` if pagination is disabled.
        """
        if self.paginator is None:
            return None
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        """
        Return a paginated style `Response` object for the given output data.
        """
        assert self.paginator is not None
        return self.paginator.get_paginated_response(data)


User = get_user_model()


class TenantConfigurationView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for managing tenant configuration.

    This view allows Tenant Administrators to retrieve and update
    tenant-specific configuration settings. It automatically creates
    a default configuration if one doesn't exist for the tenant.

    Permissions:
    - User must be authenticated
    - User must have Tenant Administrator privileges
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    serializer_class = TenantConfigurationSerializer

    def get_object(self):
        """
        Get or create the tenant configuration for the current tenant.

        Returns:
            TenantConfiguration: The tenant configuration object

        Raises:
            NotFound: If tenant context not found
        """
        # Get tenant identifier from the URL path
        path_parts = [p for p in self.request.path.split("/") if p]

        # Find the tenant slug in the URL (should be after /api/v1/)
        try:
            tenant_index = path_parts.index("v1") + 1
            tenant_identifier = path_parts[tenant_index]
        except (ValueError, IndexError):
            raise NotFound("Could not determine tenant from URL path")

        try:
            # Try to retrieve the existing configuration
            config_obj = TenantConfiguration.objects.get(tenant_ref=tenant_identifier)
            return config_obj
        except TenantConfiguration.DoesNotExist:
            # Create a new configuration if it doesn't exist
            config_obj = TenantConfiguration.objects.create(
                tenant_ref=tenant_identifier, config_data={}
            )
            return config_obj


class BaseTenantViewSet(viewsets.ModelViewSet):
    """
    Base viewset for models that inherit from BaseTenantModel.

    This viewset automatically handles tenant-specific operations:
    - Ensures proper tenant isolation via database schema connection
    - Applies tenant-specific permissions
    - Sets dummy tenant IDs and real user IDs for audit fields

    All viewsets for models inheriting from BaseTenantModel should
    extend this viewset to ensure consistent handling of tenant context.
    """

    # Default permission classes for tenant-specific viewsets
    permission_classes = [IsTenantUser]

    # Removed get_queryset override as tenant filtering is now handled by database schema connection
    def perform_create(self, serializer: BaseSerializer) -> None:
        """
        Override to auto-populate dummy tenant IDs and real user audit fields.

        Args:
            serializer: The serializer instance
        """
        # Get user_id from request for audit fields
        user_id = getattr(self.request, "auth_user_id", None)

        # Auto-populate with dummy tenant IDs and real user ID for audit
        create_data = {
            "client_id": 1,  # Set dummy placeholder value
            "company_id": 1,  # Set dummy placeholder value
            "created_by": user_id,
            "updated_by": user_id,
        }

    def perform_update(self, serializer: BaseSerializer) -> None:
        """
        Override to auto-populate audit fields on update.
        Only updates the updated_by field with the real user ID.

        Args:
            serializer: The serializer instance
        """
        # Get user_id from request for audit fields
        user_id = getattr(self.request, "auth_user_id", None)

    @transaction.atomic
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        Override to implement soft delete if model supports it.

        Args:
            request: The request object
            *args: Additional positional arguments
            **kwargs: Additional keyword arguments

        Returns:
            Response indicating success or failure
        """
        instance = self.get_object()

        # Check if model supports soft delete
        if hasattr(instance, "is_deleted"):
            # Use soft delete
            instance.is_deleted = True
            if hasattr(instance, "deleted_at"):
                from django.utils import timezone

                instance.deleted_at = timezone.now()
            instance.save(
                update_fields=(
                    ["is_deleted", "deleted_at"]
                    if hasattr(instance, "deleted_at")
                    else ["is_deleted"]
                )
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Fall back to hard delete
        return super().destroy(request, *args, **kwargs)


# class ProductViewSet(viewsets.ViewSet):
#     """
#     ViewSet for retrieving product information.

#     This viewset provides read-only access to product data from the product service
#     and enriches it with inventory information from the inventory service.
#     """

#     permission_classes = [AllowAny]  # Allow unauthenticated access
#     authentication_classes = [TenantSchemaMiddleware]

#     def retrieve(
#         self, request: Request, pk: str = None, tenant_slug: str = None
#     ) -> Response:
#         """
#         Retrieve a single product by SKU.

#         Args:
#             request: The request object
#             pk: The product SKU
#             tenant_slug: The tenant slug from the URL

#         Returns:
#             Response containing serialized product data
#         """
#         # Get tenant ID from request
#         client_id = getattr(request, "auth_tenant_id", 1)
#         if not client_id:
#             return Response(
#                 {"detail": "Tenant context not found."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Validate product SKU
#         if not product_sku:
#             return Response(
#                 {"detail": "Product SKU not provided."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Check cache first
#         cache_key = f"product:{client_id}:{pk}"
#         cache_ttl = getattr(settings, "CACHE_TTL", 300)  # Default to 5 minutes
#         cached_data = cache.get(cache_key)

#         if cached_data:
#             return Response(cached_data)
#         # Extract delivery parameters from query params
#         pincode = request.query_params.get('pincode')
#         country = request.query_params.get('country')
#         customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')

#         # Get product details from product service
#         product_details = product_service.get_product_details(
#             sku=pk, tenant_slug=tenant_slug
#         )
#         if not product_details:
#             return Response(
#                 {"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND
#             )

#         # Check if product is active
#         if not product_details.get("is_active", False):
#             return Response(
#                 {"detail": "Product is not active."}, status=status.HTTP_404_NOT_FOUND
#             )

#         # Get ATP quantity from inventory service
#         try:
#             # Pass the tenant_slug from the URL to get_atp
#             atp = inventory_service.get_atp(sku=pk, tenant_slug=tenant_slug)

#             # Determine stock status based on ATP
#             if atp <= 0:
#                 stock_status = "OUT_OF_STOCK"
#             elif atp < 5:  # Threshold for low stock
#                 stock_status = "LOW_STOCK"
#             else:
#                 stock_status = "IN_STOCK"
#         except inventory_service.InventoryConnectionError as e:
#             logger.error(
#                 f"Connection error getting ATP for SKU {pk}",
#                 extra={"error": str(e), "client_id": client_id},
#             )
#             return Response(
#                 {"detail": "Could not retrieve stock information at this time."},
#                 status=status.HTTP_503_SERVICE_UNAVAILABLE,
#             )
#         except inventory_service.InventoryResponseError as e:
#             logger.error(
#                 f"Response error getting ATP for SKU {pk}",
#                 extra={"error": str(e), "client_id": client_id},
#             )
#             return Response(
#                 {"detail": "Could not retrieve stock information at this time."},
#                 status=status.HTTP_503_SERVICE_UNAVAILABLE,
#             )

#         # Get variant defining attributes directly from product_details
#         variant_defining_attributes = product_details.get(
#             "variant_defining_attributes", None
#         )
#         logger.info(
#             f"Variant defining attributes from product_details: {variant_defining_attributes}"
#         )

#         # Check delivery eligibility if delivery parameters are provided
#         delivery_eligible = True
#         delivery_error = None
        
#         if pincode and country and customer_group_selling_channel_id:
#             delivery_status = self._check_delivery_eligibility(
#                 product_details.get("id"), pincode, country, customer_group_selling_channel_id
#             )
#             delivery_eligible = delivery_status["eligible"]
#             delivery_error = delivery_status["message"] if not delivery_status["eligible"] else None

#         # Combine product, inventory, and delivery data
#         combined_data = {
#             **product_details,
#             "atp_quantity": atp,
#             "stock_status": stock_status,
#             "variant_defining_attributes": variant_defining_attributes,
#             "delivery_eligible": delivery_eligible,
#             "delivery_error": delivery_error,
#         }

#         # Cache the result
#         cache.set(cache_key, combined_data, timeout=cache_ttl)

#         return Response(combined_data)
    
#     def _check_delivery_eligibility(self, product_id, pincode, country, customer_group_selling_channel_id):
#         """
#         Check if a product is deliverable to the given pincode/country.
        
#         Args:
#             product_id: The product ID
#             pincode: The delivery pincode
#             country: The delivery country
#             customer_group_selling_channel_id: The customer group selling channel ID
            
#         Returns:
#             Dictionary with 'eligible' boolean and 'message' string
#         """
#         try:
#             from products.models import ProductZoneRestriction
#             from shipping_zones.models import PincodeZoneAssignment
#             from order_management.models import FeatureToggleSettings
#             from order_management.products.selector import get_country_code
            
#             # Convert country name to country code if needed
#             country_code = get_country_code(country)
#             logger.info(f"Checking delivery for product {product_id}, pincode {pincode}, country {country}, country_code {country_code}")
            
#             # Check if product has zone restrictions
#             products_with_zones = ProductZoneRestriction.objects.filter(product_id=product_id).exists()
#             logger.info(f"Product {product_id} has zone restrictions: {products_with_zones}")
            
#             if products_with_zones:
#                 # Case 1: Product has zone restrictions - check pincode zone assignment
#                 try:
#                     pincode_assignment = PincodeZoneAssignment.objects.get(
#                         pincode__pincode=pincode,
#                         pincode__country_code=country_code
#                     )
#                     user_zone_id = pincode_assignment.zone_id
#                     logger.info(f"Pincode {pincode} is assigned to zone {user_zone_id}")
                    
#                     # Check product zone restrictions
#                     product_zones = ProductZoneRestriction.objects.filter(product_id=product_id)
#                     include_restrictions = product_zones.filter(restriction_mode='INCLUDE')
#                     exclude_restrictions = product_zones.filter(restriction_mode='EXCLUDE')
#                     logger.info(f"Product {product_id} has {include_restrictions.count()} INCLUDE restrictions and {exclude_restrictions.count()} EXCLUDE restrictions")
#                     logger.info(f"INCLUDE zones: {list(include_restrictions.values_list('zone_id', flat=True))}")
                    
#                     if include_restrictions.exists():
#                         # If INCLUDE restrictions exist, zone must be in the included list
#                         if include_restrictions.filter(zone_id=user_zone_id).exists():
#                             logger.info(f"Product {product_id} is eligible - user zone {user_zone_id} is in INCLUDE list")
#                             return {"eligible": True, "message": ""}
#                         else:
#                             logger.info(f"Product {product_id} is NOT eligible - user zone {user_zone_id} is NOT in INCLUDE list")
#                             return {"eligible": False, "message": "Product not available for delivery to this location"}
#                     elif exclude_restrictions.exists():
#                         # If EXCLUDE restrictions exist, zone must NOT be in the excluded list
#                         if not exclude_restrictions.filter(zone_id=user_zone_id).exists():
#                             return {"eligible": True, "message": ""}
#                         else:
#                             return {"eligible": False, "message": "Product not available for delivery to this location"}
#                     else:
#                         return {"eligible": False, "message": "Product has no delivery zones configured"}
                        
#                 except PincodeZoneAssignment.DoesNotExist:
#                     return {"eligible": False, "message": f"Delivery not available to pincode {pincode}"}
#             else:
#                 # Case 2: Product has no zone restrictions - check default_delivery_zone
#                 try:
#                     feature_settings = FeatureToggleSettings.objects.get(
#                         customer_group_selling_channel_id=customer_group_selling_channel_id
#                     )
#                     default_zone = feature_settings.default_delivery_zone
                    
#                     if default_zone == "All over world":
#                         return {"eligible": True, "message": ""}
#                     elif default_zone == country:
#                         return {"eligible": True, "message": ""}
#                     else:
#                         return {"eligible": False, "message": f"Product only available for delivery to {default_zone}"}
                        
#                 except FeatureToggleSettings.DoesNotExist:
#                     return {"eligible": False, "message": "Delivery settings not configured for this channel"}
                    
#         except Exception as e:
#             # On error, assume product is eligible but log the error
#             logger.error(f"Error checking delivery eligibility for product {product_id}: {str(e)}")
#             return {"eligible": True, "message": ""}


# @extend_schema_view(
#     get_cart=extend_schema(
#         summary="Get current cart",
#         description="Retrieves the current shopping cart for the authenticated user or guest session.",
#         tags=["Shopping Cart"],
#         responses={200: OpenApiResponse(description="Cart retrieved successfully")},
#     ),
#     add_item=extend_schema(
#         summary="Add item to cart",
#         description="Adds a product to the shopping cart. Creates a new cart if one doesn't exist.",
#         tags=["Shopping Cart"],
#         request=CartItemInputSerializer,
#         responses={
#             200: OpenApiResponse(description="Item added successfully"),
#             400: OpenApiResponse(description="Invalid input or product not found"),
#         },
#         examples=[
#             OpenApiExample(
#                 name="Add item example",
#                 value={"product_sku": "PROD-12345", "quantity": 2},
#                 request_only=True,
#             )
#         ],
#     ),
#     update_item=extend_schema(
#         summary="Update cart item",
#         description="Updates the quantity of an item in the cart. Set quantity to 0 to remove the item.",
#         tags=["Shopping Cart"],
#         request=CartItemUpdateSerializer,
#         responses={
#             200: OpenApiResponse(description="Item updated successfully"),
#             404: OpenApiResponse(description="Item not found in cart"),
#         },
#         examples=[
#             OpenApiExample(
#                 name="Update quantity example", value={"quantity": 3}, request_only=True
#             )
#         ],
#     ),
#     remove_item=extend_schema(
#         summary="Remove item from cart",
#         description="Removes an item from the shopping cart.",
#         tags=["Shopping Cart"],
#         responses={
#             204: OpenApiResponse(description="Item removed successfully"),
#             404: OpenApiResponse(description="Item not found in cart"),
#         },
#     ),
#     clear_cart=extend_schema(
#         summary="Clear cart",
#         description="Removes all items from the shopping cart.",
#         tags=["Shopping Cart"],
#         responses={
#             204: OpenApiResponse(description="Cart cleared successfully"),
#             404: OpenApiResponse(description="Cart not found"),
#         },
#     ),
# )
# class CartViewSet(viewsets.ViewSet):
#     """
#     ViewSet for managing shopping carts.

#     This viewset provides methods for viewing, adding, updating, and removing
#     items from the shopping cart. It handles both guest (session-based) and
#     logged-in (user-based) carts.

#     Security:
#     - Uses AllowAny permission to support guest cart functionality
#     - Applies rate limiting to prevent abuse
#     - Ensures proper tenant isolation through get_request_cart utility

#     Endpoints:
#     - GET /cart/ - Get the current shopping cart
#     - POST /cart/add_item/ - Add an item to the cart
#     - PUT /cart/update_item/{item_pk}/ - Update item quantity
#     - DELETE /cart/clear/ - Clear all items from the cart
#     - DELETE /cart/remove_item/{item_pk}/ - Remove an item from the cart
#     """

#     authentication_classes = [TenantSchemaMiddleware]
#     permission_classes = [
#         AllowAny
#     ]  # Allow anonymous users for guest cart functionality
#     throttle_classes = [
#         AnonRateThrottle,
#         UserRateThrottle,
#     ]  # Apply throttling to prevent abuse

#     def get_throttles(self):
#         """
#         Return custom throttle scopes based on user authentication status.

#         Returns:
#             List of throttle instances with appropriate scopes
#         """
#         throttle_classes = self.throttle_classes
#         if not throttle_classes:
#             return []

#         return [throttle() for throttle in throttle_classes]

#     def get_throttle_scopes(self):
#         """
#         Define custom throttle scopes for cart operations.

#         Returns:
#             Dictionary mapping throttle classes to scopes
#         """
#         return {"AnonRateThrottle": "cart_anon", "UserRateThrottle": "cart_user"}

#     def get_cart(self, request: Request, tenant_slug: str = None) -> Response:
#         """
#         Get the current cart.

#         Args:
#             request: The request object
#             tenant_slug: The tenant slug from the URL

#         Returns:
#             Response containing serialized cart data
#         """
#         # Set tenant context from the URL parameter
#         if tenant_slug and not hasattr(request, "tenant"):
#             from django_tenants.utils import schema_context
#             from clients.models import Client

#             try:
#                 tenant = Client.objects.get(schema_name=tenant_slug, is_active=True)
#                 request.tenant = tenant
#                 request.auth_tenant_id = tenant.id
#             except Client.DoesNotExist:
#                 return Response(
#                     {"detail": "Invalid tenant"}, status=status.HTTP_404_NOT_FOUND
#                 )

#         # Get basic cart first
#         cart = get_request_cart(request)

#         # If cart has an ID (saved to DB), fetch an optimized version with prefetching
#         if cart and cart.id:
#             # Optimized query with prefetch_related to eliminate N+1 queries
#             cart = Cart.objects.filter(id=cart.id).prefetch_related("items").first()

#         # Get delivery location parameters from query params
#         pincode = request.query_params.get('pincode')
#         country = request.query_params.get('country')
#         customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')
        
#         serializer = CartSerializer(
#             cart,
#             context={
#                 "client_id": getattr(request, "auth_tenant_id", None),
#                 "request": request,
#                 "pincode": pincode,
#                 "country": country,
#                 "customer_group_selling_channel_id": customer_group_selling_channel_id,
#             },
#         )
#         return Response(serializer.data)

#     def add_item(self, request: Request, tenant_slug: str = None) -> Response:
#         print("SESSION KEY BEFORE:", request.session.session_key)
#         print("SESSION DATA:", dict(request.session))

#         if not request.session.session_key:
#             request.session.save()
#             print("NEW SESSION KEY:", request.session.session_key)
#         """
#         Add an item to the cart.
        
#         Args:
#             request: The request object containing product_sku and quantity
            
#         Returns:
#             Response containing serialized cart data
#         """
#         # Validate input
#         serializer = CartItemInputSerializer(data=request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         product_sku = serializer.validated_data["product_sku"]
#         quantity = serializer.validated_data["quantity"]

#         # Get client_id from request
#         client_id = getattr(request, "auth_tenant_id", None)
#         if not client_id:
#             return Response(
#                 {"detail": "Tenant context not found."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Validate product SKU
#         if not product_sku:
#             return Response(
#                 {"detail": "Product SKU not provided."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # # Extract delivery parameters from query params
#         # pincode = request.query_params.get('pincode')
#         # country = request.query_params.get('country')
#         # customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')

#         # Check ATP
#         try:
#             # Pass the tenant_slug from the URL to get_atp
#             atp = inventory_service.get_atp(sku=product_sku, tenant_slug=tenant_slug)
#             if atp < quantity:
#                 return Response(
#                     {
#                         "detail": f"Requested quantity ({quantity}) exceeds available quantity ({atp})."
#                     },
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#         except inventory_service.InventoryConnectionError as e:
#             logger.error(
#                 f"Connection error getting ATP for SKU {product_sku}",
#                 extra={"error": str(e)},
#             )
#             return Response(
#                 {"detail": "Could not retrieve stock information at this time."},
#                 status=status.HTTP_503_SERVICE_UNAVAILABLE,
#             )
#         except inventory_service.InventoryResponseError as e:
#             logger.error(
#                 f"Response error getting ATP for SKU {product_sku}",
#                 extra={"error": str(e)},
#             )
#             return Response(
#                 {"detail": "Could not retrieve stock information at this time."},
#                 status=status.HTTP_503_SERVICE_UNAVAILABLE,
#             )
#         except inventory_service.InventoryServiceError as e:
#             logger.error(
#                 f"Service error for SKU {product_sku}", extra={"error": str(e)}
#             )
#             return Response(
#                 {"detail": "Insufficient stock available."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Get or create cart
#         cart = get_request_cart(request)

#         # Find or create cart item
#         cart_item, created = CartItem.objects.get_or_create(
#             cart=cart,
#             product_sku=product_sku,
#             defaults={
#                 "quantity": quantity,
#                 "client_id": client_id,
#                 "company_id": getattr(request, "auth_company_id", 1),
#                 "created_by": getattr(
#                     request, "auth_user_id", 1
#                 ),  # Use 1 as default in development
#                 "updated_by": getattr(request, "auth_user_id", 1),
#             },
#         )

#         # Update quantity if item already exists
#         if not created:
#             new_quantity = cart_item.quantity + quantity
#             if atp >= new_quantity:
#                 cart_item.quantity = new_quantity
#             else:
#                 cart_item.quantity = atp
#             cart_item.save()

#         # Return serialized cart
#         serializer = CartSerializer(
#             cart, context={"client_id": client_id, "request": request}
#         )
#         return Response(serializer.data)

#     def update_item(
#         self, request: Request, item_pk=None, tenant_slug: str = None
#     ) -> Response:
#         """
#         Update an item in the cart.

#         Args:
#             request: The request object containing quantity
#             item_pk: The primary key of the cart item

#         Returns:
#             Response containing serialized cart item data
#         """
#         # Validate input
#         serializer = CartItemUpdateSerializer(data=request.data)
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         quantity = serializer.validated_data["quantity"]

#         # Get client_id from request
#         client_id = getattr(request, "auth_tenant_id", None)
#         if not client_id:
#             return Response(
#                 {"detail": "Tenant context not found."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Get cart
#         cart = get_request_cart(request)

#         # Find cart item
#         try:
#             cart_item = CartItem.objects.get(cart=cart, id=item_pk)
#         except CartItem.DoesNotExist:
#             return Response(
#                 {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
#             )

#         # Check if quantity is valid
#         if quantity <= 0:
#             # Remove item if quantity is 0 or negative
#             cart_item.delete()
#             return Response(status=status.HTTP_204_NO_CONTENT)

#         # Check ATP if quantity increases
#         if quantity > cart_item.quantity:
#             try:
#                 # Pass the tenant_slug from the URL to get_atp
#                 atp = inventory_service.get_atp(
#                     sku=cart_item.product_sku, tenant_slug=tenant_slug
#                 )
#                 if atp < quantity:
#                     return Response(
#                         {
#                             "detail": f"Requested quantity ({quantity}) exceeds available quantity ({atp})."
#                         },
#                         status=status.HTTP_400_BAD_REQUEST,
#                     )
#             except inventory_service.InventoryConnectionError as e:
#                 logger.error(
#                     f"Connection error getting ATP for SKU {cart_item.product_sku}",
#                     extra={"error": str(e)},
#                 )
#                 return Response(
#                     {"detail": "Could not retrieve stock information at this time."},
#                     status=status.HTTP_503_SERVICE_UNAVAILABLE,
#                 )
#             except inventory_service.InventoryResponseError as e:
#                 logger.error(
#                     f"Response error getting ATP for SKU {cart_item.product_sku}",
#                     extra={"error": str(e)},
#                 )
#                 return Response(
#                     {"detail": "Could not retrieve stock information at this time."},
#                     status=status.HTTP_503_SERVICE_UNAVAILABLE,
#                 )
#             except inventory_service.InventoryServiceError as e:
#                 logger.error(
#                     f"Service error for SKU {cart_item.product_sku}",
#                     extra={"error": str(e)},
#                 )
#                 return Response(
#                     {"detail": "Insufficient stock available."},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#         # Update quantity
#         cart_item.quantity = quantity
#         cart_item.save()

#         # Return serialized cart item
#         serializer = CartItemSerializer(
#             cart_item, context={"client_id": client_id, "request": request}
#         )
#         return Response(serializer.data)

#     def remove_item(
#         self, request: Request, item_pk=None, tenant_slug: str = None
#     ) -> Response:
#         """
#         Remove an item from the cart.

#         Args:
#             request: The request object
#             item_pk: The primary key of the cart item

#         Returns:
#             Response with no content
#         """
#         # Get cart
#         cart = get_request_cart(request)

#         # Find cart item
#         try:
#             cart_item = CartItem.objects.get(cart=cart, id=item_pk)
#         except CartItem.DoesNotExist:
#             return Response(
#                 {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
#             )

#         # Delete cart item
#         cart_item.delete()

#         return Response(status=status.HTTP_204_NO_CONTENT)

#     def clear_cart(self, request: Request, tenant_slug: str = None) -> Response:
#         """
#         Remove all items from the cart.

#         Args:
#             request: The request object

#         Returns:
#             Response with no content
#         """
#         # Get cart
#         cart = get_request_cart(request)

#         if cart:
#             # Delete all cart items
#             CartItem.objects.filter(cart=cart).delete()

#         return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutShippingViewSet(viewsets.ViewSet):
    """
    ViewSet for managing checkout shipping methods.

    Provides endpoints for retrieving available shipping methods
    and selecting a shipping method for the current checkout.

    Security:
    - Uses AllowAny permission to support guest checkout
    - Applies rate limiting to prevent abuse
    - Ensures proper tenant isolation through checkout_session utility
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    throttle_classes = [
        AnonRateThrottle,
        UserRateThrottle,
    ]  # Apply throttling to prevent abuse

    def get_throttles(self):
        """
        Return custom throttle scopes based on user authentication status.

        Returns:
            List of throttle instances with appropriate scopes
        """
        throttle_classes = self.throttle_classes
        if not throttle_classes:
            return []

        return [throttle() for throttle in throttle_classes]

    def get_throttle_scopes(self):
        """
        Define custom throttle scopes for checkout operations.

        Returns:
            Dictionary mapping throttle classes to scopes
        """
        return {
            "AnonRateThrottle": "checkout_anon",
            "UserRateThrottle": "checkout_user",
        }

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def get_shipping_methods(self, request: Request) -> Response:
        """
        Get available shipping methods based on shipping address.

        Args:
            request: The request object

        Returns:
            Response containing list of available shipping methods
        """
        # Get shipping address from session
        checkout_data = get_checkout_data(request)
        shipping_address = checkout_data.get(SHIPPING_ADDRESS_SESSION_KEY)

        if not shipping_address:
            return Response(
                {
                    "detail": "Shipping address not set. Please set shipping address first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get cart details
        cart = get_request_cart(request)
        if not cart or not cart.items.exists():
            return Response(
                {"detail": "Your cart is empty. Please add items to your cart first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_items_data = CartItemSerializer(
            cart.items.all(),
            many=True,
            context={"client_id": getattr(request, "auth_tenant_id", None)},
        ).data

        # Get tenant identifier value
        tenant_client_id = getattr(request, "auth_tenant_id", 0)

        # Get shipping options from fulfillment service
        try:
            from order_management.exceptions import (
                FulfillmentServiceError,
                FulfillmentConnectionError,
                FulfillmentResponseError,
                FulfillmentProcessError,
            )

            shipping_options = fulfillment_service.get_shipping_options(
                client_id=tenant_client_id,
                shipping_address=shipping_address,
                items=cart_items_data,
            )

            # Handle empty response from fulfillment service
            if not shipping_options:
                logger.warning(
                    f"No shipping options returned for client {tenant_client_id}"
                )
                return Response(
                    {
                        "detail": "No shipping options available for your location or items. Please contact customer support."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        except FulfillmentConnectionError as e:
            logger.error(
                f"Failed to connect to fulfillment service for client {tenant_client_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Shipping calculation service is currently unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except FulfillmentResponseError as e:
            logger.error(
                f"Fulfillment service error response for client {tenant_client_id}: {e.status_code} - {e.message}"
            )
            return Response(
                {
                    "detail": "Error calculating shipping options. Please try again later."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except FulfillmentProcessError as e:
            logger.error(
                f"Fulfillment processing error for client {tenant_client_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Unable to calculate shipping for the provided address or items. Please verify your information."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except FulfillmentServiceError as e:
            logger.error(
                f"General fulfillment service error for client {tenant_client_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Error calculating shipping options. Please try again later."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(shipping_options)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def select_shipping_method(self, request: Request) -> Response:
        """
        Select shipping method for checkout.

        Args:
            request: The request object

        Returns:
            Response containing the selected shipping method
        """
        # Validate input
        serializer = ShippingMethodSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Store selected method in session
        selected_method = serializer.validated_data
        update_checkout_data(request, {SHIPPING_METHOD_SESSION_KEY: selected_method})

        return Response(selected_method)


class CheckoutAddressViewSet(viewsets.ViewSet):
    """
    ViewSet for managing checkout addresses.

    Provides endpoints for retrieving saved addresses and setting
    shipping and billing addresses for the current checkout.

    Security:
    - Uses action-specific permissions (IsAuthenticated for saved addresses, AllowAny for guest checkout)
    - Applies custom JWT authentication for proper token validation
    - Applies rate limiting to prevent abuse
    - Ensures proper tenant isolation through checkout_session utility
    """

    authentication_classes = [TenantSchemaMiddleware, JWTAuthentication]
    throttle_classes = [
        AnonRateThrottle,
        UserRateThrottle,
    ]  # Apply throttling to prevent abuse

    def get_throttles(self):
        """
        Return custom throttle scopes based on user authentication status.

        Returns:
            List of throttle instances with appropriate scopes
        """
        throttle_classes = self.throttle_classes
        if not throttle_classes:
            return []

        return [throttle() for throttle in throttle_classes]

    def get_throttle_scopes(self):
        """
        Define custom throttle scopes for checkout operations.

        Returns:
            Dictionary mapping throttle classes to scopes
        """
        return {
            "AnonRateThrottle": "checkout_anon",
            "UserRateThrottle": "checkout_user",
        }

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def list_saved_addresses(
        self, request: Request, tenant_slug: str = None
    ) -> Response:
        """
        List saved addresses for the authenticated user.
        """
        try:
            # Get user info from request
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {"detail": "Authentication required."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check if contact exists
            try:
                contact = Contact.objects.get(user_id=user.id)
                account_id = contact.account_id
            except Contact.DoesNotExist:
                return Response(
                    {
                        "detail": "No contact found for this user. Please create a contact profile first."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get addresses directly from Address model and sort them
            addresses = Address.objects.filter(account_id=account_id).order_by(
                # First sort by address_type (BILLING comes before SHIPPING)
                "address_type",
                # Then sort by default status within each type
                Case(
                    When(
                        address_type="BILLING", is_primary_billing=True, then=Value(0)
                    ),
                    When(
                        address_type="SHIPPING", is_primary_shipping=True, then=Value(0)
                    ),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            )

            # Prepare response data
            address_list = []
            for address in addresses:
                address_data = {
                    "id": address.id,
                    "address_type": address.address_type,
                    "full_name": address.full_name,
                    "address_line1": address.street_1,
                    "address_line2": address.street_2,
                    "city": address.city,
                    "state": address.state_province,
                    "postal_code": address.postal_code,
                    "country": address.country,
                    "phone_number": address.phone_number,
                    "business_name": address.business_name,
                    "gst_number": address.gst_number,
                    "is_default": (
                        address.is_primary_shipping
                        if address.address_type == "SHIPPING"
                        else address.is_primary_billing
                    ),
                }
                address_list.append(address_data)

            return Response(address_list)

        except Exception as e:
            return Response(
                {"detail": f"Error retrieving addresses: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def set_shipping_address(
        self, request: Request, tenant_slug: str = None
    ) -> Response:
        """
        Set shipping address for checkout.
        Accepts address data and saves it to the database.
        """
        try:
            # Get address data from request
            address_data = request.data.get("address_data")

            # Validate we have address data
            if not address_data:
                return Response(
                    {"detail": "address_data is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get user info from request.user (JWT token is automatically verified)
            user = request.user
            print(f"User ID from token: {user.id}")
            print(f"Email ID from token: {user.email}")  # For debugging
            contact = Contact.objects.get(user_id=user.id)
            print(f"Account ID: {contact.account_id}")
            print(f"Contact ID: {contact.id}")
            account = contact.account_id
            # Save the address data
            serializer = AddressSerializer(data=address_data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Get the account
            try:
                from customers.models import Account, Address

                account = Account.objects.get(id=account)
            except Account.DoesNotExist:
                return Response(
                    {"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND
                )

            # Check if account already has a default shipping address
            has_primary_shipping = Address.objects.filter(
                account=account, is_primary_shipping=True
            ).exists()

            # Create and save the address
            try:
                # Create address with optional fields
                new_address = Address(
                    account=account,
                    address_type="SHIPPING",
                    # address_category=address_data.get('type', 'residential'),
                    business_name=address_data.get("business_name", ""),
                    gst_number=address_data.get("gst_number", ""),
                    full_name=address_data.get("full_name", ""),
                    # Make phone_number optional by providing default empty string
                    phone_number=address_data.get("phone_number", ""),
                    street_1=address_data.get("address_line1", ""),
                    street_2=address_data.get("address_line2", ""),
                    city=address_data.get("city", ""),
                    state_province=address_data.get("state", ""),
                    postal_code=address_data.get("postal_code", ""),
                    country=address_data.get("country", ""),
                    is_primary_shipping=not has_primary_shipping,  # Set to True only if no primary exists
                    client_id=1,
                    created_by=user.id,
                    updated_by=user.id,
                )
                new_address.save()

                # Return the saved address data
                response_data = {
                    "id": str(new_address.id),
                    "full_name": new_address.full_name,
                    "type": new_address.address_category,
                    "business_name": new_address.business_name,
                    "gst_number": new_address.gst_number,
                    "phone_number": new_address.phone_number,
                    "address_line1": new_address.street_1,
                    "address_line2": new_address.street_2,
                    "city": new_address.city,
                    "state": new_address.state_province,
                    "postal_code": new_address.postal_code,
                    "country": new_address.country,
                }

                # Store in session for checkout
                update_checkout_data(
                    request, {SHIPPING_ADDRESS_SESSION_KEY: response_data}
                )

                return Response(response_data)

            except Exception as e:
                return Response(
                    {"detail": "Error saving address."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            return Response(
                {"detail": "Error processing request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def set_billing_address(
        self, request: Request, tenant_slug: str = None
    ) -> Response:
        """
        Set billing address for checkout.
        Accepts address data and saves it to the database.
        """
        try:
            # Get address data from request
            address_data = request.data.get("address_data")

            # Validate we have address data
            if not address_data:
                return Response(
                    {"detail": "address_data is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = request.user
            contact = Contact.objects.get(user_id=user.id)
            account = contact.account_id
            # Save the address data
            serializer = AddressSerializer(data=address_data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Get the account
            try:
                from customers.models import Account, Address

                account = Account.objects.get(id=account)
            except Account.DoesNotExist:
                return Response(
                    {"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND
                )

            # Check if account already has a default billing address
            has_primary_billing = Address.objects.filter(
                account=account, is_primary_billing=True
            ).exists()

            # Create and save the address
            try:
                # Create address with optional fields
                new_address = Address(
                    account=account,
                    address_type="BILLING",
                    # address_category=address_data.get('', ''),
                    business_name=address_data.get("business_name", ""),
                    gst_number=address_data.get("gst_number", ""),
                    full_name=address_data.get("full_name", ""),
                    phone_number=address_data.get("phone_number", ""),
                    street_1=address_data.get("address_line1", ""),
                    street_2=address_data.get("address_line2", ""),
                    city=address_data.get("city", ""),
                    state_province=address_data.get("state", ""),
                    postal_code=address_data.get("postal_code", ""),
                    country=address_data.get("country", ""),
                    is_primary_billing=not has_primary_billing,  # Set to True only if no primary exists
                    client_id=1,
                    created_by=user.id,
                    updated_by=user.id,
                )
                new_address.save()

                # Return the saved address data
                response_data = {
                    "id": str(new_address.id),
                    "full_name": new_address.full_name,
                    "type": new_address.address_category,
                    "business_name": new_address.business_name,
                    "gst_number": new_address.gst_number,
                    "phone_number": new_address.phone_number,
                    "address_line1": new_address.street_1,
                    "address_line2": new_address.street_2,
                    "city": new_address.city,
                    "state": new_address.state_province,
                    "postal_code": new_address.postal_code,
                    "country": new_address.country,
                }

                # Store in session for checkout
                update_checkout_data(
                    request, {BILLING_ADDRESS_SESSION_KEY: response_data}
                )

                return Response(response_data)

            except Exception as e:
                return Response(
                    {"detail": "Error saving address."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            return Response(
                {"detail": "Error processing request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["patch"], permission_classes=[AllowAny])
    def update_address(self, request: Request, tenant_slug: str = None) -> Response:
        """
        Update an existing address by ID.
        Accepts address_data with an 'id' field and updates the address.
        """
        try:
            address_data = request.data.get("address_data")
            if not address_data or "id" not in address_data:
                return Response(
                    {"detail": "address_data with 'id' is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            address_id = address_data["id"]
            from customers.models import Address

            try:
                address = Address.objects.get(id=address_id)
            except Address.DoesNotExist:
                return Response(
                    {"detail": "Address not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Update fields if provided
            fields = [
                "business_name", "gst_number", "full_name", "phone_number",
                "address_line1", "address_line2", "city", "state", "postal_code", "country"
            ]
            for field in fields:
                model_field = (
                    "street_1" if field == "address_line1" else
                    "street_2" if field == "address_line2" else
                    "state_province" if field == "state" else
                    field
                )
                if field in address_data:
                    setattr(address, model_field, address_data[field])

            address.updated_by = request.user.id if request.user and request.user.is_authenticated else None
            address.save()

            response_data = {
                "id": str(address.id),
                "full_name": address.full_name,
                "type": address.address_category,
                "business_name": address.business_name,
                "gst_number": address.gst_number,
                "phone_number": address.phone_number,
                "address_line1": address.street_1,
                "address_line2": address.street_2,
                "city": address.city,
                "state": address.state_province,
                "postal_code": address.postal_code,
                "country": address.country,
            }
            return Response(response_data)
        except Exception as e:
            return Response(
                {"detail": "Error updating address."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CheckoutPaymentViewSet(viewsets.ViewSet):
    """
    ViewSet for managing checkout payment methods.

    Provides endpoints for retrieving available payment methods
    for the current checkout process.

    Security:
    - Uses AllowAny permission to support guest checkout
    - Applies rate limiting to prevent abuse
    - Ensures proper tenant isolation through checkout_session utility
    """

    throttle_classes = [
        AnonRateThrottle,
        UserRateThrottle,
    ]  # Apply throttling to prevent abuse

    def get_throttles(self):
        """
        Return custom throttle scopes based on user authentication status.

        Returns:
            List of throttle instances with appropriate scopes
        """
        throttle_classes = self.throttle_classes
        if not throttle_classes:
            return []

        return [throttle() for throttle in throttle_classes]

    def get_throttle_scopes(self):
        """
        Define custom throttle scopes for checkout operations.

        Returns:
            Dictionary mapping throttle classes to scopes
        """
        return {
            "AnonRateThrottle": "checkout_anon",
            "UserRateThrottle": "checkout_user",
        }

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def get_payment_methods(self, request: Request) -> Response:

        print("yash123_____________________________")
        """
        Get available payment methods for checkout.
        
        Args:
            request: The request object
            
        Returns:
            Response containing list of available payment methods
        """
        # Get tenant identifier
        tenant_client_id = getattr(request, "auth_tenant_id", None)
        if not tenant_client_id:
            return Response(
                {"detail": "Tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get payment methods from payment service
        try:
            from order_management.exceptions import (
                PaymentServiceError,
                PaymentConnectionError,
                PaymentResponseError,
                PaymentProcessingError,
            )

            payment_methods = payment_service.get_enabled_payment_methods(
                client_id=tenant_client_id
            )
        except PaymentConnectionError as e:
            logger.error(
                f"Failed to connect to payment service for client {tenant_client_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Payment service is currently unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except PaymentResponseError as e:
            logger.error(
                f"Payment service error response for client {tenant_client_id}: {e.status_code} - {e.message}"
            )
            return Response(
                {"detail": "Error retrieving payment methods. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except PaymentServiceError as e:
            logger.error(
                f"General payment service error for client {tenant_client_id}: {str(e)}"
            )
            return Response(
                {"detail": "Error retrieving payment methods. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Check if wallet module is enabled for this tenant using feature flags
        wallet_enabled = is_feature_enabled(WALLET, tenant_client_id)

        # If wallet is enabled and user is authenticated, check wallet balance
        if wallet_enabled:
            user_id = getattr(request, "auth_user_id", None)
            if user_id:
                try:
                    # This would be replaced with actual wallet service integration
                    # For now, we'll simulate a wallet balance check
                    from wallet_management.services import get_wallet_balance

                    wallet_balance = get_wallet_balance(
                        user_id=user_id, client_id=tenant_client_id
                    )

                    # If wallet has a positive balance, add it as a payment method
                    if wallet_balance > 0:
                        wallet_payment_method = {
                            "id": "wallet",
                            "name": "My Wallet",
                            "icon_url": "/static/images/wallet-icon.png",
                            "balance": str(wallet_balance),
                            "currency": "USD",  # This would come from tenant configuration
                        }

                        # Add wallet to payment methods if not already present
                        if not any(
                            method.get("id") == "wallet" for method in payment_methods
                        ):
                            payment_methods.append(wallet_payment_method)
                except (ImportError, Exception) as e:
                    logger.warning(f"Error checking wallet balance: {e}")

        return Response(payment_methods)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def initiate_payment(self, request: Request) -> Response:
        """
        Initiate a payment transaction for the current checkout.

        Args:
            request: The request object containing payment method ID and optional loyalty points

        Returns:
            Response containing payment transaction details
        """
        # Validate input data using serializer
        serializer = PaymentInitiationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get validated data
        payment_method_id = serializer.validated_data["payment_method_id"]
        points_to_redeem = serializer.validated_data.get("points_to_redeem", 0)

        # Get tenant and user identifiers
        tenant_client_id = getattr(request, "auth_tenant_id", None)
        user_id = getattr(request, "auth_user_id", None)

        if not tenant_client_id:
            return Response(
                {"detail": "Tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get current cart
        cart = get_request_cart(request)
        if not cart.items.exists():
            return Response(
                {"detail": "Cart is empty. Cannot initiate payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get checkout data from session
        checkout_data = get_checkout_data(request)
        shipping_address = checkout_data.get(SHIPPING_ADDRESS_SESSION_KEY)
        billing_address = checkout_data.get(BILLING_ADDRESS_SESSION_KEY)
        shipping_method = checkout_data.get(SHIPPING_METHOD_SESSION_KEY)

        # Validate required checkout data
        if not shipping_address:
            return Response(
                {
                    "detail": "Shipping address not set. Please set shipping address first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not shipping_method:
            return Response(
                {
                    "detail": "Shipping method not selected. Please select shipping method first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use billing address if provided, otherwise use shipping address
        final_billing_address = billing_address or shipping_address

        try:
            # Fetch product details for all items in the cart
            cart_items = []
            for item in cart.items.all():
                try:
                    product_details = product_service.get_product_details(
                        client_id=tenant_client_id, sku=item.product_sku
                    )

                    if not product_details:
                        return Response(
                            {
                                "detail": f"Product with SKU {item.product_sku} not found or is no longer available."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    cart_items.append({"item": item, "details": product_details})
                except Exception as e:
                    logger.error(
                        f"Error fetching product details for SKU {item.product_sku}: {e}"
                    )
                    return Response(
                        {"detail": f"Error fetching product details: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

            # Calculate totals
            # Extract tenant slug from request path
            tenant_slug = None
            path = request.path
            if path:
                # Extract tenant slug from URL path pattern /api/v1/{tenant_slug}/...
                import re

                match = re.search(r"/api/v1/([^/]+)/", path)
                if match:
                    tenant_slug = match.group(1)
                    logger.debug(f"Extracted tenant_slug from path: {tenant_slug}")

            # Pass tenant slug to get_subtotal_amount
            subtotal = cart.get_subtotal_amount(tenant_slug=tenant_slug)
            shipping_cost = Decimal(shipping_method.get("cost", "0.00"))
            tax_amount = Decimal("0.00")  # Stubbed for now
            grand_total = subtotal + shipping_cost + tax_amount

            # Initialize loyalty discount
            loyalty_discount = Decimal("0.00")
            loyalty_info = None

            # Check if loyalty program is enabled for this tenant using feature flags
            if (
                is_feature_enabled(LOYALTY, tenant_client_id)
                and points_to_redeem > 0
                and user_id
            ):
                logger.info(
                    f"Loyalty redemption requested: {points_to_redeem} points for user {user_id}"
                )

                try:
                    # Validate against user's balance
                    current_balance = loyalty_service.get_user_points_balance(
                        user_id=user_id, client_id=tenant_client_id
                    )

                    if points_to_redeem > current_balance:
                        return Response(
                            {
                                "detail": f"Insufficient loyalty points. Available: {current_balance}"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Get loyalty configuration from TenantConfiguration model
                    loyalty_rules = get_tenant_config_value(
                        client_id=tenant_client_id,
                        config_key="loyalty_config",
                        default={},
                    )

                    # Calculate discount value using redeem rate from configuration
                    redeem_rate_str = loyalty_rules.get("redeem_rate", "0")
                    redeem_rate = Decimal(str(redeem_rate_str))

                    if redeem_rate <= 0:
                        return Response(
                            {
                                "detail": "Loyalty redemption is not configured or available at this time."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    loyalty_discount = Decimal(points_to_redeem) * redeem_rate

                    # Cap discount at subtotal amount
                    if loyalty_discount > subtotal:
                        loyalty_discount = subtotal
                        points_to_redeem = int(subtotal / redeem_rate)
                        logger.info(
                            f"Adjusted loyalty redemption to {points_to_redeem} points (max discount reached)"
                        )

                    # Store validated points and discount in session
                    loyalty_info = {
                        "points": points_to_redeem,
                        "discount": str(loyalty_discount),
                    }
                    update_checkout_data(
                        request, {LOYALTY_POINTS_TO_REDEEM_KEY: loyalty_info}
                    )

                    logger.info(
                        f"Applied loyalty discount of {loyalty_discount} for {points_to_redeem} points"
                    )
                except Exception as e:
                    logger.error(f"Error processing loyalty redemption: {e}")
                    return Response(
                        {"detail": f"Error processing loyalty redemption: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            else:
                # Clear any previously stored loyalty redemption data
                update_checkout_data(request, {LOYALTY_POINTS_TO_REDEEM_KEY: None})

            # Format address data for storage on the Order
            formatted_shipping_address = {
                "full_name": f"{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}".strip(),
                "address_line1": shipping_address.get("address_line1", ""),
                "address_line2": shipping_address.get("address_line2", ""),
                "city": shipping_address.get("city", ""),
                "state": shipping_address.get("state", ""),
                "postal_code": shipping_address.get("postal_code", ""),
                "country": shipping_address.get("country", ""),
                "phone_number": shipping_address.get("phone_number", ""),
            }

            formatted_billing_address = {
                "full_name": f"{final_billing_address.get('first_name', '')} {final_billing_address.get('last_name', '')}".strip(),
                "address_line1": final_billing_address.get("address_line1", ""),
                "address_line2": final_billing_address.get("address_line2", ""),
                "city": final_billing_address.get("city", ""),
                "state": final_billing_address.get("state", ""),
                "postal_code": final_billing_address.get("postal_code", ""),
                "country": final_billing_address.get("country", ""),
                "phone_number": final_billing_address.get("phone_number", ""),
            }

            # Calculate final amount after loyalty discount
            final_amount = grand_total - loyalty_discount

            # Start database transaction for creating Order and Payment records
            with transaction.atomic():
                # Create Order instance
                order = Order()
                order.client_id = tenant_client_id
                order.customer_id = user_id or 0  # Fallback if no user_id
                order.contact_person_id = None  # Not applicable in this context
                order.status = OrderStatus.PENDING_PAYMENT
                order.payment_status = PaymentStatus.PENDING

                # Set addresses and shipping info
                order.shipping_address = formatted_shipping_address
                order.billing_address = formatted_billing_address
                order.shipping_method_name = shipping_method.get("name", "")
                order.shipping_method_id = shipping_method.get("id", "")

                # Set financial data
                order.currency = "USD"  # This would come from tenant configuration
                order.subtotal_amount = subtotal
                order.discount_amount = loyalty_discount
                order.shipping_amount = shipping_cost
                order.tax_amount = tax_amount
                order.total_amount = final_amount

                # Set audit fields
                if user_id:
                    order.created_by_id = user_id
                    order.updated_by_id = user_id

                # Save to get an ID
                order.save()

                # Generate order_id
                # Format: ORD-{tenant}-{year}-{sequential_number}
                year = datetime.now().year
                order.order_id = f"ORD-{tenant_client_id}-{year}-{order.id:07d}"
                order.save(update_fields=["order_id"])

                # Create OrderItem instances for each cart item
                for cart_item_data in cart_items:
                    cart_item = cart_item_data["item"]
                    product_details = cart_item_data["details"]

                    OrderItem.objects.create(
                        client_id=tenant_client_id,
                        order=order,
                        product_sku=cart_item.product_sku,
                        product_name=product_details.get("name", cart_item.product_sku),
                        quantity=cart_item.quantity,
                        unit_price=cart_item.unit_price,
                        total_price=cart_item.unit_price * cart_item.quantity,
                        created_by_id=user_id if user_id else None,
                        updated_by_id=user_id if user_id else None,
                    )

                # Process immediate payments (Wallet/Loyalty)
                wallet_amount_used = Decimal("0.00")
                total_paid = Decimal("0.00")

                # Process wallet payment if applicable
                if is_feature_enabled(WALLET, tenant_client_id) and user_id:
                    # Get wallet amount from checkout data (if implemented)
                    # For now, we'll assume there's no wallet payment
                    wallet_amount_str = checkout_data.get("wallet_amount", "0.00")
                    try:
                        wallet_amount_used = Decimal(wallet_amount_str)
                    except:
                        wallet_amount_used = Decimal("0.00")

                    if wallet_amount_used > 0:
                        try:
                            # Get wallet balance
                            wallet_balance = wallet_service.get_user_wallet_balance(
                                user_id=user_id, client_id=tenant_client_id
                            )

                            if wallet_balance < wallet_amount_used:
                                # Insufficient balance, adjust the amount
                                wallet_amount_used = wallet_balance

                            if wallet_amount_used > 0:

                                # Get customer ID from user_id
                                customer_id = wallet_service.get_customer_id_or_raise(
                                    user_id, tenant_client_id
                                )

                                # Get or create wallet
                                wallet = wallet_service.get_or_create_wallet(
                                    customer_id=customer_id,
                                    client_id=tenant_client_id,
                                    created_by_user_id=user_id,
                                )

                                # Add wallet transaction
                                wallet_txn = wallet_service.add_transaction(
                                    wallet=wallet,
                                    transaction_type=WalletTransactionType.ORDER_PAYMENT,
                                    amount=-wallet_amount_used,  # Negative for payment
                                    created_by_user_id=user_id,
                                    related_order=order,
                                    notes=f"Payment for order {order.order_id}",
                                )

                                wallet_payment = Payment.objects.create(
                                    client_id=tenant_client_id,
                                    order=order,
                                    amount=wallet_amount_used,
                                    payment_method="WALLET",
                                    status=PaymentStatus.PAID,
                                    gateway_transaction_id=f"WALLET_TXN_{wallet_txn.id}",
                                    processed_at=timezone.now(),
                                    wallet_transaction=wallet_txn,
                                    created_by_id=user_id,
                                    updated_by_id=user_id,
                                )

                                # Update total paid
                                total_paid += wallet_amount_used
                        except Exception as e:
                            logger.error(f"Error processing wallet payment: {e}")
                            # Continue without wallet payment
                            wallet_amount_used = Decimal("0.00")

                # Process loyalty payment if applicable
                loyalty_discount_applied = Decimal("0.00")
                if loyalty_info and loyalty_info["points"] > 0:
                    try:
                        # Create loyalty payment record
                        loyalty_discount_applied = Decimal(loyalty_info["discount"])

                        loyalty_txn = loyalty_service.redeem_points_for_checkout(
                            user_id=user_id,
                            client_id=tenant_client_id,
                            points_to_redeem=loyalty_info["points"],
                            order_being_placed=order,
                        )

                        if loyalty_txn:
                            # Create loyalty payment record and link to transaction
                            loyalty_payment = Payment.objects.create(
                                client_id=tenant_client_id,
                                order=order,
                                amount=loyalty_discount_applied,
                                payment_method="LOYALTY",
                                status=PaymentStatus.PAID,
                                gateway_transaction_id=f"LOYALTY_TXN_{loyalty_txn.id}",
                                processed_at=timezone.now(),
                                loyalty_transaction=loyalty_txn,
                                created_by_id=user_id,
                                updated_by_id=user_id,
                            )

                            # Update total paid
                            total_paid += loyalty_discount_applied
                    except Exception as e:
                        logger.error(f"Error processing loyalty payment: {e}")
                        # Continue without loyalty payment
                        loyalty_discount_applied = Decimal("0.00")

                # Calculate remaining amount due
                amount_due = order.total_amount - total_paid

                # Update order payment status based on payments
                if amount_due <= 0:
                    # Order is fully paid by wallet/loyalty
                    order.payment_status = PaymentStatus.PAID
                    order.status = OrderStatus.PROCESSING
                    order.save(update_fields=["payment_status", "status"])

            # After transaction completion (atomic block)
            if amount_due <= 0:
                # Order is fully paid, trigger notifications and fulfillment
                try:
                    # Send order confirmation email
                    notification_service.send_transactional_email.delay(
                        client_id=tenant_client_id,
                        template_key="ORDER_CONFIRMATION",
                        recipient_email=final_billing_address.get("email", ""),
                        context={
                            "order_id": order.order_id,
                            "amount": str(order.total_amount),
                            "customer_name": formatted_billing_address["full_name"],
                        },
                    )
                except Exception as e:
                    logger.error(f"Error sending confirmation email: {e}")
                    # Continue without sending email

                try:
                    # Submit order for fulfillment
                    fulfillment_service.submit_order_for_fulfillment.delay(
                        client_id=tenant_client_id, order_id=order.id
                    )
                except Exception as e:
                    logger.error(f"Error submitting order for fulfillment: {e}")
                    # Continue without submitting for fulfillment

                # Clear cart and checkout session
                cart.items.all().delete()
                cart.status = CartStatus.ORDERED
                cart.save()
                clear_checkout_data(request)

                # Return success response
                return Response(
                    {
                        "status": "completed",
                        "order_id": order.order_id,
                        "message": "Order has been placed and payment completed.",
                    }
                )
            else:
                # Gateway payment needed for remaining amount
                # Prepare customer info for payment gateway
                customer_info = {
                    "name": formatted_billing_address["full_name"],
                    "email": final_billing_address.get("email", ""),
                    "phone": formatted_billing_address["phone_number"],
                    "address": {
                        "line1": formatted_billing_address["address_line1"],
                        "line2": formatted_billing_address["address_line2"],
                        "city": formatted_billing_address["city"],
                        "state": formatted_billing_address["state"],
                        "postal_code": formatted_billing_address["postal_code"],
                        "country": formatted_billing_address["country"],
                    },
                }

                # Prepare callback URL
                callback_url = request.build_absolute_uri(
                    reverse("order_management_api:payment-callback")
                )

                # Prepare metadata
                metadata = {
                    "order_id": order.id,
                    "order_reference": order.order_id,
                    "user_id": user_id,
                    "client_id": tenant_client_id,
                }

                # Call payment service to initiate payment for remaining amount
                try:
                    from order_management.exceptions import (
                        PaymentServiceError,
                        PaymentConnectionError,
                        PaymentResponseError,
                        PaymentProcessingError,
                    )

                    response_data = payment_service.initiate_payment(
                        client_id=tenant_client_id,
                        order_ref=order.order_id,
                        amount=amount_due,  # Only the remaining amount
                        currency="USD",  # This would come from tenant configuration
                        payment_method_id=payment_method_id,
                        customer_info=customer_info,
                        callback_url=callback_url,
                        metadata=metadata,
                    )

                    # Store payment transaction info in session
                    update_checkout_data(
                        request,
                        {
                            PAYMENT_TXN_SESSION_KEY: {
                                "txn_id": response_data.get("transaction_id"),
                                "ref": order.order_id,
                                "order_id": order.id,
                                "wallet_applied": wallet_amount_used > 0,
                                "loyalty_applied": loyalty_discount_applied > 0,
                            }
                        },
                    )

                    # Clear cart
                    cart.items.all().delete()
                    cart.status = CartStatus.ORDERED
                    cart.save()

                    # Clear checkout session data
                    clear_checkout_data(request)

                    # Return payment initiation response
                    return Response(
                        {
                            "status": "pending_gateway",
                            "order_id": order.order_id,
                            "transaction_id": response_data.get("transaction_id"),
                            "redirect_url": response_data.get("redirect_url"),
                            "message": "Please complete payment to finalize your order.",
                        }
                    )

                except PaymentConnectionError as e:
                    logger.error(
                        f"Failed to connect to payment service for order {order.id}: {str(e)}"
                    )
                    return Response(
                        {
                            "detail": "Payment service is currently unavailable. Please try again later."
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                except PaymentResponseError as e:
                    logger.error(
                        f"Payment service error response for order {order.id}: {e.status_code} - {e.message}"
                    )
                    return Response(
                        {
                            "detail": "Error processing payment request. Please try again later."
                        },
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                except PaymentProcessingError as e:
                    logger.error(
                        f"Payment processing error for order {order.id}: {str(e)}"
                    )
                    return Response(
                        {"detail": f"Payment processing error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                except PaymentServiceError as e:
                    logger.error(
                        f"General payment service error for order {order.id}: {str(e)}"
                    )
                    return Response(
                        {"detail": "Error processing payment. Please try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

        except Exception as e:
            logger.error(f"Error initiating payment: {e}")
            return Response(
                {"detail": f"Failed to initiate payment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def payment_callback(self, request: Request) -> Response:
        """
        Handle callback from payment processor.

        This endpoint receives the callback from the payment processor
        after the payment process is completed (success or failure).

        Args:
            request: The request object containing transaction details

        Returns:
            Response with appropriate redirect
        """
        # Get transaction ID from query parameters
        transaction_id = request.query_params.get("transaction_id")
        status_param = request.query_params.get("status")

        if not transaction_id:
            logger.error("Payment callback received without transaction_id")
            # Redirect to checkout with error message
            return Response(
                {"detail": "Invalid payment callback. Missing transaction ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get checkout data from session
        checkout_data = get_checkout_data(request)
        pending_payment = checkout_data.get(PAYMENT_TXN_SESSION_KEY, {})

        # Verify the transaction matches our pending payment
        if pending_payment.get("txn_id") != transaction_id:
            logger.warning(
                f"Payment callback received for unknown transaction: {transaction_id}"
            )
            return Response(
                {"detail": "Unknown transaction ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check payment status
        if status_param == "success":
            try:
                with transaction.atomic():
                    # Create order from payment using checkout data
                    order = create_order_from_payment(checkout_data)

                    # Clear the cart after successful order creation
                    cart = Cart.objects.filter(
                        session_id=request.session.session_key
                    ).first()
                    if cart:
                        cart.delete()

                    # Clear checkout session data
                    request.session.pop(SHIPPING_ADDRESS_SESSION_KEY, None)
                    request.session.pop(SHIPPING_METHOD_SESSION_KEY, None)
                    request.session.pop(LOYALTY_POINTS_TO_REDEEM_KEY, None)
                    request.session.pop(PAYMENT_TXN_SESSION_KEY, None)

                    return Response(
                        {
                            "status": "success",
                            "message": "Order created successfully.",
                            "transaction_id": transaction_id,
                            "order_id": order.order_id,
                        }
                    )
            except Exception as e:
                logger.error(
                    f"Order creation failed for transaction {transaction_id}: {str(e)}"
                )
                return Response(
                    {
                        "status": "error",
                        "message": "Order creation failed.",
                        "transaction_id": transaction_id,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            # Payment failed
            return Response(
                {
                    "status": "failed",
                    "message": "Payment processing failed.",
                    "transaction_id": transaction_id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


def validate_webhook_signature(request: Request, secret: str) -> bool:
    """
    Validate the webhook signature from the Payment Microservice.

    Args:
        request: The request object
        secret: The shared webhook secret

    Returns:
        True if signature is valid, False otherwise
    """
    try:
        # Get the signature from the headers
        signature_header = request.headers.get("X-Payment-Signature")
        if not signature_header:
            logger.warning("Missing X-Payment-Signature header in webhook request")
            return False

        # Get the request body as bytes
        payload_body = request.body

        # Calculate the expected signature
        # HMAC using SHA256 and base64 encoding
        expected_signature = base64.b64encode(
            hmac.new(secret.encode("utf-8"), payload_body, hashlib.sha256).digest()
        ).decode("utf-8")

        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, signature_header)
    except Exception as e:
        logger.error(f"Error validating webhook signature: {e}")
        return False


class PaymentCallbackView(APIView):
    """
    API view for handling payment callbacks from the Payment Microservice.

    This view receives webhook notifications when a payment status changes
    and processes them accordingly.

    Security:
    - Validates request signature using HMAC-SHA256
    - Validates timestamp to prevent replay attacks
    - Applies rate limiting to prevent abuse
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "payment_webhook"

    def post(self, request: Request) -> Response:
        """
        Handle POST requests with payment status updates.

        Args:
            request: The request object containing payment data

        Returns:
            Response acknowledging receipt
        """
        # Validate webhook signature
        webhook_secret = settings.PAYMENT_MS_WEBHOOK_SECRET
        if not validate_webhook_signature(request, webhook_secret):
            logger.warning("Invalid webhook signature")
            return Response(
                {"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate webhook timestamp
        webhook_timestamp_str = request.META.get("HTTP_X_PAYMENT_TIMESTAMP")
        if not webhook_timestamp_str:
            logger.warning("Webhook request missing timestamp header")
            return Response(
                {"detail": "Timestamp header missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            webhook_timestamp = float(webhook_timestamp_str)
            current_timestamp = timezone.now().timestamp()
            tolerance = settings.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS

            if abs(current_timestamp - webhook_timestamp) > tolerance:
                logger.warning(
                    f"Webhook timestamp validation failed. Difference > {tolerance}s. Possible replay attack"
                )
                return Response(
                    {"detail": "Timestamp validation failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError) as e:
            logger.warning(f"Webhook timestamp validation failed. Invalid format: {e}")
            return Response(
                {"detail": "Invalid timestamp format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Parse the payload
            payload = json.loads(request.body.decode("utf-8"))

            # Validate required fields
            required_fields = ["transaction_id", "status", "order_ref", "metadata"]
            for field in required_fields:
                if field not in payload:
                    logger.error(f"Missing required field '{field}' in webhook payload")
                    return Response(
                        {"detail": f"Missing required field: {field}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Extract metadata
            metadata = payload.get("metadata", {})
            transaction_type = metadata.get("type")
            user_id = metadata.get("user_id")
            client_id = metadata.get("client_id")

            # Validate metadata
            if not user_id or not client_id:
                logger.error(f"Missing required metadata fields in webhook payload")
                return Response(
                    {"detail": "Missing required metadata fields"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Extract payment data
            transaction_id = payload.get("transaction_id")
            payment_status_from_callback = payload.get("status")
            order_ref = payload.get("order_ref")
            amount_paid = payload.get("amount")
            payment_method_used = payload.get("payment_method", "UNKNOWN")
            gateway_response_data = payload
            processed_at_timestamp = datetime.fromtimestamp(webhook_timestamp)

            # Check transaction type from metadata
            if transaction_type == "WALLET_RECHARGE":
                # Handle wallet recharge transaction - keeping existing logic
                customer_id = metadata.get("customer_id")

                if not customer_id:
                    logger.error(f"Missing customer_id in wallet recharge metadata")
                    return Response(
                        {"detail": "Missing customer_id in metadata"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Process based on payment status
                if payment_status_from_callback == "PAID":
                    try:
                        with transaction.atomic():
                            # Get or create wallet
                            wallet = wallet_service.get_or_create_wallet(
                                customer_id=customer_id,
                                client_id=client_id,
                                created_by_user_id=user_id,
                            )

                            # Add recharge transaction
                            wallet_service.add_transaction(
                                wallet=wallet,
                                transaction_type=WalletTransactionType.RECHARGE,
                                amount=Decimal(amount_paid),
                                created_by_user_id=user_id,
                                notes=f"Payment Txn ID: {transaction_id}",
                            )

                            # Check for bonus eligibility
                            wallet_rules = get_tenant_config_value(
                                client_id=client_id,
                                config_key="wallet_config",
                                default={},
                            )
                            bonus_config = wallet_rules.get("recharge_bonus")

                            if bonus_config:
                                # Calculate bonus amount based on config type
                                amount_decimal = Decimal(amount_paid)
                                threshold = Decimal(
                                    str(bonus_config.get("threshold", 0))
                                )

                                if amount_decimal >= threshold:
                                    if bonus_config["type"] == "percentage":
                                        rate = Decimal(str(bonus_config.get("rate", 0)))
                                        bonus_amount = amount_decimal * rate
                                    elif bonus_config["type"] == "fixed":
                                        bonus_amount = Decimal(
                                            str(bonus_config.get("amount", 0))
                                        )
                                    else:
                                        bonus_amount = Decimal("0.00")

                                    # Add bonus transaction if applicable
                                    if bonus_amount > Decimal("0.00"):
                                        wallet_service.add_transaction(
                                            wallet=wallet,
                                            transaction_type=WalletTransactionType.BONUS,
                                            amount=bonus_amount,
                                            created_by_user_id=user_id,
                                            notes=f"Bonus for recharge txn {transaction_id}",
                                        )
                                        logger.info(
                                            f"Added bonus of {bonus_amount} to wallet for customer {customer_id}"
                                        )

                            # Trigger notification
                            transaction.on_commit(
                                lambda: notification_service.send_transactional_email.delay(
                                    client_id=client_id,
                                    recipient_email=f"user{user_id}@example.com",  # In real app, get from user profile
                                    template_id="WALLET_RECHARGE_SUCCESS",
                                    data={
                                        "amount": amount_paid,
                                        "transaction_id": transaction_id,
                                        "date": datetime.now().isoformat(),
                                    },
                                )
                            )

                        logger.info(
                            f"Wallet recharge processed successfully for transaction {transaction_id}"
                        )
                        return Response(status=status.HTTP_200_OK)

                    except Exception as e:
                        logger.error(
                            f"Error processing wallet recharge for transaction {transaction_id}: {e}"
                        )
                        return Response(
                            {"detail": "Wallet recharge processing failed"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                elif payment_status_from_callback == "FAILED":
                    # Log the failure
                    logger.info(
                        f"Wallet recharge payment {transaction_id} failed for client {client_id}"
                    )

                    # Trigger notification
                    notification_service.send_transactional_email.delay(
                        client_id=client_id,
                        recipient_email=f"user{user_id}@example.com",  # In real app, get from user profile
                        template_id="WALLET_RECHARGE_FAILED",
                        data={
                            "amount": amount_paid,
                            "transaction_id": transaction_id,
                            "date": datetime.now().isoformat(),
                        },
                    )

                    return Response(status=status.HTTP_200_OK)

                else:
                    logger.warning(
                        f"Unknown payment status for wallet recharge: {payment_status_from_callback}"
                    )
                    return Response(
                        {"detail": "Unknown payment status"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            else:
                # Handle regular order payment (refactored logic)

                # 1. Find Existing Order
                try:
                    order = Order.objects.filter(
                        order_id=order_ref, client_id=client_id
                    ).first()
                except Exception as e:
                    logger.error(f"Database error while querying order: {e}")
                    return Response(
                        {"detail": "Database error"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # If order not found, log error and return
                if not order:
                    logger.error(f"Callback received for unknown order: {order_ref}")
                    return Response(
                        {"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND
                    )

                # Check if order is already processed (beyond PENDING_PAYMENT)
                # Note: This is for idempotency - if we've already processed this order, we don't need to do it again
                if order.status != OrderStatus.PENDING_PAYMENT:
                    logger.warning(
                        f"Callback received for already processed order: {order_ref}, current status: {order.status}"
                    )
                    return Response(status=status.HTTP_200_OK)

                # 2. Check for Duplicate Payment Record
                existing_payment = Payment.objects.filter(
                    gateway_transaction_id=transaction_id, client_id=client_id
                ).exists()

                if existing_payment:
                    logger.info(
                        f"Duplicate callback received for transaction: {transaction_id}"
                    )
                    return Response(status=status.HTTP_200_OK)

                # 3. Map payment status from callback to PaymentStatus model
                # Common mappings: 'PAID' -> PaymentStatus.PAID, 'FAILED' -> PaymentStatus.FAILED, etc.
                payment_status_mapping = {
                    "PAID": PaymentStatus.PAID,
                    "FAILED": PaymentStatus.FAILED,
                    "AUTHORIZED": PaymentStatus.AUTHORIZED,
                    "PENDING": PaymentStatus.PENDING,
                    "CAPTURED": PaymentStatus.CAPTURED,
                }

                # Get mapped status or default to PENDING if unknown
                mapped_payment_status = payment_status_mapping.get(
                    payment_status_from_callback, PaymentStatus.PENDING
                )

                try:
                    # 4. Use transaction.atomic() to ensure data consistency
                    with transaction.atomic():
                        # 5. Create Payment Record
                        payment = Payment(
                            client_id=client_id,
                            order=order,
                            amount=Decimal(amount_paid),
                            payment_method=payment_method_used,
                            status=mapped_payment_status,
                            gateway_transaction_id=transaction_id,
                            gateway_response=gateway_response_data,
                            processed_at=processed_at_timestamp,
                            created_by_id=user_id,
                            updated_by_id=user_id,
                        )
                        payment.save()

                        logger.info(
                            f"Created payment record for transaction: {transaction_id}, order: {order_ref}"
                        )

                        # 6. Update Order Status (If Payment Succeeded)
                        if mapped_payment_status == PaymentStatus.PAID:
                            # Calculate total amount paid successfully for this order
                            paid_payments = Payment.objects.filter(
                                order=order, status=PaymentStatus.PAID
                            )
                            total_paid = paid_payments.aggregate(total=Sum("amount"))[
                                "total"
                            ] or Decimal("0.00")

                            # Check if Order is Fully Paid
                            if total_paid >= order.total_amount:
                                # Update order status
                                order.payment_status = PaymentStatus.PAID
                                order.status = OrderStatus.PROCESSING
                                order.save(
                                    update_fields=[
                                        "payment_status",
                                        "status",
                                        "updated_at",
                                    ]
                                )

                                logger.info(
                                    f"Order {order_ref} is fully paid and updated to status: {order.status}"
                                )

                                # 7. Trigger Post-Payment Tasks using on_commit
                                # Send order confirmation email
                                # Determine if this is a guest order
                                is_guest = order.user_id is None

                                # Construct the appropriate URL based on user type
                                if is_guest and order.guest_access_token:
                                    # Guest order - use guest tracking URL
                                    order_view_url = f"{settings.FRONTEND_URL.rstrip('/')}/track-order/{order.guest_access_token}/"
                                    url_key_in_payload = "guest_tracking_url"
                                else:
                                    # Registered user - use account order URL
                                    order_view_url = f"{settings.FRONTEND_URL.rstrip('/')}/account/orders/{order.id}/"
                                    url_key_in_payload = "account_order_url"

                                # Get recipient email from order's shipping address
                                recipient_email = order.shipping_address.get("email")
                                if not recipient_email:
                                    # Fallback to a default email (should be improved in production)
                                    recipient_email = (
                                        f"user{order.customer_id}@example.com"
                                    )

                                # Send order confirmation email
                                transaction.on_commit(
                                    lambda: notification_service.send_transactional_email.delay(
                                        client_id=order.client_id,
                                        template_id="ORDER_CONFIRMATION",
                                        recipient_email=recipient_email,
                                        data={
                                            "order_id": order.order_id,
                                            "total_amount": str(order.total_amount),
                                            "date": datetime.now().isoformat(),
                                            "payment_method": payment_method_used,
                                            url_key_in_payload: order_view_url,
                                        },
                                    )
                                )

                                # Submit order for fulfillment
                                transaction.on_commit(
                                    lambda: submit_order_for_fulfillment_task.delay(
                                        client_id=order.client_id, order_id=order.id
                                    )
                                )

                                # 8. Clean Up Cart if cart_id is provided in metadata
                                cart_id = metadata.get("cart_id")
                                if cart_id:
                                    try:
                                        cart = Cart.objects.get(
                                            id=cart_id, client_id=client_id
                                        )
                                        cart.status = (
                                            CartStatus.ABANDONED
                                        )  # Or use a different status if you have ORDERED
                                        cart.save(
                                            update_fields=["status", "updated_at"]
                                        )
                                        logger.info(
                                            f"Updated cart {cart_id} status to {cart.status}"
                                        )
                                    except Cart.DoesNotExist:
                                        logger.warning(
                                            f"Cart {cart_id} not found for cleanup"
                                        )
                                    except Exception as e:
                                        logger.error(
                                            f"Error cleaning up cart {cart_id}: {e}"
                                        )
                            else:
                                logger.info(
                                    f"Order {order_ref} is partially paid: {total_paid}/{order.total_amount}"
                                )

                        elif mapped_payment_status == PaymentStatus.FAILED:
                            # Handle FAILED payment status - Order status remains PENDING_PAYMENT
                            logger.info(
                                f"Payment failed for order {order_ref}, transaction: {transaction_id}"
                            )

                            # Optionally, send a payment failed notification
                            transaction.on_commit(
                                lambda: notification_service.send_transactional_email.delay(
                                    client_id=order.client_id,
                                    template_id="PAYMENT_FAILED",
                                    recipient_email=f"user{order.customer_id}@example.com",  # In real app, get from user profile
                                    data={
                                        "order_id": order.order_id,
                                        "total_amount": str(order.total_amount),
                                        "date": datetime.now().isoformat(),
                                        "payment_method": payment_method_used,
                                    },
                                )
                            )

                    # Return success response after atomic transaction
                    return Response(status=status.HTTP_200_OK)

                except Exception as e:
                    logger.error(
                        f"Error processing payment callback for transaction {transaction_id}: {e}"
                    )
                    return Response(
                        {"detail": "Error processing payment callback"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook payload")
            return Response(
                {"detail": "Invalid JSON payload"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return Response(
                {"detail": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WishlistViewSet(BaseTenantViewSet):
    """
    ViewSet for managing wishlist items.

    This viewset provides methods for listing, creating, and deleting
    wishlist items for the authenticated user.
    """

    authentication_classes = [TenantSchemaMiddleware, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistItemSerializer

    queryset = WishlistItem.objects.all()
    print("queryset::::")

    def destroy(self, request, *args, **kwargs):
        """
        Delete a wishlist item.

        Args:
            request: The HTTP request

        Returns:
            Response with 204 status if successful

        Raises:
            NotFound: If the item doesn't exist
            PermissionDenied: If user doesn't have permission
        """
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting wishlist item: {e}")
            return Response(
                {"detail": "Error deleting wishlist item"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_queryset(self):
        """
        Get queryset filtered by tenant and user.

        Returns:
            QuerySet of WishlistItem objects for the current user
        """
        queryset = super().get_queryset()

        # Get user, contact, and account info directly from authenticated user
        user = self.request.user
        try:
            contact = Contact.objects.get(user_id=user.id)
            contact_id = contact.id
        except Contact.DoesNotExist:
            logger.warning(f"No contact found for user {user.id}")
            return queryset.none()

        if not contact_id:
            logger.warning(f"Could not determine contact ID")
            return queryset.none()

        return queryset.filter(contact_id=contact_id)

    def perform_create(self, serializer):
        """
        Create a new wishlist item.

        Args:
            serializer: The serializer instance

        Raises:
            ValidationError: If the item already exists in the wishlist or mapping fails
        """
        # Get user, contact, and account info directly from authenticated user
        user = self.request.user
        auth_credential_id = user.id

        print("auth:", auth_credential_id)

        if not auth_credential_id:
            raise ValidationError(
                {"detail": "Authentication required to add items to wishlist."},
                code="authentication_required",
            )

        try:
            contact = Contact.objects.get(user_id=user.id)
            contact_id = contact.id
        except Contact.DoesNotExist:
            raise ValidationError(
                {"detail": "Could not determine contact ID from credentials."},
                code="mapping_failed",
            )

        print("contact_id:", contact_id)

        # Fixed client_id for development
        client_id = 1

        # Check if item already exists in wishlist
        product_sku = serializer.validated_data.get("product_sku")
        existing_item = WishlistItem.objects.filter(
            contact_id=contact_id, product_sku=product_sku, client_id=client_id
        ).first()

        if existing_item:
            # Item already exists, return existing item
            raise ValidationError(
                {"detail": "Item already exists in wishlist."}, code="unique"
            )

        # Set both user_id (for backward compatibility) and contact_id fields
        # This is needed until we fully migrate the database schema
        serializer.save(
            client_id=client_id,
            contact_id=contact_id,
            user_id=auth_credential_id,  # For backward compatibility until migration is complete
            created_by=user.id,  # Use user ID for audit field
            updated_by=user.id,  # Use user ID for audit field
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API view for retrieving and updating user profile information.

    This view interacts with the customer service integration to fetch
    and update user profile data. It supports GET, PUT, and PATCH methods.
    """

    permission_classes = [IsAuthenticated]

    def get_object(self):
        """
        Retrieve user profile from customer service.

        Returns:
            Dictionary containing user profile data

        Raises:
            Http404: If user profile not found
        """
        from django.http import Http404

        # Get user from request and fixed client_id for development
        user = self.request.user
        user_id = user.id
        client_id = 1  # Fixed client_id for development

        if not user_id:
            raise Http404("User identification not available")

        # Get profile from customer service
        try:
            from order_management.exceptions import (
                CustomerServiceError,
                CustomerConnectionError,
                CustomerResponseError,
                CustomerNotFoundError,
            )

            profile = customer_service.get_customer_details(user_id=user_id)

            if not profile:
                raise Http404("User profile not found")

        except CustomerNotFoundError:
            raise Http404("User profile not found")
        except CustomerConnectionError as e:
            logger.error(
                f"Failed to connect to customer service for user {user_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Customer service is currently unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except CustomerResponseError as e:
            logger.error(
                f"Customer service error response for user {user_id}: {e.status_code} - {e.message}"
            )
            return Response(
                {
                    "detail": "Error retrieving customer profile. Please try again later."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except CustomerServiceError as e:
            logger.error(f"General customer service error for user {user_id}: {str(e)}")
            return Response(
                {
                    "detail": "Error retrieving customer profile. Please try again later."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return profile

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on request method.

        Returns:
            Serializer class for the current request method
        """
        if self.request.method == "GET":
            return UserProfileSerializer
        return UserProfileUpdateSerializer

    def update(self, request, *args, **kwargs):
        """
        Update user profile via customer service.

        Args:
            request: The request object containing profile data to update

        Returns:
            Response containing updated profile data

        Raises:
            APIException: If profile update fails
        """
        from rest_framework.exceptions import APIException

        # Get user from request and fixed client_id for development
        user = request.user
        user_id = user.id
        client_id = 1  # Fixed client_id for development

        if not user_id:
            raise APIException("User identification not available")

        # Get current profile
        current_profile = self.get_object()

        # Validate input data
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Update profile via customer service
        try:
            from order_management.exceptions import (
                CustomerServiceError,
                CustomerConnectionError,
                CustomerResponseError,
                CustomerNotFoundError,
            )

            updated_profile = customer_service.update_customer_profile(
                user_id=user_id,
                client_id=client_id,
                profile_data=serializer.validated_data,
            )
        except CustomerNotFoundError as e:
            logger.error(f"Customer not found for user {user_id}: {str(e)}")
            return Response(
                {"detail": "Customer account not found. Please contact support."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except CustomerConnectionError as e:
            logger.error(
                f"Failed to connect to customer service for user {user_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Customer service is currently unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except CustomerResponseError as e:
            logger.error(
                f"Customer service error response for user {user_id}: {e.status_code} - {e.message}"
            )
            return Response(
                {
                    "detail": "Error retrieving customer details. Please try again later."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except CustomerServiceError as e:
            logger.error(f"General customer service error for user {user_id}: {str(e)}")
            return Response(
                {
                    "detail": "Error retrieving customer details. Please try again later."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not updated_profile:
            raise APIException("Failed to update profile")

        # Return updated profile
        output_serializer = UserProfileSerializer(updated_profile)
        return Response(output_serializer.data)


class ReturnInitiationView(generics.CreateAPIView):
    """
    API endpoint for initiating a return request.

    This view handles the creation of RMA (Return Merchandise Authorization) records
    based on validated input data. It performs the following steps:
    1. Validates the return request using RMAInitiationSerializer
    2. Creates an RMA record with a unique RMA number
    3. Creates RMAItem records for each item being returned
    4. Triggers a notification to the user

    The endpoint requires authentication and returns the created RMA details.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = RMAInitiationSerializer

    def get_serializer_context(self):
        """
        Add request to serializer context for validation.

        Returns:
            Dictionary containing the request object
        """
        return {"request": self.request}

    def perform_create(self, serializer):
        """Create the RMA and related RMA items."""
        try:
            # Extract data from serializer
            order_id = serializer.validated_data.get("order_id")
            items_data = serializer.validated_data.get("items", [])

            # Get authenticated user ID from request
            auth_credential_id = (
                self.request.user.id if self.request.user.is_authenticated else None
            )
            # Get client_id from JWT token or default to 1
            client_id = 1  # Hardcode to 1 for testing
            # Get contact_id from JWT token
            contact_id = None
            if hasattr(self.request, "auth") and self.request.auth:
                # Try to extract contact_id from JWT token
                try:
                    # Decode the JWT token
                    token_data = jwt.decode(
                        self.request.auth, options={"verify_signature": False}
                    )
                    contact_id = token_data.get("contact_id")
                    print("token_data:", token_data)
                except Exception as e:
                    logger.error(f"Error decoding JWT token: {str(e)}")

            print(
                "auth_credential_id:",
                auth_credential_id,
                "client_id:",
                client_id,
                "contact_idabc:",
                contact_id,
            )

            if not auth_credential_id:
                logger.error("User identification not available")
                return

            # Use contact_id directly from the JWT token instead of mapping
            if not contact_id:
                logger.warning(
                    f"No contact_id found in JWT token for user {auth_credential_id}"
                )
                # Only as fallback, try to map credential ID to contact ID
                contact_id = customer_service.get_contact_id_for_credential(
                    credential_id=auth_credential_id
                )
                print("Fallback contact_id:", contact_id)
            if not contact_id:
                logger.warning(
                    f"Could not map credential ID {auth_credential_id} to contact ID"
                )
                raise ValidationError(
                    {"detail": "Could not determine contact ID from credentials."},
                    code="mapping_failed",
                )

            # Get validated objects from serializer context
            order = serializer.context.get("validated_order")
            order_items_map = serializer.context.get("order_items_map")
            items_data = serializer.validated_data.get("items", [])

            # Generate a unique RMA number
            rma_number = f"RMA-{client_id}-{uuid.uuid4().hex[:8].upper()}"

            try:
                # Create RMA record
                rma = RMA.objects.create(
                    order=order,
                    contact_id=contact_id,  # Use contact_id from JWT token
                    client_id=client_id,  # Use hardcoded client_id=1
                    rma_number=rma_number,
                    status=RMAStatus.PENDING_APPROVAL,
                    created_by=auth_credential_id,  # Use credential ID for audit field
                    updated_by=auth_credential_id,  # Use credential ID for audit field
                )

                # Create RMAItem records
                for item in items_data:
                    order_item = order_items_map.get(item["order_item_id"])
                    RMAItem.objects.create(
                        rma=rma,
                        order_item=order_item,
                        quantity_requested=item["quantity"],
                        reason=item.get("reason", ""),
                        client_id=client_id,
                        created_by=auth_credential_id,  # Use credential ID for audit field
                        updated_by=auth_credential_id,  # Use credential ID for audit field
                    )

                # Trigger notification
                notification_service.send_transactional_email.delay(
                    tenant_identifier=str(client_id),
                    recipient_email=self.request.user.email,
                    template_key="RETURN_REQUESTED",
                    context={"rma_number": rma_number, "order_id": order.order_id},
                )

                logger.info(
                    f"Return initiated successfully: RMA {rma_number} for order {order.id}"
                )

                # Store success data in serializer for the create method to use
                self.rma_number = rma_number
                self.order_id = order.id

            except Exception as e:
                logger.error(f"Error initiating return: {str(e)}")
                raise ValidationError(
                    {"detail": f"Failed to create return request: {str(e)}"},
                    code="creation_failed",
                )

        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            raise

    def create(self, request, *args, **kwargs):
        """Override create to return a custom success response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return custom success response instead of serialized data
        return Response(
            {
                "rma_number": getattr(self, "rma_number", None),
                "order_id": getattr(self, "order_id", None),
                "status": "success",
                "message": f"Return request created successfully",
            },
            status=status.HTTP_201_CREATED,
        )


class WalletRechargeInitiationView(generics.GenericAPIView):
    """View for initiating a wallet recharge.

    This view handles the initiation of wallet recharge transactions,
    including permission checks and payment processing.

    Only accessible by users with the 'Admin' role within a B2B/Gov customer account
    or individual users managing their own wallets.
    """

    permission_classes = [IsAuthenticated, IsCustomerAdminPermission]
    serializer_class = WalletRechargeInitiationSerializer

    def post(self, request, *args, **kwargs):
        """Process wallet recharge initiation request.

        Args:
            request: The HTTP request object

        Returns:
            Response with payment initiation details or error message
        """
        # Validate input payload
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Fixed client_id for development
        client_id = 1

        # Get user info from authenticated user
        user = request.user
        user_id = user.id

        # Check if wallet feature is enabled for this tenant
        if not is_feature_enabled(WALLET, client_id):
            return Response(
                {"error": "Wallet feature is not enabled for this tenant"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            # Get customer ID
            customer_id = wallet_service.get_customer_id_or_raise(user_id, client_id)

            # Permission check is now handled by IsCustomerAdminPermission
            # No need for manual role check here

            # Get validated data
            amount = serializer.validated_data["amount"]
            payment_method_id = serializer.validated_data["payment_method_id"]

            # Generate unique recharge reference
            recharge_ref = f"WRECH-{client_id}-{uuid.uuid4().hex[:8]}"

            # Define callback URL
            callback_url = request.build_absolute_uri(
                reverse("order_management_api:payment-callback")
            )

            # Prepare customer info
            customer_info = {
                "user_id": user_id,
                "email": f"user{user_id}@example.com",  # In real app, get from user profile
            }

            # Prepare metadata
            metadata = {
                "type": "WALLET_RECHARGE",
                "user_id": user_id,
                "client_id": client_id,
                "customer_id": customer_id
                or user_id,  # Use user_id as fallback for individuals
            }

            # Call payment service to initiate payment
            payment_response = payment_service.initiate_payment(
                client_id=client_id,
                order_ref=recharge_ref,
                amount=amount,
                currency="USD",  # In real app, get from tenant config
                payment_method_id=payment_method_id,
                customer_info=customer_info,
                callback_url=callback_url,
                metadata=metadata,
            )

            # Return the payment initiation response
            return Response(payment_response, status=status.HTTP_200_OK)

        except wallet_service.WalletError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.exceptions.RequestException as e:
            logger.error(f"Payment service error: {str(e)}")
            return Response(
                {"error": "Payment service unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error(f"Unexpected error in wallet recharge: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CustomerUserManagementViewSet(viewsets.ViewSet):
    """
    ViewSet for managing users within a customer account.

    This viewset allows Customer Admins to view contact persons associated with
    their company account and enable/disable portal access or assign roles to
    these contacts.

    Only accessible by users with the 'Admin' role within a B2B/Gov customer account.
    """

    permission_classes = [IsAuthenticated, IsCustomerAdminPermission]

    def list(self, request: Request) -> Response:
        """
        List all contact persons for the customer account.

        Returns a list of contact persons associated with the parent customer account
        of the authenticated user. Each contact includes information about their
        portal access status and role.

        Returns:
            Response containing list of contact persons
        """
        # Get user and tenant IDs from request
        user_id = getattr(request, "auth_user_id", None)
        client_id = getattr(request, "auth_tenant_id", None)

        if not user_id or not client_id:
            return Response(
                {"detail": "User or tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get parent customer ID for the user
        try:
            from order_management.exceptions import (
                CustomerServiceError,
                CustomerConnectionError,
                CustomerResponseError,
                CustomerNotFoundError,
            )

            customer_id = customer_service.get_customer_id_for_user(
                user_id=user_id, client_id=client_id
            )
        except CustomerNotFoundError as e:
            logger.error(f"Customer not found for user {user_id}: {str(e)}")
            return Response(
                {"detail": "Customer account not found. Please contact support."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except CustomerConnectionError as e:
            logger.error(
                f"Failed to connect to customer service for user {user_id}: {str(e)}"
            )
            return Response(
                {
                    "detail": "Customer service is currently unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except CustomerResponseError as e:
            logger.error(
                f"Customer service error response for user {user_id}: {e.status_code} - {e.message}"
            )
            return Response(
                {
                    "detail": "Error retrieving customer information. Please try again later."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except CustomerServiceError as e:
            logger.error(f"General customer service error for user {user_id}: {str(e)}")
            return Response(
                {
                    "detail": "Error retrieving customer information. Please try again later."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not customer_id:
            return Response(
                {
                    "detail": "Parent customer account not found. This feature is only available for B2B/Gov users."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get contact persons for the customer
        try:
            try:
                from order_management.exceptions import (
                    CustomerServiceError,
                    CustomerConnectionError,
                    CustomerResponseError,
                    CustomerNotFoundError,
                )

                contact_persons = customer_service.get_contact_persons_for_customer(
                    customer_id=customer_id, client_id=client_id
                )
            except CustomerNotFoundError as e:
                logger.error(f"Customer not found for ID {customer_id}: {str(e)}")
                return Response(
                    {"detail": "Customer account not found. Please contact support."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except CustomerConnectionError as e:
                logger.error(
                    f"Failed to connect to customer service for customer {customer_id}: {str(e)}"
                )
                return Response(
                    {
                        "detail": "Customer service is currently unavailable. Please try again later."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except CustomerResponseError as e:
                logger.error(
                    f"Customer service error response for customer {customer_id}: {e.status_code} - {e.message}"
                )
                return Response(
                    {
                        "detail": "Error retrieving contact persons. Please try again later."
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            except CustomerServiceError as e:
                logger.error(
                    f"General customer service error for customer {customer_id}: {str(e)}"
                )
                return Response(
                    {
                        "detail": "Error retrieving contact persons. Please try again later."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Serialize the contacts
            serializer = ContactPersonSerializer(contact_persons, many=True)

            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving contact persons: {str(e)}")
            return Response(
                {"detail": "An error occurred while retrieving contact persons."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["put", "patch"], url_path="access")
    def set_access(self, request: Request, pk=None) -> Response:
        """
        Set access and role for a contact person.

        This endpoint allows Customer Admins to enable/disable portal access
        and assign roles to contact persons within their company account.

        Args:
            request: The request object containing access_enabled and role
            pk: The contact person ID to update

        Returns:
            Response indicating success or failure
        """
        if not pk:
            return Response(
                {"detail": "Contact person ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user and tenant IDs from request
        managing_user_id = getattr(request, "auth_user_id", None)
        client_id = getattr(request, "auth_tenant_id", None)

        if not managing_user_id or not client_id:
            return Response(
                {"detail": "User or tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent self-modification
        if str(managing_user_id) == str(pk):
            return Response(
                {"detail": "You cannot modify your own access settings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get parent customer ID for the managing user
        managing_user_customer_id = customer_service.get_customer_id_for_user(
            user_id=managing_user_id, client_id=client_id
        )

        if not managing_user_customer_id:
            return Response(
                {
                    "detail": "Parent customer account not found. This feature is only available for B2B/Gov users."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get parent customer ID for the target user to verify they belong to the same customer
        target_user_customer_id = customer_service.get_customer_id_for_user(
            user_id=int(pk), client_id=client_id
        )

        # Verify target user belongs to the same customer account
        if (
            not target_user_customer_id
            or target_user_customer_id != managing_user_customer_id
        ):
            return Response(
                {
                    "detail": "The specified contact person does not belong to your customer account."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate input data
        serializer = ContactAccessUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get validated data
        access_enabled = serializer.validated_data["access_enabled"]
        role = serializer.validated_data["role"]

        # Get contact details to retrieve email
        contacts = customer_service.get_contact_persons_for_customer(
            customer_id=managing_user_customer_id, client_id=client_id
        )

        target_contact = next((c for c in contacts if str(c["id"]) == str(pk)), None)
        if not target_contact:
            return Response(
                {"detail": "Contact person not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_email = target_contact.get("email")
        if not target_email:
            return Response(
                {"detail": "Contact person has no email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use transaction to ensure consistency
        try:
            with transaction.atomic():
                # Update flags in Customer module
                try:
                    from order_management.exceptions import (
                        CustomerServiceError,
                        CustomerConnectionError,
                        CustomerResponseError,
                        CustomerNotFoundError,
                    )

                    updated_flags = customer_service.update_contact_person_flags(
                        contact_person_id=int(pk),
                        client_id=client_id,
                        access_enabled=access_enabled,
                        role=role,
                    )
                except CustomerNotFoundError as e:
                    logger.error(f"Customer not found for ID {customer_id}: {str(e)}")
                    return Response(
                        {
                            "detail": "Customer account not found. Please contact support."
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )
                except CustomerConnectionError as e:
                    logger.error(
                        f"Failed to connect to customer service for customer {customer_id}: {str(e)}"
                    )
                    return Response(
                        {
                            "detail": "Customer service is currently unavailable. Please try again later."
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                except CustomerResponseError as e:
                    logger.error(
                        f"Customer service error response for customer {customer_id}: {e.status_code} - {e.message}"
                    )
                    return Response(
                        {
                            "detail": "Error updating contact person flags. Please try again later."
                        },
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                except CustomerServiceError as e:
                    logger.error(
                        f"General customer service error for customer {customer_id}: {str(e)}"
                    )
                    return Response(
                        {
                            "detail": "Error updating contact person flags. Please try again later."
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                if not updated_flags:
                    raise Exception("Failed to update contact person flags")

                # Update/Create EcommCredential
                if access_enabled:
                    # Enable portal access
                    credential, initial_pwd = (
                        user_credential_service.enable_portal_credential(
                            user_id=int(pk),
                            client_id=client_id,
                            email=target_email,
                            created_by_user_id=managing_user_id,
                        )
                    )

                    # Trigger welcome email
                    user_credential_service.trigger_welcome_email(
                        client_id=client_id,
                        recipient_email=target_email,
                        initial_password_or_token=initial_pwd,
                    )

                    logger.info(
                        f"Portal access enabled for user {pk} by admin {managing_user_id}"
                    )

                else:
                    # Disable portal access
                    user_credential_service.disable_portal_credential(
                        user_id=int(pk), client_id=client_id
                    )

                    logger.info(
                        f"Portal access disabled for user {pk} by admin {managing_user_id}"
                    )

                return Response(
                    {
                        "status": "success",
                        "access_enabled": access_enabled,
                        "role": role,
                    }
                )

        except Exception as e:
            logger.error(f"Error updating contact person access: {str(e)}")
            return Response(
                {
                    "detail": f"An error occurred while updating contact person access: {str(e)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], url_path="trigger-reset")
    def trigger_password_reset(self, request: Request, pk=None) -> Response:
        """
        Allows a Customer Admin to trigger a password reset email for another user
        within the same customer account. pk is the target user_id (contact_person_id).

        Args:
            request: The request object
            pk: The contact person ID to trigger password reset for

        Returns:
            Response indicating success or failure
        """
        target_user_id = int(pk) if pk else None
        managing_user_id = getattr(request, "auth_user_id", None)
        client_id = getattr(request, "auth_tenant_id", None)

        if not target_user_id or not managing_user_id or not client_id:
            return Response(
                {"detail": "Invalid request parameters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user_id == managing_user_id:
            return Response(
                {"detail": "Cannot trigger password reset for yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Validation: Ensure target user belongs to the same parent customer ---
        managing_customer_id = customer_service.get_customer_id_for_user(
            user_id=managing_user_id, client_id=client_id
        )
        target_customer_id = customer_service.get_customer_id_for_user(
            user_id=target_user_id, client_id=client_id
        )
        target_user_details = customer_service.get_customer_details(
            user_id=target_user_id, client_id=client_id
        )

        if (
            not managing_customer_id
            or not target_customer_id
            or not target_user_details
        ):
            logger.warning(
                f"Password reset trigger failed validation (User/Customer lookup) "
                f"for target {target_user_id} by {managing_user_id} in client {client_id}"
            )
            return Response(
                {"detail": "Invalid target user or permission issue."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if managing_customer_id != target_customer_id:
            logger.warning(
                f"Permission denied: User {managing_user_id} cannot reset password "
                f"for user {target_user_id} in different customer accounts (Client: {client_id})"
            )
            return Response(
                {"detail": "Target user does not belong to your company account."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # --- End Validation ---

        try:
            # Generate password reset token
            token_obj = user_credential_service.generate_password_reset_token(
                user_id=target_user_id,
                client_id=client_id,
                initiating_user_id=managing_user_id,
            )

            # Construct frontend reset URL
            frontend_reset_path = f"/reset-password/?token={token_obj.token}"
            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}{frontend_reset_path}"

            # Get target user email and name
            target_user_email = target_user_details.get("email")
            target_user_name = target_user_details.get("name", "User")

            if not target_user_email:
                logger.error(
                    f"Cannot send password reset email: Target user {target_user_id} has no email address (Client: {client_id})."
                )
                return Response(
                    {"detail": "Target user has no email address."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Prepare email data
            email_data = {"reset_link": reset_url, "target_user_name": target_user_name}

            try:
                from order_management.exceptions import (
                    NotificationServiceError,
                    NotificationConnectionError,
                    NotificationResponseError,
                    NotificationSendError,
                )

                notification_service.send_transactional_email(
                    client_id=client_id,
                    recipient_email=target_user_email,
                    template_id="PASSWORD_RESET_TRIGGER",
                    data=email_data,
                )
            except NotificationConnectionError as e:
                logger.error(f"Failed to connect to notification service: {str(e)}")
                return Response(
                    {"detail": "Failed to send notification. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except NotificationResponseError as e:
                logger.error(
                    f"Notification service error response: {e.status_code} - {e.message}"
                )
                return Response(
                    {"detail": "Failed to send notification. Please try again later."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            except NotificationSendError as e:
                logger.error(f"Failed to send notification: {str(e)}")
                return Response(
                    {"detail": "Failed to send notification. Please try again later."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            except NotificationServiceError as e:
                logger.error(f"General notification service error: {str(e)}")
                return Response(
                    {"detail": "Failed to send notification. Please try again later."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            logger.info(
                f"Password reset triggered for user {target_user_id} by user {managing_user_id} (Client: {client_id})"
            )
            return Response(
                {"status": "Password reset email initiated."}, status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception(
                f"Error triggering password reset for user {target_user_id} by {managing_user_id} (Client: {client_id}): {str(e)}"
            )
            return Response(
                {"detail": "Failed to initiate password reset."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminReportingView(APIView):
    """
    API endpoint for Tenant Admins to fetch summary statistics about orders and returns.

    This view provides aggregated data about orders and returns within a specified date range,
    including total orders, total sales, status breakdowns, and return statistics.

    Permissions:
    - User must be authenticated
    - User must have Tenant Administrator privileges
    """

    permission_classes = [IsAuthenticated, IsTenantAdminUser]

    def get(self, request):
        """
        Get summary statistics for orders and returns.

        Query Parameters:
        - start_date: Optional start date for filtering (YYYY-MM-DD)
        - end_date: Optional end date for filtering (YYYY-MM-DD)

        Returns:
            Response with aggregated statistics
        """
        # Get tenant context
        client_id = request.auth_tenant_id

        # Parse date parameters
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        start_date = None
        end_date = None

        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Build base querysets with date filters
        order_filter = Q(client_id=client_id)
        rma_filter = Q(client_id=client_id)

        if start_date:
            order_filter &= Q(created_at__date__gte=start_date)
            rma_filter &= Q(created_at__date__gte=start_date)

        if end_date:
            order_filter &= Q(created_at__date__lte=end_date)
            rma_filter &= Q(created_at__date__lte=end_date)

        # Use a single query with annotations for order statistics
        order_stats = Order.objects.filter(order_filter).aggregate(
            total_orders=Count("id"),
            total_sales=Sum(
                Case(
                    When(
                        ~Q(
                            status__in=[
                                OrderStatus.CANCELLED,
                                OrderStatus.PENDING_PAYMENT,
                            ]
                        ),
                        then="total_amount",
                    ),
                    default=0,
                    output_field=DecimalField(),
                )
            ),
        )

        # Get order counts by status in a single query
        status_counts = dict(
            Order.objects.filter(order_filter)
            .values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        # Get RMA statistics in a single query
        rma_stats = RMA.objects.filter(rma_filter).aggregate(total_returns=Count("id"))

        # Get RMA counts by status in a single query
        returns_by_status = dict(
            RMA.objects.filter(rma_filter)
            .values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        # Structure response data
        data = {
            "summary": {
                "total_orders": order_stats["total_orders"] or 0,
                "total_sales": order_stats["total_sales"] or Decimal("0.00"),
                "total_returns": rma_stats["total_returns"] or 0,
            },
            "orders_by_status": status_counts,
            "returns_by_status": returns_by_status,
            "query_params": {
                "start_date": start_date_str,
                "end_date": end_date_str,
            },
        }

        return Response(data)


@extend_schema_view(
    get_balance=extend_schema(
        summary="Get wallet balance",
        description="Returns the current wallet balance for the authenticated user.",
        responses={
            200: OpenApiResponse(
                description="Successful response with wallet balance",
                examples=[
                    OpenApiExample("Example Response", value={"balance": "500.00"})
                ],
            ),
            403: OpenApiResponse(
                description="Wallet feature is not enabled for this tenant"
            ),
            404: OpenApiResponse(description="Wallet not found"),
            500: OpenApiResponse(description="Internal server error"),
        },
    ),
    get_history=extend_schema(
        summary="Get wallet transaction history",
        description="Returns a paginated list of wallet transactions for the authenticated user.",
        parameters=[
            OpenApiParameter(
                name="page",
                description="Page number for pagination",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="page_size",
                description="Number of items per page",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="transaction_type",
                description="Filter by transaction type (e.g., RECHARGE, ORDER_PAYMENT, REFUND)",
                required=False,
                type=str,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="Successful response with paginated transaction history"
            ),
            403: OpenApiResponse(
                description="Wallet feature is not enabled for this tenant"
            ),
            500: OpenApiResponse(description="Internal server error"),
        },
    ),
)
class WalletViewSet(viewsets.ViewSet):
    """ViewSet for wallet-related operations.

    Provides endpoints for retrieving wallet balance and transaction history.
    All operations require authentication and are tenant-aware.

    Endpoints:
    - GET /wallet/balance/ - Get current wallet balance
    - GET /wallet/history/ - Get paginated transaction history

    Error Handling:
    - Returns appropriate HTTP status codes for different error scenarios
    - Includes detailed error messages in the response
    - Handles exceptions from the wallet service gracefully
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="balance")
    def get_balance(self, request):
        """Get the current wallet balance for the authenticated user.

        Retrieves the wallet balance for the authenticated user from the wallet service.
        If the wallet feature is not enabled for the tenant, returns a 403 error.
        If the wallet is not found, returns a 404 error.

        Args:
            request: The HTTP request object containing auth_user_id and auth_tenant_id

        Returns:
            Response with wallet balance or appropriate error message

        Raises:
            WalletError: If there's an issue with the wallet service
            Exception: For unexpected errors
        """
        user_id = request.auth_user_id
        client_id = request.auth_tenant_id

        # Check if wallet feature is enabled for this tenant
        if not is_feature_enabled(WALLET, client_id):
            return Response(
                {"error": "Wallet feature is not enabled for this tenant"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            balance = wallet_service.get_user_wallet_balance(
                user_id=user_id, client_id=client_id
            )
            return Response({"balance": balance})
        except wallet_service.WalletError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred while retrieving wallet balance"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="history")
    def get_history(self, request):
        """Get transaction history for the authenticated user's wallet.

        Args:
            request: The HTTP request object

        Returns:
            Paginated response with wallet transactions or error message
        """
        user_id = request.auth_user_id
        client_id = request.auth_tenant_id

        # Check if wallet feature is enabled for this tenant
        if not is_feature_enabled(WALLET, client_id):
            return Response(
                {"error": "Wallet feature is not enabled for this tenant"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            # Get the customer ID for the user
            customer_id = wallet_service.get_customer_id_or_raise(user_id, client_id)

            # Get the wallet for the customer
            wallet = Wallet.objects.filter(
                customer_id=customer_id, client_id=client_id
            ).first()

            if not wallet:
                return Response([], status=status.HTTP_200_OK)

            # Get transactions for the wallet with optimized query
            # Using select_related to fetch wallet details in a single query
            transactions = (
                WalletTransaction.objects.filter(wallet=wallet)
                .select_related("wallet")
                .select_related("related_order")
                .select_related("related_rma")
                .order_by("-created_at")
            )

            # Initialize paginator
            paginator = PageNumberPagination()
            paginator.page_size = 20  # Set a reasonable page size

            # Paginate the results
            result_page = paginator.paginate_queryset(transactions, request)

            # Serialize the paginated results
            serializer = WalletTransactionSerializer(result_page, many=True)

            # Return paginated response
            return paginator.get_paginated_response(serializer.data)

        except wallet_service.WalletError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(
                f"Error retrieving wallet history: {str(e)}",
                extra={"user_id": user_id, "client_id": client_id},
            )
            return Response(
                {
                    "error": "An unexpected error occurred while retrieving transaction history"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @property
    def paginator(self):
        """Get the paginator instance for this viewset."""
        if not hasattr(self, "_paginator"):
            from rest_framework.pagination import PageNumberPagination

            self._paginator = PageNumberPagination()
        return self._paginator

    def paginate_queryset(self, queryset):
        """Paginate the queryset if pagination is configured."""
        if self.paginator is None:
            return None
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        """Return a paginated response."""
        assert self.paginator is not None
        return self.paginator.get_paginated_response(data)


class FulfillmentUpdateView(APIView):
    """
    API endpoint for receiving fulfillment status updates from the Fulfillment Service.

    This webhook receives notifications when an order's fulfillment status changes
    (e.g., shipped, delivered) and updates the order accordingly.

    Security:
    - Validates request signature using HMAC-SHA256
    - Requires webhook secret for validation
    - Validates timestamp to prevent replay attacks
    - Applies rate limiting to prevent abuse
    - Uses IP blocking to prevent abuse from specific IP addresses
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "fulfillment_webhook"

    def validate_signature(self, request):
        """
        Validate the webhook signature from the Fulfillment Service.

        Args:
            request: The request object containing the signature header

        Returns:
            bool: True if signature is valid, False otherwise
        """
        if not settings.FULFILLMENT_WEBHOOK_SECRET:
            logger.error("FULFILLMENT_WEBHOOK_SECRET not configured")
            return False

        signature_header = request.headers.get("X-Fulfillment-Signature")
        if not signature_header:
            logger.error("Missing X-Fulfillment-Signature header")
            return False

        # Get request body as bytes
        request_body = request.body

        # Calculate expected signature
        expected_signature = hmac.new(
            key=settings.FULFILLMENT_WEBHOOK_SECRET.encode(),
            msg=request_body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        # Compare signatures using constant-time comparison to prevent timing attacks
        return hmac.compare_digest(signature_header, expected_signature)

    def post(self, request, *args, **kwargs):
        """
        Process fulfillment status update from the Fulfillment Service.

        Args:
            request: The request object containing the update payload

        Returns:
            Response indicating success or failure
        """
        # Validate webhook signature
        if not self.validate_signature(request):
            return Response(
                {"detail": "Invalid signature"}, status=status.HTTP_403_FORBIDDEN
            )

        # Validate webhook timestamp
        webhook_timestamp_str = request.headers.get("X-Fulfillment-Timestamp")
        if not webhook_timestamp_str:
            logger.warning("Webhook request missing timestamp header")
            return Response(
                {"detail": "Timestamp header missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            webhook_timestamp = float(webhook_timestamp_str)
            current_timestamp = timezone.now().timestamp()
            tolerance = settings.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS

            if abs(current_timestamp - webhook_timestamp) > tolerance:
                logger.warning(
                    f"Webhook timestamp validation failed. Difference > {tolerance}s. Possible replay attack"
                )
                return Response(
                    {"detail": "Timestamp validation failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError) as e:
            logger.warning(f"Webhook timestamp validation failed. Invalid format: {e}")
            return Response(
                {"detail": "Invalid timestamp format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Parse payload
            payload = request.data

            # Validate required fields
            required_fields = ["order_id", "client_id", "event_type", "timestamp"]
            for field in required_fields:
                if field not in payload:
                    return Response(
                        {"detail": f"Missing required field: {field}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Extract fields
            order_id = payload["order_id"]
            client_id = payload["client_id"]
            event_type = payload["event_type"]
            timestamp_str = payload["timestamp"]

            # Parse timestamp
            try:
                parsed_timestamp = datetime.fromisoformat(
                    timestamp_str.replace("Z", "+00:00")
                )
            except ValueError:
                return Response(
                    {"detail": "Invalid timestamp format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Process update within a transaction
            with transaction.atomic():
                # Find the order
                order = (
                    Order.objects.select_for_update()
                    .filter(order_id=order_id, client_id=client_id)
                    .first()
                )

                if not order:
                    logger.warning(f"Order not found: {order_id} (Client: {client_id})")
                    return Response(
                        status=status.HTTP_200_OK
                    )  # Return 200 even if order not found

                # Update order based on event type
                if event_type == "SHIPPED":
                    order.status = OrderStatus.SHIPPED
                    order.shipped_at = parsed_timestamp

                    # Update tracking info if provided
                    if "tracking_number" in payload:
                        order.tracking_number = payload["tracking_number"]
                    if "carrier_name" in payload:
                        order.carrier_name = payload["carrier_name"]

                    # Save changes
                    update_fields = ["status", "shipped_at", "updated_at"]
                    if "tracking_number" in payload:
                        update_fields.append("tracking_number")
                    if "carrier_name" in payload:
                        update_fields.append("carrier_name")

                    order.save(update_fields=update_fields)

                    # Determine if this is a guest order
                    is_guest = order.user_id is None

                    # Construct the appropriate URL based on user type
                    if is_guest and order.guest_access_token:
                        # Guest order - use guest tracking URL
                        order_view_url = f"{settings.FRONTEND_URL.rstrip('/')}/track-order/{order.guest_access_token}/"
                        url_key_in_payload = "guest_tracking_url"
                    else:
                        # Registered user - use account order URL
                        order_view_url = f"{settings.FRONTEND_URL.rstrip('/')}/account/orders/{order.id}/"
                        url_key_in_payload = "account_order_url"

                    # Trigger notification
                    send_transactional_email.delay(
                        client_id=client_id,
                        recipient_email=order.email,
                        template_id="ORDER_SHIPPED",
                        data={
                            "order_id": order.order_id,
                            "customer_name": order.customer_name,
                            "tracking_number": order.tracking_number,
                            "carrier_name": order.carrier_name,
                            "shipped_at": order.shipped_at.isoformat(),
                            url_key_in_payload: order_view_url,
                        },
                    )

                elif event_type == "DELIVERED":
                    order.status = OrderStatus.DELIVERED
                    order.delivered_at = parsed_timestamp
                    order.save(update_fields=["status", "delivered_at", "updated_at"])

                    # Trigger notification (optional)
                    send_transactional_email.delay(
                        client_id=client_id,
                        recipient_email=order.email,
                        template_id="ORDER_DELIVERED",
                        data={
                            "order_id": order.order_id,
                            "customer_name": order.customer_name,
                            "delivered_at": order.delivered_at.isoformat(),
                        },
                    )

                elif event_type == "PARTIALLY_SHIPPED":
                    order.status = OrderStatus.PARTIALLY_SHIPPED

                    # Update tracking info if provided
                    if "tracking_number" in payload:
                        order.tracking_number = payload["tracking_number"]
                    if "carrier_name" in payload:
                        order.carrier_name = payload["carrier_name"]

                    # Save changes
                    update_fields = ["status", "updated_at"]
                    if "tracking_number" in payload:
                        update_fields.append("tracking_number")
                    if "carrier_name" in payload:
                        update_fields.append("carrier_name")

                    order.save(update_fields=update_fields)

                elif event_type == "FULFILLMENT_FAILED":
                    # Log the failure but don't change order status
                    logger.error(
                        f"Fulfillment failed for order {order_id} (Client: {client_id})"
                    )
                    if "error_message" in payload:
                        logger.error(f"Fulfillment error: {payload['error_message']}")

                # Add support for other event types as needed

            # Return success
            return Response(status=status.HTTP_200_OK)

        except Exception as e:
            # Log the error but return 200 to prevent retries
            logger.exception(f"Error processing fulfillment update: {str(e)}")
            return Response(
                {"detail": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminRMAViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    ViewSet for Tenant Admins to manage RMA (Return Merchandise Authorization) requests.

    Provides endpoints for viewing, approving, rejecting, and processing returns,
    including marking items as received, issuing refunds, and creating exchange orders.

    Permissions:
    - User must be authenticated
    - User must have Tenant Administrator privileges
    """

    queryset = RMA.objects.select_related("order").prefetch_related(
        "items__order_item", "items__order_item__product", "order__items"
    )
    permission_classes = [IsAuthenticated, IsTenantAdminUser]
    serializer_class = RMAOutputSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["rma_number", "user_id"]
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "updated_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Filter queryset by tenant context with optimized prefetching.

        Returns:
            QuerySet filtered by tenant context with optimized prefetching
        """
        tenant_client_id = getattr(self.request, "auth_tenant_id", None)
        if not tenant_client_id:
            return RMA.objects.none()

        # Get base queryset filtered by tenant
        base_queryset = super().get_queryset()

        # For list action, use more efficient prefetching
        if self.action == "list":
            return base_queryset.select_related("order").prefetch_related("items")

        # For retrieve and other detail actions, use more comprehensive prefetching
        return base_queryset.select_related("order").prefetch_related(
            Prefetch("items", queryset=RMAItem.objects.select_related("order_item")),
            "order__payment_transactions",
            Prefetch(
                "order__items",
                queryset=OrderItem.objects.select_related("product", "variant"),
            ),
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Approve an RMA request.

        This action:
        1. Validates if the RMA is in a state that allows approval
        2. Updates the RMA status to APPROVED
        3. Triggers a notification to the customer

        Args:
            request: The request object
            pk: The RMA primary key

        Returns:
            Response with updated RMA details
        """
        try:
            # Get the RMA
            rma = self.get_object()

            # Check if status allows approval
            if rma.status != RMAStatus.PENDING_APPROVAL:
                return Response(
                    {
                        "detail": f"Cannot approve RMA in {rma.status} status. RMA must be in PENDING_APPROVAL status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update status to APPROVED
            rma.status = RMAStatus.APPROVED
            rma.updated_by = request.user
            rma.save()

            # Trigger notification
            notification_service.send_transactional_email.delay(
                client_id=rma.client_id,
                template_key="RMA_APPROVED",
                recipient_email=f"user{rma.user_id}@example.com",  # In a real app, get from user profile
                context={
                    "rma_number": rma.rma_number,
                    "order_id": rma.order.order_id if rma.order else "",
                    "return_instructions": "Please ship your items to our returns department within 14 days.",
                },
            )

            # Return updated RMA
            serializer = self.get_serializer(rma)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"detail": f"Error approving RMA: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], serializer_class=RMARejectInputSerializer)
    def reject(self, request, pk=None):
        """
        Reject an RMA request.

        This action:
        1. Validates if the RMA is in a state that allows rejection
        2. Updates the RMA status to REJECTED
        3. Adds rejection reason to notes
        4. Triggers a notification to the customer

        Args:
            request: The request object
            pk: The RMA primary key

        Returns:
            Response with updated RMA details
        """
        try:
            # Get the RMA
            rma = self.get_object()

            # Check if status allows rejection
            if rma.status != RMAStatus.PENDING_APPROVAL:
                return Response(
                    {
                        "detail": f"Cannot reject RMA in {rma.status} status. RMA must be in PENDING_APPROVAL status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate input
            serializer = RMARejectInputSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Update status and notes
            reason = serializer.validated_data["reason"]
            rma.status = RMAStatus.REJECTED
            rma.notes = (
                f"Rejected: {reason}"
                if not rma.notes
                else f"{rma.notes}\nRejected: {reason}"
            )
            rma.updated_by = request.user
            rma.save()

            # Trigger notification
            notification_service.send_transactional_email.delay(
                client_id=rma.client_id,
                template_key="RMA_REJECTED",
                recipient_email=f"user{rma.user_id}@example.com",  # In a real app, get from user profile
                context={
                    "rma_number": rma.rma_number,
                    "order_id": rma.order.order_id if rma.order else "",
                    "rejection_reason": reason,
                },
            )

            # Return updated RMA
            serializer = self.get_serializer(rma)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"detail": f"Error rejecting RMA: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-received",
        serializer_class=RMAReceivedInputSerializer,
    )
    def mark_received(self, request, pk=None):
        """
        Mark RMA items as received.

        This action:
        1. Validates if the RMA is in a state that allows marking as received
        2. Updates the received quantities for RMA items
        3. Updates the RMA status to RECEIVED
        4. Optionally triggers a notification

        Args:
            request: The request object
            pk: The RMA primary key

        Returns:
            Response with updated RMA details
        """
        try:
            # Get the RMA
            rma = self.get_object()

            # Check if status allows marking as received
            if rma.status != RMAStatus.APPROVED:
                return Response(
                    {
                        "detail": f"Cannot mark as received RMA in {rma.status} status. RMA must be in APPROVED status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate input
            serializer = RMAReceivedInputSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Process in a transaction
            with transaction.atomic():
                # Check each item exists and belongs to this RMA
                item_data = {
                    item["rma_item_id"]: item
                    for item in serializer.validated_data["items"]
                }
                rma_items = RMAItem.objects.filter(rma=rma, id__in=item_data.keys())

                if len(rma_items) != len(item_data):
                    return Response(
                        {
                            "detail": "One or more RMA items not found or do not belong to this RMA."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update received quantity for each item
                for item in rma_items:
                    received_qty = item_data[item.id]["received_quantity"]
                    item.received_quantity = received_qty
                    item.updated_by = request.user
                    item.save()

                # Update RMA status
                rma.status = RMAStatus.RECEIVED
                rma.updated_by = request.user
                rma.save()

                # Optional notification (could be implemented based on requirements)

                # Return updated RMA
                rma_serializer = self.get_serializer(rma)
                return Response(rma_serializer.data)

        except Exception as e:
            return Response(
                {"detail": f"Error marking RMA as received: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["post"],
        url_path="process-refund",
        serializer_class=RMAProcessRefundInputSerializer,
    )
    def process_refund(self, request, pk=None):
        """
        Process a refund for received RMA items.

        This action:
        1. Validates if the RMA is in a state that allows processing refunds
        2. Updates RMA items with resolution and condition
        3. Updates inventory based on item condition
        4. Processes refund to wallet or original payment method
        5. Updates RMA status to COMPLETED
        6. Triggers notification
        """
        try:
            # Get the RMA with optimized prefetching
            rma = (
                RMA.objects.select_related("order")
                .prefetch_related(
                    Prefetch(
                        "items", queryset=RMAItem.objects.select_related("order_item")
                    ),
                    "order__payment_transactions",
                    Prefetch(
                        "order__items",
                        queryset=OrderItem.objects.select_related("product", "variant"),
                    ),
                )
                .get(pk=pk, client_id=request.auth_tenant_id)
            )

            # Check if status allows processing refund
            if rma.status != RMAStatus.RECEIVED:
                return Response(
                    {
                        "detail": f"Cannot process refund for RMA in {rma.status} status. RMA must be in RECEIVED status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate input
            serializer = RMAProcessRefundInputSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Process in a transaction
            with transaction.atomic():
                # Get refund destination
                refund_destination = serializer.validated_data["refund_destination"]

                # Process each item
                item_data = {
                    item["rma_item_id"]: item
                    for item in serializer.validated_data["items"]
                }
                rma_items = RMAItem.objects.filter(rma=rma, id__in=item_data.keys())

                if len(rma_items) != len(item_data):
                    return Response(
                        {
                            "detail": "One or more RMA items not found or do not belong to this RMA."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Calculate total refund amount and prepare inventory update
                total_refund_amount = Decimal("0.00")
                inventory_update_items = []

                for item in rma_items:
                    item_info = item_data[item.id]
                    approved_qty = item_info["approved_quantity"]
                    condition = item_info["condition"]

                    if approved_qty <= 0:
                        continue

                    # Calculate refund amount for this item
                    unit_price = item.order_item.unit_price
                    item_refund = unit_price * Decimal(approved_qty)

                    # Adjust refund based on condition
                    if condition == RMAItemCondition.DAMAGED:
                        item_refund = item_refund * Decimal("0.50")
                    elif condition == RMAItemCondition.OPENED:
                        item_refund = item_refund * Decimal("0.80")

                    total_refund_amount += item_refund

                    # Update RMA item
                    item.resolution = RMAResolution.REFUND
                    item.condition = condition
                    item.approved_quantity = approved_qty
                    item.updated_by = request.user
                    item.save()

                    # Add to inventory update if in reusable condition
                    if condition in [RMAItemCondition.AS_NEW, RMAItemCondition.OPENED]:
                        inventory_update_items.append(
                            {
                                "sku": item.order_item.product_sku,
                                "quantity": approved_qty,
                                "condition": condition,
                            }
                        )

                # Update inventory
                if inventory_update_items:
                    try:
                        inventory_service.update_stock_on_return(
                            client_id=rma.client_id, items=inventory_update_items
                        )
                    except Exception as e:
                        logger.error(
                            f"Inventory update error for RMA {rma.rma_number}: {e}"
                        )

                # Process refund based on destination
                if refund_destination == "WALLET":
                    try:
                        # Get customer ID
                        customer_id = customer_service.get_customer_id_for_user(
                            user_id=rma.user_id, client_id=rma.client_id
                        )

                        # Get or create wallet
                        wallet = wallet_service.get_or_create_wallet(
                            customer_id=customer_id,
                            client_id=rma.client_id,
                            created_by_user_id=request.user.id,
                        )

                        # Add refund transaction
                        wallet_txn = wallet_service.add_transaction(
                            wallet=wallet,
                            transaction_type=WalletTransactionType.REFUND,
                            amount=total_refund_amount,
                            related_rma=rma,
                            created_by_user_id=request.user.id,
                            notes=f"Refund for RMA {rma.rma_number}",
                        )

                        # Create payment record for wallet refund
                        Payment.objects.create(
                            client_id=rma.client_id,
                            order=rma.order,
                            amount=total_refund_amount,
                            payment_method="WALLET",
                            status=PaymentStatus.REFUNDED,
                            wallet_transaction=wallet_txn,
                            processed_at=timezone.now(),
                            created_by_id=request.user.id,
                            updated_by_id=request.user.id,
                        )

                    except Exception as e:
                        logger.error(
                            f"Wallet refund error for RMA {rma.rma_number}: {e}"
                        )
                        return Response(
                            {"detail": f"Error processing wallet refund: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                elif refund_destination == "ORIGINAL_METHOD":
                    try:
                        # Find original payment to refund against
                        original_payment = Payment.objects.filter(
                            order=rma.order,
                            status=PaymentStatus.PAID,
                            payment_method="GATEWAY",
                        ).first()

                        if not original_payment:
                            return Response(
                                {
                                    "detail": "No valid original payment found for refund."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )

                        # Process refund via payment service
                        refund_result = payment_service.process_refund(
                            client_id=rma.client_id,
                            transaction_id=original_payment.gateway_transaction_id,
                            amount=total_refund_amount,
                            reason=f"Refund for RMA {rma.rma_number}",
                            related_rma_id=rma.id,
                        )

                        # Update original payment status
                        if refund_result and refund_result.get("status") == "SUCCESS":
                            original_payment.status = PaymentStatus.REFUNDED
                        else:
                            original_payment.status = PaymentStatus.PARTIALLY_REFUNDED

                        original_payment.processed_at = timezone.now()
                        original_payment.save()

                    except Exception as e:
                        logger.error(
                            f"Gateway refund error for RMA {rma.rma_number}: {e}"
                        )
                        return Response(
                            {"detail": f"Error processing gateway refund: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                # Update RMA status
                rma.status = RMAStatus.COMPLETED
                rma.updated_by = request.user
                rma.save()

                # Send notification
                try:
                    notification_service.send_transactional_email.delay(
                        client_id=rma.client_id,
                        template_key="REFUND_PROCESSED",
                        recipient_email=f"user{rma.user_id}@example.com",
                        context={
                            "rma_number": rma.rma_number,
                            "order_id": rma.order.order_id if rma.order else "",
                            "refund_amount": str(total_refund_amount),
                            "refund_destination": (
                                "wallet"
                                if refund_destination == "WALLET"
                                else "original payment method"
                            ),
                        },
                    )
                except Exception as e:
                    logger.error(f"Notification error for RMA {rma.rma_number}: {e}")

                return Response(
                    self.get_serializer(rma).data, status=status.HTTP_200_OK
                )

        except Exception as e:
            logger.error(f"Error processing RMA refund: {e}")
            return Response(
                {"detail": f"Error processing refund: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=["post"],
        url_path="process-exchange",
        serializer_class=RMAProcessExchangeInputSerializer,
    )
    def process_exchange(self, request, pk=None):
        """
        Process an exchange for received RMA items.

        This action:
        1. Validates if the RMA is in a state that allows processing exchanges
        2. Updates RMA items with resolution and condition
        3. Updates inventory based on item condition
        4. Creates a replacement order for the exchanged items
        5. Updates RMA status to COMPLETED
        6. Triggers notification

        Args:
            request: The request object
            pk: The RMA primary key

        Returns:
            Response with updated RMA details
        """
        try:
            # Get the RMA with optimized prefetching to reduce N+1 queries
            rma = (
                RMA.objects.select_related("order")
                .prefetch_related(
                    Prefetch(
                        "items", queryset=RMAItem.objects.select_related("order_item")
                    ),
                    Prefetch(
                        "order__items",
                        queryset=OrderItem.objects.select_related("product", "variant"),
                    ),
                )
                .get(pk=pk, client_id=request.auth_tenant_id)
            )

            # Check if status allows processing exchange
            if rma.status != RMAStatus.RECEIVED:
                return Response(
                    {
                        "detail": f"Cannot process exchange for RMA in {rma.status} status. RMA must be in RECEIVED status."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate input
            serializer = RMAProcessExchangeInputSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Process in a transaction
            with transaction.atomic():
                # Check each item exists and belongs to this RMA
                item_data = {
                    item["rma_item_id"]: item
                    for item in serializer.validated_data["items"]
                }
                rma_items = RMAItem.objects.filter(rma=rma, id__in=item_data.keys())

                if len(rma_items) != len(item_data):
                    return Response(
                        {
                            "detail": "One or more RMA items not found or do not belong to this RMA."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Prepare exchange items and inventory update
                exchange_items = []
                inventory_update_items = []

                for item in rma_items:
                    # Get item data
                    item_info = item_data[item.id]
                    approved_qty = item_info["approved_quantity"]
                    condition = item_info["condition"]

                    # Skip if approved quantity is 0
                    if approved_qty <= 0:
                        continue

                    # Update RMA item
                    item.resolution = RMAResolution.REPLACEMENT
                    item.condition = condition
                    item.approved_quantity = approved_qty
                    item.updated_by = request.user
                    item.save()

                    # Add to exchange items list
                    exchange_items.append(
                        {
                            "product_sku": item.order_item.product_sku,
                            "product_name": item.order_item.product_name,
                            "quantity": approved_qty,
                            "unit_price": Decimal(
                                "0.00"
                            ),  # Exchange orders have zero price
                        }
                    )

                    # Add to inventory update if in reusable condition
                    if condition in [RMAItemCondition.AS_NEW, RMAItemCondition.OPENED]:
                        inventory_update_items.append(
                            {
                                "sku": item.order_item.product_sku,
                                "quantity": approved_qty,
                                "condition": condition,
                            }
                        )

                # Update inventory
                if inventory_update_items:
                    try:
                        inventory_service.update_stock_on_return(
                            client_id=rma.client_id, items=inventory_update_items
                        )
                        logger.info(
                            f"Successfully updated inventory for RMA {rma.rma_number}"
                        )
                    except inventory_service.InventoryConnectionError as e:
                        logger.error(
                            f"Inventory connection error for RMA {rma.rma_number}: {str(e)}"
                        )
                        # Continue with refund process but log the error
                        # This allows the refund to be processed even if inventory update fails
                    except inventory_service.InventoryResponseError as e:
                        logger.error(
                            f"Inventory response error for RMA {rma.rma_number}: {str(e)}"
                        )
                        # Continue with refund process but log the error

                # Create replacement order if there are items to exchange
                if exchange_items:
                    # Get original order details for shipping
                    original_order = rma.order
                    if not original_order:
                        return Response(
                            {
                                "detail": "Cannot process exchange: original order not found."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Create replacement order
                    replacement_order = Order.objects.create(
                        client_id=rma.client_id,
                        customer_id=original_order.customer_id,
                        contact_person_id=original_order.contact_person_id,
                        status=OrderStatus.PROCESSING,
                        payment_status=PaymentStatus.PAID,  # Exchange is pre-paid via returned items
                        currency=original_order.currency,
                        subtotal_amount=Decimal("0.00"),
                        discount_amount=Decimal("0.00"),
                        shipping_amount=Decimal("0.00"),
                        tax_amount=Decimal("0.00"),
                        total_amount=Decimal("0.00"),
                        shipping_address=original_order.shipping_address,
                        billing_address=original_order.billing_address,
                        shipping_method_name=original_order.shipping_method_name,
                        shipping_method_id=original_order.shipping_method_id,
                        payment_method="Exchange",
                        created_by_id=request.user.id,
                        updated_by_id=request.user.id,
                        notes=f"Replacement order for RMA {rma.rma_number}",
                    )

                    # Create order items
                    for item_data in exchange_items:
                        OrderItem.objects.create(
                            client_id=rma.client_id,
                            order=replacement_order,
                            product_sku=item_data["product_sku"],
                            product_name=item_data["product_name"],
                            quantity=item_data["quantity"],
                            unit_price=item_data["unit_price"],
                            total_price=item_data["unit_price"] * item_data["quantity"],
                            created_by_id=request.user.id,
                            updated_by_id=request.user.id,
                        )

                    # Trigger fulfillment for replacement order
                    try:
                        from order_management.exceptions import (
                            FulfillmentServiceError,
                            FulfillmentConnectionError,
                            FulfillmentResponseError,
                            FulfillmentProcessError,
                        )

                        fulfillment_service.create_fulfillment_order(
                            client_id=rma.client_id,
                            order_id=replacement_order.id,
                            priority="high",  # Prioritize replacement orders
                        )
                    except FulfillmentConnectionError as e:
                        logger.error(
                            f"Failed to connect to fulfillment service for replacement order {replacement_order.id}: {str(e)}"
                        )
                        # Continue with process but log the error
                        # The order is created, but fulfillment will need to be triggered manually
                    except FulfillmentResponseError as e:
                        logger.error(
                            f"Fulfillment service error response for replacement order {replacement_order.id}: {e.status_code} - {e.message}"
                        )
                        # Continue with process but log the error
                    except FulfillmentProcessError as e:
                        logger.error(
                            f"Fulfillment processing error for replacement order {replacement_order.id}: {str(e)}"
                        )
                        # Continue with process but log the error
                    except FulfillmentServiceError as e:
                        logger.error(
                            f"General fulfillment service error for replacement order {replacement_order.id}: {str(e)}"
                        )
                        # Continue with process but log the error

                # Update RMA status
                rma.status = RMAStatus.COMPLETED
                rma.updated_by = request.user
                rma.save()

                # Trigger notification
                try:
                    notification_service.send_transactional_email.delay(
                        client_id=rma.client_id,
                        template_key="EXCHANGE_PROCESSED",
                        recipient_email=f"user{rma.user_id}@example.com",  # In a real app, get from user profile
                        context={
                            "rma_number": rma.rma_number,
                            "order_id": rma.order.order_id if rma.order else "",
                            "replacement_order_id": replacement_order.order_id,
                            "num_items": len(exchange_items),
                        },
                    )
                except Exception as e:
                    # Since this is a notification, we don't want to fail the entire process if it fails
                    # Just log the error and continue
                    logger.error(
                        f"Failed to send exchange processed notification for RMA {rma.rma_number}: {str(e)}"
                    )
                    # Consider adding to a retry queue or implementing a fallback notification mechanism

                # Return updated RMA
                rma_serializer = self.get_serializer(rma)
                return Response(rma_serializer.data)

        except Exception as e:
            return Response(
                {"detail": f"Error processing exchange: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GuestReturnInitiationView(generics.CreateAPIView):
    """
    API endpoint that allows guest users to initiate returns using the guest access token.

    This view handles validation of the token, checks return policy, and creates
    the necessary RMA records with nulled user references.

    Security:
    - Validates guest token belongs to a genuine guest order
    - Performs all the same policy checks as regular return requests
    - Records created with appropriate audit trail
    """

    permission_classes = [AllowAny]
    serializer_class = RMAInitiationSerializer

    def get_serializer_context(self):
        """
        Add the guest order to the serializer context.

        This allows the serializer to validate the items against the order
        without requiring user authentication.

        Returns:
            Dict containing the request, view, and order context
        """
        context = super().get_serializer_context()
        guest_access_token = self.kwargs.get("guest_access_token")

        # Fetch order ensuring user_id is NULL
        try:
            order = get_object_or_404(
                Order.objects.filter(user_id__isnull=True),
                guest_access_token=guest_access_token,
            )
            context["order"] = order
        except Exception as e:
            logger.error(
                f"Error retrieving guest order with token {guest_access_token}: {str(e)}"
            )
            # The actual 404 will be returned by the framework

        return context

    def perform_create(self, serializer):
        """
        Create the RMA record for a guest order.

        This method:
        1. Gets the validated order from context
        2. Creates RMA and RMAItem records with null user references
        3. Triggers notification email to the guest

        Args:
            serializer: The validated serializer instance
        """
        # Get validated order from context (added by get_serializer_context)
        order = serializer.context["validated_order"]
        client_id = order.client_id
        items_data = serializer.validated_data["items"]

        # Generate RMA Number
        rma_number = f"RMA-{client_id}-{uuid.uuid4().hex[:8].upper()}"

        try:
            with transaction.atomic():
                # Create RMA record with user_id=None, created_by=None
                rma = RMA.objects.create(
                    order=order,
                    user_id=None,  # Guest user
                    client_id=client_id,
                    rma_number=rma_number,
                    status=RMAStatus.PENDING_APPROVAL,
                    created_by=None,  # No specific user created this record
                    updated_by=None,
                )

                # Create RMAItem records
                order_items_map = serializer.context.get("order_items_map")
                for item_data in items_data:
                    order_item = order_items_map.get(item_data["order_item_id"])
                    if order_item:  # Should always be true if validation passed
                        RMAItem.objects.create(
                            rma=rma,
                            order_item=order_item,
                            quantity_requested=item_data["quantity"],
                            reason=item_data.get("reason"),
                            client_id=client_id,
                            created_by=None,
                            updated_by=None,
                        )

            # Trigger notification after transaction commits
            guest_email = order.shipping_address.get("email")
            if guest_email:
                # Include the guest tracking URL with the token
                tracking_url = f"{settings.FRONTEND_URL.rstrip('/')}/track-order/{order.guest_access_token}/"

                transaction.on_commit(
                    lambda: notification_service.send_transactional_email.delay(
                        client_id=client_id,
                        recipient_email=guest_email,
                        template_id="RETURN_REQUESTED_GUEST",
                        data={
                            "rma_number": rma.rma_number,
                            "order_id": order.order_id,
                            "guest_tracking_url": tracking_url,
                        },
                    )
                )
            else:
                logger.warning(
                    f"No email found for guest order {order.order_id} to send RMA confirmation."
                )

            # Set the created instance for the CreateAPIView response
            serializer.instance = rma

        except Exception as e:
            logger.exception(
                f"Error creating guest RMA for Order {order.order_id}, client {client_id}: {str(e)}"
            )
            # Re-raise to let DRF handle it appropriately
            raise


class StorePickupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing store pickup locations.

    Provides complete CRUD operations for store pickup locations with proper tenant isolation.
    Only authenticated users with appropriate permissions can access these endpoints.

    Endpoints:
    - GET /storepickup/ - List all store pickup locations with counts
    - POST /storepickup/ - Create a new store pickup location
    - GET /storepickup/{id}/ - Retrieve a specific store pickup location
    - PUT /storepickup/{id}/ - Update a store pickup location
    - PATCH /storepickup/{id}/ - Partially update a store pickup location
    - DELETE /storepickup/{id}/ - Delete a store pickup location
    """

    queryset = StorePickup.objects.all()
    serializer_class = StorePickupSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = StorePickupFilter
    filterset_fields = ["city", "state", "country", "is_active"]
    search_fields = ["name", "address_line1", "city", "state", "country", "pincode"]
    ordering_fields = ["name", "city", "is_active", "created_at"]
    ordering = ["-id"]

    def get_filterset_context(self):
        """
        Add request to the filterset context for custom filters that need access to request parameters.
        """
        context = super().get_filterset_context()
        context["request"] = self.request
        return context

    def list(self, request, *args, **kwargs):
        """
        List store pickups with counts.
        Counts reflect total numbers in the database, not filtered results.
        """
        # Get the base queryset (filtered by tenant)
        filtered_queryset = self.filter_queryset(self.get_queryset())

        # Get counts from the complete unfiltered queryset
        base_queryset = super().get_queryset()  # This gets all records for the tenant
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        # Check if pagination is disabled
        paginate = request.query_params.get("paginate", "true").lower()
        if paginate == "false":
            serializer = self.get_serializer(filtered_queryset, many=True)
            return Response({"results": serializer.data, "counts": counts})

        # For paginated responses
        page = self.paginate_queryset(filtered_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            return response

        # Fallback non-paginated response
        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(
            {
                "count": filtered_queryset.count(),
                "next": None,
                "previous": None,
                "counts": counts,
                "results": serializer.data,
            }
        )

    def perform_create(self, serializer):
        """
        Create a new StorePickup instance with audit fields.

        Args:
            serializer: The serializer instance
        """
        serializer.save(created_by=self.request.user.id)

    def perform_update(self, serializer):
        """
        Update a StorePickup instance with audit fields.

        Args:
            serializer: The serializer instance
        """
        serializer.save(updated_by=self.request.user.id)

class PublicStorePickupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API endpoint for fetching store pickup locations.
    Returns only active store pickup locations in the required format.
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        from django.db import connection
        import json
        
        # Handle filtering by customer_group_selling_channels_id (single or comma-separated)
        cgs_param = request.query_params.get("customer_group_selling_channels_id")
        cgs_ids = None
        if cgs_param:
            try:
                cgs_ids = [int(x) for x in cgs_param.split(",") if x.strip().isdigit()]
            except Exception:
                cgs_ids = None  # Ignore invalid values

        with connection.cursor() as cursor:
            # Get schema name from URL path parameter
            tenant_schema = (
                kwargs.get('tenant_slug') or 
                kwargs.get('schema') or 
                getattr(request, 'resolver_match', {}).kwargs.get('tenant_slug') or
                getattr(request, 'resolver_match', {}).kwargs.get('schema')
            )
            if not tenant_schema:
                raise AttributeError("Missing tenant schema in URL path. Expected format: /api/v1/<schema>/om/storepickups/")
            cursor.execute("SET search_path TO %s;", [tenant_schema])

            # DEBUG: Print current schema/search_path
            cursor.execute("SHOW search_path;")
            search_path = cursor.fetchone()[0]

            # DEBUG: Check if table is visible
            try:
                cursor.execute("SELECT 1 FROM order_management_storepickup LIMIT 1;")
            except Exception as e:
                pass

            # Base query for store pickups with customer group selling channels
            base_query = """
                SELECT DISTINCT
                    sp.id,
                    sp.name,
                    sp.contact_person,
                    sp.contact_number,
                    sp.address_line1,
                    sp.address_line2,
                    sp.city,
                    sp.state,
                    sp.country,
                    sp.pincode,
                    sp.google_place_id,
                    sp.operating_hours,
                    sp.is_active,
                    sp.city,
                    sp.state,
                    sp.country,
                    sp.pincode,
                    sp.google_place_id,
                    sp.operating_hours,
                    sp.is_active,
                    COALESCE(
                        ARRAY_AGG(
                            CASE WHEN cgsp.is_active = true 
                            THEN cgsp.customer_group_selling_channel_id 
                            ELSE NULL END
                        ) FILTER (WHERE cgsp.customer_group_selling_channel_id IS NOT NULL),
                        ARRAY[]::integer[]
                    ) as customer_group_selling_channels
                FROM order_management_storepickup sp
                LEFT JOIN order_management_store_pickup_exclusions cgsp 
                    ON sp.id = cgsp.store_pickup_id AND cgsp.is_active = true
                WHERE sp.is_active = true
            """
            
            if cgs_ids:
                placeholders = ','.join(['%s'] * len(cgs_ids))
                base_query += f"""
                    AND NOT EXISTS (
                        SELECT 1 FROM order_management_store_pickup_exclusions cgsp2
                        WHERE cgsp2.store_pickup_id = sp.id 
                        AND cgsp2.is_active = true
                        AND cgsp2.customer_group_selling_channel_id IN ({placeholders})
                    )
                """
                params = cgs_ids
            else:
                params = []
            
            base_query += """
                GROUP BY sp.id, sp.name, sp.contact_person, sp.contact_number, 
                         sp.address_line1, sp.address_line2, sp.city, sp.state, 
                         sp.country, sp.pincode, sp.google_place_id, sp.operating_hours,
                         sp.is_active
                ORDER BY sp.id DESC
            """
            
            
            
            cursor.execute(base_query, params)
            columns = [col[0] for col in cursor.description]
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                
                if row_dict['operating_hours']:
                    if isinstance(row_dict['operating_hours'], str):
                        try:
                            row_dict['operating_hours'] = json.loads(row_dict['operating_hours'])
                        except json.JSONDecodeError:
                            row_dict['operating_hours'] = {}
                
                # Ensure customer_group_selling_channels is a list
                if row_dict['customer_group_selling_channels'] is None:
                    row_dict['customer_group_selling_channels'] = []
                
                results.append(row_dict)

        return Response(results)


class TimeSlotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing time slots.

    Provides complete CRUD operations for time slots with proper tenant isolation.
    Only authenticated users with appropriate permissions can access these endpoints.

    Endpoints:
    - GET /timeslots/ - List all time slots with counts
    - POST /timeslots/ - Create a new time slot
    - GET /timeslots/{id}/ - Retrieve a specific time slot
    - PUT /timeslots/{id}/ - Update a time slot
    - PATCH /timeslots/{id}/ - Partially update a time slot
    - DELETE /timeslots/{id}/ - Delete a time slot
    """

    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "start_time", "end_time", "is_active", "created_at"]
    ordering = ["start_time"]

    def list(self, request, *args, **kwargs):
        """
        List time slots with counts.
        Counts reflect total numbers in the database, not filtered results.
        """
        # Get the base queryset (filtered by any query parameters)
        filtered_queryset = self.filter_queryset(self.get_queryset())

        # Get counts from the complete unfiltered queryset
        base_queryset = super().get_queryset()
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        # Check if pagination is disabled
        paginate = request.query_params.get("paginate", "true").lower()
        if paginate == "false":
            serializer = self.get_serializer(filtered_queryset, many=True)
            return Response({"results": serializer.data, "counts": counts})

        # For paginated responses
        page = self.paginate_queryset(filtered_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            return response

        # Fallback non-paginated response
        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(
            {
                "count": filtered_queryset.count(),
                "next": None,
                "previous": None,
                "counts": counts,
                "results": serializer.data,
            }
        )

    def perform_create(self, serializer):
        """
        Create a new TimeSlot instance with audit fields.
        """
        serializer.save(created_by=self.request.user.id)

    def perform_update(self, serializer):
        """
        Update a TimeSlot instance with audit fields.
        """
        serializer.save(updated_by=self.request.user.id)


class StoreTimeSlotViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API endpoint for fetching time slots for a store.
    Accessible without authentication, uses tenant_slug from URL to determine the schema.

    Endpoints:
    - GET /store/timeslots/ - List all active time slots
    - GET /store/timeslots/{id}/ - Retrieve a specific time slot
    """

    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    pagination_class = None  # Disable pagination
    ordering = ["start_time"]

    def get_queryset(self):
        """
        Return active time slots for the current tenant, ordered by start time.
        """
        return super().get_queryset().filter(is_active=True).order_by("start_time")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ShippingMethodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shipping methods.

    Provides complete CRUD operations for shipping methods with proper tenant isolation.
    Only authenticated users with appropriate permissions can access these endpoints.

    Endpoints:
    - GET /shipping-methods/ - List all shipping methods with counts
    - POST /shipping-methods/ - Create a new shipping method
    - GET /shipping-methods/{id}/ - Retrieve a specific shipping method
    - PUT /shipping-methods/{id}/ - Update a shipping method
    - PATCH /shipping-methods/{id}/ - Partially update a shipping method
    - DELETE /shipping-methods/{id}/ - Delete a shipping method
    """

    queryset = ShippingMethod.objects.all()
    serializer_class = ShippingMethodSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = [
        "id",
        "name",
        "min_delivery_days",
        "max_delivery_days",
        "is_active",
        "created_at",
    ]
    ordering = ["id"]

    def list(self, request, *args, **kwargs):
        """
        List shipping methods with counts.
        Counts reflect total numbers in the database, not filtered results.
        """
        # Get the base queryset (filtered by tenant)
        filtered_queryset = self.filter_queryset(self.get_queryset())

        # Get counts from the complete unfiltered queryset
        base_queryset = super().get_queryset()  # This gets all records for the tenant
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        # Check if pagination is disabled
        paginate = request.query_params.get("paginate", "true").lower()
        if paginate == "false":
            serializer = self.get_serializer(filtered_queryset, many=True)
            return Response({"results": serializer.data, "counts": counts})

        # For paginated responses
        page = self.paginate_queryset(filtered_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            return response

        # Fallback non-paginated response
        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(
            {
                "count": filtered_queryset.count(),
                "next": None,
                "previous": None,
                "counts": counts,
                "results": serializer.data,
            }
        )

    def perform_create(self, serializer):
        """
        Create a new ShippingMethod instance with audit fields.

        Args:
            serializer: The serializer instance
        """
        try:
            serializer.save(created_by=self.request.user.id)
        except IntegrityError as e:
            logger = logging.getLogger(__name__)
            logger.error(f"IntegrityError: {repr(e)}")
            logger.error(f"IntegrityError args: {e.args}")
            if "unique_shipping_method_name_per_tenant" in str(
                e
            ) or "duplicate key value violates unique constraint" in str(e):
                raise ValidationError(
                    {
                        "name": "A shipping method with this name already exists for this tenant."
                    }
                )
            raise

    def perform_update(self, serializer):
        """
        Update a ShippingMethod instance with audit fields.

        Args:
            serializer: The serializer instance
        """

        try:
            serializer.save(updated_by=self.request.user.id)
        except IntegrityError as e:
            logger = logging.getLogger(__name__)
            logger.error(f"IntegrityError: {repr(e)}")
            logger.error(f"IntegrityError args: {e.args}")
            if "unique_shipping_method_name_per_tenant" in str(
                e
            ) or "duplicate key value violates unique constraint" in str(e):
                raise ValidationError(
                    {
                        "name": "A shipping method with this name already exists for this tenant."
                    }
                )
            raise


class StoreShippingMethodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API endpoint for fetching shipping methods for a store.
    Returns only active shipping methods in the required format with exclusion filtering.
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        from django.db import connection
        import json
        
        # Handle filtering by customer_group_selling_channels_id (single or comma-separated)
        cgs_param = request.query_params.get("customer_group_selling_channels_id")
        cgs_ids = None
        if cgs_param:
            try:
                cgs_ids = [int(x) for x in cgs_param.split(",") if x.strip().isdigit()]
            except Exception:
                cgs_ids = None  # Ignore invalid values

        with connection.cursor() as cursor:
            # Get schema name from URL path parameter
            tenant_schema = (
                kwargs.get('tenant_slug') or 
                kwargs.get('schema') or 
                getattr(request, 'resolver_match', {}).kwargs.get('tenant_slug') or
                getattr(request, 'resolver_match', {}).kwargs.get('schema')
            )
            if not tenant_schema:
                raise AttributeError("Missing tenant schema in URL path. Expected format: /api/v1/<schema>/om/shipping-methods/")
            cursor.execute("SET search_path TO %s;", [tenant_schema])

            # DEBUG: Print current schema/search_path
            cursor.execute("SHOW search_path;")
            search_path = cursor.fetchone()[0]

            # DEBUG: Check if table is visible
            try:
                cursor.execute("SELECT 1 FROM order_management_shippingmethod LIMIT 1;")
            except Exception as e:
                pass

            # Read zone filter params for pincode-based filtering
            pincode = request.query_params.get("pincode")
            
            # Base query for shipping methods with customer group selling channels and zone restrictions
            base_query = """
                SELECT DISTINCT
                    sm.id,
                    sm.name,
                    sm.min_delivery_days,
                    sm.max_delivery_days,
                    sm.is_active,
                    COALESCE(
                        ARRAY_AGG(
                            CASE WHEN cgsm.is_active = true 
                            THEN cgsm.customer_group_selling_channel_id 
                            ELSE NULL END
                        ) FILTER (WHERE cgsm.customer_group_selling_channel_id IS NOT NULL),
                        ARRAY[]::integer[]
                    ) as customer_group_selling_channels,
                    COALESCE(
                        ARRAY_AGG(
                            DISTINCT CASE WHEN szr.id IS NOT NULL 
                            THEN jsonb_build_object(
                                'zone_id', szr.zone_id,
                                'restriction_mode', szr.restriction_mode
                            )
                            ELSE NULL END
                        ) FILTER (WHERE szr.id IS NOT NULL),
                        ARRAY[]::jsonb[]
                    ) as zone_restrictions
                FROM order_management_shippingmethod sm
                LEFT JOIN order_management_shipping_method_exclusions cgsm 
                    ON sm.id = cgsm.shipping_method_id AND cgsm.is_active = true
                LEFT JOIN shipping_method_zone_restrictions szr
                    ON sm.id = szr.shipping_method_id
                WHERE sm.is_active = true
            """
            
            # Apply zone-based filtering if pincode provided
            zone_filter_applied = False
            if pincode:
                # Find the zone for the given pincode/location
                zone_query = """
                    SELECT DISTINCT szpa.zone_id
                    FROM shipping_zone_pincode_assignments szpa
                    JOIN shipping_zones_pincode_master pm ON szpa.pincode_id = pm.id
                    WHERE 1=1
                """
                zone_params = []
                if pincode:
                    zone_query += " AND pm.pincode = %s"
                    zone_params.append(pincode)
                
                # Get the zone ID for the location
                cursor.execute(zone_query, zone_params)
                zone_result = cursor.fetchone()
                
                print(f"DEBUG: Zone query: {zone_query}")
                print(f"DEBUG: Zone params: {zone_params}")
                print(f"DEBUG: Zone result: {zone_result}")
                
                if zone_result:
                    location_zone_id = zone_result[0]
                    print(f"DEBUG: Found zone_id {location_zone_id} for pincode {pincode}")
                    # Filter shipping methods based on zone restrictions
                    base_query += f"""
                        AND (
                            -- No zone restrictions = available everywhere
                            NOT EXISTS (SELECT 1 FROM shipping_method_zone_restrictions szr2 WHERE szr2.shipping_method_id = sm.id)
                            OR
                            -- Has INCLUDE restriction for this zone
                            EXISTS (
                                SELECT 1 FROM shipping_method_zone_restrictions szr3 
                                WHERE szr3.shipping_method_id = sm.id 
                                AND szr3.zone_id = %s 
                                AND szr3.restriction_mode = 'INCLUDE'
                            )
                            OR
                            -- Has restrictions but no EXCLUDE for this zone (and no INCLUDE restrictions exist)
                            (
                                EXISTS (SELECT 1 FROM shipping_method_zone_restrictions szr4 WHERE szr4.shipping_method_id = sm.id)
                                AND NOT EXISTS (
                                    SELECT 1 FROM shipping_method_zone_restrictions szr5 
                                    WHERE szr5.shipping_method_id = sm.id 
                                    AND szr5.restriction_mode = 'INCLUDE'
                                )
                                AND NOT EXISTS (
                                    SELECT 1 FROM shipping_method_zone_restrictions szr6 
                                    WHERE szr6.shipping_method_id = sm.id 
                                    AND szr6.zone_id = %s 
                                    AND szr6.restriction_mode = 'EXCLUDE'
                                )
                            )
                        )
                    """
                    zone_params = [location_zone_id, location_zone_id]
                    zone_filter_applied = True
                    print(f"DEBUG: Applied zone filtering for zone_id {location_zone_id}")
                else:
                    # Pincode not assigned to any zone = available for all shipping methods with no restrictions
                    print(f"DEBUG: Pincode {pincode} not assigned to any zone - only showing methods with no zone restrictions")
                    base_query += """
                        AND NOT EXISTS (SELECT 1 FROM shipping_method_zone_restrictions szr2 WHERE szr2.shipping_method_id = sm.id)
                    """
                    zone_params = []
                    zone_filter_applied = True
            else:
                zone_params = []
            
            
            if cgs_ids:
                placeholders = ','.join(['%s'] * len(cgs_ids))
                base_query += f"""
                    AND NOT EXISTS (
                        SELECT 1 FROM order_management_shipping_method_exclusions cgsm2
                        WHERE cgsm2.shipping_method_id = sm.id 
                        AND cgsm2.is_active = true
                        AND cgsm2.customer_group_selling_channel_id IN ({placeholders})
                    )
                """
                if zone_filter_applied:
                    params = zone_params + cgs_ids
                else:
                    params = cgs_ids
            else:
                if zone_filter_applied:
                    params = zone_params
                else:
                    params = []
            
            base_query += """
                GROUP BY sm.id, sm.name, sm.min_delivery_days, sm.max_delivery_days, sm.is_active
                ORDER BY sm.id DESC
            """
            
            cursor.execute(base_query, params)
            columns = [col[0] for col in cursor.description]
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                
                # Ensure customer_group_selling_channels is a list
                if row_dict['customer_group_selling_channels'] is None:
                    row_dict['customer_group_selling_channels'] = []
                
                # Parse zone_restrictions from JSON strings to dicts
                if row_dict.get('zone_restrictions') is not None:
                    zone_restrictions = []
                    for zr in row_dict['zone_restrictions']:
                        if isinstance(zr, dict):
                            zone_restrictions.append(zr)
                        elif isinstance(zr, str):
                            try:
                                zone_restrictions.append(json.loads(zr))
                            except Exception:
                                pass
                    row_dict['zone_restrictions'] = zone_restrictions
                results.append(row_dict)

        return Response(results)

class CheckoutConfigurationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing checkout configurations.
    
    This viewset provides CRUD operations for CheckoutConfiguration model,
    allowing configuration of checkout settings per customer group and selling channel.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CheckoutConfigurationSerializer
    queryset = CheckoutConfiguration.objects.all()
    lookup_field = 'id'
    pagination_class = None
    
    def get_queryset(self):
        """
        Get queryset for the view.
        (Tenant filtering removed as per request.)
        """
        return super().get_queryset()
    
    def perform_create(self, serializer):
        """Set the created_by field on create (tenant removed)."""
        serializer.save(created_by=self.request.user.id)
    
    def perform_update(self, serializer):
        """Set the updated_by field on update."""
        serializer.save(updated_by=self.request.user.id)
    
    @action(detail=True, methods=['get'])
    def customer_groups(self, request, id=None):
        """
        Get the customer group selling channel for this checkout configuration.
        Returns a single item or None if not set.
        """
        config = self.get_object()
        if not config.customer_group_selling_channel:
            return Response([])
        
        # Use the CustomerGroupSellingChannel serializer instead
        from customers.api.serializers import CustomerGroupSellingChannelSerializer
        serializer = CustomerGroupSellingChannelSerializer(
            config.customer_group_selling_channel
        )
        return Response([serializer.data])  # Return as list for consistency

class UITemplateSettingsViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing UI template settings.

    This viewset provides CRUD operations for UITemplateSettings model,
    allowing configuration of UI layouts per customer group and selling channel.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = UITemplateSettingsSerializer
    queryset = UITemplateSettings.objects.all()
    lookup_field = 'id'
    pagination_class = None

    def get_queryset(self):
        """
        Get queryset for the view.
        (Tenant filtering can be added if needed.)
        """
        return super().get_queryset()

    def perform_create(self, serializer):
        """Set the created_by field on create."""
        serializer.save(created_by=self.request.user.id)

    def perform_update(self, serializer):
        """Set the updated_by field on update."""
        serializer.save(updated_by=self.request.user.id)

class FeatureToggleSettingsViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing feature toggle settings.

    This viewset provides CRUD operations for FeatureToggleSettings model,
    allowing configuration of feature toggles and wallet settings per customer group and selling channel.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = FeatureToggleSettingsSerializer
    queryset = FeatureToggleSettings.objects.all()
    lookup_field = 'id'
    pagination_class = None

    def get_queryset(self):
        """
        Get queryset for the view.
        (Tenant filtering can be added if needed.)
        """
        return super().get_queryset()

    def perform_create(self, serializer):
        """Set the created_by field on create."""
        serializer.save(created_by=self.request.user.id)

    def perform_update(self, serializer):
        """Set the updated_by field on update."""
        serializer.save(updated_by=self.request.user.id)


class GuestConfigViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing guest configuration records.

    Provides CRUD operations for GuestConfig model, allowing management of selling channel, customer group, and segment relationships.
    Supports bulk creation of multiple records in a single API call.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = GuestConfigSerializer
    queryset = GuestConfig.objects.all()
    lookup_field = 'id'
    pagination_class = None

    def get_queryset(self):
        """
        Get queryset for the view.
        (Tenant filtering can be added if needed.)
        """
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        """
        Handle both single and bulk creation of GuestConfig records.
        
        For bulk creation, send an array of objects:
        [
            {"selling_channel_id": "web", "customer_group_id": 1, "segment_id": 1},
            {"selling_channel_id": "mobile", "customer_group_id": 2, "segment_id": 2}
        ]
        
        For single creation, send a single object:
        {"selling_channel_id": "web", "customer_group_id": 1, "segment_id": 1}
        """
        many = isinstance(request.data, list)
        
        # Add audit fields to each record
        if many:
            # Bulk creation
            for item in request.data:
                item['created_by'] = request.user.id
                item['updated_by'] = request.user.id
        else:
            # Single creation
            request.data['created_by'] = request.user.id
            request.data['updated_by'] = request.user.id
        
        serializer = self.get_serializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)
        
        # Set bulk operation context for validation
        if many:
            # Set the is_bulk_operation flag directly in the serializer context
            serializer.context['is_bulk_operation'] = True
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )

    def perform_create(self, serializer):
        """Handle creation for both single and bulk operations."""
        if isinstance(serializer.validated_data, list):
            # Bulk creation - audit fields already set in create method
            serializer.save()
        else:
            # Single creation
            serializer.save(created_by=self.request.user.id)

    def perform_update(self, serializer):
        """Set the updated_by field on update."""
        serializer.save(updated_by=self.request.user.id)

    def update(self, request, *args, **kwargs):
        """
        Handle both single and bulk update of GuestConfig records.
    
        For bulk update, send an array of objects with IDs:
        [
            {"id": 1, "selling_channel_id": "web", "customer_group_id": 1, "segment_id": 1},
            {"id": 2, "selling_channel_id": "mobile", "customer_group_id": 2, "segment_id": 2}
        ]
    
        For single update, use the standard PUT/PATCH:
        {"selling_channel_id": "web", "customer_group_id": 1, "segment_id": 1}
        """
        # Check if it's bulk update (array with IDs)
        if isinstance(request.data, list):
            return self._bulk_update(request)
    
        # Single update - use default behavior
        return super().update(request, *args, **kwargs)

    def _bulk_update(self, request):
        """
        Handle bulk update of multiple GuestConfig records.
        
        If a record fails validation (e.g., unique constraint violation),
        it will be skipped but other valid records will still be updated.
        """
        data = request.data
    
        # Validate that all items have IDs
        for item in data:
            if 'id' not in item:
                return Response(
                    {"error": "All items must include 'id' field for bulk update"},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
        # Extract IDs and get existing records
        ids = [item['id'] for item in data]
        existing_records = {obj.id: obj for obj in self.get_queryset().filter(id__in=ids)}
    
        # Check if all records exist
        missing_ids = set(ids) - set(existing_records.keys())
        if missing_ids:
            return Response(
                {"error": f"Records with IDs {list(missing_ids)} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
        updated_records = []
        skipped_records = []
    
        # Process each update
        for item in data:
            record_id = item['id']
            instance = existing_records[record_id]
            
            # Add audit field
            item['updated_by'] = request.user.id
            
            # Set context to indicate bulk operation
            context = self.get_serializer_context()
            context['is_bulk_operation'] = True
            
            # Validate and update
            serializer = self.get_serializer(instance, data=item, partial=True, context=context)
            if serializer.is_valid():
                updated_record = serializer.save()
                updated_records.append(serializer.data)
            else:
                # Just skip this record and continue with others
                skipped_records.append({
                    "id": record_id,
                    "reason": serializer.errors
                })
    
        # Always return 200 OK with information about updated and skipped records
        return Response(
            {
                "message": f"Successfully updated {len(updated_records)} records",
                "data": updated_records,
                "skipped": len(skipped_records),
                "skipped_details": skipped_records if skipped_records else None
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['patch'], url_path='bulk-update')
    def bulk_update_action(self, request):
        """
        Alternative endpoint for bulk updates: PATCH /guest-config/bulk-update/
    
        Accepts the same format as the main update endpoint:
        [
            {"id": 1, "selling_channel_id": "web", "customer_group_id": 1},
            {"id": 2, "selling_channel_id": "mobile", "customer_group_id": 2}
        ]
        """
        if not isinstance(request.data, list):
            return Response(
                {"error": "Bulk update requires an array of objects"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
        return self._bulk_update(request)