from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from customers.models import Account
from invoices.models import Invoice
from core.models.base import BaseTenantModel
from payment_method.models import PaymentMethod


class Receipt(BaseTenantModel):
    """
    Represents a single payment received from a customer.
    This record is independent of any invoice until it's allocated.
    """

    class PaymentStatus(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        BOUNCED = "BOUNCED", "Bounced"
        REVERSED = "REVERSED", "Reversed"
        CANCELLED = "CANCELLED", "Cancelled"

    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="payments"
    )
    account_name = models.CharField(max_length=100)
    receipt_number = models.CharField(
        max_length=50, unique=True, help_text="Unique identifier for the payment"
    )
    receipt_date = models.DateField()
    amount_received = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Transaction ID, check number, etc.",
    )
    notes = models.TextField(blank=True, null=True)
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.RECEIVED
    )
    original_receipt = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True
    )
    deposit_to_account_id = models.BigIntegerField(null=True, blank=True)
    source = models.CharField(max_length=20, null=True, blank=True)
    unallocated_amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    class Meta:
        ordering = ["-receipt_date"]

    def __str__(self):
        return f"Receipt {self.receipt_number} for {self.account_name} - {self.amount_received}"


class ReceiptAllocation(BaseTenantModel):
    """
    This is the "through" model that links a Receipt to an Invoice.
    It specifies how much of a payment is applied to a specific invoice.
    """

    receipt = models.ForeignKey(
        Receipt, on_delete=models.CASCADE, related_name="allocations"
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="allocations"
    )
    amount_applied = models.DecimalField(max_digits=12, decimal_places=2)
    allocation_date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-allocation_date"]

    def __str__(self):
        return f"{self.amount_applied} of {self.receipt} applied to {self.invoice}"


class CreditLedger(BaseTenantModel):

    class EntryType(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT = "DEBIT", "Debit"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="credits"
    )
    transaction_date = models.DateTimeField(auto_now_add=True)
    entry_type = models.CharField(max_length=20, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    running_balance = models.DecimalField(max_digits=15, decimal_places=2)
    source_document_id = models.BigIntegerField(null=True, blank=True)
    source_document_type = models.CharField(max_length=20, null=True, blank=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return (
            f"{self.amount} {self.entry_type} for {self.account} - {self.description}"
        )


class AuditTrail(BaseTenantModel):

    class ActionType(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"
        VOID = "VOID", "Void"

    user_id = models.BigIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    record_type = models.CharField(max_length=50)
    record_id = models.BigIntegerField(null=True, blank=True)
    change_details = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.action_type} {self.record_type} {self.record_id}"


class TDSAdjustments(BaseTenantModel):

    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        REVERSED = "REVERSED", "Reversed"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="tds_adjustments"
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="tds_adjustments"
    )
    receipt = models.ForeignKey(
        Receipt, on_delete=models.CASCADE, related_name="tds_adjustments"
    )
    adjustment_date = models.DateField(auto_now_add=True)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tds_certificate_reference = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices)

    def __str__(self):
        return f"{self.tds_amount} TDS Adjustment for {self.invoice} - {self.status}"
