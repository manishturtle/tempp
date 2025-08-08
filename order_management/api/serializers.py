"""
Serializers for Order Management API.

This module contains serializers for transforming Order Management models
to/from JSON for the REST API. It includes a base serializer for tenant-specific models.
"""

import logging

logger = logging.getLogger(__name__)
from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models.base import BaseTenantModel
from decimal import Decimal
from order_management.models import (
    Order,
    OrderItem,
    Cart,
    CartItem,
    WishlistItem,
    RMA,
    RMAItem,
    RMAItemCondition,
    WalletTransaction,
    LoyaltyTransaction,
    TenantConfiguration,
    StorePickup,
    TimeSlot,
    ShippingMethod,
    CheckoutConfiguration,
    UITemplateSettings,
    FeatureToggleSettings,
    ShippingMethodZoneRestriction,
    GuestConfig,
)
from order_management.integrations import (
    product_service,
    policy_service,
    customer_service,
)
from django.utils.translation import gettext_lazy as _
from customers.models import CustomerGroupSellingChannel
from shipping_zones.models import ShippingZone

User = get_user_model()


class BaseTenantModelSerializer(serializers.ModelSerializer):
    """
    Base serializer for models that inherit from BaseTenantModel.

    This serializer automatically handles tenant-specific fields and ensures
    proper tenant isolation in serialization/deserialization.
    """

    class Meta:
        model = BaseTenantModel
        fields = "__all__"
        read_only_fields = [
            "client_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class PaymentInitiationSerializer(serializers.Serializer):
    """
    Serializer for payment initiation requests.

    Handles validation of payment method and optional loyalty points redemption.
    """

    payment_method_id = serializers.CharField(
        required=True,
        max_length=100,
        min_length=3,
        error_messages={
            "required": "Payment method ID is required",
            "blank": "Payment method ID cannot be blank",
            "min_length": "Payment method ID must be at least 3 characters",
            "max_length": "Payment method ID cannot exceed 100 characters",
        },
    )
    points_to_redeem = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=1000000,  # Set a reasonable upper limit
        default=0,
        error_messages={
            "min_value": "Points to redeem cannot be negative",
            "max_value": "Points to redeem exceeds the maximum allowed value",
            "invalid": "Points to redeem must be a valid integer",
        },
    )

    def validate_payment_method_id(self, value):
        """
        Validate payment method ID format.

        Args:
            value: The payment method ID to validate

        Returns:
            The validated value

        Raises:
            ValidationError: If payment method ID format is invalid
        """
        # Basic validation to ensure payment method ID doesn't contain special characters except - and _
        import re

        if re.search(r"[^a-zA-Z0-9\-_]", value):
            raise serializers.ValidationError(
                "Payment method ID contains invalid characters"
            )

        return value

    def validate_points_to_redeem(self, value):
        """
        Validate that points to redeem is a non-negative integer.

        Args:
            value: The points to redeem value

        Returns:
            The validated value

        Raises:
            ValidationError: If value is negative
        """
        if value is not None and value < 0:
            raise serializers.ValidationError("Points to redeem cannot be negative.")
        return value


class LoyaltyTransactionSerializer(BaseTenantModelSerializer):
    """
    Serializer for loyalty transactions.

    This serializer handles the transformation of LoyaltyTransaction model instances
    to/from JSON for the REST API. All fields are read-only since transactions
    are only created through the loyalty service.
    """

    class Meta:
        model = LoyaltyTransaction
        fields = [
            "id",
            "transaction_type",
            "points_change",
            "created_at",
            "related_order_id",
            "expiry_date",
            "notes",
        ]
        read_only_fields = fields  # All fields are read-only for this use case


class ProductListSerializer(serializers.Serializer):
    """
    Serializer for product list views with minimal fields.

    This serializer contains only essential fields needed for product listings
    to minimize payload size and optimize performance for list views.
    """

    id = serializers.IntegerField(read_only=True)
    sku = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    category = serializers.IntegerField(read_only=True, required=False)
    subcategory = serializers.IntegerField(read_only=True, required=False)
    display_price = serializers.CharField(read_only=True, required=False)
    compare_at_price = serializers.CharField(read_only=True, required=False)
    currency_code = serializers.CharField(read_only=True, required=False)
    is_active = serializers.BooleanField(read_only=True, required=False)
    publication_status = serializers.CharField(read_only=True, required=False)
    images = serializers.SerializerMethodField()
    atp_quantity = serializers.IntegerField(read_only=True)
    stock_status = serializers.CharField(read_only=True)
    short_description = serializers.CharField(read_only=True, required=False)
    key_features = serializers.CharField(read_only=True, required=False)

    def get_images(self, obj):
        """
        Get product images with fallback logic:
        1. Use product images if available
        2. If not, use subcategory image
        3. If not, use category image
        4. If not, use division image
        5. If all fail, return empty list

        Args:
            obj: The product data object

        Returns:
            List of image objects or empty list
        """
        # Check if product has its own images
        product_images = obj.get("images", [])
        if product_images and len(product_images) > 0:
            return product_images

        # Create a standardized image object format
        def create_image_obj(image_url):
            return [
                {
                    "image": image_url,
                    "is_primary": True,
                    "alt_text": obj.get("name", "Product image"),
                }
            ]

        # Try subcategory image
        subcategory_details = obj.get("subcategory_details", {})
        if subcategory_details and subcategory_details.get("image"):
            return create_image_obj(subcategory_details["image"])

        # Try category image
        category_details = obj.get("category_details", {})
        if category_details and category_details.get("image"):
            return create_image_obj(category_details["image"])

        # Try division image
        division_details = obj.get("division_details", {})
        if division_details and division_details.get("image"):
            return create_image_obj(division_details["image"])

        # No images found
        return []


class ProductDetailSerializer(serializers.Serializer):
    """
    Serializer for detailed product information.

    This serializer contains all fields needed for product detail views,
    providing complete information about a product.
    """

    id = serializers.IntegerField(read_only=True)
    sku = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    short_description = serializers.CharField(read_only=True, required=False)
    category = serializers.IntegerField(read_only=True, required=False)
    category_details = serializers.DictField(read_only=True, required=False)
    subcategory = serializers.IntegerField(read_only=True, required=False)
    subcategory_details = serializers.DictField(read_only=True, required=False)
    division = serializers.IntegerField(read_only=True, required=False)
    division_details = serializers.DictField(read_only=True, required=False)
    uom = serializers.IntegerField(read_only=True, required=False)
    uom_details = serializers.DictField(read_only=True, required=False)
    productstatus = serializers.IntegerField(read_only=True, required=False)
    productstatus_details = serializers.DictField(read_only=True, required=False)
    currency_code = serializers.CharField(read_only=True, required=False)
    display_price = serializers.CharField(read_only=True, required=False)
    compare_at_price = serializers.CharField(read_only=True, required=False)
    is_active = serializers.BooleanField(read_only=True, required=False)
    key_features = serializers.CharField(read_only=True, required=False)
    images = serializers.SerializerMethodField()
    atp_quantity = serializers.IntegerField(read_only=True)
    stock_status = serializers.CharField(read_only=True)
    variant_defining_attributes = serializers.ListField(read_only=True, required=False)
    variants = serializers.ListField(read_only=True, required=False)
    delivery_eligible = serializers.BooleanField(read_only=True, required=False)
    delivery_error = serializers.CharField(read_only=True, required=False)

    def get_images(self, obj):
        """
        Get product images with fallback logic:
        1. Use product images if available
        2. If not, use subcategory image
        3. If not, use category image
        4. If not, use division image
        5. If all fail, return empty list

        Args:
            obj: The product data object

        Returns:
            List of image objects or empty list
        """
        # Check if product has its own images
        product_images = obj.get("images", [])
        if product_images and len(product_images) > 0:
            return product_images

        # Create a standardized image object format
        def create_image_obj(image_url):
            return [
                {
                    "image": image_url,
                    "is_primary": True,
                    "alt_text": obj.get("name", "Product image"),
                }
            ]

        # Try subcategory image
        subcategory_details = obj.get("subcategory_details", {})
        if subcategory_details and subcategory_details.get("image"):
            return create_image_obj(subcategory_details["image"])

        # Try category image
        category_details = obj.get("category_details", {})
        if category_details and category_details.get("image"):
            return create_image_obj(category_details["image"])

        # Try division image
        division_details = obj.get("division_details", {})
        if division_details and division_details.get("image"):
            return create_image_obj(division_details["image"])

        # No images found
        return []

    is_serialized = serializers.BooleanField(read_only=True, required=False)
    is_lotted = serializers.BooleanField(read_only=True, required=False)
    pre_order_available = serializers.BooleanField(read_only=True, required=False)
    pre_order_date = serializers.DateTimeField(read_only=True, required=False)
    publication_status = serializers.CharField(read_only=True, required=False)
    seo_title = serializers.CharField(read_only=True, required=False)
    seo_description = serializers.CharField(read_only=True, required=False)
    seo_keywords = serializers.CharField(read_only=True, required=False)
    tags = serializers.ListField(read_only=True, required=False)
    faqs = serializers.ListField(read_only=True, required=False)
    images = serializers.ListField(read_only=True, required=False)
    attribute_values = serializers.ListField(read_only=True, required=False)
    atp_quantity = serializers.IntegerField(read_only=True)
    stock_status = serializers.CharField(read_only=True)
    variant_defining_attributes = serializers.ListField(read_only=True, required=False)
    variants = serializers.ListField(read_only=True, required=False)


class ProductSerializer(ProductDetailSerializer):
    """
    Legacy serializer for product data, inherits from ProductDetailSerializer.

    This serializer is maintained for backward compatibility with existing code.
    For new code, use ProductListSerializer or ProductDetailSerializer directly.
    """

    pass


# class CartItemInputSerializer(serializers.Serializer):
#     """
#     Serializer for creating new cart items.

#     Used when adding a new item to a cart, with validation to ensure:
#     - Product SKU format is valid (alphanumeric with - and _ allowed)
#     - Quantity is a valid positive integer

#     This serializer validates input data before it's processed by the CartViewSet
#     and handles proper error messaging for invalid inputs.
#     """

#     product_sku = serializers.CharField(
#         max_length=100,
#         min_length=3,
#         help_text="Product SKU/identifier of the item to add to cart",
#         error_messages={
#             "required": "Product SKU is required",
#             "blank": "Product SKU cannot be blank",
#             "min_length": "Product SKU must be at least 3 characters",
#             "max_length": "Product SKU cannot exceed 100 characters",
#         },
#     )
#     quantity = serializers.IntegerField(
#         min_value=1,
#         max_value=999,
#         help_text="Quantity of the product to add (minimum 1, maximum 999)",
#         error_messages={
#             "required": "Quantity is required",
#             "min_value": "Quantity must be at least 1",
#             "max_value": "Quantity cannot exceed 999",
#             "invalid": "Quantity must be a valid integer",
#         },
#     )

#     def validate_product_sku(self, value):
#         """
#         Validate product SKU format.

#         Args:
#             value: The product SKU to validate

#         Returns:
#             Validated product SKU

#         Raises:
#             ValidationError: If product SKU format is invalid
#         """
#         # Basic validation to ensure SKU doesn't contain special characters except - and _
#         import re

#         if re.search(r"[^a-zA-Z0-9\-_]", value):
#             raise serializers.ValidationError("Product SKU contains invalid characters")

#         return value


# class CartItemUpdateSerializer(serializers.Serializer):
#     """
#     Serializer for updating existing cart item quantities.

#     Used specifically for the update_item action in CartViewSet to validate
#     quantity changes for items already in the cart. Setting quantity to 0
#     is allowed and will trigger item removal from cart.
#     """

#     quantity = serializers.IntegerField(
#         min_value=0,
#         max_value=999,
#         help_text="New quantity for the cart item (0 to remove item from cart)",
#         error_messages={
#             "required": "Quantity is required",
#             "min_value": "Quantity must be at least 0",
#             "max_value": "Quantity cannot exceed 999",
#             "invalid": "Quantity must be a valid integer",
#         },
#     )


# class CartItemSerializer(BaseTenantModelSerializer):
#     """
#     Serializer for CartItem model representation in API responses.

#     This serializer enriches cart item data with product details from the product service,
#     providing a complete representation of items in the cart including current pricing,
#     availability, and product information.

#     The product_details field is dynamically populated using the get_product_details method,
#     which fetches data from the product service for each cart item.
#     """

#     product_details = serializers.SerializerMethodField(read_only=True)

#     class Meta:
#         model = CartItem
#         fields = [
#             "id",
#             "product_sku",
#             "quantity",
#             "product_details",
#             "created_at",
#             "updated_at",
#         ]
#         read_only_fields = ["id", "created_at", "updated_at"]

#     def get_product_details(self, obj):
#         """
#         Get product details from product service.

#         Args:
#             obj: The CartItem instance

#         Returns:
#             Dictionary with product details or None if not found
#         """
#         # Get tenant_slug from the request context
#         request = self.context.get("request")
#         tenant_slug = (
#             request.resolver_match.kwargs.get("tenant_slug") if request else None
#         )

#         # Get product details with tenant context
#         product = product_service.get_product_details(
#             sku=obj.product_sku, tenant_slug=tenant_slug
#         )

#         if not product:
#             return None

#         # Get the first image URL if available, otherwise return None
#         images = product.get("images", [])
#         image_url = (
#             images[0].get("image")
#             if images and isinstance(images, list) and len(images) > 0
#             else None
#         )
#         uom_details = product.get("uom_details", {})

#         # Check delivery eligibility if location parameters are provided
#         delivery_status = None
#         pincode = self.context.get('pincode')
#         country = self.context.get('country')
#         customer_group_selling_channel_id = self.context.get('customer_group_selling_channel_id')
        
#         if pincode and country and customer_group_selling_channel_id:
#             delivery_status = self._check_delivery_eligibility(
#                 product.get("id"), pincode, country, customer_group_selling_channel_id
#             )

#         product_details = {
#             "id": product.get("id", "N/A"),
#             "name": product.get("name", "N/A"),
#             "price": product.get(
#                 "display_price", "N/A"
#             ),  # Use display_price instead of price
#             "image_url": image_url if image_url else "N/A",
#             "unit_name": uom_details.get("name", "N/A") if uom_details else "N/A",
#         }
        
#         # Add delivery status if checked
#         if delivery_status is not None:
#             product_details["delivery_eligible"] = delivery_status["eligible"]
#             if not delivery_status["eligible"]:
#                 product_details["delivery_error"] = delivery_status["message"]
        
#         return product_details
    
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
            
#             # Check if product has zone restrictions
#             products_with_zones = ProductZoneRestriction.objects.filter(product_id=product_id).exists()
            
#             if products_with_zones:
#                 # Case 1: Product has zone restrictions - check pincode zone assignment
#                 try:
#                     pincode_assignment = PincodeZoneAssignment.objects.get(
#                         pincode__pincode=pincode,
#                         pincode__country_code=country_code
#                     )
#                     user_zone_id = pincode_assignment.zone_id
                    
#                     # Check product zone restrictions
#                     product_zones = ProductZoneRestriction.objects.filter(product_id=product_id)
#                     include_restrictions = product_zones.filter(restriction_mode='INCLUDE')
#                     exclude_restrictions = product_zones.filter(restriction_mode='EXCLUDE')
                    
#                     if include_restrictions.exists():
#                         # If INCLUDE restrictions exist, zone must be in the included list
#                         if include_restrictions.filter(zone_id=user_zone_id).exists():
#                             return {"eligible": True, "message": ""}
#                         else:
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
#             import logging
#             logger = logging.getLogger(__name__)
#             logger.error(f"Error checking delivery eligibility for product {product_id}: {str(e)}")
#             return {"eligible": True, "message": ""}


# class CartSerializer(BaseTenantModelSerializer):
#     """
#     Serializer for Cart model representation in API responses.

#     This serializer provides a complete representation of a shopping cart,
#     including all items with their product details, calculated totals,
#     and cart status information. It's used primarily by the CartViewSet
#     to present cart data to clients.

#     Features:
#     - Includes nested CartItem serializers for all items in the cart
#     - Calculates and includes total quantity across all items
#     - Calculates and includes subtotal amount based on current product prices
#     - Handles both authenticated user carts and guest carts
#     """

#     items = CartItemSerializer(
#         many=True,
#         read_only=True,
#         help_text="List of items in the cart with product details",
#     )
#     total_quantity = serializers.SerializerMethodField(
#         read_only=True, help_text="Total quantity of all items in the cart"
#     )
#     subtotal_amount = serializers.SerializerMethodField(
#         read_only=True,
#         help_text="Calculated subtotal amount based on current product prices",
#     )

#     class Meta:
#         model = Cart
#         fields = [
#             "id",
#             "status",
#             "items",
#             "total_quantity",
#             "subtotal_amount",
#             "created_at",
#             "updated_at",
#         ]
#         read_only_fields = ["id", "status", "created_at", "updated_at"]

#     def get_total_quantity(self, obj: Cart) -> int:
#         """
#         Get total quantity of items in cart.

#         Uses the Cart model's get_total_quantity method.

#         Args:
#             obj: The Cart instance

#         Returns:
#             Total quantity of items in cart
#         """
#         return obj.get_total_quantity()

#     def get_subtotal_amount(self, obj: Cart) -> Decimal:
#         """
#         Get subtotal amount of items in cart.

#         Uses the Cart model's get_subtotal_amount method which fetches
#         current prices from the product service.

#         Args:
#             obj: The Cart instance

#         Returns:
#             Subtotal amount of items in cart
#         """
#         # Extract tenant slug from request context if available
#         tenant_slug = None
#         request = self.context.get("request")

#         if request:
#             # Try to extract from request path
#             path = request.path
#             if path:
#                 # Extract tenant slug from URL path pattern /api/v1/{tenant_slug}/...
#                 import re

#                 match = re.search(r"/api/v1/([^/]+)/", path)
#                 if match:
#                     tenant_slug = match.group(1)

#         # Pass the tenant slug to the model method
#         return obj.get_subtotal_amount(tenant_slug=tenant_slug)


class WishlistItemSerializer(BaseTenantModelSerializer):
    """
    Serializer for WishlistItem model representation in API responses.

    This serializer enriches wishlist item data with product details from the product service,
    providing a complete representation of saved items including current pricing,
    availability, and product information.

    The product_details field is dynamically populated using the get_product_details method,
    which fetches data from the product service for each wishlist item.

    Note: This serializer inherits from BaseTenantModelSerializer which handles tenant context
    and user audit fields automatically.
    """

    product_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "product_sku",
            "product_details",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_product_details(self, obj):
        """
        Get product details from product service.

        Args:
            obj: The WishlistItem instance

        Returns:
            Dictionary with product details or None if not found
        """
        # Get tenant_slug from the request context
        request = self.context.get("request")
        tenant_slug = (
            request.resolver_match.kwargs.get("tenant_slug") if request else None
        )

        # Get product details with tenant context
        product = product_service.get_product_details(
            sku=obj.product_sku, tenant_slug=tenant_slug
        )

        # print("Product details:", product)

        if not product:
            return None

        # Get the first image URL if available, otherwise return None
        images = product.get("images", [])
        image_url = (
            images[0].get("image")
            if images and isinstance(images, list) and len(images) > 0
            else None
        )

        return {
            "name": product.get("name"),
            "price": product.get("display_price"),
            "description": product.get("description"),
            "image_url": image_url,
            "category": product.get("category"),
            "sku": product.get("sku"),  # Include the SKU from product details
        }


class AddressSerializer(serializers.Serializer):
    """
    Serializer for address data validation.

    Used for validating address input during checkout.
    """

    full_name = serializers.CharField(
        max_length=100,
        min_length=2,
        error_messages={
            "required": "Full name is required",
            "blank": "Full name cannot be blank",
            "min_length": "Full name must be at least 2 characters",
            "max_length": "Full name cannot exceed 100 characters",
        },
    )
    address_line1 = serializers.CharField(
        max_length=255,
        min_length=5,
        error_messages={
            "required": "Address line 1 is required",
            "blank": "Address line 1 cannot be blank",
            "min_length": "Address line 1 must be at least 5 characters",
            "max_length": "Address line 1 cannot exceed 255 characters",
        },
    )
    address_line2 = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        error_messages={"max_length": "Address line 2 cannot exceed 255 characters"},
    )
    city = serializers.CharField(
        max_length=100,
        min_length=2,
        error_messages={
            "required": "City is required",
            "blank": "City cannot be blank",
            "min_length": "City must be at least 2 characters",
            "max_length": "City cannot exceed 100 characters",
        },
    )
    state = serializers.CharField(
        max_length=100,
        min_length=2,
        error_messages={
            "required": "State is required",
            "blank": "State cannot be blank",
            "min_length": "State must be at least 2 characters",
            "max_length": "State cannot exceed 100 characters",
        },
    )
    postal_code = serializers.CharField(
        max_length=20,
        min_length=3,
        error_messages={
            "required": "Postal code is required",
            "blank": "Postal code cannot be blank",
            "min_length": "Postal code must be at least 3 characters",
            "max_length": "Postal code cannot exceed 20 characters",
        },
    )
    country = serializers.CharField(
        max_length=2,
        min_length=2,
        error_messages={
            "required": "Country code is required",
            "blank": "Country code cannot be blank",
            "min_length": "Country code must be exactly 2 characters",
            "max_length": "Country code must be exactly 2 characters",
        },
    )
    # phone_number = serializers.CharField(
    #     max_length=20,
    #     min_length=7,
    #     error_messages={
    #         'required': 'Phone number is required',
    #         'blank': 'Phone number cannot be blank',
    #         'min_length': 'Phone number must be at least 7 characters',
    #         'max_length': 'Phone number cannot exceed 20 characters'
    #     }
    # )

    def validate_country(self, value):
        """
        Validate country code is 2 characters and a valid ISO 3166-1 alpha-2 code.

        Args:
            value: The country code to validate

        Returns:
            Validated country code (uppercase)

        Raises:
            ValidationError: If country code is not 2 characters
        """
        if len(value) != 2:
            raise serializers.ValidationError(
                "Country code must be 2 characters (ISO 3166-1 alpha-2)"
            )

        # Convert to uppercase for consistency
        value = value.upper()

        # Optional: Add validation against a list of valid country codes if needed
        # valid_countries = ['US', 'CA', 'GB', 'AU', ...]
        # if value not in valid_countries:
        #     raise serializers.ValidationError("Invalid country code")

        return value

    def validate_phone_number(self, value):
        """
        Validate phone number format.

        Args:
            value: The phone number to validate

        Returns:
            Validated phone number

        Raises:
            ValidationError: If phone number format is invalid
        """
        # Remove any non-digit characters for validation
        digits_only = "".join(filter(str.isdigit, value))

        if len(digits_only) < 7:
            raise serializers.ValidationError(
                "Phone number must have at least 7 digits"
            )

        if len(digits_only) > 15:
            raise serializers.ValidationError(
                "Phone number cannot have more than 15 digits"
            )

        return value

    def validate_postal_code(self, value):
        """
        Validate postal code format.

        Args:
            value: The postal code to validate

        Returns:
            Validated postal code

        Raises:
            ValidationError: If postal code contains invalid characters
        """
        # Basic validation to ensure postal code doesn't contain special characters
        import re

        if re.search(r"[^a-zA-Z0-9\s-]", value):
            raise serializers.ValidationError("Postal code contains invalid characters")

        return value


class ShippingMethodSerializer(serializers.Serializer):
    """
    Serializer for shipping method data validation.

    Used for validating shipping method selection during checkout.
    """

    method_id = serializers.CharField(
        max_length=50,
        min_length=2,
        error_messages={
            "required": "Shipping method ID is required",
            "blank": "Shipping method ID cannot be blank",
            "min_length": "Shipping method ID must be at least 2 characters",
            "max_length": "Shipping method ID cannot exceed 50 characters",
        },
    )
    name = serializers.CharField(
        max_length=100,
        min_length=2,
        error_messages={
            "required": "Shipping method name is required",
            "blank": "Shipping method name cannot be blank",
            "min_length": "Shipping method name must be at least 2 characters",
            "max_length": "Shipping method name cannot exceed 100 characters",
        },
    )
    cost = serializers.CharField(
        max_length=20,
        error_messages={
            "required": "Shipping cost is required",
            "blank": "Shipping cost cannot be blank",
            "max_length": "Shipping cost cannot exceed 20 characters",
        },
    )
    estimated_delivery = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        error_messages={
            "max_length": "Estimated delivery cannot exceed 100 characters"
        },
    )

    def validate_cost(self, value):
        """
        Validate shipping cost format.

        Args:
            value: The shipping cost to validate

        Returns:
            The validated value

        Raises:
            ValidationError: If shipping cost format is invalid
        """
        try:
            # Try to convert to float to ensure it's a valid number
            cost_value = float(value.replace(",", ""))
            if cost_value < 0:
                raise serializers.ValidationError("Shipping cost cannot be negative")
        except ValueError:
            raise serializers.ValidationError("Shipping cost must be a valid number")

        return value

    def validate_method_id(self, value):
        """
        Validate shipping method ID format.

        Args:
            value: The shipping method ID to validate

        Returns:
            The validated value

        Raises:
            ValidationError: If shipping method ID format is invalid
        """
        # Basic validation to ensure method ID doesn't contain special characters except - and _
        import re

        if re.search(r"[^a-zA-Z0-9\-_]", value):
            raise serializers.ValidationError(
                "Shipping method ID contains invalid characters"
            )

        return value


class UserProfileSerializer(serializers.Serializer):
    """
    Serializer for reading user profile data.

    This serializer is used for retrieving user profile information
    from the customer service integration.
    """

    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone_number = serializers.CharField(
        read_only=True, allow_blank=True, allow_null=True
    )


class UserProfileUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating user profile data.

    This serializer is used for validating and updating user profile
    information via the customer service integration.
    """

    name = serializers.CharField(
        required=False,
        max_length=100,
        min_length=2,
        error_messages={
            "min_length": "Name must be at least 2 characters",
            "max_length": "Name cannot exceed 100 characters",
        },
    )
    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
        min_length=7,
        error_messages={
            "min_length": "Phone number must be at least 7 characters",
            "max_length": "Phone number cannot exceed 20 characters",
        },
    )

    def validate_phone_number(self, value):
        """
        Validate phone number format if provided.

        Args:
            value: The phone number to validate

        Returns:
            Validated phone number

        Raises:
            ValidationError: If phone number format is invalid
        """
        if not value:  # Skip validation if empty
            return value

        # Remove any non-digit characters for validation
        digits_only = "".join(filter(str.isdigit, value))

        if len(digits_only) < 7:
            raise serializers.ValidationError(
                "Phone number must have at least 7 digits"
            )

        if len(digits_only) > 15:
            raise serializers.ValidationError(
                "Phone number cannot have more than 15 digits"
            )

        return value


class RMAInitiationItemSerializer(serializers.Serializer):
    """
    Serializer for validating individual items in a return request.

    This serializer validates the order item ID, quantity, and optional reason
    for each item being returned.
    """

    order_item_id = serializers.IntegerField(
        required=True,
        error_messages={
            "required": "Order item ID is required",
            "invalid": "Order item ID must be a valid integer",
        },
    )
    quantity = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=999,
        error_messages={
            "required": "Quantity is required",
            "min_value": "Quantity must be at least 1",
            "max_value": "Quantity cannot exceed 999",
            "invalid": "Quantity must be a valid integer",
        },
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        error_messages={"max_length": "Reason cannot exceed 255 characters"},
    )

    def validate_reason(self, value):
        """
        Validate reason text for potential security issues.

        Args:
            value: The reason text to validate

        Returns:
            Validated reason text

        Raises:
            ValidationError: If reason contains potentially harmful content
        """
        if not value:  # Skip validation if empty
            return value

        # Check for potentially harmful HTML or script content
        import re

        if re.search(
            r"<[^>]*script|javascript:|data:|vbscript:|<\s*iframe|<\s*img|<\s*object|<\s*embed|<\s*form|<\s*input|<\s*link|onerror=|onload=|onclick=",
            value,
            re.IGNORECASE,
        ):
            raise serializers.ValidationError(
                "Reason contains potentially harmful content"
            )

        return value


class RMAInitiationSerializer(serializers.Serializer):
    """
    Serializer for validating return initiation requests.

    This serializer validates the order ID and items to be returned,
    checking against business rules via the policy service.
    """

    order_id = serializers.IntegerField(required=True)
    items = RMAInitiationItemSerializer(many=True, required=True, allow_empty=False)

    def validate(self, data):
        """
        Validate the return request against business rules.

        This method performs several validations:
        1. Verifies the order exists and belongs to the user (for registered users)
           or is accessed via a valid guest token (for guest users)
        2. Checks if the return is allowed via policy service
        3. Validates each item belongs to the order and quantities are valid

        Args:
            data: The validated data containing order_id and items

        Returns:
            The validated data if all checks pass

        Raises:
            ValidationError: If any validation check fails
        """
        order_id = data.get("order_id")
        items_data = data.get("items")
        request = self.context.get("request")

        # Get order from context (for guest users) or fetch it (for registered users)
        order = self.context.get("order")
        user_id = None

        if order:
            # Guest user flow - order was provided in context by the view
            user_id = None  # Explicitly set to None for guest users
        elif request:
            # Registered user flow - fetch order based on user credentials
            user_id = getattr(request, "auth_user_id", None)

        if not user_id:
            raise serializers.ValidationError("User identification not available")

        try:
            # Fetch order using only order_id (tenant scoping handled by schema)
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise serializers.ValidationError(f"Order with ID {order_id} not found")

        # Verify user ownership by comparing contact IDs
        user_contact_id = customer_service.get_contact_id_for_credential(user_id)
        if order.contact_id != user_contact_id:
            raise serializers.ValidationError(
                "You can only initiate returns for your own orders"
            )

        # Check return policy
        can_return, reason = policy_service.can_initiate_return(
            order=order,
            items_data=items_data,
            user_id=user_id,  # Add the required user_id parameter
        )

        if not can_return:
            raise serializers.ValidationError(reason)

        # Validate each item
        order_items_map = {}
        for item in items_data:
            try:
                order_item = OrderItem.objects.get(
                    id=item["order_item_id"], order_id=order.id
                )
            except OrderItem.DoesNotExist:
                raise serializers.ValidationError(
                    f"Order item with ID {item['order_item_id']} not found in order {order_id}"
                )

            if item["quantity"] > order_item.quantity:
                raise serializers.ValidationError(
                    f"Requested return quantity ({item['quantity']}) exceeds ordered quantity ({order_item.quantity})"
                )

            order_items_map[item["order_item_id"]] = order_item

        # Store validated objects in context for use in perform_create
        self.context["validated_order"] = order
        self.context["order_items_map"] = order_items_map

        return data


class RMAItemOutputSerializer(BaseTenantModelSerializer):
    """
    Serializer for RMAItem model (output).

    Used for displaying RMA item details in API responses.
    Includes order item details, resolution, received quantity, and condition.
    """

    order_item_details = serializers.SerializerMethodField()

    class Meta:
        model = RMAItem
        fields = [
            "id",
            "order_item_id",
            "quantity_requested",
            "received_quantity",
            "resolution",
            "condition",
            "reason",
            "order_item_details",
            "created_at",
            "updated_at",
        ]

    def get_order_item_details(self, obj):
        """
        Get details of the original order item.

        Args:
            obj: The RMAItem instance

        Returns:
            Dictionary with order item details
        """
        if not obj.order_item:
            return None

        return {
            "id": obj.order_item.id,
            "product_sku": obj.order_item.product_sku,
            "product_name": obj.order_item.product_name,
            "unit_price": str(obj.order_item.unit_price),
            "quantity": obj.order_item.quantity,
        }


class RMAOutputSerializer(BaseTenantModelSerializer):
    """
    Serializer for RMA model (output).

    Used for displaying RMA details in API responses, including nested items,
    order details, and custom notes.
    """

    items = RMAItemOutputSerializer(many=True, read_only=True)
    order_details = serializers.SerializerMethodField()

    class Meta:
        model = RMA
        fields = [
            "id",
            "rma_number",
            "order_id",
            "contact_id",
            "status",
            "notes",
            "created_at",
            "updated_at",
            "items",
            "order_details",
        ]

    def get_order_details(self, obj):
        """
        Get basic details of the original order.

        Args:
            obj: The RMA instance

        Returns:
            Dictionary with order details
        """
        if not obj.order:
            return None

        return {
            "id": obj.order.id,
            "order_id": obj.order.order_id,
            "total_amount": str(obj.order.total_amount),
            "currency": obj.order.currency,
            "account_id": obj.order.account_id,
            "created_at": obj.order.created_at,
        }


class WalletTransactionSerializer(BaseTenantModelSerializer):
    """Serializer for WalletTransaction model.

    Used for displaying wallet transaction details in API responses.
    """

    class Meta:
        model = WalletTransaction
        fields = [
            "id",
            "transaction_type",
            "amount",
            "created_at",
            "related_order_id",
            "related_rma_id",
            "notes",
        ]
        read_only_fields = fields


class WalletRechargeInitiationSerializer(serializers.Serializer):
    """Serializer for wallet recharge initiation.

    Used for validating input when initiating a wallet recharge.
    """

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=1.00,
        error_messages={
            "min_value": "Recharge amount must be at least 1.00",
            "invalid": "Please enter a valid amount",
        },
    )
    payment_method_id = serializers.CharField(
        max_length=100,
        required=True,
        error_messages={
            "required": "Payment method is required",
            "blank": "Payment method cannot be blank",
        },
    )


class ContactPersonSerializer(serializers.Serializer):
    """
    Serializer for contact person data.

    Used for displaying contact person details in the Customer User Management API.
    """

    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    is_portal_access_enabled = serializers.BooleanField(read_only=True)
    portal_role = serializers.CharField(read_only=True, allow_null=True)


class ContactAccessUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating contact person access and role.

    Used for validating input when updating a contact person's portal access and role.
    """

    access_enabled = serializers.BooleanField(
        required=True,
        error_messages={
            "required": "Access enabled flag is required",
        },
    )
    role = serializers.ChoiceField(
        choices=["Admin", "Regular User"],
        required=True,
        error_messages={
            "required": "Role is required",
            "invalid_choice": 'Role must be either "Admin" or "Regular User"',
        },
    )


class RMARejectInputSerializer(serializers.Serializer):
    """
    Serializer for validating RMA rejection requests.

    This serializer validates the rejection reason provided when
    an administrator rejects a return merchandise authorization request.
    """

    reason = serializers.CharField(
        required=True,
        max_length=500,
        error_messages={
            "required": "Rejection reason is required",
            "max_length": "Rejection reason cannot exceed 500 characters",
        },
    )

    def validate_reason(self, value):
        """
        Validate the rejection reason for potential security issues.

        Args:
            value: The rejection reason string

        Returns:
            The validated reason string

        Raises:
            ValidationError: If reason contains potentially harmful content
        """
        if not value:  # Skip validation if empty
            return value

        # Check for potentially harmful HTML or script content
        import re

        if re.search(
            r"<[^>]*script|javascript:|data:|vbscript:|<\s*iframe|<\s*img|<\s*object|<\s*embed|<\s*form|<\s*input|<\s*link|onerror=|onload=|onclick=",
            value,
            re.IGNORECASE,
        ):
            raise serializers.ValidationError(
                "Reason contains potentially harmful content"
            )

        return value


class RMAReceivedItemInputSerializer(serializers.Serializer):
    """
    Serializer for validating received RMA items.
    """

    rma_item_id = serializers.IntegerField(
        required=True, error_messages={"required": "RMA item ID is required"}
    )
    received_quantity = serializers.IntegerField(
        required=True,
        min_value=0,
        error_messages={
            "required": "Received quantity is required",
            "min_value": "Received quantity cannot be negative",
        },
    )


class RMAReceivedInputSerializer(serializers.Serializer):
    """
    Serializer for validating multiple received RMA items.
    """

    items = RMAReceivedItemInputSerializer(
        many=True,
        required=True,
        allow_empty=False,
        error_messages={
            "required": "At least one item must be specified",
            "empty": "At least one item must be specified",
        },
    )


class RMAResolutionItemInputSerializer(serializers.Serializer):
    """
    Serializer for validating RMA item resolution details.
    """

    rma_item_id = serializers.IntegerField(
        required=True, error_messages={"required": "RMA item ID is required"}
    )
    approved_quantity = serializers.IntegerField(
        required=True,
        min_value=0,
        error_messages={
            "required": "Approved quantity is required",
            "min_value": "Approved quantity cannot be negative",
        },
    )
    condition = serializers.ChoiceField(
        choices=RMAItemCondition.choices,
        required=True,
        error_messages={
            "required": "Item condition is required",
            "invalid_choice": "Invalid condition. Must be one of the allowed values.",
        },
    )


class RMAProcessRefundInputSerializer(serializers.Serializer):
    """
    Serializer for validating RMA refund processing requests.
    """

    items = RMAResolutionItemInputSerializer(
        many=True,
        required=True,
        allow_empty=False,
        error_messages={
            "required": "At least one item must be specified",
            "empty": "At least one item must be specified",
        },
    )
    refund_destination = serializers.ChoiceField(
        choices=["WALLET", "ORIGINAL_METHOD"],
        required=True,
        error_messages={
            "required": "Refund destination is required",
            "invalid_choice": 'Refund destination must be either "WALLET" or "ORIGINAL_METHOD"',
        },
    )


class RMAProcessExchangeInputSerializer(serializers.Serializer):
    """
    Serializer for validating RMA exchange processing requests.
    """

    items = RMAResolutionItemInputSerializer(
        many=True,
        required=True,
        allow_empty=False,
        error_messages={
            "required": "At least one item must be specified",
            "empty": "At least one item must be specified",
        },
    )


class TenantConfigurationSerializer(BaseTenantModelSerializer):
    """
    Serializer for TenantConfiguration model.

    This serializer handles tenant-specific configuration settings,
    including payment settings, notification preferences, UI templates,
    feature toggles, and module-specific configurations. It provides
    comprehensive validation for each configuration section to ensure data integrity.

    Fields:
    - payment_settings: JSON object containing payment provider configurations, gateway settings, and payment options
    - notification_settings: JSON object with email/SMS templates, provider credentials, and notification preferences
    - feature_toggles: JSON object with boolean flags to enable/disable specific features
    - wallet_config: JSON object with wallet module settings (transaction limits, auto-recharge settings, etc.)
    - returns_config: JSON object with return policy settings (return window, eligible statuses, etc.)
    - loyalty_config: JSON object with loyalty program settings (points rules, tiers, expiration policies, etc.)

    Example:
    ```json
    {
      "payment_settings": {
        "providers": {"stripe": {"api_key": "...", "webhook_secret": "..."}},
        "allowed_methods": ["credit_card", "bank_transfer", "wallet"]
      },
      "feature_toggles": {
        "enable_wishlist": true,
        "enable_reviews": false
      }
    }
    ```
    """

    class Meta:
        model = TenantConfiguration
        fields = [
            # Configurable JSON fields
            "payment_settings",
            "notification_settings",
            # "feature_toggles",
            # "wallet_config",
            # "loyalty_config",
            # "returns_config",
            "pending_payment_timeout_minutes",
            "tenant_ref",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "tenant_ref",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def validate_payment_settings(self, value):
        """
        Validate payment settings structure and content.

        This method validates that the payment_settings field contains a properly structured
        JSON object with all required keys and appropriate data types. The payment_settings
        object configures which payment gateways are available to customers and which one
        is used by default.

        Required structure:
        {
            "enabled_gateways": ["stripe", "paypal", ...],  # List of enabled gateway IDs
            "default_gateway": "stripe",                    # Must be in enabled_gateways
            "gateway_config": {                            # Optional gateway-specific settings
                "stripe": { "api_key": "...", "webhook_secret": "..." },
                "paypal": { "client_id": "...", "client_secret": "..." }
            },
            "payment_options": {                          # Optional payment display options
                "show_payment_icons": true,
                "allowed_methods": ["credit_card", "bank_transfer"]
            }
        }

        Args:
            value: The payment settings JSON object

        Returns:
            The validated value if validation passes

        Raises:
            ValidationError: If value is not a valid JSON object, is missing required keys,
                            or contains invalid values for any required fields
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Payment settings must be a JSON object")

        # Validate required keys
        required_keys = ["enabled_gateways", "default_gateway"]
        for key in required_keys:
            if key not in value:
                raise serializers.ValidationError(
                    f"Payment settings must include '{key}'"
                )

        # Validate enabled_gateways is a list
        if not isinstance(value.get("enabled_gateways"), list):
            raise serializers.ValidationError(
                "enabled_gateways must be a list of payment gateway IDs"
            )

        # Validate default_gateway is a string and in the enabled_gateways list
        if not isinstance(value.get("default_gateway"), str):
            raise serializers.ValidationError("default_gateway must be a string")

        if value.get("default_gateway") not in value.get("enabled_gateways", []):
            raise serializers.ValidationError(
                "default_gateway must be one of the enabled_gateways"
            )

        return value

    def validate_notification_settings(self, value):
        """
        Validate notification settings structure and content.

        This method validates that the notification_settings field contains a properly structured
        JSON object with configuration for email, SMS, and push notifications. It validates the
        presence of required keys and ensures proper data types for all configuration settings.

        Required structure:
        {
            "email": {
                "enabled": true,                    # Boolean indicating if email notifications are enabled
                "sender_email": "noreply@example.com",  # Default sender email address
                "templates": {                     # Email templates by notification type
                    "order_confirmation": {"subject": "...", "body": "..."},
                    "shipping_confirmation": {"subject": "...", "body": "..."}
                }
            },
            "sms": {
                "enabled": false,                   # Boolean indicating if SMS notifications are enabled
                "provider": "twilio",              # SMS provider name (twilio, sns, etc.)
                "templates": {                     # SMS templates by notification type
                    "order_confirmation": "Your order {{order_id}} has been confirmed."
                }
            },
            "notification_events": {               # Configuration for which events trigger notifications
                "order_placed": {"email": true, "sms": false},
                "order_shipped": {"email": true, "sms": true}
            }
        }

        Args:
            value: The notification settings JSON object

        Returns:
            The validated value if validation passes

        Raises:
            ValidationError: If value is not a valid JSON object, is missing required keys,
                            or contains invalid values for any required fields
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Notification settings must be a JSON object"
            )

        # Validate email_notifications if present
        if "email_notifications" in value:
            if not isinstance(value["email_notifications"], dict):
                raise serializers.ValidationError(
                    "email_notifications must be an object"
                )

            # Check that email notification settings are booleans
            email_settings = value["email_notifications"]
            for key, val in email_settings.items():
                if not isinstance(val, bool):
                    raise serializers.ValidationError(
                        f"Email notification setting '{key}' must be a boolean"
                    )

        # Validate sms_notifications if present
        if "sms_notifications" in value:
            if not isinstance(value["sms_notifications"], dict):
                raise serializers.ValidationError("sms_notifications must be an object")

            # Check that SMS notification settings are booleans
            sms_settings = value["sms_notifications"]
            for key, val in sms_settings.items():
                if not isinstance(val, bool):
                    raise serializers.ValidationError(
                        f"SMS notification setting '{key}' must be a boolean"
                    )

        return value

    # def validate_feature_toggles(self, value):
    #     """
    #     Validate feature toggles structure and content.

    #     This method validates that the feature_toggles field contains a properly structured
    #     JSON object with boolean flags to enable/disable specific functionality within
    #     the application. Each toggle key should be in uppercase and match one of the expected
    #     feature names, with a boolean value indicating whether the feature is enabled.

    #     Expected structure:
    #     {
    #         "WALLET": true,            # Enable/disable wallet functionality
    #         "LOYALTY": true,           # Enable/disable loyalty points program
    #         "RETURNS": true,           # Enable/disable product returns
    #         "EXCHANGE": false,         # Enable/disable product exchanges
    #     }

    #     Args:
    #         value: The feature toggles JSON object

    #     Returns:
    #         The validated value if validation passes

    #     Raises:
    #         ValidationError: If value is not a valid JSON object, contains non-boolean values,
    #                         or contains unexpected feature keys
    #     """
    #     if not isinstance(value, dict):
    #         raise serializers.ValidationError("Feature toggles must be a JSON object")

    #     # Expected feature toggle keys
    #     expected_features = [
    #         "WALLET",
    #         "LOYALTY",
    #         "RETURNS",
    #         "EXCHANGE",
    #     ]

    #     # Validate that all feature toggle values are booleans
    #     for key, val in value.items():
    #         if not isinstance(val, bool):
    #             raise serializers.ValidationError(
    #                 f"Feature toggle '{key}' must be a boolean value"
    #             )

    #     # Ensure required features are present
    #     for feature in expected_features:
    #         if feature not in value:
    #             raise serializers.ValidationError(
    #                 f"Feature toggle '{feature}' is required"
    #             )

    #     return value

    # def validate_wallet_config(self, value):
    #     """
    #     Validate wallet configuration structure and content.

    #     This method validates that the wallet_config field contains a properly structured
    #     JSON object with settings for the wallet module. It includes configuration for
    #     minimum/maximum recharge amounts, transaction limits, auto-recharge settings,
    #     and whether the wallet functionality is enabled for this tenant.

    #     Expected structure:
    #     {
    #         "enabled": true,                      # Master toggle for wallet functionality
    #         "min_recharge_amount": 10.00,        # Minimum amount for a single recharge
    #         "max_recharge_amount": 10000.00,     # Maximum amount for a single recharge
    #         "daily_transaction_limit": 5000.00,  # Optional daily transaction limit
    #         "auto_recharge": {                   # Optional auto-recharge settings
    #             "enabled": false,
    #             "threshold": 100.00,
    #             "amount": 500.00
    #         },
    #         "expiry": {                          # Optional wallet balance expiry settings
    #             "enabled": false,
    #             "days": 365
    #         }
    #     }

    #     Args:
    #         value: The wallet configuration JSON object

    #     Returns:
    #         The validated value if validation passes

    #     Raises:
    #         ValidationError: If value is not a valid JSON object, is missing required keys,
    #                         or contains invalid values for any required fields
    #     """
    #     if not isinstance(value, dict):
    #         raise serializers.ValidationError(
    #             "Wallet configuration must be a JSON object"
    #         )

    #     # Required wallet configuration keys
    #     required_keys = ["min_recharge_amount", "max_recharge_amount", "enabled"]
    #     for key in required_keys:
    #         if key not in value:
    #             raise serializers.ValidationError(
    #                 f"Wallet configuration must include '{key}'"
    #             )

    #     # Validate min_recharge_amount is a positive number
    #     if "min_recharge_amount" in value:
    #         try:
    #             min_amount = float(value["min_recharge_amount"])
    #             if min_amount <= 0:
    #                 raise serializers.ValidationError(
    #                     "min_recharge_amount must be a positive number"
    #                 )
    #         except (ValueError, TypeError):
    #             raise serializers.ValidationError(
    #                 "min_recharge_amount must be a valid number"
    #             )

    #     # Validate max_recharge_amount is a positive number and greater than min_recharge_amount
    #     if "max_recharge_amount" in value:
    #         try:
    #             max_amount = float(value["max_recharge_amount"])
    #             if max_amount <= 0:
    #                 raise serializers.ValidationError(
    #                     "max_recharge_amount must be a positive number"
    #                 )

    #             if "min_recharge_amount" in value and max_amount < float(
    #                 value["min_recharge_amount"]
    #             ):
    #                 raise serializers.ValidationError(
    #                     "max_recharge_amount must be greater than min_recharge_amount"
    #                 )
    #         except (ValueError, TypeError):
    #             raise serializers.ValidationError(
    #                 "max_recharge_amount must be a valid number"
    #             )

    #     # Validate enabled is a boolean
    #     if "enabled" in value and not isinstance(value["enabled"], bool):
    #         raise serializers.ValidationError("enabled must be a boolean value")

    #     return value

    # def validate_loyalty_config(self, value):
    #     """
    #     Validate loyalty configuration structure.

    #     Args:
    #         value: The loyalty configuration value

    #     Returns:
    #         The validated value

    #     Raises:
    #         ValidationError: If value is not a valid JSON object or has invalid structure
    #     """
    #     if not isinstance(value, dict):
    #         raise serializers.ValidationError(
    #             "Loyalty configuration must be a JSON object"
    #         )

    #     # Required loyalty configuration keys
    #     required_keys = [
    #         "earn_rate",
    #         "redemption_rate",
    #         "enabled",
    #         "min_points_for_redemption",
    #     ]
    #     for key in required_keys:
    #         if key not in value:
    #             raise serializers.ValidationError(
    #                 f"Loyalty configuration must include '{key}'"
    #             )

    #     # Validate earn_rate is a positive number
    #     if "earn_rate" in value:
    #         try:
    #             earn_rate = float(value["earn_rate"])
    #             if earn_rate <= 0:
    #                 raise serializers.ValidationError(
    #                     "earn_rate must be a positive number"
    #                 )
    #         except (ValueError, TypeError):
    #             raise serializers.ValidationError("earn_rate must be a valid number")

    #     # Validate redemption_rate is a positive number
    #     if "redemption_rate" in value:
    #         try:
    #             redemption_rate = float(value["redemption_rate"])
    #             if redemption_rate <= 0:
    #                 raise serializers.ValidationError(
    #                     "redemption_rate must be a positive number"
    #                 )
    #         except (ValueError, TypeError):
    #             raise serializers.ValidationError(
    #                 "redemption_rate must be a valid number"
    #             )

    #     # Validate min_points_for_redemption is a positive integer
    #     if "min_points_for_redemption" in value:
    #         try:
    #             min_points = int(value["min_points_for_redemption"])
    #             if min_points < 0:
    #                 raise serializers.ValidationError(
    #                     "min_points_for_redemption must be a non-negative integer"
    #                 )
    #         except (ValueError, TypeError):
    #             raise serializers.ValidationError(
    #                 "min_points_for_redemption must be a valid integer"
    #             )

    #     # Validate enabled is a boolean
    #     if "enabled" in value and not isinstance(value["enabled"], bool):
    #         raise serializers.ValidationError("enabled must be a boolean value")

    #     return value

    # def validate_returns_config(self, value):
    #     """
    #     Validate return policy configuration structure.

    #     Args:
    #         value: The return policy configuration value

    #     Returns:
    #         The validated value

    #     Raises:
    #         ValidationError: If value is not a valid JSON object or has invalid structure
    #     """
    #     if not isinstance(value, dict):
    #         raise serializers.ValidationError(
    #             "Return policy configuration must be a JSON object"
    #         )

    #     # Optional: Validate specific fields if present
    #     if "return_window_days" in value and not isinstance(
    #         value["return_window_days"], int
    #     ):
    #         raise serializers.ValidationError("return_window_days must be an integer")

    #     if "allow_return_on_status" in value and not isinstance(
    #         value["allow_return_on_status"], list
    #     ):
    #         raise serializers.ValidationError(
    #             "allow_return_on_status must be a list of status strings"
    #         )

    #     if "non_returnable_skus" in value and not isinstance(
    #         value["non_returnable_skus"], list
    #     ):
    #         raise serializers.ValidationError(
    #             "non_returnable_skus must be a list of product SKUs"
    #         )

    #     return value

class StorePickupSerializer(serializers.ModelSerializer):
    """
    Serializer for StorePickup model.

    This serializer handles the transformation of StorePickup model instances
    to/from JSON for the REST API. All fields except contact_person and contact_number
    are required.

    When updating:
    - Only included customer_group_selling_channels will be active
    - Excluded ones will be marked inactive
    - Response will only show active relationships
    """

    customer_group_selling_channels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=CustomerGroupSellingChannel.objects.all(), required=False
    )

    def update(self, instance, validated_data):
        """
        Update store pickup and handle customer group selling channel relationships.

        Args:
            instance: The store pickup instance being updated
            validated_data: Validated data from the request

        Returns:
            Updated store pickup instance
        """
        # Get the customer group selling channels from validated data
        customer_group_selling_channels = validated_data.pop(
            "customer_group_selling_channels", []
        )

        # Get all existing relationships
        existing_relationships = (
            instance.customer_group_selling_channels.through.objects.filter(
                store_pickup=instance
            )
        )

        # Get user_id from JWT token
        user_id = getattr(self.context["request"].user, "id", None)

        # Update all relationships to inactive first
        existing_relationships.update(is_active=False)

        # Activate only the ones that were included in the update
        for channel in customer_group_selling_channels:
            relationship, created = (
                instance.customer_group_selling_channels.through.objects.get_or_create(
                    store_pickup=instance,
                    customer_group_selling_channel=channel,
                    defaults={"is_active": True, "created_by": user_id},
                )
            )
            if not created:
                relationship.is_active = True
                relationship.updated_by = user_id
                relationship.save()

        # Continue with regular update
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        """
        Customize the representation to only show active relationships.
        """
        representation = super().to_representation(instance)

        # Filter to only show active relationships
        active_relationships = (
            instance.customer_group_selling_channels.through.objects.filter(
                store_pickup=instance, is_active=True
            ).values_list("customer_group_selling_channel_id", flat=True)
        )

        representation["customer_group_selling_channels"] = list(active_relationships)
        return representation

    class Meta:
        model = StorePickup
        fields = [
            "id",
            "name",
            "contact_person",
            "contact_number",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "country",
            "pincode",
            "google_place_id",
            "operating_hours",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "customer_group_selling_channels",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "address_line1": {"required": True},
            "city": {"required": True},
            "state": {"required": True},
            "country": {"required": True},
            "pincode": {"required": True},
            "operating_hours": {"required": True},
            "is_active": {"required": True},
        }

    def validate_operating_hours(self, value):
        """
        Validate the operating_hours JSON field.

        Args:
            value: The operating hours value to validate

        Returns:
            The validated operating hours

        Raises:
            serializers.ValidationError: If operating hours format is invalid
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Operating hours must be a JSON object")

        days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]

        for day in days:
            if day in value:
                day_data = value[day]
                if not isinstance(day_data, dict):
                    raise serializers.ValidationError(
                        f"Invalid format for {day} in operating hours"
                    )

                if "is_open" not in day_data:
                    raise serializers.ValidationError(f"Missing 'is_open' for {day}")

                if day_data.get("is_open", False):
                    if "open" not in day_data or "close" not in day_data:
                        raise serializers.ValidationError(
                            f"Missing 'open' or 'close' time for {day}"
                        )

                    try:
                        # Validate time format (HH:MM)
                        from datetime import datetime

                        datetime.strptime(day_data["open"], "%H:%M")
                        datetime.strptime(day_data["close"], "%H:%M")
                    except ValueError:
                        raise serializers.ValidationError(
                            f"Invalid time format for {day}. Use 'HH:MM' format"
                        )

        return value


class TimeSlotSerializer(serializers.ModelSerializer):
    """
    Serializer for the TimeSlot model.
    Handles conversion between TimeSlot model instances and JSON.
    """

    class Meta:
        model = TimeSlot
        fields = [
            "id",
            "name",
            "start_time",
            "end_time",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "start_time": {"format": "%H:%M"},
            "end_time": {"format": "%H:%M"},
        }

    def validate(self, data):
        """
        Validate that start_time is before end_time.
        """
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError(
                {"end_time": _("End time must be after start time.")}
            )
        return data

    def to_representation(self, instance):
        """
        Convert time fields to string format for JSON response.
        """
        representation = super().to_representation(instance)
        representation["start_time"] = instance.start_time.strftime("%H:%M")
        representation["end_time"] = instance.end_time.strftime("%H:%M")
        return representation


class ShippingMethodZoneRestrictionSerializer(serializers.ModelSerializer):
    """
    Serializer for ShippingMethodZoneRestriction model.
    Handles conversion between ShippingMethodZoneRestriction model instances and JSON.
    """
    zone = serializers.PrimaryKeyRelatedField(queryset=ShippingZone.objects.all())
    restriction_mode = serializers.ChoiceField(choices=[('INCLUDE', 'Include'), ('EXCLUDE', 'Exclude')])

    class Meta:
        model = ShippingMethodZoneRestriction
        fields = ["zone", "restriction_mode"]

class ShippingMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for the ShippingMethod model.
    Handles conversion between ShippingMethod model instances and JSON.
    Includes validation for delivery days and customer group selling channel relationships.

    When updating:
    - Only included customer_group_selling_channels will be active
    - Excluded ones will be marked inactive
    - Response will only show active relationships
    """

    customer_group_selling_channels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=CustomerGroupSellingChannel.objects.all(), required=False
    )
    zone_restrictions = ShippingMethodZoneRestrictionSerializer(many=True, required=False)

    def create(self, validated_data):
        """
        Create shipping method and handle nested zone_restrictions and customer_group_selling_channels.
        """
        zone_restrictions_data = validated_data.pop('zone_restrictions', [])
        customer_group_selling_channels = validated_data.pop('customer_group_selling_channels', [])
        user_id = getattr(self.context["request"].user, "id", None)

        # Create the ShippingMethod instance
        shipping_method = ShippingMethod.objects.create(**validated_data)

        # Add customer_group_selling_channels relationships
        for channel in customer_group_selling_channels:
            shipping_method.customer_group_selling_channels.through.objects.create(
                shipping_method=shipping_method,
                customer_group_selling_channel=channel,
                is_active=True,
                created_by=user_id,
            )

        # Add zone restrictions
        for zr in zone_restrictions_data:
            ShippingMethodZoneRestriction.objects.create(
                shipping_method=shipping_method,
                zone=zr['zone'],
                restriction_mode=zr['restriction_mode']
            )

        return shipping_method

    def update(self, instance, validated_data):
        """
        Update shipping method and handle customer group selling channel relationships and zone restrictions.

        Args:
            instance: The shipping method instance being updated
            validated_data: Validated data from the request

        Returns:
            Updated shipping method instance
        """
        # Get the customer group selling channels from validated data
        customer_group_selling_channels = validated_data.pop(
            "customer_group_selling_channels", []
        )

        # Get all existing relationships
        existing_relationships = (
            instance.customer_group_selling_channels.through.objects.filter(
                shipping_method=instance
            )
        )

        # Get user_id from JWT token
        user_id = getattr(self.context["request"].user, "id", None)

        # Update all relationships to inactive first
        existing_relationships.update(is_active=False)

        # Activate only the ones that were included in the update
        for channel in customer_group_selling_channels:
            relationship, created = (
                instance.customer_group_selling_channels.through.objects.get_or_create(
                    shipping_method=instance,
                    customer_group_selling_channel=channel,
                    defaults={"is_active": True, "created_by": user_id},
                )
            )
            if not created:
                relationship.is_active = True
                relationship.updated_by = user_id
                relationship.save()

        # --- ZONE RESTRICTIONS UPDATE LOGIC ---
        zone_restrictions_data = validated_data.pop('zone_restrictions', None)
        if zone_restrictions_data is not None:
            # Remove all existing restrictions for this shipping method
            instance.zone_restrictions.all().delete()
            # Add new ones
            for zr in zone_restrictions_data:
                ShippingMethodZoneRestriction.objects.create(
                    shipping_method=instance,
                    zone=zr['zone'],
                    restriction_mode=zr['restriction_mode']
                )

        # Continue with regular update
        return super().update(instance, validated_data)


    def to_representation(self, instance):
        """
        Customize the representation to only show active relationships.
        """
        representation = super().to_representation(instance)

        # Filter to only show active relationships
        active_relationships = (
            instance.customer_group_selling_channels.through.objects.filter(
                shipping_method=instance, is_active=True
            ).values_list("customer_group_selling_channel_id", flat=True)
        )

        representation["customer_group_selling_channels"] = list(active_relationships)

        # Add zone restrictions
        zone_restrictions = instance.zone_restrictions.all()
        representation["zone_restrictions"] = [
            {
                "zone": zr.zone.id,
                "restriction_mode": zr.restriction_mode
            } for zr in zone_restrictions
        ]

        # Add a human-readable delivery time range
        representation["delivery_range"] = _("{min}-{max} days").format(
            min=instance.min_delivery_days, max=instance.max_delivery_days
        )
        return representation

    class Meta:
        model = ShippingMethod
        fields = [
            "id",
            "name",
            "min_delivery_days",
            "max_delivery_days",
            "is_active",
            "created_at",
            "updated_at",
            "customer_group_selling_channels",
            "zone_restrictions",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "min_delivery_days": {"min_value": 0},
            "max_delivery_days": {"min_value": 1},
        }

    def validate(self, data):
        """
        Validate that max_delivery_days is not less than min_delivery_days
        and both are provided together.
        """
        min_days = data.get("min_delivery_days")
        max_days = data.get("max_delivery_days")

        # Only validate if both fields are being set
        if min_days is not None and max_days is not None:
            if max_days < min_days:
                raise serializers.ValidationError(
                    {
                        "max_delivery_days": _(
                            "Maximum delivery days cannot be less than minimum delivery days"
                        )
                    }
                )

        return data


from ..models import FulfillmentType

class CheckoutConfigurationSerializer(BaseTenantModelSerializer):
    is_active = serializers.BooleanField(default=True)
    """Serializer for CheckoutConfiguration model with direct customer group selling channel relation."""
    
    customer_group_selling_channel = serializers.PrimaryKeyRelatedField(
        queryset=CustomerGroupSellingChannel.objects.all(),
        required=True,
        allow_null=False,
        help_text="The customer group selling channel this configuration applies to"
    )
    segment_name = serializers.SerializerMethodField(read_only=True)
    fulfillment_type = serializers.ChoiceField(
        choices=FulfillmentType.choices,
        default=FulfillmentType.BOTH,
        help_text="Type of fulfillment options available: delivery, store_pickup, or both"
    )
    pickup_method_label = serializers.CharField(
        allow_blank=True,
        required=False,
        max_length=100,
        help_text="Display name for the in-store pickup option"
    )

    def get_segment_name(self, obj):
        try:
            return obj.customer_group_selling_channel.segment_name
        except AttributeError:
            return None
    
    class Meta:
        model = CheckoutConfiguration
        fields = [
            "id",
            "allow_guest_checkout",
            "min_order_value",
            "allow_user_select_shipping",
            "fulfillment_type",
            "pickup_method_label",
            "enable_delivery_prefs",
            "enable_preferred_date",
            "enable_time_slots",
            "currency",
            "customer_group_selling_channel",
            "segment_name",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]
    
    def validate(self, data):
        """
        Ensure customer_group_selling_channel is provided on creation and validate fulfillment_type.
        """
        customer_group_selling_channel = data.get('customer_group_selling_channel')
        if self.instance is None and not customer_group_selling_channel:
            raise serializers.ValidationError({
                'customer_group_selling_channel': 'This field is required and cannot be null.'
            })
        # Check unique constraint before DB save
        if customer_group_selling_channel:
            qs = CheckoutConfiguration.objects.filter(customer_group_selling_channel=customer_group_selling_channel)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'customer_group_selling_channel': 'A configuration for this customer group selling channel already exists.'
                })
        # Validate pickup_method_label if store_pickup or both
        fulfillment_type = data.get('fulfillment_type', getattr(self.instance, 'fulfillment_type', None))
        if fulfillment_type in [FulfillmentType.STORE_PICKUP, FulfillmentType.BOTH]:
            if not data.get('pickup_method_label') and not getattr(self.instance, 'pickup_method_label', None):
                raise serializers.ValidationError({
                    'pickup_method_label': 'This field is required when store pickup is enabled.'
                })
        # If fulfillment_type is NONE, pickup_method_label must not be set
        if fulfillment_type == FulfillmentType.NONE:
            if data.get('pickup_method_label'):
                raise serializers.ValidationError({
                    'pickup_method_label': 'pickup_method_label must be empty if fulfillment type is None.'
                })
        return data

    def validate_min_order_value(self, value):
        """Validate that min_order_value is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Minimum order value cannot be negative")
        return value
    
    def create(self, validated_data):
        """
        Create a new CheckoutConfiguration instance and ensure customer_group_selling_channel is set.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel')
        return CheckoutConfiguration.objects.create(
            customer_group_selling_channel=customer_group_selling_channel,
            **validated_data
        )

    def update(self, instance, validated_data):
        """
        Update the customer_group_selling_channel directly.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel', None)
        instance = super().update(instance, validated_data)
        if customer_group_selling_channel is not None:
            instance.customer_group_selling_channel = customer_group_selling_channel
            instance.save()
        return instance

class UITemplateSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for UITemplateSettings model with direct customer group selling channel relation.
    """
    is_active = serializers.BooleanField(default=True)
    customer_group_selling_channel = serializers.PrimaryKeyRelatedField(
        queryset=CustomerGroupSellingChannel.objects.all(),
        required=True,
        allow_null=False,
        help_text="The customer group selling channel this UI template setting applies to"
    )
    segment_name = serializers.SerializerMethodField(read_only=True)

    def get_segment_name(self, obj):
        try:
            return obj.customer_group_selling_channel.segment_name
        except AttributeError:
            return None

    class Meta:
        model = UITemplateSettings
        fields = [
            "id",
            "checkout_layout",
            "pdp_layout_style",
            "product_card_style",
            "customer_group_selling_channel",
            "segment_name",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def validate(self, data):
        """
        Ensure customer_group_selling_channel is provided on creation and is unique.
        """
        customer_group_selling_channel = data.get('customer_group_selling_channel')
        if self.instance is None and not customer_group_selling_channel:
            raise serializers.ValidationError({
                'customer_group_selling_channel': 'Customer group selling channel is required and cannot be null.'
            })
        # Check unique constraint before DB save
        if customer_group_selling_channel:
            qs = UITemplateSettings.objects.filter(customer_group_selling_channel=customer_group_selling_channel)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'customer_group_selling_channel': 'A UI template setting for this customer group selling channel already exists.'
                })
        return data

    def create(self, validated_data):
        """
        Create a new UITemplateSettings instance and ensure customer_group_selling_channel is set.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel')
        return UITemplateSettings.objects.create(
            customer_group_selling_channel=customer_group_selling_channel,
            **validated_data
        )

    def update(self, instance, validated_data):
        """
        Update the customer_group_selling_channel directly.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel', None)
        instance = super().update(instance, validated_data)
        if customer_group_selling_channel is not None:
            instance.customer_group_selling_channel = customer_group_selling_channel
            instance.save()
        return instance

class FeatureToggleSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for FeatureToggleSettings model with direct customer group selling channel relation and conditional wallet config logic.
    """
    customer_group_selling_channel = serializers.PrimaryKeyRelatedField(
        queryset=CustomerGroupSellingChannel.objects.all(),
        required=True,
        allow_null=False,
        help_text="The customer group selling channel this feature toggle setting applies to"
    )
    segment_name = serializers.SerializerMethodField(read_only=True)

    def get_segment_name(self, obj):
        try:
            return obj.customer_group_selling_channel.segment_name
        except AttributeError:
            return None

    class Meta:
        model = FeatureToggleSettings
        fields = [
            'id',
            'customer_group_selling_channel',
            'segment_name',
            'wallet_enabled',
            'loyalty_enabled',
            'reviews_enabled',
            'wishlist_enabled',
            'min_recharge_amount',
            'max_recharge_amount',
            'daily_transaction_limit',
            'is_active',
            'kill_switch',
            'default_delivery_zone',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def validate(self, data):
        """
        Ensure customer_group_selling_channel is provided on creation and is unique.
        Also, only allow wallet fields if wallet_enabled is True.
        """
        customer_group_selling_channel = data.get('customer_group_selling_channel')
        if self.instance is None and not customer_group_selling_channel:
            raise serializers.ValidationError({
                'customer_group_selling_channel': 'Customer group selling channel is required and cannot be null.'
            })
        # Check unique constraint before DB save
        if customer_group_selling_channel:
            qs = FeatureToggleSettings.objects.filter(customer_group_selling_channel=customer_group_selling_channel)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'customer_group_selling_channel': 'A feature toggle setting for this customer group selling channel already exists.'
                })

        # Wallet field validation
        wallet_fields = [
            'min_recharge_amount',
            'max_recharge_amount',
            'daily_transaction_limit',
        ]
        wallet_enabled = data.get('wallet_enabled', getattr(self.instance, 'wallet_enabled', False))
        if not wallet_enabled:
            for field in wallet_fields:
                if field in data and data[field] not in (None, '', False):
                    raise serializers.ValidationError({field: "Wallet must be enabled to set this field."})
        return data

    def create(self, validated_data):
        """
        Create a new FeatureToggleSettings instance and ensure customer_group_selling_channel is set.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel')
        return FeatureToggleSettings.objects.create(
            customer_group_selling_channel=customer_group_selling_channel,
            **validated_data
        )

    def update(self, instance, validated_data):
        """
        Update the customer_group_selling_channel directly.
        """
        customer_group_selling_channel = validated_data.pop('customer_group_selling_channel', None)
        instance = super().update(instance, validated_data)
        if customer_group_selling_channel is not None:
            instance.customer_group_selling_channel = customer_group_selling_channel
            instance.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.wallet_enabled:
            wallet_fields = [
                'min_recharge_amount',
                'max_recharge_amount',
                'daily_transaction_limit',
            ]
            for field in wallet_fields:
                data.pop(field, None)
        return data

class GuestConfigListSerializer(serializers.ListSerializer):
    """
    Custom ListSerializer for bulk operations on GuestConfig.
    """
    def create(self, validated_data):
        """
        Create multiple GuestConfig instances in bulk.
        """
        guest_configs = [GuestConfig(**attrs) for attrs in validated_data]
        return GuestConfig.objects.bulk_create(guest_configs)

class GuestConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for GuestConfig model with bulk creation support.
    """
    class Meta:
        model = GuestConfig
        list_serializer_class = GuestConfigListSerializer
        fields = [
            "id",
            "selling_channel_id",
            "customer_group_id",
            "segment_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
    
    def validate(self, data):
        """
        Validate unique constraint for selling_channel, customer_group_id, segment_id.
        """
        selling_channel_id = data.get('selling_channel_id')
        customer_group_id = data.get('customer_group_id')
        segment_id = data.get('segment_id')
        
        # Check if combination already exists (only for single record validation)
        if not self.context.get('is_bulk_operation', False):
            if GuestConfig.objects.filter(
                selling_channel_id=selling_channel_id,
                customer_group_id=customer_group_id,
                segment_id=segment_id
            ).exists():
                raise serializers.ValidationError(
                    "A guest config with this combination already exists."
                )
        
        return data