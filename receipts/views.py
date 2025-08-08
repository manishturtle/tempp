from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from decimal import Decimal

from .models import Receipt, ReceiptAllocation
from .serializers import (
    ReceiptCreateSerializer,
    ReceiptListSerializer,
    ReceiptDetailSerializer,
    ReceiptCorrectionSerializer,
)
from invoices.models import Invoice
from erp_backend.middleware import CustomJWTAuthentication


class ReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing receipts.

    Provides CRUD operations for receipts and additional actions for
    receipt-related operations.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["account", "payment_method", "payment_status", "receipt_date"]
    search_fields = ["receipt_number", "account_name", "reference_number", "notes"]
    ordering_fields = ["receipt_date", "amount_received", "created_at", "updated_at"]
    ordering = ["-receipt_date"]

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on the action.
        """
        if self.action == "list":
            return ReceiptListSerializer
        elif self.action == "retrieve":
            return ReceiptDetailSerializer
        elif self.action == "create":
            return ReceiptCreateSerializer
        return ReceiptListSerializer

    def get_queryset(self):
        """
        Return queryset filtered by client_id and optimized with select_related and prefetch_related.
        """
        client_id = getattr(self.request, "client_id", None)
        queryset = Receipt.objects.filter(client_id=client_id)

        # Optimize queries with select_related and prefetch_related
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("allocations__invoice")

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(created_by=user_id, updated_by=user_id)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        Cancel a receipt and reverse all allocations.

        This will:
        1. Set the receipt status to CANCELLED
        2. Reverse all allocations by updating invoice amount_paid and amount_due
        3. Reset unallocated_amount to 0
        """
        try:
            receipt = self.get_object()

            # Check if receipt is already cancelled
            if receipt.payment_status == Receipt.PaymentStatus.CANCELLED:
                return Response(
                    {"detail": "Receipt is already cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get all allocations for this receipt
            allocations = ReceiptAllocation.objects.filter(
                receipt=receipt
            ).select_related("invoice")

            # Process each allocation to reverse the payment
            for allocation in allocations:
                invoice = allocation.invoice

                # Reverse the payment amount
                invoice.amount_paid = (
                    invoice.amount_paid or Decimal("0.00")
                ) - allocation.amount_applied
                invoice.amount_due = (
                    invoice.amount_due or Decimal("0.00")
                ) + allocation.amount_applied

                # Update invoice payment status
                if invoice.amount_paid <= Decimal("0.00"):
                    invoice.payment_status = Invoice.PaymentStatus.UNPAID
                else:
                    invoice.payment_status = Invoice.PaymentStatus.PARTIALLY_PAID

                invoice.save()

            # Update receipt status
            receipt.payment_status = Receipt.PaymentStatus.CANCELLED
            receipt.unallocated_amount = Decimal("0.00")
            receipt.save()

            return Response(
                {"detail": "Receipt cancelled successfully."}, status=status.HTTP_200_OK
            )

        except Receipt.DoesNotExist:
            return Response(
                {"detail": "Receipt not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"])
    def correct(self, request, pk=None, tenant_slug=None):
        """
        Correct an existing receipt by reversing the original and creating a new one.

        This action:
        1. Reverses the original receipt and all its allocations
        2. Creates a new receipt with the corrected data
        3. Handles all related ledger entries and invoice updates

        Expected payload structure:
        {
            "account_id": 123,
            "account_name": "Customer Name",
            "receipt_date": "2024-01-15",
            "amount_received": "1000.00",
            "payment_method_id": 1,
            "reference_number": "REF123",
            "notes": "Corrected payment details",
            "reason_for_correction": "Incorrect amount entered",
            "invoice_settlements": [
                {
                    "invoiceId": 456,
                    "amountSettled": "800.00",
                    "isTdsApplied": false,
                    "tdsAmount": "0.00"
                }
            ]
        }
        """
        try:
            original_receipt = self.get_object()

            # Check if receipt can be corrected
            if original_receipt.payment_status in [
                Receipt.PaymentStatus.REVERSED,
                Receipt.PaymentStatus.CANCELLED,
            ]:
                return Response(
                    {
                        "detail": f"Cannot correct a receipt with status: {original_receipt.payment_status}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Initialize the serializer with the correction data
            serializer = ReceiptCorrectionSerializer(data=request.data)

            if serializer.is_valid():
                # Pass the original receipt in the context
                serializer.context["original_receipt"] = original_receipt

                # Create the corrected receipt
                corrected_receipt = serializer.save()

                # Return the corrected receipt data using ReceiptDetailSerializer
                response_serializer = ReceiptDetailSerializer(corrected_receipt)

                return Response(
                    {
                        "detail": "Receipt corrected successfully.",
                        "original_receipt_id": original_receipt.id,
                        "corrected_receipt": response_serializer.data,
                    },
                    status=status.HTTP_201_CREATED,
                )
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Receipt.DoesNotExist:
            return Response(
                {"detail": "Receipt not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"An error occurred while correcting the receipt: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def by_account(self, request):
        """
        Get receipts for a specific account.

        Query parameters:
        - account_id: ID of the account
        """
        account_id = request.query_params.get("account_id")

        if not account_id:
            return Response(
                {"detail": "account_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(request, "client_id", None)
        queryset = Receipt.objects.filter(
            account_id=account_id, client_id=client_id
        ).prefetch_related("allocations__invoice")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ReceiptListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ReceiptListSerializer(queryset, many=True)
        return Response(serializer.data)
