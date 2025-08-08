from rest_framework import serializers

from order_management.models import (
    Order,
    OrderItem,
    OrderItemTax,
    TaxRate,
)
from order_management.integrations import (
    product_service,
)
from django.utils.translation import gettext_lazy as _
from order_management.api.serializers import (
    BaseTenantModelSerializer,
)
import logging
from django.db import transaction
from customers.models import OrderAddress
from products.models import Product

logger = logging.getLogger(__name__)


class OrderItemTaxSerializer(BaseTenantModelSerializer):
    """
    Serializer for OrderItemTax model.
    """

    class Meta:
        model = OrderItemTax
        fields = [
            "id",
            "tax_id",
            "tax_code",
            "tax_rate",
            "tax_amount",
        ]
        read_only_fields = fields


class OrderItemTaxCreateSerializer(serializers.Serializer):
    """
    Serializer for creating OrderItemTax records within OrderItemCreateSerializer.
    """

    tax_id = serializers.IntegerField(required=True)
    tax_code = serializers.CharField(required=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=True)
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )


class OrderItemCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating OrderItem with extended fields and tax information.
    Used within the OrderCreateSerializer for handling order item creation with tax details.
    """

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=True
    )
    product_sku = serializers.CharField(required=True)
    product_name = serializers.CharField(required=True)
    quantity = serializers.IntegerField(required=True)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )
    hsn_sac_code = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    item_order = serializers.IntegerField(required=True)
    description = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    discount_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    discount_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0.00
    )
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, default=0.00
    )
    # Replace individual tax fields with an array of tax objects
    taxes = OrderItemTaxCreateSerializer(many=True, required=False)

    class Meta:
        model = OrderItem
        fields = [
            "product",
            "product_sku",
            "product_name",
            "quantity",
            "unit_price",
            "hsn_sac_code",
            "item_order",
            "description",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "uom_symbol",
            "taxes",
        ]

    def create(self, validated_data):
        """
        Create an OrderItem with the validated data,
        and handle tax information separately.
        """
        # Extract taxes data from validated_data if present
        taxes_data = validated_data.pop("taxes", [])

        # Create the order item
        order_item = OrderItem.objects.create(**validated_data)

        # Create tax records if tax information is provided
        for tax_data in taxes_data:
            tax_id = tax_data.get("tax_id")
            tax_code = tax_data.get("tax_code")
            tax_rate = tax_data.get("tax_rate")
            tax_amount = tax_data.get("tax_amount")

            try:
                tax_rate_obj = TaxRate.objects.get(id=tax_id)
                OrderItemTax.objects.create(
                    order_item=order_item,
                    tax=tax_rate_obj,
                    tax_code=tax_code,
                    tax_rate=tax_rate,
                    tax_amount=tax_amount,
                )
            except TaxRate.DoesNotExist:
                logger.error(
                    f"Tax rate with ID {tax_id} not found when creating order item tax"
                )
                # Still create the tax record with the provided values
                # This ensures we have the tax information even if the tax rate record is not found
                OrderItemTax.objects.create(
                    order_item=order_item,
                    tax_id=tax_id,  # This will raise an error if the foreign key is required
                    tax_code=tax_code,
                    tax_rate=tax_rate,
                    tax_amount=tax_amount,
                )

        return order_item


class OrderAddressSerializer(BaseTenantModelSerializer):
    """
    Serializer for the OrderAddress model.

    This serializer handles address information for both billing and shipping purposes.
    """

    class Meta:
        model = OrderAddress
        fields = [
            "id",
            "address_type",
            "address_category",
            "full_name",
            "street_1",
            "street_2",
            "street_3",
            "city",
            "state_province",
            "postal_code",
            "country",
            "phone_number",
            "address_id",
        ]


class OrderCreateSerializer(BaseTenantModelSerializer):
    """
    Serializer for creating new orders with all the extended fields.
    Handles nested order items with tax information, address details,
    and additional JSON fields for preferences and details.
    """

    account_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    contact_person_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    order_date = serializers.DateTimeField(required=False)

    # Address data that will be used to create OrderAddress records
    billing_address = serializers.JSONField(required=True, write_only=True)
    shipping_address = serializers.JSONField(required=True, write_only=True)

    # Additional JSON fields
    recipient_details = serializers.JSONField(required=False)
    delivery_preferences = serializers.JSONField(required=False)
    fulfillment_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    pickup_details = serializers.JSONField(required=False)

    # Nested items
    items = OrderItemCreateSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            # Primary key
            "id",
            # Core order information
            "account_id",
            "account_name",
            "contact_id",
            "contact_person_name",
            "order_date",
            "currency",
            "shipping_method_name",
            "shipping_method",
            "payment_status",
            "selling_channel",
            "responsible_person",
            "status",
            # Financial information
            "subtotal_amount",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "same_as_shipping",
            # Address information
            "billing_address",
            "shipping_address",
            # Additional details
            "recipient_details",
            "delivery_preferences",
            "fulfillment_type",
            "pickup_details",
            # Order items
            "items",
            "storepickup",
            "source",
        ]

    @transaction.atomic
    def create(self, validated_data):
        """
        Create an order with nested items and handle all related data.
        Uses transactions to ensure data consistency.
        """
        items_data = validated_data.pop("items", [])
        billing_address_data = validated_data.pop("billing_address", {})
        shipping_address_data = validated_data.pop("shipping_address", {})

        # Create OrderAddress records
        if billing_address_data:
            # Create billing address record
            try:
                # Get tenant_id from the request context
                request = self.context.get("request")
                if request is None:
                    raise ValueError("No request in context")

                auth_tenant_id = getattr(request, "auth_tenant_id", None)
                if auth_tenant_id is None:
                    # Try to get from JWT token if available
                    if hasattr(request, "auth") and request.auth:
                        auth_tenant_id = 1  # Default to 1 for testing if not found
                    else:
                        auth_tenant_id = 1  # Default for testing

                billing_address_obj = OrderAddress.objects.create(
                    client_id=auth_tenant_id,
                    address_type="BILLING",
                    street_1=billing_address_data.get("street_1", ""),
                    street_2=billing_address_data.get("street_2", ""),
                    street_3=billing_address_data.get("street_3", ""),
                    city=billing_address_data.get("city", ""),
                    state_province=billing_address_data.get("state_province", ""),
                    full_name=billing_address_data.get("full_name", ""),
                    business_name=billing_address_data.get("business_name", ""),
                    gst_number=billing_address_data.get("gst_number", ""),
                    postal_code=billing_address_data.get("postal_code", ""),
                    country=billing_address_data.get("country", ""),
                    phone_number=billing_address_data.get("phone_number", ""),
                    address_category=billing_address_data.get(
                        "address_category", "business"
                    ),
                    address_id=billing_address_data.get("address_id", None),
                )
                validated_data["billing_address"] = billing_address_obj
            except Exception as e:
                raise

        if shipping_address_data:
            try:
                # Check if shipping address is same as billing address
                if (
                    shipping_address_data.get("same_as_billing", False)
                    and billing_address_data
                ):
                    shipping_address_obj = billing_address_obj
                else:
                    # Get tenant_id from the request context
                    request = self.context.get("request")
                    auth_tenant_id = getattr(
                        request, "auth_tenant_id", 1
                    )  # Default to 1 if not found

                    # Create shipping address record
                    shipping_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        address_type="SHIPPING",
                        street_1=shipping_address_data.get("street_1", ""),
                        street_2=shipping_address_data.get("street_2", ""),
                        street_3=shipping_address_data.get("street_3", ""),
                        city=shipping_address_data.get("city", ""),
                        state_province=shipping_address_data.get("state_province", ""),
                        full_name=shipping_address_data.get("full_name", ""),
                        business_name=shipping_address_data.get("business_name", ""),
                        gst_number=shipping_address_data.get("gst_number", ""),
                        postal_code=shipping_address_data.get("postal_code", ""),
                        country=shipping_address_data.get("country", ""),
                        phone_number=shipping_address_data.get("phone_number", ""),
                        address_category=shipping_address_data.get(
                            "address_category", "business"
                        ),
                        address_id=shipping_address_data.get("address_id", None),
                    )
                validated_data["shipping_address"] = shipping_address_obj
            except Exception as e:
                raise

        try:
            # Create the order with address references
            order = Order.objects.create(**validated_data)

            # Create order items with their tax information
            for idx, item_data in enumerate(items_data):
                try:
                    item_data["order"] = order
                    OrderItemCreateSerializer().create(item_data)
                except Exception as e:
                    raise e

            return order
        except Exception as e:
            raise e
        finally:
            pass


class AdminOrderItemSerializer(BaseTenantModelSerializer):
    """
    Serializer for OrderItem model in admin context.

    This serializer is specifically designed for admin views and includes
    enhanced product details from the product service while maintaining
    proper tenant isolation. It also includes tax information and discount details.
    """

    image_url = serializers.SerializerMethodField(read_only=True)
    taxes = OrderItemTaxSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order_id",
            "product_id",
            "product_sku",
            "product_name",
            "quantity",
            "unit_price",
            "total_price",
            "hsn_sac_code",
            "item_order",
            "description",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "uom_symbol",
            "taxes",
            "image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_tenant_slug(self):
        """
        Get tenant slug from serializer context, request context or URL kwargs.

        Returns:
            str: The tenant slug or None if not found
        """
        # First check if tenant_slug is directly in serializer context
        tenant_slug = self.context.get("tenant_slug")
        if tenant_slug:
            return tenant_slug

        request = self.context.get("request")
        if not request:
            return None

        if hasattr(request, "tenant_slug"):
            return request.tenant_slug

        # Fall back to URL kwargs
        return (
            request.resolver_match.kwargs.get("tenant_slug")
            if request.resolver_match
            else None
        )

    def get_image_url(self, obj):
        """
        Get product image URL from product details.

        Args:
            obj: The OrderItem instance

        Returns:
            str: Image URL or None if not found
        """
        tenant_slug = self.get_tenant_slug()
        if not tenant_slug:
            logger.warning(
                f"No tenant_slug found in request context for product {obj.product_sku}"
            )
            return None

        try:
            return (
                product_service.get_product_details(
                    sku=obj.product_sku, tenant_slug=tenant_slug
                )
                .get("images", [])[0]
                .get("image")
                if product_service.get_product_details(
                    sku=obj.product_sku, tenant_slug=tenant_slug
                ).get("images", [])
                else None
            )
        except Exception as e:
            logger.error(
                f"Error fetching product details for SKU {obj.product_sku}: {str(e)}",
                exc_info=True,
            )
            return None
        return images[0].get("image") if images else None


class OrderItemSerializer(BaseTenantModelSerializer):
    """Serializer for OrderItem model."""

    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order_id",  # Added order_id field
            "product_sku",
            "product_name",
            "quantity",
            "unit_price",
            "total_price",
            "uom_symbol",
            "image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_price",
            "created_at",
            "updated_at",
            "image_url",
        ]

    def get_image_url(self, obj):
        """
        Get product image URL from product service.

        Args:
            obj: The OrderItem instance

        Returns:
            The image URL string or None if not found
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

        if not product:
            return None

        # Get the first image URL if available, otherwise return None
        images = product.get("images", [])
        return (
            images[0].get("image")
            if images and isinstance(images, list) and len(images) > 0
            else None
        )


class OrderListSerializer(BaseTenantModelSerializer):
    """
    Serializer for Order list view in API responses.

    This serializer provides a simplified view of orders for list endpoints,
    including the essential fields needed for order history listings and
    a simplified view of order items.

    Features:
    - Includes core order identifiers and status information
    - Provides financial summary (total amount, currency)
    - Includes timestamps for tracking
    - Includes a simplified view of order items
    - All fields are read-only to prevent modification through this serializer

    For admin views, this includes additional fields like customer_id and payment_status.

    Note: For more detailed order information, use OrderDetailSerializer.
    """

    # Include order items with a simplified serializer
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "account_id",
            "contact_id",
            "status",
            "payment_status",
            "total_amount",
            "currency",
            "created_at",
            "updated_at",
            "items",  # Include order items
        ]
        read_only_fields = fields  # All fields are read-only for list view


class AdminOrderDetailSerializer(BaseTenantModelSerializer):
    """
    Admin-specific serializer for Order detail view in API responses.

    This serializer extends the standard OrderDetailSerializer with additional
    admin-specific fields and uses AdminOrderItemSerializer for order items
    to include enhanced product details with proper tenant context.

    Features:
    - Includes all standard order fields
    - Uses AdminOrderItemSerializer for rich product details
    - Includes admin-specific fields and metadata
    - Properly handles tenant isolation
    - Includes audit fields and timestamps
    - Includes discount level and type information
    - Supports item-level taxes and discounts
    - Properly handles OrderAddress foreign key relationships
    """

    items = AdminOrderItemSerializer(many=True, read_only=True)
    customer_details = serializers.SerializerMethodField(read_only=True)
    billing_address = OrderAddressSerializer(read_only=True)
    shipping_address = OrderAddressSerializer(read_only=True)
    recipient_details = serializers.JSONField(required=False)
    delivery_preferences = serializers.JSONField(required=False)
    fulfillment_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    pickup_details = serializers.JSONField(required=False)
    responsible_person = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Order
        fields = [
            # Core order information
            "id",
            "order_id",
            "status",
            "payment_status",
            "currency",
            "order_date",
            "selling_channel",
            # Customer information
            "account_id",
            "account_name",
            "contact_id",
            "contact_person_name",
            "customer_details",
            # Financial information
            "subtotal_amount",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "same_as_shipping",
            # Shipping information
            "shipping_address",
            "billing_address",
            "shipping_method_name",
            "shipping_method",
            "tracking_number",
            "carrier_name",
            # Additional details
            "recipient_details",
            "delivery_preferences",
            "fulfillment_type",
            "pickup_details",
            "responsible_person",
            # Order items
            "items",
            # Audit and timestamps
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            # Additional fields
            "guest_access_token",
            "shipped_at",
            "delivered_at",
            "storepickup",
            "source",
        ]
        read_only_fields = fields

    def get_customer_details(self, obj):
        """
        Get customer details including contact information.

        Args:
            obj: The Order instance or OrderedDict

        Returns:
            dict: Customer details or None if not available
        """
        # Handle both OrderedDict (from create/update) and Order instance
        contact_id = obj.get("contact_id") if isinstance(obj, dict) else obj.contact_id

        if not contact_id:
            return None

        try:
            # Import Contact model here to avoid circular imports
            from customers.models import Contact

            # Get contact from database
            contact = Contact.objects.filter(id=contact_id).first()
            if not contact:
                return None

            # Get account name if available
            company_name = (
                contact.account.name
                if hasattr(contact, "account") and contact.account
                else None
            )

            # Return contact details
            return {
                "name": contact.full_name,
                "email": contact.email,
                "phone": contact.mobile_phone or contact.work_phone,
                "company": company_name,
                "account_status": contact.status,
                "contact_id": obj.contact_id,
                "customer_group_id": contact.account.customer_group_id,
            }

        except Exception as e:
            request = self.context.get("request")
            logger.error(
                f"Error fetching contact details for contact_id {obj.contact_id}: {str(e)}",
                exc_info=True,
                extra={
                    "tenant_id": (
                        getattr(request, "tenant_id", None) if request else None
                    ),
                    "user_id": getattr(request, "user_id", None) if request else None,
                    "request_id": (
                        request.META.get("HTTP_X_REQUEST_ID") if request else None
                    ),
                },
            )
            return None


class OrderDetailSerializer(BaseTenantModelSerializer):
    """
    Serializer for Order detail view in API responses.

    This serializer provides a comprehensive view of an order for detail endpoints,
    including all order information, addresses, payment details, and nested items.
    It's used for single-order retrieval where complete order details are needed.

    Features:
    - Includes all order fields from the Order model
    - Nests related OrderItems with their product details
    - Includes shipping and billing address information
    - Provides payment and fulfillment details
    - Includes return/RMA data if present
    - Includes invoice information if available
    - All fields are read-only to prevent modification through this serializer

    This serializer is typically used by the OrderHistoryViewSet for retrieving
    detailed information about a specific order.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    responsible_person = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "account_id",
            "contact_id",
            "status",
            "currency",
            "subtotal_amount",
            "discount_amount",
            "same_as_shipping",
            "tax_amount",
            "total_amount",
            "shipping_address",
            "billing_address",
            "shipping_method_name",
            "shipping_method",
            "payment_status",
            "created_at",
            "updated_at",
            "items",
            "guest_access_token",
            "invoice",
            "responsible_person",
            "storepickup",
        ]
        read_only_fields = fields  # All fields are read-only for detail view


class OrderSerializer(BaseTenantModelSerializer):
    """Serializer for Order model.

    This is the general-purpose serializer for Order model operations.
    For read-only list and detail views, consider using OrderListSerializer
    and OrderDetailSerializer instead.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    contact_email = serializers.SerializerMethodField(read_only=True)
    responsible_person = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "account_id",
            "contact_id",
            "status",
            "currency",
            "subtotal_amount",
            "discount_amount",
            "same_as_shipping",
            "tax_amount",
            "total_amount",
            "shipping_address",
            "billing_address",
            "created_at",
            "updated_at",
            "items",
            "contact_email",
            "recipient_details",
            "delivery_preferences",
            "fulfillment_type",
            "pickup_details",
        ]
        read_only_fields = [
            "id",
            "order_id",
            "created_at",
            "updated_at",
        ]

    def get_contact_email(self, obj):
        """
        Get the contact's email from the order's contact_id or JWT token.

        Args:
            obj: The Order instance

        Returns:
            str: The contact's email address or empty string if not found
        """
        # If no contact_id is set, return empty string
        if not obj.contact_id:
            return ""

        request = self.context.get("request")
        if not request:
            return ""

        # Get the user from the request (set by JWT authentication)
        user = request.user
        if hasattr(user, "email") and user.email:
            return user.email

        # Fallback to token payload if user object doesn't have email
        if hasattr(request, "auth") and request.auth:
            try:
                # Assuming the token payload has the email in the 'email' claim
                return request.auth.get("email", "")
            except (AttributeError, KeyError):
                pass

        return ""


class OrderItemUpdateSerializer(OrderItemCreateSerializer):
    """
    Serializer for updating OrderItems with support for both creating and updating
    related tax information.

    This serializer extends OrderItemCreateSerializer but adds ID field support
    for updating existing items and their taxes.
    """

    id = serializers.IntegerField(required=False)

    class Meta(OrderItemCreateSerializer.Meta):
        fields = ["id"] + OrderItemCreateSerializer.Meta.fields

    def create(self, validated_data):
        """
        Create or update an OrderItem with the validated data,
        and handle tax information separately.
        """
        item_id = validated_data.pop("id", None)
        taxes_data = validated_data.pop("taxes", [])

        if item_id:
            # Update existing order item
            try:
                order_item = OrderItem.objects.get(id=item_id)
                for attr, value in validated_data.items():
                    setattr(order_item, attr, value)
                order_item.save()
            except OrderItem.DoesNotExist:
                # If the item doesn't exist, create it
                order_item = OrderItem.objects.create(**validated_data)
        else:
            # Create a new order item
            order_item = OrderItem.objects.create(**validated_data)

        # Process taxes - update existing ones or create new ones
        existing_taxes = {
            tax.tax_id: tax
            for tax in OrderItemTax.objects.filter(order_item=order_item)
        }
        processed_tax_ids = set()

        for tax_data in taxes_data:
            tax_id = tax_data.get("tax_id")
            tax_data_id = tax_data.pop("id", None)

            if tax_id in existing_taxes:
                # Update existing tax
                tax_obj = existing_taxes[tax_id]
                for attr, value in tax_data.items():
                    setattr(tax_obj, attr, value)
                tax_obj.save()
                processed_tax_ids.add(tax_id)
            else:
                # Create new tax
                try:
                    tax_rate_obj = TaxRate.objects.get(id=tax_id)
                    OrderItemTax.objects.create(
                        order_item=order_item,
                        tax=tax_rate_obj,
                        tax_code=tax_data.get("tax_code"),
                        tax_rate=tax_data.get("tax_rate"),
                        tax_amount=tax_data.get("tax_amount"),
                    )
                    processed_tax_ids.add(tax_id)
                except TaxRate.DoesNotExist:
                    logger.error(
                        f"Tax rate with ID {tax_id} not found when creating order item tax"
                    )
                    # Still create the tax record with the provided values
                    OrderItemTax.objects.create(
                        order_item=order_item,
                        tax_id=tax_id,
                        tax_code=tax_data.get("tax_code"),
                        tax_rate=tax_data.get("tax_rate"),
                        tax_amount=tax_data.get("tax_amount"),
                    )
                    processed_tax_ids.add(tax_id)

        # Delete taxes that were not included in the update
        for tax_id, tax_obj in existing_taxes.items():
            if tax_id not in processed_tax_ids:
                tax_obj.delete()

        return order_item


class OrderUpdateSerializer(OrderCreateSerializer):
    """
    Serializer for updating orders with all related data.

    This serializer extends OrderCreateSerializer but provides logic for updating
    existing order items, addresses, and tax information instead of always creating new ones.
    """

    id = serializers.IntegerField(required=False, read_only=True)
    items = OrderItemUpdateSerializer(many=True)

    class Meta(OrderCreateSerializer.Meta):
        fields = ["id"] + OrderCreateSerializer.Meta.fields

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update an order with nested items and handle all related data.
        If related objects have IDs, update them rather than create new ones.
        Uses transactions to ensure data consistency.
        """
        items_data = validated_data.pop("items", [])
        billing_address_data = validated_data.pop("billing_address", {})
        shipping_address_data = validated_data.pop("shipping_address", {})

        # Helper function to filter address data to only include valid OrderAddress fields
        def filter_order_address_data(address_data, address_type):
            """Filter address data to only include valid OrderAddress model fields."""
            valid_fields = {
                "address_category",
                "business_name",
                "gst_number",
                "address_type",
                "street_1",
                "street_2",
                "street_3",
                "full_name",
                "phone_number",
                "city",
                "state_province",
                "postal_code",
                "country",
                "address_id",
            }
            filtered_data = {k: v for k, v in address_data.items() if k in valid_fields}
            filtered_data["address_type"] = address_type
            return filtered_data

        # Update basic order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update or Create OrderAddress records
        if billing_address_data:
            try:
                # Get tenant_id from the request context
                request = self.context.get("request")
                if request is None:
                    raise ValueError("No request in context")

                auth_tenant_id = getattr(request, "auth_tenant_id", None)
                if auth_tenant_id is None:
                    # Try to get from JWT token if available
                    if hasattr(request, "auth") and request.auth:
                        auth_tenant_id = 1  # Default to 1 for testing if not found
                    else:
                        auth_tenant_id = 1  # Default for testing

                billing_id = billing_address_data.pop("id", None)
                # Filter billing address data to only include valid OrderAddress fields
                filtered_billing_data = filter_order_address_data(
                    billing_address_data, "BILLING"
                )

                if billing_id:
                    # Update existing billing address
                    try:
                        billing_address_obj = OrderAddress.objects.get(id=billing_id)
                        for attr, value in filtered_billing_data.items():
                            setattr(billing_address_obj, attr, value)
                        billing_address_obj.save()
                    except OrderAddress.DoesNotExist:
                        # If the address doesn't exist, create it
                        billing_address_obj = OrderAddress.objects.create(
                            client_id=auth_tenant_id,
                            **filtered_billing_data,
                        )
                else:
                    # Create new billing address
                    billing_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        **filtered_billing_data,
                    )

                instance.billing_address = billing_address_obj

            except Exception as e:
                logger.error(f"Error updating billing address: {e}")
                raise

        if shipping_address_data:
            try:
                # Check if shipping address is same as billing address
                if (
                    shipping_address_data.get("same_as_billing", False)
                    and billing_address_data
                ):
                    shipping_address_obj = instance.billing_address
                else:
                    # Get tenant_id from the request context
                    request = self.context.get("request")
                    auth_tenant_id = getattr(
                        request, "auth_tenant_id", 1
                    )  # Default to 1 if not found

                    shipping_id = shipping_address_data.pop("id", None)
                    # Filter shipping address data to only include valid OrderAddress fields
                    filtered_shipping_data = filter_order_address_data(
                        shipping_address_data, "SHIPPING"
                    )

                    if shipping_id:
                        # Update existing shipping address
                        try:
                            shipping_address_obj = OrderAddress.objects.get(
                                id=shipping_id
                            )
                            for attr, value in filtered_shipping_data.items():
                                setattr(shipping_address_obj, attr, value)
                            shipping_address_obj.save()
                        except OrderAddress.DoesNotExist:
                            # If the address doesn't exist, create it
                            shipping_address_obj = OrderAddress.objects.create(
                                client_id=auth_tenant_id,
                                **filtered_shipping_data,
                            )
                    else:
                        # Create new shipping address
                        shipping_address_obj = OrderAddress.objects.create(
                            client_id=auth_tenant_id,
                            **filtered_shipping_data,
                        )

                instance.shipping_address = shipping_address_obj

            except Exception as e:
                logger.error(f"Error updating shipping address: {e}")
                raise

        # Save the order with updated address references
        instance.save()

        # Update order items
        # Track which existing items are updated to identify which ones need to be deleted
        existing_items = {item.id: item for item in instance.items.all()}
        processed_item_ids = set()

        for item_data in items_data:
            item_id = item_data.get("id")
            if item_id:
                # Item exists, update it
                processed_item_ids.add(item_id)
                item_data["order"] = instance
                try:
                    OrderItemUpdateSerializer().create(
                        item_data
                    )  # Using create method which handles updates
                except Exception as e:
                    logger.error(f"Error updating order item: {e}")
                    raise
            else:
                # New item, create it
                item_data["order"] = instance
                try:
                    OrderItemCreateSerializer().create(item_data)
                except Exception as e:
                    logger.error(f"Error creating order item: {e}")
                    raise

        # Delete items that weren't included in the update
        for item_id, item in existing_items.items():
            if item_id not in processed_item_ids:
                item.delete()

        return instance
