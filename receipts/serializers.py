from rest_framework import serializers
from django.db import transaction, models
from decimal import Decimal
from django.utils import timezone
from .models import (
    Receipt,
    ReceiptAllocation,
    CreditLedger,
    TDSAdjustments,
)
from invoices.models import (
    Invoice,
)
from payment_method.models import PaymentMethod

# ==============================================================================
# 1. Nested Serializer for Invoice Settlements
# ==============================================================================
# This serializer handles the validation and structure of each object
# within the `invoice_settlements` array in the main payload.


class InvoiceSettlementSerializer(serializers.Serializer):
    """
    Serializer for validating each settlement object within the main payload.
    """

    invoiceId = serializers.IntegerField(required=True)
    amountSettled = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True, min_value=Decimal("0.00")
    )
    isTdsApplied = serializers.BooleanField(default=False)
    tdsAmount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        min_value=Decimal("0.00"),
        default=Decimal("0.00"),
    )

    def validate(self, data):
        """
        Validates each settlement object.
        """
        # Ensure that if TDS is applied, the tdsAmount is greater than zero.
        if data.get("isTdsApplied") and data.get("tdsAmount", Decimal("0.00")) <= 0:
            raise serializers.ValidationError(
                "If isTdsApplied is true, tdsAmount must be greater than zero."
            )

        # Ensure that if TDS is not applied, tdsAmount is zero.
        if not data.get("isTdsApplied") and data.get("tdsAmount", Decimal("0.00")) != 0:
            raise serializers.ValidationError(
                "If isTdsApplied is false, tdsAmount must be zero."
            )

        return data


# ==============================================================================
# 2. Receipt Allocation Serializer for Read Operations
# ==============================================================================


class ReceiptAllocationSerializer(serializers.ModelSerializer):
    """Serializer for ReceiptAllocation model for read operations"""

    invoice_number = serializers.SerializerMethodField()
    invoice_date = serializers.SerializerMethodField()
    invoice_total = serializers.SerializerMethodField()
    tds_amount = serializers.SerializerMethodField()
    show_tds = serializers.SerializerMethodField()

    class Meta:
        model = ReceiptAllocation
        fields = [
            "id",
            "invoice",
            "invoice_number",
            "invoice_date",
            "invoice_total",
            "amount_applied",
            "allocation_date",
            "tds_amount",
            "show_tds",
        ]
        read_only_fields = ["id", "receipt", "allocation_date"]

    def get_invoice_number(self, obj):
        return obj.invoice.invoice_number if obj.invoice else None

    def get_invoice_date(self, obj):
        return obj.invoice.issue_date if obj.invoice else None

    def get_invoice_total(self, obj):
        return obj.invoice.total_amount if obj.invoice else None

    def get_tds_amount(self, obj):
        """Get the total TDS amount for this invoice and receipt combination"""
        from django.db.models import Sum
        from receipts.models import TDSAdjustments

        if not obj.invoice or not obj.receipt:
            return None

        # Get the sum of all TDS adjustments for this invoice and receipt
        tds_sum = TDSAdjustments.objects.filter(
            invoice_id=obj.invoice.id,
            receipt_id=obj.receipt.id,
            status=TDSAdjustments.Status.APPLIED,
        ).aggregate(total=Sum("tds_amount"))["total"]

        return tds_sum or 0

    def get_show_tds(self, obj):
        """Check if this allocation has any TDS adjustments applied"""
        from receipts.models import TDSAdjustments

        if not obj.invoice or not obj.receipt:
            return False

        # Check if there are any TDS adjustments for this invoice and receipt
        tds_amount = self.get_tds_amount(obj)
        has_tds_records = TDSAdjustments.objects.filter(
            invoice_id=obj.invoice.id,
            receipt_id=obj.receipt.id,
            status=TDSAdjustments.Status.APPLIED,
        ).exists()

        # Return True if either there are TDS records or the TDS amount is greater than 0
        return has_tds_records or (tds_amount and tds_amount > 0)


# ==============================================================================
# 3. Receipt List Serializer
# ==============================================================================


class ReceiptListSerializer(serializers.ModelSerializer):
    """Serializer for listing Receipt records with essential information"""

    payment_method_name = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = [
            "id",
            "receipt_number",
            "receipt_date",
            "account_id",
            "account_name",
            "amount_received",
            "payment_method",
            "payment_method_name",
            "payment_status",
            "unallocated_amount",
            "created_at",
            "updated_at",
        ]

    def get_payment_method_name(self, obj):
        if obj.payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(id=obj.payment_method_id)
                return payment_method.name
            except PaymentMethod.DoesNotExist:
                return None
        return None


# ==============================================================================
# 4. Receipt Detail Serializer
# ==============================================================================


class ReceiptDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Receipt with allocations and payment method details"""

    payment_method_name = serializers.SerializerMethodField()
    allocations = ReceiptAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = Receipt
        fields = [
            "id",
            "receipt_number",
            "receipt_date",
            "account_id",
            "account_name",
            "amount_received",
            "payment_method",
            "payment_method_id",
            "payment_method_name",
            "reference_number",
            "notes",
            "payment_status",
            "unallocated_amount",
            "deposit_to_account_id",
            "source",
            "allocations",
            "created_at",
            "updated_at",
        ]

    def get_payment_method_name(self, obj):
        if obj.payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(id=obj.payment_method_id)
                return payment_method.name
            except PaymentMethod.DoesNotExist:
                return None
        return None


# ==============================================================================
# 5. Main Receipt Create Serializer
# ==============================================================================
# This is the primary serializer that will be used in your API view.
# It orchestrates the entire creation process.


class ReceiptCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Receipt and handling all related allocations
    and ledger entries within a single, atomic transaction.
    """

    # These fields accept simple IDs from the frontend payload.
    account_id = serializers.IntegerField(write_only=True)
    payment_method_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )

    # This field accepts the list of settlement objects from the frontend payload.
    invoice_settlements = InvoiceSettlementSerializer(
        many=True, write_only=True, required=False
    )

    class Meta:
        model = Receipt
        fields = [
            "id",
            "account_id",
            "receipt_date",
            "amount_received",
            "payment_method_id",
            "reference_number",
            "notes",
            "invoice_settlements",
            "account_name",  # This is now part of the payload
        ]
        read_only_fields = [
            "receipt_number",
            "payment_status",
            "unallocated_amount",
        ]

    def validate(self, data):
        """
        Perform high-level validation on the entire payload before attempting to create anything.
        """
        amount_received = data.get("amount_received")
        settlements = data.get("invoice_settlements", [])

        # Calculate the total cash being settled from the payload (exclude TDS)
        total_cash_settled = sum(
            s.get("amountSettled", Decimal("0.00")) for s in settlements
        )

        # Critical Validation: The total cash settled cannot exceed the amount received.
        if total_cash_settled > amount_received:
            raise serializers.ValidationError(
                f"The total cash settled amount ({total_cash_settled}) cannot exceed the amount received ({amount_received})."
            )

        # Validate that all provided invoice IDs exist, belong to the specified account, and are in a payable state.
        invoice_ids = [s["invoiceId"] for s in settlements]
        if invoice_ids:
            # Fetch all invoices in a single query for efficiency.
            invoices = Invoice.objects.filter(
                id__in=invoice_ids, account_id=data["account_id"]
            )
            if len(invoices) != len(
                set(invoice_ids)
            ):  # Use set() to handle duplicate invoiceIds in payload
                raise serializers.ValidationError(
                    "One or more invoice IDs are invalid or do not belong to the specified customer account."
                )

            # Store the fetched invoices in the serializer's context to avoid re-querying in the create method.
            self.context["invoices"] = {invoice.id: invoice for invoice in invoices}

        return data

    def create(self, validated_data):
        """
        Overrides the default create method to implement our complex business logic.
        The entire operation is wrapped in a database transaction for data integrity.
        """
        settlements = validated_data.pop("invoice_settlements", [])

        # --- Start Atomic Transaction ---
        with transaction.atomic():
            # 1. Calculate Unallocated Amount
            total_cash_settled = sum(
                s.get("amountSettled", Decimal("0.00")) for s in settlements
            )
            unallocated_amount = validated_data["amount_received"] - total_cash_settled

            # 2. Auto-generate the Receipt Number (NEW LOGIC)
            # This is a standard approach for generating sequential numbers for a financial year.
            today = timezone.now().date()
            current_financial_year = today.year if today.month >= 4 else today.year - 1
            start_of_fy = timezone.datetime(current_financial_year, 4, 1).date()

            last_receipt = (
                Receipt.objects.filter(receipt_date__gte=start_of_fy)
                .order_by("id")
                .last()
            )

            if last_receipt and last_receipt.receipt_number:
                last_seq = int(last_receipt.receipt_number.split("-")[-1])
                new_seq = last_seq + 1
            else:
                new_seq = 1

            # Format: R-25-26-00001
            new_receipt_number = f"R-{str(current_financial_year)[-2:]}-{str(current_financial_year + 1)[-2:]}-{new_seq:05d}"

            # 3. Create the main Receipt record
            # We explicitly map the _id fields to the actual model instance fields.
            receipt = Receipt.objects.create(
                account_id=validated_data["account_id"],
                account_name=validated_data["account_name"],
                receipt_date=validated_data["receipt_date"],
                amount_received=validated_data["amount_received"],
                payment_method_id=validated_data.get("payment_method_id"),
                reference_number=validated_data.get("reference_number"),
                notes=validated_data.get("notes"),
                unallocated_amount=unallocated_amount,
                receipt_number=new_receipt_number,
            )

            invoices_to_update = []

            # 4. Loop through settlements to create allocations and TDS adjustments
            for settlement in settlements:
                invoice_id = settlement["invoiceId"]
                invoice = self.context["invoices"][invoice_id]

                if settlement["amountSettled"] > 0:
                    ReceiptAllocation.objects.create(
                        receipt=receipt,
                        invoice=invoice,
                        amount_applied=settlement["amountSettled"],
                    )

                if settlement["isTdsApplied"] and settlement["tdsAmount"] > 0:
                    TDSAdjustments.objects.create(
                        account_id=receipt.account_id,
                        invoice=invoice,
                        receipt=receipt,
                        tds_amount=settlement["tdsAmount"],
                        status=TDSAdjustments.Status.APPLIED,
                    )

                invoices_to_update.append(invoice)

            # 5. Update Invoice Balances and Statuses
            for invoice in set(invoices_to_update):
                # Sum all related receipt allocations for this invoice
                total_allocations = invoice.allocations.aggregate(
                    total=models.Sum(
                        "amount_applied", output_field=models.DecimalField()
                    )
                )["total"] or Decimal("0.00")

                # Sum all related *applied* TDS adjustments for this invoice
                total_tds = invoice.tds_adjustments.filter(status="APPLIED").aggregate(
                    total=models.Sum("tds_amount", output_field=models.DecimalField())
                )["total"] or Decimal("0.00")

                # Calculate the total amount paid/settled
                total_paid = total_allocations + total_tds
                invoice.amount_paid = total_paid
                invoice.amount_due = invoice.total_amount - total_paid

                # Determine the new status based on the amounts
                if invoice.amount_paid >= invoice.total_amount:
                    invoice.payment_status = "PAID"
                elif invoice.amount_paid > 0:
                    invoice.payment_status = "PARTIALLY_PAID"
                else:
                    invoice.payment_status = "UNPAID"

                # Save the updated fields for the invoice
                invoice.save(
                    update_fields=["amount_paid", "amount_due", "payment_status"]
                )

            # 6. Create CreditLedger Entry for any unallocated funds
            if unallocated_amount > 0:
                last_balance = (
                    CreditLedger.objects.filter(account_id=receipt.account_id)
                    .order_by("-transaction_date")
                    .first()
                )
                new_running_balance = (
                    last_balance.running_balance if last_balance else Decimal("0.00")
                ) + unallocated_amount

                CreditLedger.objects.create(
                    account_id=receipt.account_id,
                    entry_type=CreditLedger.EntryType.CREDIT,
                    amount=unallocated_amount,
                    running_balance=new_running_balance,
                    description=f"Credit from overpayment on Receipt #{receipt.receipt_number}",
                    source_document_type="Receipt",
                    source_document_id=receipt.id,
                )

            # 7. AuditTrail Entry is handled by a post_save signal.

        # --- End Atomic Transaction ---

        return receipt


class ReceiptCorrectionSerializer(serializers.Serializer):
    """
    Serializer for "correcting" an existing Receipt. It validates a payload
    that looks like a new receipt creation, but orchestrates a reversal
    of the original receipt and the creation of a new, corrected one.
    """

    # The payload structure is kept almost identical to the create serializer
    # for frontend consistency.
    account_id = serializers.IntegerField(required=True)
    account_name = serializers.CharField(max_length=100, required=True)
    receipt_date = serializers.DateField(required=True)
    amount_received = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )
    payment_method_id = serializers.IntegerField(required=False, allow_null=True)
    reference_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    invoice_settlements = InvoiceSettlementSerializer(many=True, required=False)

    # These fields are auto-generated and should not come from frontend
    receipt_number = serializers.CharField(
        max_length=50, required=False, read_only=True
    )
    unallocated_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, read_only=True
    )

    # A new field to explain why the correction is being made.
    reason_for_correction = serializers.CharField(
        write_only=True, required=True, allow_blank=False
    )

    def validate(self, data):
        """
        Perform high-level validation on the correction payload.
        This is very similar to the create serializer's validation.
        """
        amount_received = data.get("amount_received")
        settlements = data.get("invoice_settlements", [])

        total_cash_settled = sum(
            s.get("amountSettled", Decimal("0.00")) for s in settlements
        )

        if total_cash_settled > amount_received:
            raise serializers.ValidationError(
                f"The total cash settled amount ({total_cash_settled}) cannot exceed the amount received ({amount_received})."
            )

        invoice_ids = [s["invoiceId"] for s in settlements]
        if invoice_ids:
            invoices = Invoice.objects.filter(
                id__in=invoice_ids, account_id=data["account_id"]
            )
            if len(invoices) != len(set(invoice_ids)):
                raise serializers.ValidationError(
                    "One or more invoice IDs are invalid or do not belong to the specified customer account."
                )
            self.context["invoices"] = {invoice.id: invoice for invoice in invoices}

        return data

    def create(self, validated_data):
        """
        This method doesn't create a standalone record. Instead, it orchestrates
        the entire correction workflow.
        """
        original_receipt = self.context["original_receipt"]
        settlements = validated_data.pop("invoice_settlements", [])
        print(original_receipt, "original_receipt")

        # --- Start Atomic Transaction ---
        with transaction.atomic():
            # ==================================================================
            # Step 1: Reverse the Original Receipt and its effects
            # ==================================================================

            # a. Create reversing allocation records for the original receipt
            original_allocations = original_receipt.allocations.all()
            invoices_to_update = {alloc.invoice for alloc in original_allocations}

            # Create a negative counterpart for each original allocation to reverse it.
            for alloc in original_allocations:
                ReceiptAllocation.objects.create(
                    receipt=alloc.receipt,
                    invoice=alloc.invoice,
                    amount_applied=-alloc.amount_applied,  # The reversing amount
                    allocation_date=timezone.now().date(),  # Use today's date for the reversal
                )

            # b. Reverse all TDS adjustments from the original receipt's settlements
            # This assumes TDS is tied to the settlement event, not the receipt itself.
            # A more robust system might link TDS adjustments to the receipt.
            # For now, we find TDS adjustments on the same invoices from the same date.
            TDSAdjustments.objects.filter(
                invoice__in=invoices_to_update,
                # adjustment_date=original_receipt.receipt_date,
                receipt=original_receipt,
            ).update(status=TDSAdjustments.Status.REVERSED)

            # c. Reverse the original credit ledger entry
            if original_receipt.unallocated_amount > 0:
                last_balance = (
                    CreditLedger.objects.filter(account_id=original_receipt.account_id)
                    .order_by("-transaction_date")
                    .first()
                )
                new_running_balance = (
                    last_balance.running_balance if last_balance else Decimal("0.00")
                ) - original_receipt.unallocated_amount

                CreditLedger.objects.create(
                    account_id=original_receipt.account_id,
                    entry_type=CreditLedger.EntryType.DEBIT,
                    amount=original_receipt.unallocated_amount,
                    running_balance=new_running_balance,
                    description=f"Reversal of credit from Receipt #{original_receipt.receipt_number}",
                    source_document_type="Receipt",
                    source_document_id=original_receipt.id,
                )

            # d. Mark the original receipt as reversed
            original_receipt.payment_status = Receipt.PaymentStatus.REVERSED
            original_receipt.notes = (
                (original_receipt.notes or "")
                + f"\nReversed on {timezone.now().date()}. Reason: {validated_data['reason_for_correction']}"
            )
            original_receipt.save()

            # ==================================================================
            # Step 2: Create the New, Corrected Receipt and its effects
            # This logic is nearly identical to the ReceiptCreateSerializer
            # ==================================================================

            # a. Calculate new unallocated amount
            total_cash_settled = sum(
                s.get("amountSettled", Decimal("0.00")) for s in settlements
            )
            unallocated_amount = validated_data["amount_received"] - total_cash_settled

            # b. Auto-generate a new receipt number
            # (Using the same logic from the create serializer)
            today = timezone.now().date()
            current_financial_year = today.year if today.month >= 4 else today.year - 1
            start_of_fy = timezone.datetime(current_financial_year, 4, 1).date()
            last_receipt = (
                Receipt.objects.filter(receipt_date__gte=start_of_fy)
                .order_by("id")
                .last()
            )
            new_seq = (
                (int(last_receipt.receipt_number.split("-")[-1]) + 1)
                if last_receipt and last_receipt.receipt_number
                else 1
            )
            new_receipt_number = f"R-{str(current_financial_year)[-2:]}-{str(current_financial_year + 1)[-2:]}-{new_seq:05d}"

            # c. Create the new receipt record, linking it to the original
            new_receipt = Receipt.objects.create(
                account_id=validated_data["account_id"],
                account_name=validated_data["account_name"],
                receipt_date=validated_data["receipt_date"],
                amount_received=validated_data["amount_received"],
                payment_method_id=validated_data.get("payment_method_id"),
                reference_number=validated_data.get("reference_number"),
                notes=validated_data.get("notes"),
                unallocated_amount=unallocated_amount,
                receipt_number=new_receipt_number,
                original_receipt=original_receipt,  # Link to the reversed receipt
            )

            # d. Create new allocations and TDS adjustments
            for settlement in settlements:
                invoice_id = settlement["invoiceId"]
                invoice = self.context["invoices"][invoice_id]
                if settlement["amountSettled"] > 0:
                    ReceiptAllocation.objects.create(
                        receipt=new_receipt,
                        invoice=invoice,
                        amount_applied=settlement["amountSettled"],
                    )
                if settlement["isTdsApplied"] and settlement["tdsAmount"] > 0:
                    TDSAdjustments.objects.create(
                        account_id=new_receipt.account_id,
                        invoice=invoice,
                        tds_amount=settlement["tdsAmount"],
                        status=TDSAdjustments.Status.APPLIED,
                        receipt=new_receipt,
                        adjustment_date=new_receipt.receipt_date,
                    )
                invoices_to_update.add(invoice)

            # e. Update all affected invoices (both old and new)
            for invoice in set(invoices_to_update):
                # Sum all related receipt allocations for this invoice
                total_allocations = invoice.allocations.aggregate(
                    total=models.Sum(
                        "amount_applied", output_field=models.DecimalField()
                    )
                )["total"] or Decimal("0.00")

                # Sum all related *applied* TDS adjustments for this invoice
                total_tds = invoice.tds_adjustments.filter(status="APPLIED").aggregate(
                    total=models.Sum("tds_amount", output_field=models.DecimalField())
                )["total"] or Decimal("0.00")

                # Calculate the total amount paid/settled
                total_paid = total_allocations + total_tds
                invoice.amount_paid = total_paid
                invoice.amount_due = invoice.total_amount - total_paid

                # Determine the new status based on the amounts
                if invoice.amount_paid >= invoice.total_amount:
                    invoice.payment_status = "PAID"
                elif invoice.amount_paid > 0:
                    invoice.payment_status = "PARTIALLY_PAID"
                else:
                    invoice.payment_status = "UNPAID"

                # Save the updated fields for the invoice
                invoice.save(
                    update_fields=["amount_paid", "amount_due", "payment_status"]
                )

            # f. Create new credit ledger entry if needed
            if unallocated_amount > 0:
                last_balance = (
                    CreditLedger.objects.filter(account_id=new_receipt.account_id)
                    .order_by("-transaction_date")
                    .first()
                )
                new_running_balance = (
                    last_balance.running_balance if last_balance else Decimal("0.00")
                ) + unallocated_amount
                CreditLedger.objects.create(
                    account_id=new_receipt.account_id,
                    entry_type=CreditLedger.EntryType.CREDIT,
                    amount=unallocated_amount,
                    running_balance=new_running_balance,
                    description=f"Credit from overpayment on Receipt #{new_receipt.receipt_number}",
                    source_document_type="Receipt",
                    source_document_id=new_receipt.id,
                )

            # g. Create a comprehensive AuditTrail entry for the correction
            # (This would be handled by a signal or a dedicated service)

        # --- End Atomic Transaction ---

        return new_receipt
