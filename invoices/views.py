# invoices/views.py
import logging
import datetime
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.conf import settings
from .models import Invoice
from .serializers import (
    AdminInvoiceSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    AdminInvoiceDetailSerializer,
    InvoiceListSerializer,
)
from erp_backend.middleware import CustomJWTAuthentication

# Set up logger
logger = logging.getLogger(__name__)


class AdminInvoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for admin users to view and manage invoices.

    This viewset provides operations for admin users to view all invoices
    with multi-tenant support based on the tenant slug extracted from JWT token.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == "list":
            return InvoiceListSerializer
        elif self.action == "retrieve":
            return AdminInvoiceDetailSerializer
        elif self.action == "create":
            return InvoiceCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return InvoiceUpdateSerializer
        return AdminInvoiceSerializer

    def get_serializer_context(self):
        """
        Add tenant information to serializer context.
        """
        context = super().get_serializer_context()
        context["auth_tenant_id"] = getattr(self.request, "client_id", None)
        context["tenant_slug"] = self.kwargs.get("tenant_slug")
        return context

    def get_queryset(self):
        """
        Return all invoices for the tenant identified in the URL.

        Returns:
            QuerySet: Filtered invoices for the current tenant
        """
        # Get tenant information from the URL
        tenant_slug = self.kwargs.get("tenant_slug")
        client_id = getattr(self.request, "client_id", 1)  # Fallback to 1 if not set

        logger.info(
            f"AdminInvoiceViewSet - get_queryset - client_id: {client_id}, tenant_slug: {tenant_slug}"
        )

        if not tenant_slug:
            logger.warning("AdminInvoiceViewSet - Missing tenant_slug in URL")
            return Invoice.objects.none()

        # Log the count of invoices for this client
        invoice_count = Invoice.objects.filter(client_id=client_id).count()
        logger.info(
            f"AdminInvoiceViewSet - Found {invoice_count} invoices for client_id: {client_id}"
        )

        # Get all invoices for this tenant
        queryset = (
            Invoice.objects.filter(client_id=client_id)
            .select_related("account", "contact", "billing_address", "shipping_address")
            .prefetch_related("items__taxes")
            .order_by("-issue_date", "-created_at")
        )

        # Log the SQL query for debugging
        logger.info(f"AdminInvoiceViewSet - SQL Query: {str(queryset.query)}")

        return queryset

    def perform_create(self, serializer):
        """
        Save invoice with tenant context.
        This is called by the create method after data has been validated.
        """
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(created_by=user_id, updated_by=user_id)

    def perform_update(self, serializer):
        """
        Update invoice with tenant context from JWT token.
        """
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(updated_by=user_id)

    @action(detail=False, methods=["get"], url_path="download-pdf")
    def download_pdf(self, request, tenant_slug=None):
        """
        Generate a signed URL for downloading invoice PDF.

        Query Parameters:
            invoice_id (int): ID of the invoice to download PDF for

        Returns:
            Response: JSON with signed_url for PDF download
        """
        # Get invoice_id from query parameters
        invoice_id = request.query_params.get("invoice_id")

        # Validate invoice_id
        if not invoice_id:
            return Response(
                {"error": "invoice_id is required as a query parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            invoice_id = int(invoice_id)
        except ValueError:
            return Response(
                {"error": "invoice_id must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get client_id from request
        client_id = getattr(request, "client_id", 1)  # Fallback to 1 if not set

        try:
            # Get the invoice record
            invoice = Invoice.objects.get(id=invoice_id, client_id=client_id)
        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if PDF exists
        if not invoice.invoice_url:  # invoice_url now stores the GCS object path
            return Response(
                {"detail": "No PDF available for this invoice."},
                status=status.HTTP_404_NOT_FOUND,
            )

        gcs_object_path = (
            invoice.invoice_url
        )  # This is the path like "invoices/client_.../...pdf"

        try:
            # Get GCS bucket name from settings
            bucket_name = settings.GS_BUCKET_NAME
            if not bucket_name:
                return Response(
                    {"error": "GCS_BUCKET_NAME not configured."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Import GCS client
            from invoices.tasks import storage_client

            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(gcs_object_path)

            if not blob.exists():
                return Response(
                    {"detail": "PDF file not found in storage."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Generate a signed URL, valid for 15 minutes
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(minutes=15),
                method="GET",
            )

            logger.info(
                f"Generated signed URL for invoice {invoice.invoice_number} PDF download"
            )

            return Response({"signed_url": signed_url})

        except ImportError:
            logger.error("GCS storage client not available")
            return Response(
                {"error": "Storage service not available."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(
                f"Error generating signed URL for invoice {invoice_id}: {str(e)}"
            )
            return Response(
                {"error": "Failed to generate download URL."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="get-unpaid-invoices")
    def get_unpaid_invoices(self, request, tenant_slug=None):
        """
        Get all unpaid invoices for a specific account with detailed information.

        Query Parameters:
            account_id (int): ID of the account to get unpaid invoices for

        Returns:
            Response: JSON with unpaid_amount and unpaid_invoices list with detailed information
        """
        # Get account_id from query parameters
        account_id = request.query_params.get("account_id")

        # Validate account_id
        if not account_id:
            return Response(
                {"error": "account_id is required as a query parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            account_id = int(account_id)
        except ValueError:
            return Response(
                {"error": "account_id must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(request, "client_id", 1)  # Fallback to 1 if not set

        # Get unpaid and overdue invoices for this account with related payment methods
        unpaid_invoices = Invoice.objects.filter(
            client_id=client_id,
            account_id=account_id,
            invoice_status="ISSUED",
            payment_status__in=["UNPAID", "OVERDUE", "PARTIALLY_PAID"],
        ).prefetch_related('invoice_payment_methods__payment_method')

        # Sum up the amount_due
        total_unpaid_amount = (
            unpaid_invoices.aggregate(total=models.Sum("amount_due"))["total"] or 0
        )

        # Prepare detailed invoice data
        invoice_data = []
        for invoice in unpaid_invoices:
            # Calculate amount_paid as the difference between total_amount and amount_due
            amount_paid = invoice.total_amount - invoice.amount_due
            
            # Get payment method IDs for this invoice
            payment_methods = [
                ipm.payment_method_id 
                for ipm in invoice.invoice_payment_methods.all()
            ]
            
            invoice_data.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "issue_date": invoice.issue_date,
                "due_date": invoice.due_date,
                "total_amount": invoice.total_amount,
                "amount_due": invoice.amount_due,
                "amount_paid": amount_paid,
                "payment_methods": payment_methods,
                "payment_status": invoice.payment_status
            })

        return Response({
            "unpaid_amount": total_unpaid_amount,
            "unpaid_invoices": invoice_data
        })
