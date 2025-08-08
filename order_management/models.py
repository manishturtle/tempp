"""
Order Management models for the ERP backend.

This module defines models for the Order Management subsystem of the multi-tenant ERP platform.
It includes models for orders, carts, wishlists, returns (RMAs), wallet transactions, loyalty points, 
and tenant-specific configurations.

All models inherit from BaseTenantModel to ensure proper multi-tenant isolation and include:
- client (ForeignKey to TENANT_MODEL): The tenant this record belongs to
- company_id (IntegerField): Company ID within the tenant context
- created_at, updated_at (DateTimeField): Automatic timestamps
- created_by, updated_by (ForeignKey to AUTH_USER_MODEL): Audit fields
- custom_fields (JSONField): Extensible field for tenant-specific customizations

Design Principles:
- Most IDs use BigAutoField for scalability
- Status fields use TextChoices for better maintainability
- Addresses stored as JSONField for flexibility across different address formats
- External IDs (customer_id, user_id) use BigInteger to match ID types in external services

Key Relationships:
- Order -> OrderItems: One-to-many (items in an order)
- Cart -> CartItems: One-to-many (items in a cart)
- Order -> RMAs: One-to-many (returns for an order)
- RMA -> RMAItems: One-to-many (items in a return)
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from decimal import Decimal, InvalidOperation as DecimalException
import logging
import uuid

from core.models.base import BaseTenantModel
from order_management.integrations import product_service
from customers.models import OrderAddress
from products.models import Product
from pricing.models import TaxRate, SellingChannel

logger = logging.getLogger(__name__)


class ShippingMethod(BaseTenantModel):
    """
    Model for managing shipping methods in the eCommerce platform.
    Each tenant can have their own set of shipping methods.
    """

    name = models.CharField(
        _("method name"),
        max_length=100,
        help_text=_("Name of the shipping method (e.g., Standard, Express, Overnight)"),
    )

    min_delivery_days = models.PositiveSmallIntegerField(
        _("minimum delivery days"),
        help_text=_("Minimum estimated delivery time in days"),
    )

    max_delivery_days = models.PositiveSmallIntegerField(
        _("maximum delivery days"),
        help_text=_("Maximum estimated delivery time in days"),
    )

    is_active = models.BooleanField(
        _("is active"),
        default=True,
        help_text=_(
            "Whether this shipping method is active and available for selection"
        ),
    )

    customer_group_selling_channels = models.ManyToManyField(
        "customers.CustomerGroupSellingChannel",
        through="order_management.CustomerGroupSellingChannelShippingMethod",
        related_name="shipping_methods",
        blank=True,
        help_text=_(
            "Customer group and selling channel combinations that have access to this shipping method"
        ),
    )

    class Meta:
        verbose_name = _("shipping method")
        verbose_name_plural = _("shipping methods")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(max_delivery_days__gte=models.F("min_delivery_days")),
                name="max_delivery_not_less_than_min",
            ),
            models.UniqueConstraint(
                fields=["name"], name="unique_shipping_method_name_per_tenant"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.min_delivery_days}-{self.max_delivery_days} days)"

    def clean(self):
        """
        Validate that max_delivery_days is not less than min_delivery_days
        """
        if self.max_delivery_days < self.min_delivery_days:
            raise ValidationError(
                {
                    "max_delivery_days": _(
                        "Maximum delivery days cannot be less than minimum delivery days"
                    )
                }
            )


class StorePickup(BaseTenantModel):
    """
    Model for managing store pickup locations and their operating hours.
    """

    name = models.CharField(_("store name"), max_length=255)
    contact_person = models.CharField(_("contact person"), max_length=255)
    contact_number = models.CharField(_("contact number"), max_length=20)

    # Address information
    address_line1 = models.CharField(_("address line 1"), max_length=255)
    address_line2 = models.CharField(
        _("address line 2"), max_length=255, blank=True, null=True
    )
    country = models.CharField(_("country"), max_length=100)
    state = models.CharField(_("state"), max_length=100)
    city = models.CharField(_("city"), max_length=100)
    pincode = models.CharField(_("pincode"), max_length=20)

    # Optional Google integration
    google_place_id = models.CharField(
        _("Google Place ID"), max_length=255, blank=True, null=True
    )

    # Operating hours stored as JSON
    operating_hours = models.JSONField(
        _("operating hours"),
        default=dict,
        help_text=_(
            'Format: {"monday": {"open": "09:00", "close": "18:00", "is_open": true}, ...}'
        ),
    )

    is_active = models.BooleanField(_("is active"), default=True)

    customer_group_selling_channels = models.ManyToManyField(
        "customers.CustomerGroupSellingChannel",
        through="order_management.CustomerGroupSellingChannelStorePickup",
        related_name="store_pickups",
        blank=True,
        help_text=_(
            "Customer group and selling channel combinations that have access to this store pickup location"
        ),
    )

    class Meta:
        verbose_name = _("store pickup")
        verbose_name_plural = _("store pickups")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["city"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.city}"

    @property
    def full_address(self):
        """Return formatted address string"""
        address_parts = [
            self.address_line1,
            self.address_line2,
            self.city,
            self.state,
            self.country,
            self.pincode,
        ]
        return ", ".join(filter(None, address_parts))


class OrderStatus(models.TextChoices):
    """Order status choices for tracking order lifecycle."""

    DRAFT = "DRAFT", _("Draft")
    PENDING_PAYMENT = "PENDING_PAYMENT", _("Pending Payment")
    PROCESSING = "PROCESSING", _("Processing")
    AWAITING_FULFILLMENT = "AWAITING_FULFILLMENT", _("Awaiting Fulfillment")
    PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED", _("Partially Shipped")
    SHIPPED = "SHIPPED", _("Shipped")
    DELIVERED = "DELIVERED", _("Delivered")
    COMPLETED = "COMPLETED", _("Completed")
    CANCELLED = "CANCELLED", _("Cancelled")
    ON_HOLD = "ON_HOLD", _("On Hold")
    BACKORDERED = "BACKORDERED", _("Backordered")
    REFUNDED = "REFUNDED", _("Refunded")
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", _("Partially Refunded")


class PaymentStatus(models.TextChoices):
    """Payment status choices for tracking payment lifecycle."""

    PENDING = "PENDING", _("Pending")
    AUTHORIZED = "AUTHORIZED", _("Authorized")
    CAPTURED = "CAPTURED", _("Captured")
    PAID = "PAID", _("Paid")
    PARTIALLY_PAID = "PARTIALLY_PAID", _("Partially Paid")
    FAILED = "FAILED", _("Failed")
    REFUNDED = "REFUNDED", _("Refunded")
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", _("Partially Refunded")


class Order(BaseTenantModel):
    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", _("Percentage")
        AMOUNT = "AMOUNT", _("Amount")

    id = models.BigAutoField(primary_key=True)

    order_id = models.CharField(
        max_length=100,
        unique=True,
        editable=False,
        db_index=True,
        help_text=_(
            "Unique order identifier generated automatically in format ORD-{tenant}-{year}-{sequential_number}"
        ),
    )

    account_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_(
            "Reference to customer account ID in the Customer Service. Indexed for efficient lookup. Null for guest orders."
        ),
    )
    account_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_("Name of the customer account. Null for guest orders."),
    )
    contact_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_(
            "Reference to contact ID within customer account. May be null for guest checkouts or consumer orders."
        ),
    )
    contact_person_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_(
            "Name of the contact person. May be null for guest checkouts or consumer orders."
        ),
    )

    status = models.CharField(
        max_length=50,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
        db_index=True,
        help_text=_("Current status of the order"),
    )

    currency = models.CharField(
        max_length=3, help_text=_("Three-letter currency code (e.g., USD, EUR)")
    )

    subtotal_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Sum of all order items before discounts, shipping, and taxes"),
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Total tax applied to the order"),
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Grand total including all items, discounts, shipping, and taxes"),
    )

    shipping_address = models.ForeignKey(
        OrderAddress,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="shipping_orders",
        help_text=_("Reference to the shipping address for this order"),
    )
    billing_address = models.ForeignKey(
        OrderAddress,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="billing_orders",
        help_text=_("Reference to the billing address for this order"),
    )

    shipping_method_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        help_text=_(
            'Display name of the selected shipping method (e.g., "Express Shipping", "Standard Delivery")'
        ),
    )
    shipping_method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        help_text=_("Shipping method selected for this order"),
    )

    payment_status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
        help_text=_(
            "Overall payment status of the order, derived from related Payment records"
        ),
    )

    tracking_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Shipping tracking number"),
    )
    carrier_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Name of the shipping carrier (e.g., UPS, FedEx, DHL)"),
    )

    guest_access_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        help_text=_("Unique token for guest users to access order status."),
    )

    shipped_at = models.DateTimeField(
        null=True, blank=True, db_index=True, help_text=_("When the order was shipped")
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("When the order was delivered"),
    )
    recipient_details = models.JSONField(
        _("Recipient Details"),
        help_text="Stores recipient information including name, contact, and preferences",
        default=dict,
        blank=True,
    )

    delivery_preferences = models.JSONField(
        _("Delivery Preferences"),
        help_text="Stores customer delivery preferences and special instructions",
        default=dict,
        blank=True,
    )

    fulfillment_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text=_("Fullfillment type for the order"),
    )

    pickup_details = models.JSONField(
        _("Pickup Details"),
        help_text="Stores pickup location, date, time slot, and instructions",
        default=dict,
        blank=True,
    )

    order_date = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("When the order was created"),
    )
    discount_type = models.CharField(
        max_length=50,
        choices=DiscountType.choices,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Discount type for the order"),
    )

    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text=_("Discount percentage for the order"),
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Discount amount for the order"),
    )

    selling_channel = models.ForeignKey(
        SellingChannel,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders",
        help_text=_("Selling channel for the order"),
    )

    responsible_person = models.BigIntegerField(
        null=True,
        help_text="User ID of the person who is responsible for the order.",
    )

    same_as_shipping = models.BooleanField(
        default=False,
        help_text="Is the billing address the same as the shipping address?",
    )
    storepickup = models.ForeignKey(
        StorePickup,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders",
        help_text=_("Store pickup for the order"),
    )
    source = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text=_("Source of the order"),
    )

    class Meta:
        verbose_name = _("Order")
        verbose_name_plural = _("Orders")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["client_id", "status", "created_at"],
                name="om_order_client_status_idx",
            ),
            models.Index(
                fields=["client_id", "account_id", "created_at"],
                name="om_order_client_account_idx",
            ),
        ]

    def __str__(self):
        return self.order_id

    def generate_order_id(self):
        """Generate a unique order ID following the format ORD-{tenant}-{year}-{sequential_number}."""
        from django.utils import timezone
        import datetime

        # Get current year
        current_year = timezone.now().year

        # Get client/tenant ID - fallback to 1 if not set
        tenant_id = getattr(self, "client_id", 1)

        # Find the highest sequential number for this tenant and year
        prefix = f"ORD-{tenant_id}-{current_year}-"

        # Query to find the highest sequential number for this tenant and year
        last_order = (
            Order.objects.filter(order_id__startswith=prefix)
            .order_by("-order_id")
            .first()
        )

        # Set next sequence number
        if last_order and last_order.order_id:
            try:
                # Extract the sequence number from the last order ID
                seq_str = last_order.order_id.split("-")[-1]
                seq_number = int(seq_str) + 1
            except (ValueError, IndexError):
                # If we can't parse the sequence number, start from 1
                seq_number = 1
        else:
            # If no previous order for this tenant and year, start from 1
            seq_number = 1

        # Format the order ID with 5-digit sequential number
        return f"{prefix}{seq_number:05d}"

    def save(self, *args, **kwargs):
        """Override save to ensure order_id is generated on first save and handle guest access token."""
        # Generate order_id for new orders
        if not self.pk and not self.order_id:
            self.order_id = self.generate_order_id()

        # Check if order is associated with a registered user
        is_registered_user_order = bool(self.account_id or self.created_by)

        if self.pk is None:  # If creating the order
            if is_registered_user_order:
                self.guest_access_token = (
                    None  # Ensure registered users don't get a token
                )
            elif not self.guest_access_token:
                # Ensure a guest order gets a unique token if default didn't suffice or was cleared
                self.guest_access_token = uuid.uuid4()
        elif is_registered_user_order and self.guest_access_token:
            # If an existing guest order somehow gets associated with a user later, nullify token
            self.guest_access_token = None

        # Call the parent save method
        super().save(*args, **kwargs)

    def get_total_paid_amount(self) -> Decimal:
        """
        Calculate the total amount paid for this order.

        Returns:
            Decimal: Sum of all successful payment amounts
        """
        from django.db.models import Sum

        # Sum all payments with status PAID or CAPTURED
        paid_amount = self.payments.filter(
            status__in=[PaymentStatus.PAID, PaymentStatus.CAPTURED]
        ).aggregate(total=Sum("amount")).get("total") or Decimal("0.00")

        return paid_amount

    def update_payment_status(self) -> str:
        """
        Update the order's payment status based on related Payment records.

        This method calculates the overall payment status by examining all
        related payment records and their statuses.

        Returns:
            str: The updated payment status
        """
        # Get all payments for this order
        payments = self.payments.all()

        if not payments.exists():
            # No payments yet
            self.payment_status = PaymentStatus.PENDING
            self.save(update_fields=["payment_status"])
            return self.payment_status

        # Check if any payments are in PAID or CAPTURED status
        paid_amount = self.get_total_paid_amount()

        # Check if any payments failed
        has_failed = payments.filter(status=PaymentStatus.FAILED).exists()

        # Check if any payments are refunded
        refunded_amount = payments.filter(
            status__in=[PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
            amount__lt=0,  # Negative amounts are refunds
        ).aggregate(total=Sum("amount")).get("total") or Decimal("0.00")

        # Determine the overall payment status
        if paid_amount >= self.total_amount:
            # Fully paid
            self.payment_status = PaymentStatus.PAID
        elif paid_amount > Decimal("0.00"):
            # Partially paid
            self.payment_status = PaymentStatus.PARTIALLY_PAID
        elif has_failed:
            # Payment failed
            self.payment_status = PaymentStatus.FAILED
        elif refunded_amount.abs() >= paid_amount:
            # Fully refunded
            self.payment_status = PaymentStatus.REFUNDED
        elif refunded_amount < Decimal("0.00"):
            # Partially refunded
            self.payment_status = PaymentStatus.PARTIALLY_REFUNDED
        else:
            # Still pending
            self.payment_status = PaymentStatus.PENDING

        # Save the updated status
        self.save(update_fields=["payment_status"])
        return self.payment_status

    def is_fully_paid(self) -> bool:
        """
        Check if the order is fully paid.

        Returns:
            bool: True if the order is fully paid, False otherwise
        """
        return self.payment_status == PaymentStatus.PAID


class OrderItem(BaseTenantModel):
    """Order item model for storing individual line items within an order.

    Note: This model inherits from BaseTenantModel but overrides the id field
    to use BigAutoField as required.
    """

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", _("Percentage")
        AMOUNT = "AMOUNT", _("Amount")

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Relationship to parent order
    order = models.ForeignKey(
        Order,
        related_name="items",
        on_delete=models.CASCADE,
        help_text=_("The order this item belongs to"),
    )

    # Product information
    product_sku = models.CharField(
        max_length=100, db_index=True, help_text=_("Product SKU/code")
    )
    product_name = models.CharField(
        max_length=255, help_text=_("Product name at time of order")
    )

    # Quantity and pricing
    quantity = models.PositiveIntegerField(help_text=_("Quantity ordered"))
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, help_text=_("Price per unit at time of order")
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Total price for this line item (unit_price × quantity)"),
    )
    hsn_sac_code = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("HSN/SAC code for the product"),
    )
    product = models.ForeignKey(
        Product,
        related_name="order_items",
        on_delete=models.CASCADE,
        help_text=_("The product this item belongs to"),
    )
    item_order = models.PositiveIntegerField(help_text=_("Order of the item"))
    description = models.TextField(
        null=True,
        blank=True,
        help_text=_("Description of the item"),
    )
    discount_type = models.CharField(
        max_length=50,
        choices=DiscountType.choices,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Discount type for the order"),
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text=_("Discount percentage for this line item"),
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Discount amount for this line item"),
    )
    uom_symbol = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text=_("Unit of measurement symbol for this line item"),
    )

    class Meta:
        verbose_name = _("Order Item")
        verbose_name_plural = _("Order Items")

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        if self.discount_type == "AMOUNT":
            self.total_price -= self.discount_amount
        elif self.discount_type == "PERCENTAGE":
            self.total_price -= self.total_price * (self.discount_percentage / 100)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} × {self.product_name} for Order {self.order.order_id}"


class OrderItemTax(BaseTenantModel):
    """Order item tax model for storing tax information for an order item."""

    order_item = models.ForeignKey(
        OrderItem,
        related_name="taxes",
        on_delete=models.CASCADE,
        help_text=_("The order item this tax belongs to"),
    )

    tax = models.ForeignKey(
        TaxRate,
        related_name="order_item_taxes",
        on_delete=models.CASCADE,
    )

    tax_code = models.CharField(
        max_length=50,
        help_text=_("Tax code for this tax"),
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text=_("Tax rate for this tax"),
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Tax amount for this tax"),
    )

    class Meta:
        verbose_name = _("Order Item Tax")
        verbose_name_plural = _("Order Item Taxes")


class CartStatus(models.TextChoices):
    """Cart status choices for tracking cart lifecycle."""

    OPEN = "OPEN", _("Open - Active cart")
    MERGED = "MERGED", _("Merged - Logged in, merged with user cart")
    ABANDONED = "ABANDONED", _("Abandoned - Session expired/user logged out")


class Cart(BaseTenantModel):
    """Cart model for storing shopping cart information.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL)
    - company_id (IntegerField)
    - created_at, updated_at (DateTimeField)
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL)
    - custom_fields (JSONField)

    However, we override the id field to use BigAutoField as required.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # User identification - either user_id or session_key must be present
    user_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("ID of the logged-in user who owns this cart"),
    )
    session_key = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Session key for guest carts"),
    )

    # Cart status
    status = models.CharField(
        max_length=20,
        choices=CartStatus.choices,
        default=CartStatus.OPEN,
        db_index=True,
        help_text=_("Current status of the cart"),
    )

    class Meta:
        verbose_name = _("Cart")
        verbose_name_plural = _("Carts")
        ordering = ["-created_at"]

    def __str__(self):
        if self.user_id:
            return f"Cart for User {self.user_id} (ID: {self.id})"
        elif self.session_key:
            return f"Cart for Session {self.session_key[:8]}... (ID: {self.id})"
        return f"Cart {self.id}"

    def get_total_quantity(self) -> int:
        """
        Calculate the total quantity of all items in the cart.

        Returns:
            Total quantity of items in cart
        """
        return sum(item.quantity for item in self.items.all())

    def get_subtotal_amount(self, tenant_slug: str = None) -> Decimal:
        """
        Calculate the subtotal based on current product prices.

        This method fetches current prices from the product service
        rather than using stored prices, ensuring up-to-date totals.

        Args:
            tenant_slug: Optional tenant slug to use for product service calls.
                         If not provided, will attempt to determine from context.

        Returns:
            Subtotal amount of items in cart
        """
        logger.info(
            f"Calculating subtotal for cart {self.id} with {self.items.count()} items"
        )
        subtotal = Decimal("0.00")
        cart_items = self.items.all()  # Fetch items once

        for item in cart_items:
            try:
                # Try to get tenant_slug from parameter, then from thread-local storage
                current_tenant_slug = tenant_slug

                # If tenant_slug not provided, try to get from thread-local storage
                if not current_tenant_slug:
                    from django.conf import settings

                    try:
                        # Try to get from thread local storage if available
                        from threading import local

                        _thread_locals = getattr(settings, "THREAD_LOCALS", local())
                        current_tenant_slug = getattr(
                            _thread_locals, "tenant_slug", None
                        )
                        logger.debug(
                            f"Got tenant_slug from thread locals: {current_tenant_slug}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Could not get tenant_slug from thread locals: {e}"
                        )

                # If still no tenant_slug, use client_id to determine tenant
                if not current_tenant_slug and self.client_id:
                    # Map client_id to tenant_slug if possible
                    # This is a fallback and should be replaced with proper tenant resolution
                    from django.db import connection

                    try:
                        # Try to get schema name from current connection
                        schema_name = connection.schema_name
                        if schema_name and schema_name != "public":
                            current_tenant_slug = schema_name
                            logger.debug(
                                f"Using schema name as tenant_slug: {current_tenant_slug}"
                            )
                    except Exception as e:
                        logger.warning(f"Could not get schema name: {e}")

                # Final fallback to default tenant
                if not current_tenant_slug:
                    current_tenant_slug = "erp_turtle"  # Default fallback
                    logger.warning(
                        f"Using default tenant_slug '{current_tenant_slug}' for product price lookup"
                    )

                product_details = product_service.get_product_details(
                    sku=item.product_sku, tenant_slug=current_tenant_slug
                )

                if product_details and "display_price" in product_details:
                    # Use display_price instead of price
                    price_str = str(product_details["display_price"])
                    if price_str:
                        try:
                            item_price = Decimal(price_str)
                            line_total = item_price * item.quantity
                            subtotal += line_total
                            logger.debug(
                                f"Added {line_total} to subtotal for {item.quantity} x {item.product_sku} "
                                f"(display_price: {item_price})"
                            )
                        except (ValueError, DecimalException) as e:
                            logger.error(
                                f"Invalid price format for {item.product_sku}: {price_str}. Error: {e}"
                            )
                else:
                    # Product price not found, log warning and skip item
                    logger.warning(
                        f"Could not find price for SKU {item.product_sku} "
                        f"in Cart {self.id} (Client: {self.client_id}). Skipping item in subtotal."
                    )
            except Exception as e:
                # Log unexpected errors during price fetch
                logger.error(
                    f"Error fetching price for SKU {item.product_sku} in Cart {self.id}: {e}",
                    exc_info=True,
                )
                # Skip item on error
                continue

        return subtotal


class CartItem(BaseTenantModel):
    """Cart item model for storing individual items within a shopping cart.

    This model represents a single product line item in a shopping cart. Each cart item
    is associated with a specific cart and product SKU, with a quantity field to track
    how many of that product are in the cart.

    Key features:
    - Unique constraint ensures only one line item per product in a cart
    - Product details are fetched from product service using the SKU
    - Quantity is validated to ensure it's positive

    Relationships:
    - Belongs to a Cart (ForeignKey with CASCADE deletion)

    Note: This model inherits from BaseTenantModel but overrides the id field
    to use BigAutoField as required for high-volume operations.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Relationships
    cart = models.ForeignKey(
        Cart,
        related_name="items",
        on_delete=models.CASCADE,
        help_text=_("The cart this item belongs to"),
    )

    # Product information
    product_sku = models.CharField(
        max_length=100, db_index=True, help_text=_("Product SKU/code")
    )
    quantity = models.PositiveIntegerField(
        default=1, help_text=_("Quantity of the product in cart")
    )

    class Meta:
        verbose_name = _("Cart Item")
        verbose_name_plural = _("Cart Items")
        unique_together = (
            "cart",
            "product_sku",
        )  # Only one line item per product in a cart

    def __str__(self):
        return f"{self.quantity} x {self.product_sku} in Cart {self.cart_id}"


class WishlistItem(BaseTenantModel):
    """Wishlist item model for storing products users want to save for later.

    Note: This model inherits from BaseTenantModel but overrides the id field
    to use BigAutoField as required.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # User identification
    user_id = models.BigIntegerField(
        db_index=True,
        help_text=_("Legacy User ID field - will be deprecated in favor of contact_id"),
    )

    # New field for contact identification
    contact_id = models.BigIntegerField(
        db_index=True,
        null=True,  # Temporarily allow null values for migration
        help_text=_("Contact ID of the person who owns this wishlist item"),
    )

    # Product information
    product_sku = models.CharField(
        max_length=100, db_index=True, help_text=_("Product SKU/code")
    )

    class Meta:
        verbose_name = _("Wishlist Item")
        verbose_name_plural = _("Wishlist Items")
        unique_together = (
            "contact_id",
            "product_sku",
        )  # Only one line item per product in a cart

    def __str__(self):
        return f"SKU {self.product_sku} in Wishlist for Contact {self.contact_id}"


class RMAStatus(models.TextChoices):
    """Return Merchandise Authorization status choices."""

    PENDING_APPROVAL = "PENDING_APPROVAL", _("Pending Approval")
    APPROVED = "APPROVED", _("Approved (Awaiting Return)")
    REJECTED = "REJECTED", _("Rejected")
    RECEIVED = "RECEIVED", _("Return Received")
    PROCESSING = "PROCESSING", _("Processing")  # e.g., Inspection
    COMPLETED = "COMPLETED", _("Completed")  # e.g., Refunded/Exchanged
    CLOSED = "CLOSED", _("Closed")  # Final state


class RMAResolution(models.TextChoices):
    """Resolution options for returned items."""

    PENDING = "PENDING", _("Pending")
    REFUND = "REFUND", _("Refund")
    REPLACEMENT = "REPLACEMENT", _("Replacement")
    REJECTED = "REJECTED", _("Rejected")


class RMAItemCondition(models.TextChoices):
    """Condition options for returned items."""

    UNKNOWN = "UNKNOWN", _("Unknown")
    AS_NEW = "AS_NEW", _("As New")
    DAMAGED = "DAMAGED", _("Damaged")
    OPENED = "OPENED", _("Opened")
    DEFECTIVE = "DEFECTIVE", _("Defective")


class RMA(BaseTenantModel):
    """Return Merchandise Authorization model for managing product returns.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL)
    - company_id (IntegerField)
    - created_at, updated_at (DateTimeField)
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL)
    - custom_fields (JSONField)

    However, we override the id field to use BigAutoField as required.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # RMA identification
    rma_number = models.CharField(
        max_length=100,
        unique=True,
        editable=False,
        db_index=True,
        help_text=_("Unique RMA identifier generated automatically"),
    )

    # Order reference
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,  # Protect order from deletion if RMA exists
        related_name="rmas",
        help_text=_("The order this RMA is associated with"),
    )

    # User identification
    contact_id = models.BigIntegerField(
        db_index=True,
        null=True,
        blank=True,
        help_text=_("Contact ID of the person who initiated the return"),
    )

    # Status tracking
    status = models.CharField(
        max_length=50,
        choices=RMAStatus.choices,
        default=RMAStatus.PENDING_APPROVAL,
        db_index=True,
        help_text=_("Current status of the RMA"),
    )

    # Additional information
    notes = models.TextField(
        null=True,
        blank=True,
        help_text=_("Additional notes or comments about the return"),
    )

    class Meta:
        verbose_name = _("RMA Request")
        verbose_name_plural = _("RMA Requests")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["client_id", "status", "created_at"],
                name="om_rma_client_status_idx",
            ),
            models.Index(
                fields=["client_id", "order", "status"], name="om_rma_client_order_idx"
            ),
        ]

    def __str__(self):
        return self.rma_number

    def generate_rma_number(self):
        """
        Generates a unique RMA number.

        Returns:
            A unique RMA number in the format RMA-{client_id}-{unique_suffix}

        Raises:
            ValueError: If client_id is not available
        """
        if not self.client_id:
            raise ValueError("Cannot generate RMA number without client_id.")

        # Generate a unique suffix (8 hex chars from UUID4)
        unique_suffix = uuid.uuid4().hex[:8].upper()

        # Format: RMA-{client_id}-{unique_suffix}
        return f"RMA-{self.client_id}-{unique_suffix}"

    def save(self, *args, **kwargs):
        """
        Override save method to automatically generate RMA number.

        Args:
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
        """
        # Generate RMA number only on first save and if not already set
        if not self.pk and not self.rma_number:
            self.rma_number = self.generate_rma_number()

        # Call the parent save method
        super().save(*args, **kwargs)


class RMAItem(BaseTenantModel):
    """RMA Item model for tracking individual items being returned.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL)
    - company_id (IntegerField)
    - created_at, updated_at (DateTimeField)
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL)
    - custom_fields (JSONField)

    However, we override the id field to use BigAutoField as required.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # RMA reference
    rma = models.ForeignKey(
        RMA,
        related_name="items",
        on_delete=models.CASCADE,
        help_text=_("The RMA this item belongs to"),
    )

    # Link to the specific item instance on the original order
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.PROTECT,
        related_name="rma_items",
        help_text=_("The original order item being returned"),
    )

    # Return details
    quantity_requested = models.PositiveIntegerField(
        help_text=_("Quantity requested to be returned")
    )

    reason = models.CharField(
        max_length=255, null=True, blank=True, help_text=_("Reason for the return")
    )

    # Fields updated during processing
    resolution = models.CharField(
        max_length=20,
        choices=RMAResolution.choices,
        default=RMAResolution.PENDING,
        null=True,
        blank=True,
        help_text=_("Resolution for this returned item"),
    )

    received_quantity = models.PositiveIntegerField(
        null=True, blank=True, default=0, help_text=_("Quantity actually received")
    )

    condition = models.CharField(
        max_length=20,
        choices=RMAItemCondition.choices,
        default=RMAItemCondition.UNKNOWN,
        null=True,
        blank=True,
        help_text=_("Condition of the returned item"),
    )

    class Meta:
        verbose_name = _("RMA Item")
        verbose_name_plural = _("RMA Items")

    def __str__(self):
        return f"{self.quantity_requested} x Item {self.order_item_id} for RMA {self.rma.rma_number}"


class Payment(BaseTenantModel):
    """
    Payment model for storing payment transactions related to orders.

    This model stores payment information from the payment microservice callback,
    supporting multiple payment methods and split payments for a single order.
    Each payment record represents a single payment transaction or attempt.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL): The tenant this record belongs to
    - company_id (IntegerField): Company ID within the tenant context
    - created_at, updated_at (DateTimeField): Automatic timestamps
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL): Audit fields
    - custom_fields (JSONField): Extensible field for tenant-specific customizations
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Order relationship
    order = models.ForeignKey(
        "Order",
        on_delete=models.CASCADE,
        related_name="payments",
        help_text=_("Order associated with this payment attempt/transaction"),
    )

    # Payment details
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_(
            "Amount of this payment/attempt in order currency. Negative for refunds."
        ),
    )

    # Payment method (e.g., 'STRIPE_CARD', 'WALLET', 'LOYALTY', 'COD', 'RAZORPAY_UPI')
    payment_method = models.CharField(
        max_length=50, db_index=True, help_text=_("Payment method used or attempted")
    )

    # Payment status
    status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
        help_text=_("Current status of this specific payment transaction"),
    )

    # ID from the external payment gateway/microservice
    gateway_transaction_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        unique=True,
        help_text=_("Transaction ID from the payment gateway/microservice"),
    )

    # Store the raw response from the gateway/microservice callback for audit/debug
    gateway_response = models.JSONField(
        null=True,
        blank=True,
        help_text=_(
            "Complete response data from payment gateway/microservice callback"
        ),
    )

    # Timestamp from the gateway/microservice indicating processing time
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Timestamp when the payment was processed by the gateway/service"),
    )

    # Links to WalletTransaction / LoyaltyTransaction if applicable
    wallet_transaction = models.OneToOneField(
        "WalletTransaction",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payment_record",
        unique=True,
        help_text=_("Associated wallet transaction for wallet payments"),
    )

    loyalty_transaction = models.OneToOneField(
        "LoyaltyTransaction",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payment_record",
        unique=True,
        help_text=_("Associated loyalty transaction for loyalty point redemptions"),
    )

    class Meta:
        verbose_name = _("Payment Transaction")
        verbose_name_plural = _("Payment Transactions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["client_id", "order", "status"],
                name="om_payment_client_order_idx",
            ),
            models.Index(
                fields=["gateway_transaction_id"], name="om_payment_gateway_txn_idx"
            ),
        ]

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.order_id} - {self.amount} {self.payment_method} ({self.status})"


class WalletTransactionType(models.TextChoices):
    """Transaction type choices for wallet transactions."""

    RECHARGE = "RECHARGE", _("Recharge")
    BONUS = "BONUS", _("Bonus")
    ORDER_PAYMENT = "ORDER_PAYMENT", _("Order Payment")
    REFUND = "REFUND", _("Refund")
    ADJUSTMENT = "ADJUSTMENT", _("Manual Adjustment")  # For admin corrections


class Wallet(BaseTenantModel):
    """Wallet model for managing customer wallet balances.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL)
    - company_id (IntegerField)
    - created_at, updated_at (DateTimeField)
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL)
    - custom_fields (JSONField)

    However, we override the id field to use BigAutoField as required.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Link to the parent customer entity (Individual or B2B/Gov)
    account_id = models.BigIntegerField(
        unique=True,
        db_index=True,
        help_text=_("ID of the customer account this wallet belongs to"),
    )

    # Wallet balance
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text=_("Current wallet balance"),
    )

    class Meta:
        verbose_name = _("Wallet")
        verbose_name_plural = _("Wallets")
        # No specific constraint needed here as account_id has unique=True

    def __str__(self):
        return f"Wallet for Customer {self.account_id} - Balance: {self.balance}"


class WalletTransaction(BaseTenantModel):
    """Wallet transaction model for tracking wallet credits and debits.

    This model represents financial transactions within a customer's wallet, including
    deposits, withdrawals, order payments, and refunds. Each transaction affects the
    wallet balance and maintains a complete audit trail of all financial activities.

    Key features:
    - Immutable transaction records (protected from deletion)
    - Transaction types categorized (RECHARGE, ORDER_PAYMENT, REFUND, etc.)
    - Optional reference to related orders for payment/refund transactions
    - Maintains idempotency through transaction_reference field
    - Includes metadata for additional transaction details

    Security considerations:
    - Uses PROTECT on wallet foreign key to prevent deletion of wallets with transactions
    - Maintains complete audit trail with created_by/updated_by fields
    - Transaction amounts stored with high precision (12 digits, 2 decimal places)

    Note: This model inherits from BaseTenantModel which provides tenant context and audit fields,
    but overrides the id field to use BigAutoField as required for high-volume transaction processing.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Wallet reference
    wallet = models.ForeignKey(
        Wallet,
        related_name="transactions",
        on_delete=models.PROTECT,  # Protect wallet if transactions exist
        help_text=_("The wallet this transaction belongs to"),
    )

    # Transaction details
    transaction_type = models.CharField(
        max_length=20,
        choices=WalletTransactionType.choices,
        db_index=True,
        help_text=_("Type of wallet transaction"),
    )

    # Positive for credit (recharge, bonus, refund), Negative for debit (payment)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Transaction amount (positive for credit, negative for debit)"),
    )

    # Optional links to related entities
    related_order = models.ForeignKey(
        Order,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_transactions",
        help_text=_("Related order for payment or refund transactions"),
    )

    related_rma = models.ForeignKey(
        RMA,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="wallet_transactions",
        help_text=_("Related RMA for refund transactions"),
    )

    # Additional information
    notes = models.TextField(
        null=True,
        blank=True,
        help_text=_("Additional notes or details about the transaction"),
    )

    class Meta:
        verbose_name = _("Wallet Transaction")
        verbose_name_plural = _("Wallet Transactions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["client_id", "wallet", "created_at"],
                name="om_wallet_tx_client_wallet_idx",
            ),
            models.Index(
                fields=["client_id", "transaction_type", "created_at"],
                name="om_wallet_tx_client_type_idx",
            ),
        ]

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} for Wallet {self.wallet_id} at {self.created_at}"


class LoyaltyTransactionType(models.TextChoices):
    """Transaction type choices for loyalty point transactions."""

    EARNED = "EARNED", _("Points Earned")
    REDEEMED = "REDEEMED", _("Points Redeemed")
    EXPIRED = "EXPIRED", _("Points Expired")
    ADJUSTMENT = "ADJUSTMENT", _("Manual Adjustment")  # For admin corrections


class LoyaltyTransaction(BaseTenantModel):
    """Loyalty Transaction model for tracking customer loyalty points.

    This model represents loyalty point transactions for customers, including points earned
    from purchases, points redeemed for discounts, expired points, and manual adjustments.
    It maintains a complete audit trail of all loyalty program activities.

    Key features:
    - Transaction types categorized (EARNED, REDEEMED, EXPIRED, ADJUSTMENT)
    - Optional reference to related orders for points earned/redeemed
    - Expiration date tracking for points that expire
    - Includes metadata for additional transaction details

    Business rules:
    - Points can be earned based on order amount or specific product purchases
    - Points can be redeemed for discounts on future orders
    - Points may expire after a configurable period (set in TenantConfiguration)
    - Manual adjustments can be made by administrators

    Note: This model inherits from BaseTenantModel which provides tenant context and audit fields.
    The model uses asynchronous processing via Celery tasks for point expiration and batch operations.
    """

    # Override the id field from BaseTenantModel to use BigAutoField
    id = models.BigAutoField(primary_key=True)

    # Account that owns the loyalty points
    account_id = models.BigIntegerField(
        db_index=True,
        help_text=_("ID of the customer account that owns these loyalty points"),
    )

    # User whose points balance is affected
    contact_id = models.BigIntegerField(
        db_index=True,
        help_text=_("Contact ID of the person whose points balance is affected"),
    )

    # Transaction details
    transaction_type = models.CharField(
        max_length=20,
        choices=LoyaltyTransactionType.choices,
        db_index=True,
        help_text=_("Type of loyalty transaction"),
    )

    # Positive for earned/credit, Negative for redeemed/debit/expired
    points_change = models.IntegerField(
        help_text=_(
            "Points change (positive for earned/credit, negative for redeemed/debit/expired)"
        )
    )

    # Optional link to related order
    related_order = models.ForeignKey(
        Order,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="loyalty_transactions",
        help_text=_("Related order for earned or redeemed points"),
    )

    # Set for EARNED transactions if points expire
    expiry_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Date when points expire, if applicable"),
    )

    # Additional information
    notes = models.TextField(
        null=True,
        blank=True,
        help_text=_("Additional notes or details about the transaction"),
    )

    class Meta:
        verbose_name = _("Loyalty Transaction")
        verbose_name_plural = _("Loyalty Transactions")
        ordering = ["-created_at"]
        indexes = [
            # Index for contact's history
            models.Index(
                fields=["client_id", "contact_id", "created_at"],
                name="om_loyalty_tx_contact_idx",
            ),
            # Index for account's history/balance
            models.Index(
                fields=["client_id", "account_id", "created_at"],
                name="om_loyalty_tx_account_idx",
            ),
            # Index for finding expired points per account
            models.Index(
                fields=["client_id", "account_id", "transaction_type", "expiry_date"],
                name="om_loyalty_tx_acc_type_exp_idx",
            ),
        ]

    def __str__(self):
        return f"{self.transaction_type} {self.points_change} points for Contact {self.contact_id} (Account: {self.account_id}) at {self.created_at}"


class PasswordResetToken(BaseTenantModel):
    """
    Password Reset Token model for storing temporary tokens for password reset.

    Note: This model inherits from BaseTenantModel which provides:
    - client (ForeignKey to TENANT_MODEL)
    - company_id (IntegerField)
    - created_at, updated_at (DateTimeField)
    - created_by, updated_by (ForeignKey to AUTH_USER_MODEL)
    - custom_fields (JSONField)

    However, we override the id field to use BigAutoField as required.
    """

    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(
        db_index=True, help_text=_("The user whose password needs reset")
    )
    token = models.CharField(
        max_length=64, unique=True, db_index=True, help_text=_("Secure random token")
    )
    expires_at = models.DateTimeField(help_text=_("Timestamp when this token expires"))

    class Meta:
        verbose_name = _("Password Reset Token")
        verbose_name_plural = _("Password Reset Tokens")
        ordering = ["-created_at"]

    def is_expired(self):
        """
        Check if the token has expired.

        Returns:
            bool: True if expired, False otherwise
        """
        from django.utils import timezone

        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Reset Token for User {self.user_id} (Client: {self.client_id})"


class TenantConfiguration(BaseTenantModel):
    """Tenant Configuration model for storing tenant-specific settings.

    This model implements the schema-per-tenant multi-tenancy pattern by storing
    configuration settings specific to each tenant. It serves as a central repository
    for all tenant-specific settings that control the behavior of the application.

    Key configuration areas:
    - Feature flags: Enable/disable specific features for each tenant
    - Payment settings: Configure payment gateways, methods, and options
    - Notification templates: Email and SMS templates for transactional messages
    - UI customization: Branding, colors, and layout preferences
    - Business rules: Order workflows, approval processes, and validation rules
    - Integration settings: API keys and endpoints for external services
    - Loyalty program: Points earning rates, redemption values, and expiration rules

    Implementation notes:
    - Only one configuration record is allowed per tenant (enforced by unique constraint)
    - JSON fields are used for flexible, schema-less configuration storage
    - Changes to configuration are tracked through audit fields
    - Configuration values are cached for performance

    Note: This model inherits from BaseTenantModel which provides tenant context and audit fields.
    Configuration changes should be made through the admin interface or API endpoints with
    appropriate validation to prevent system misconfiguration.
    """

    id = models.BigAutoField(primary_key=True)

    # Unique tenant identifier from the URL path
    tenant_ref = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        editable=False,
        help_text=_("Unique identifier for the tenant (e.g., from URL path)."),
    )

    # --- Configurations ---
    # Store list of enabled gateway IDs and maybe non-sensitive display names/prefs
    # Example: {'enabled_gateways': [{'id': 'stripe_card', 'display_name': 'Credit Card'}], 'default': 'stripe_card'}
    payment_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Payment gateway configurations and preferences"),
    )

    # Store selected provider IDs and non-sensitive info like sender email/name
    # Example: {'email_provider': 'zepto', 'email_from': 'store@tenant.com', 'sms_provider': None}
    notification_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Notification provider configurations and preferences"),
    )
    # Auto-cancellation timeout for orders in PENDING_PAYMENT status
    pending_payment_timeout_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=2880,  # Default to 48 hours * 60 minutes
        help_text=_(
            "Automatically cancel orders pending payment after this many MINUTES. Leave blank or 0 to disable."
        ),
    )

    # Flag to track onboarding completion status
    is_onboarding_completed = models.BooleanField(
        default=False,
        help_text=_(
            "Indicates whether the tenant has completed their initial onboarding process"
        ),
    )

    class Meta:
        verbose_name = _("Tenant Configuration")
        verbose_name_plural = _("Tenant Configurations")
        # No specific constraint needed here as tenant_ref has unique=True

    def __str__(self):
        return f"Configuration for Tenant Ref: {self.tenant_ref} (Client ID: {self.client_id})"


class CustomerGroupSellingChannelStorePickup(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and StorePickup.
    This allows tracking which store pickup locations are accessible to which customer group and selling channel combinations.
    """

    customer_group_selling_channel = models.ForeignKey(
        "customers.CustomerGroupSellingChannel",
        on_delete=models.CASCADE,
        related_name="store_pickup_relationships",
        help_text=_("Reference to the CustomerGroupSellingChannel relationship"),
        db_index=True,
    )

    store_pickup = models.ForeignKey(
        "order_management.StorePickup",
        on_delete=models.CASCADE,
        related_name="customer_group_selling_channel_relationships",
        help_text=_("Reference to the StorePickup location"),
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True, help_text=_("Whether this relationship is active"), db_index=True
    )

    class Meta:
        db_table = "order_management_store_pickup_exclusions"
        unique_together = ("customer_group_selling_channel", "store_pickup")
        ordering = ["customer_group_selling_channel", "store_pickup__name"]
        indexes = [
            models.Index(
                fields=["customer_group_selling_channel", "is_active"],
                name="idx_cgspsp_cgsc_act",
            ),
            models.Index(
                fields=["store_pickup", "is_active"], name="idx_cgspsp_sp_act"
            ),
            models.Index(
                fields=["customer_group_selling_channel", "store_pickup", "is_active"],
                name="idx_cgspsp_all",
            ),
        ]

    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.store_pickup}"


class TimeSlot(BaseTenantModel):
    name = models.CharField(_("slot name"), max_length=100)
    start_time = models.TimeField(_("start time"))
    end_time = models.TimeField(_("end time"))
    is_active = models.BooleanField(_("is active"), default=True)

    class Meta:
        verbose_name = _("time slot")
        verbose_name_plural = _("time slots")
        ordering = ["start_time"]

    def __str__(self):
        return f'{self.name}: {self.start_time.strftime("%H:%M")} - {self.end_time.strftime("%H:%M")}'


class CustomerGroupSellingChannelShippingMethod(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and ShippingMethod.
    This allows tracking which shipping methods are accessible to which customer group and selling channel combinations.
    """

    customer_group_selling_channel = models.ForeignKey(
        "customers.CustomerGroupSellingChannel",
        on_delete=models.CASCADE,
        related_name="shipping_method_relationships",
        help_text=_("Reference to the CustomerGroupSellingChannel relationship"),
        db_index=True,
    )

    shipping_method = models.ForeignKey(
        "order_management.ShippingMethod",
        on_delete=models.CASCADE,
        related_name="customer_group_selling_channel_relationships",
        help_text=_("Reference to the ShippingMethod"),
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True, help_text=_("Whether this relationship is active"), db_index=True
    )

    class Meta:
        db_table = "order_management_shipping_method_exclusions"
        unique_together = ("customer_group_selling_channel", "shipping_method")
        ordering = ["customer_group_selling_channel", "shipping_method__name"]
        indexes = [
            models.Index(
                fields=["customer_group_selling_channel", "is_active"],
                name="idx_cgscsm_cgsc_act",
            ),
            models.Index(
                fields=["shipping_method", "is_active"], name="idx_cgscsm_sm_act"
            ),
            models.Index(
                fields=[
                    "customer_group_selling_channel",
                    "shipping_method",
                    "is_active",
                ],
                name="idx_cgscsm_all",
            ),
        ]

    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.shipping_method}"


class ShippingMethodZoneRestriction(BaseTenantModel):
    """
    Manages shipping method-level shipping zone restrictions (allow/deny lists).
    This model defines which shipping zones a shipping method can or cannot be used for.
    """

    class RestrictionMode(models.TextChoices):
        INCLUDE = "INCLUDE", _("Include")
        EXCLUDE = "EXCLUDE", _("Exclude")

    shipping_method = models.ForeignKey(
        "order_management.ShippingMethod",
        on_delete=models.CASCADE,
        related_name="zone_restrictions",
        help_text="The shipping method this restriction applies to",
    )

    zone = models.ForeignKey(
        "shipping_zones.ShippingZone",
        on_delete=models.CASCADE,
        related_name="shipping_method_restrictions",
        help_text="The shipping zone being included or excluded",
    )

    restriction_mode = models.CharField(
        max_length=10,
        choices=RestrictionMode.choices,
        help_text="Whether to include or exclude this zone for the shipping method",
    )

    class Meta:
        db_table = "shipping_method_zone_restrictions"
        unique_together = ("shipping_method", "zone")
        verbose_name = _("Shipping Method Zone Restriction")
        verbose_name_plural = _("Shipping Method Zone Restrictions")

    def __str__(self):
        return f"{self.shipping_method} - {self.zone} ({self.restriction_mode})"


class FulfillmentType(models.TextChoices):
    NONE = "none", _("None")
    DELIVERY = "delivery", _("Delivery")
    STORE_PICKUP = "store_pickup", _("Store Pickup")
    BOTH = "both", _("Delivery and Store Pickup")

class CheckoutConfiguration(BaseTenantModel):
    """
    Model for storing checkout configuration settings.
    Each tenant can have multiple configurations for different customer groups and selling channels.
    """

    # Checkout settings
    allow_guest_checkout = models.BooleanField(
        default=True,
        help_text=_("Allow customers to checkout without creating an account"),
    )

    min_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Minimum order amount required to place an order"),
    )

    allow_user_select_shipping = models.BooleanField(
        default=True,
        help_text=_("Allow users to select their preferred shipping method"),
    )

    fulfillment_type = models.CharField(
        max_length=20,
        choices=FulfillmentType.choices,
        default=FulfillmentType.BOTH,
        help_text=_("Select fulfillment options: Delivery, Store Pickup, or Both"),
    )

    pickup_method_label = models.CharField(
        max_length=100,
        default=_("In-Store Pickup"),
        blank=True,
        help_text=_("Display name for the in-store pickup option"),
    )

    enable_delivery_prefs = models.BooleanField(
        default=False, help_text=_("Enable delivery preferences during checkout")
    )

    enable_preferred_date = models.BooleanField(
        default=False, help_text=_("Allow customers to select preferred delivery date")
    )

    enable_time_slots = models.BooleanField(
        default=False, help_text=_("Enable time slot selection for delivery/pickup")
    )

    currency = models.CharField(
        max_length=3,
        default="INR",
        help_text=_("Default currency code (ISO 4217) for the store"),
    )
    is_active = models.BooleanField(
        default=True, help_text=_("Is this checkout configuration active?")
    )
    is_default = models.BooleanField(
        default=False, help_text=_("Is this the default checkout configuration? Only one configuration can be default."),
        db_index=True
    )

    # One-to-one relationship with CustomerGroupSellingChannel
    customer_group_selling_channel = models.OneToOneField(
        "customers.CustomerGroupSellingChannel",
        on_delete=models.CASCADE,
        related_name="checkout_configuration",
        null=True,  # Allows backward compatibility and easy migration
        blank=True,
        unique=True,
        help_text=_(
            "Customer group and selling channel combination for this checkout configuration"
        ),
    )

    class Meta:
        db_table = "order_management_checkout_configuration"
        verbose_name = _("Checkout Configuration")
        verbose_name_plural = _("Checkout Configurations")
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_default"],
                condition=models.Q(is_default=True),
                name="unique_default_checkout_config"
            )
        ]

    def __str__(self):
        return f"Checkout Configuration #{self.id}"

class UITemplateSettings(BaseTenantModel):
    """
    Stores UI template/layout settings for a customer group and selling channel.
    """

    checkout_layout = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text=_("Checkout page layout style"),
    )
    pdp_layout_style = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text=_("Product detail page layout style"),
    )
    product_card_style = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text=_("Product card style"),
    )
    is_active = models.BooleanField(
        default=True, db_index=True, help_text=_("Is this UI template setting active?")
    )
    is_default = models.BooleanField(
        default=False, help_text=_("Is this the default UI template setting? Only one setting can be default."),
        db_index=True
    )
    customer_group_selling_channel = models.OneToOneField(
        "customers.CustomerGroupSellingChannel",
        on_delete=models.CASCADE,
        related_name="ui_template_settings",
        null=True,  # Allows backward compatibility and easy migration
        blank=True,
        unique=True,
        db_index=True,
        help_text=_(
            "Customer group and selling channel combination for this UI template setting"
        ),
    )

    class Meta:
        verbose_name = _("UI Template Setting")
        verbose_name_plural = _("UI Template Settings")
        db_table = "order_management_ui_template_settings"
        indexes = [
            models.Index(fields=["checkout_layout"]),
            models.Index(fields=["pdp_layout_style"]),
            models.Index(fields=["product_card_style"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["customer_group_selling_channel"]),
            models.Index(fields=["is_default"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["is_default"],
                condition=models.Q(is_default=True),
                name="unique_default_ui_template"
            )
        ]

    def __str__(self) -> str:
        return f"UI Template Settings for {self.customer_group_selling_channel or 'Default'}"


class FeatureToggleSettings(BaseTenantModel):
    """
    Stores feature toggles for tenant-specific modules.
    Includes kill switch and default delivery zone fields.
    """

    customer_group_selling_channel = models.OneToOneField(
        "customers.CustomerGroupSellingChannel",
        on_delete=models.CASCADE,
        related_name="feature_toggle_settings",
        null=True,  # Allows backward compatibility and easy migration
        blank=True,
        unique=True,
        db_index=True,
        help_text=_(
            "Customer group and selling channel combination for this feature toggle setting"
        ),
    )
    wallet_enabled = models.BooleanField(default=False, db_index=True)
    loyalty_enabled = models.BooleanField(default=False, db_index=True)
    reviews_enabled = models.BooleanField(default=False, db_index=True)
    wishlist_enabled = models.BooleanField(default=True, db_index=True)

    # Wallet config fields
    min_recharge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=10.00,
        help_text=_("Minimum amount for a single recharge"),
        db_index=True,
        null=True,
        blank=True,
    )
    max_recharge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=10000.00,
        help_text=_("Maximum amount for a single recharge"),
        db_index=True,
        null=True,
        blank=True,
    )
    daily_transaction_limit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5000.00,
        help_text=_("Daily transaction limit"),
        db_index=True,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Is this feature toggle setting active?"),
    )
    is_default = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_("Is this the default feature toggle setting? Only one setting can be default."),
    )
    kill_switch = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_(
            "If enabled, disables all features for this tenant (emergency kill switch)."
        ),
    )
    default_delivery_zone = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        help_text=_("Default delivery zone to use if not specified elsewhere."),
    )

    class Meta:
        db_table = "order_management_feature_toggle_settings"
        verbose_name = "Feature Toggle Settings"
        verbose_name_plural = "Feature Toggle Settings"
        indexes = [
            models.Index(fields=["is_default"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["is_default"],
                condition=models.Q(is_default=True),
                name="unique_default_feature_toggle"
            )
        ]

    def __str__(self) -> str:
        return f"FeatureToggles #{self.id} (Tenant: {self.tenant_id})"

class GuestConfig(BaseTenantModel):
    """
    Model to store guest configuration linking selling channel, customer group, and segment.
    """
    selling_channel_id = models.BigIntegerField(
        help_text=_("ID of the selling channel"),
        db_index=True,
    )
    customer_group_id = models.BigIntegerField(
        help_text=_("ID of the customer group"),
        db_index=True,
    )
    segment_id = models.BigIntegerField(
        help_text=_("ID of the segment"),
        db_index=True,
    )

    class Meta:
        db_table = "order_management_guest_config"
        verbose_name = _("Guest Config")
        verbose_name_plural = _("Guest Configs")
        unique_together = ("selling_channel_id", "customer_group_id", "segment_id")
        indexes = [
            models.Index(fields=["selling_channel_id"]),
            models.Index(fields=["customer_group_id"]),
            models.Index(fields=["segment_id"]),
        ]

    def __str__(self) -> str:
        return f"GuestConfig(sc={self.selling_channel_id}, cg={self.customer_group_id}, seg={self.segment_id})"
