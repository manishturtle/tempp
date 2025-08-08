from django.db import models
from django.db.models import Q, UniqueConstraint
from django.utils import timezone
from decimal import Decimal
from customers.models import Account, Contact
from core.models.base import BaseTenantModel
from django.utils.translation import gettext_lazy as _
from customers.models import OrderAddress
from products.models import Product
from pricing.models import TaxRate, SellingChannel
from order_management.models import Order, StorePickup
from payment_method.models import PaymentMethod


class Invoice(BaseTenantModel):
    class InvoiceStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        CANCELLED = "CANCELLED", "Cancelled"

    class InvoiceType(models.TextChoices):
        STANDARD = "STANDARD", "Standard"
        PROFORMA = "PROFORMA", "Proforma"
        SALES_RECEIPT = "SALES_RECEIPT", "Sales Receipt"
        RECURRING = "RECURRING", "Recurring"

    class PaymentStatus(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"

    class GstTreatment(models.TextChoices):
        BUSINESS_GST = "BUSINESS_GST", "Business GST"
        CONSUMER = "CONSUMER", "Consumer"

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", _("Percentage")
        AMOUNT = "AMOUNT", _("Amount")

    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="invoices",
        null=True,
        blank=True,
        help_text=_(
            "The account associated with this invoice. Can be null for certain invoice types."
        ),
    )
    account_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_("Name of the customer account. Null for guest orders."),
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        related_name="invoices",
        null=True,
        blank=True,
        help_text="The contact associated with this invoice. Optional but recommended.",
    )
    contact_person_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_(
            "Name of the contact person. May be null for guest checkouts or consumer orders."
        ),
    )
    invoice_number = models.CharField(max_length=50)
    reference_number = models.CharField(max_length=100, blank=True, default="")
    place_of_supply = models.CharField(max_length=100)
    gst_treatment = models.CharField(max_length=50, choices=GstTreatment.choices)
    template_id = models.IntegerField(default=1)
    issue_date = models.DateField(default=timezone.now)
    payment_terms = models.IntegerField(
        null=True,
        blank=True,
        default=None,
    )
    payment_terms_label = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
    )
    due_date = models.DateField(
        null=True,
        blank=True,
    )
    subtotal_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
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
    currency = models.CharField(max_length=3, default="INR")
    is_discount_before_tax = models.BooleanField(default=True)
    is_inclusive_tax = models.BooleanField(default=False)
    tax_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    allow_partial_payments = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True, default="Terms & Conditions apply")

    invoice_status = models.CharField(
        max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT
    )
    invoice_type = models.CharField(
        max_length=20, choices=InvoiceType.choices, default=InvoiceType.STANDARD
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID
    )
    invoice_url = models.URLField(max_length=512, blank=True, null=True)
    shipping_address = models.ForeignKey(
        OrderAddress,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="invoice_shipping_orders",
        help_text=_("Reference to the shipping address for this order"),
    )
    same_as_shipping = models.BooleanField(
        default=False,
        help_text="Is the billing address the same as the shipping address?",
    )
    recipient_details = models.JSONField(
        _("Recipient Details"),
        help_text="Stores recipient information including name, contact, and preferences",
        default=dict,
        blank=True,
    )
    billing_address = models.ForeignKey(
        OrderAddress,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="invoice_billing_orders",
        help_text=_("Reference to the billing address for this order"),
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Amount paid for this order"),
    )
    amount_due = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text=_("Amount due for this order"),
    )
    is_reverse_charge_applicable = models.BooleanField(default=False)
    irn = models.CharField(max_length=50, blank=True, null=True)
    ack_no = models.CharField(max_length=50, blank=True, null=True)
    signed_qr_code = models.CharField(max_length=150, blank=True, null=True)
    selling_channel = models.ForeignKey(
        SellingChannel,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoices",
        help_text=_("Selling channel for the order"),
    )

    responsible_person = models.BigIntegerField(
        null=True,
        help_text="User ID of the person who is responsible for the order.",
    )
    fulfillment_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text=_("Fullfillment type for the order"),
    )
    storepickup = models.ForeignKey(
        StorePickup,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoices",
        help_text=_("Store pickup for the order"),
    )
    pickup_details = models.JSONField(
        _("Pickup Details"),
        help_text="Stores pickup location, date, time slot, and instructions",
        default=dict,
        blank=True,
    )
    config_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="A snapshot of the invoice configuration at the time of creation.",
    )

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["invoice_number"],
                condition=~Q(invoice_status="CANCELLED"),
                name="unique_invoice_number_if_not_cancelled",
            )
        ]

    # Add orders field for many-to-many relationship with Order model
    orders = models.ManyToManyField(
        Order,
        through="InvoiceOrder",
        related_name="invoices",
        blank=True,
        help_text=_("Orders associated with this invoice"),
    )


class InvoiceItem(BaseTenantModel):
    """Invoice item model for storing individual line items within an invoice."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", _("Percentage")
        AMOUNT = "AMOUNT", _("Amount")

    invoice = models.ForeignKey(
        Invoice,
        related_name="items",
        on_delete=models.CASCADE,
        help_text=_("The invoice this item belongs to"),
    )
    product = models.ForeignKey(
        Product,
        related_name="invoice_items",
        on_delete=models.CASCADE,
        help_text=_("The product this item belongs to"),
    )
    product_sku = models.CharField(
        max_length=100, db_index=True, help_text=_("Product SKU/code")
    )
    product_name = models.CharField(
        max_length=255, help_text=_("Product name at time of invoice")
    )
    quantity = models.PositiveIntegerField(help_text=_("Quantity ordered"))
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Price per unit at time of invoice"),
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
        verbose_name = _("Invoice Item")
        verbose_name_plural = _("Invoice Items")


class InvoiceCounter(BaseTenantModel):
    """
    Tracks the last used sequence number for a specific invoice configuration,
    client, and reset period to ensure unique, sequential numbering.
    """

    config_assignment_id = models.PositiveIntegerField(
        help_text="The ID of the configuration assignment (response.id from the API)."
    )
    reset_period_key = models.CharField(max_length=20, default="all_time")
    last_sequence = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [["config_assignment_id", "reset_period_key"]]
        verbose_name = "Invoice Counter"
        verbose_name_plural = "Invoice Counters"

    def __str__(self):
        return f"Config {self.config_assignment_id} ({self.reset_period_key}): {self.last_sequence}"


class InvoiceItemTax(BaseTenantModel):
    """Invoice item tax model for storing tax information for an invoice item."""

    invoice_item = models.ForeignKey(
        InvoiceItem,
        related_name="taxes",
        on_delete=models.CASCADE,
        help_text=_("The invoice item this tax belongs to"),
    )

    tax = models.ForeignKey(
        TaxRate,
        related_name="invoice_item_taxes",
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
        verbose_name = _("Invoice Item Tax")
        verbose_name_plural = _("Invoice Item Taxes")


class InvoiceOrder(BaseTenantModel):
    """Through model for the many-to-many relationship between Invoice and Order.

    This model allows multiple orders to be associated with a single invoice and
    multiple invoices to reference the same order. It also stores additional metadata
    about the relationship such as the amount from the order applied to the invoice.
    """

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="invoice_orders",
        help_text=_("The invoice in this relationship"),
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="order_invoices",
        help_text=_("The order in this relationship"),
    )

    class Meta:
        verbose_name = _("invoice order relationship")
        verbose_name_plural = _("invoice order relationships")
        unique_together = ["invoice", "order"]

    def __str__(self):
        return f"Invoice {self.invoice.invoice_number} - Order {self.order.order_id}"


class InvoicePaymentMethod(BaseTenantModel):
    """
    Simple relationship table between Invoice and PaymentMethod.
    Allows one invoice to have multiple payment methods.
    """

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="invoice_payment_methods",
        help_text=_("The invoice in this relationship"),
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.CASCADE,
        related_name="payment_method_invoices",
        help_text=_("The payment method in this relationship"),
    )

    class Meta:
        verbose_name = _("Invoice Payment Method")
        verbose_name_plural = _("Invoice Payment Methods")
        unique_together = ["invoice", "payment_method"]

    def __str__(self):
        return f"Invoice {self.invoice.invoice_number} - {self.payment_method.name}"
