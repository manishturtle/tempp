from rest_framework import serializers
from .models import (
    Invoice,
    InvoiceItem,
    InvoiceItemTax,
    InvoicePaymentMethod,
    InvoiceCounter,
)
from customers.models import OrderAddress, CustomerGroupSellingChannel
from products.models import Product
from pricing.models import TaxRate
from django.utils.translation import gettext_lazy as _
import logging
from django.db import transaction
from typing import Dict, Any, Optional
from payment_method.models import (
    PaymentMethod,
    PaymentMethodCustomerGroupSellingChannel,
)
from datetime import datetime

logger = logging.getLogger(__name__)


class BaseTenantModelSerializer(serializers.ModelSerializer):
    """Base serializer for tenant-aware models."""

    class Meta:
        abstract = True


class InvoiceItemTaxSerializer(BaseTenantModelSerializer):
    """
    Serializer for InvoiceItemTax model.
    """

    class Meta:
        model = InvoiceItemTax
        fields = [
            "id",
            "tax_id",
            "tax_code",
            "tax_rate",
            "tax_amount",
        ]
        read_only_fields = fields


class InvoiceItemTaxCreateSerializer(serializers.Serializer):
    """
    Serializer for creating InvoiceItemTax records within InvoiceItemCreateSerializer.
    """

    tax_id = serializers.IntegerField(required=True)
    tax_code = serializers.CharField(required=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=True)
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )


class InvoiceItemCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating InvoiceItem with extended fields and tax information.
    Used within the InvoiceCreateSerializer for handling invoice item creation with tax details.
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
    taxes = InvoiceItemTaxCreateSerializer(many=True, required=False)

    class Meta:
        model = InvoiceItem
        fields = [
            "product",
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
        ]

    def create(self, validated_data):
        """
        Create an InvoiceItem with the validated data,
        and handle tax information separately.
        """
        # Extract taxes data from validated_data if present
        taxes_data = validated_data.pop("taxes", [])

        # Create the invoice item
        invoice_item = InvoiceItem.objects.create(**validated_data)

        # Create tax records if tax information is provided
        for tax_data in taxes_data:
            tax_id = tax_data.get("tax_id")
            tax_code = tax_data.get("tax_code")
            tax_rate = tax_data.get("tax_rate")
            tax_amount = tax_data.get("tax_amount")

            try:
                tax_rate_obj = TaxRate.objects.get(id=tax_id)
                InvoiceItemTax.objects.create(
                    invoice_item=invoice_item,
                    tax=tax_rate_obj,
                    tax_code=tax_code,
                    tax_rate=tax_rate,
                    tax_amount=tax_amount,
                )
            except TaxRate.DoesNotExist:
                logger.error(
                    f"Tax rate with ID {tax_id} not found when creating invoice item tax"
                )
                # Still create the tax record with the provided values
                InvoiceItemTax.objects.create(
                    invoice_item=invoice_item,
                    tax_id=tax_id,
                    tax_code=tax_code,
                    tax_rate=tax_rate,
                    tax_amount=tax_amount,
                )

        return invoice_item


class InvoiceAddressSerializer(BaseTenantModelSerializer):
    """
    Serializer for OrderAddress model within invoice context.
    """

    class Meta:
        model = OrderAddress
        fields = [
            "id",
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
        ]
        read_only_fields = fields


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new invoices with all the extended fields.
    Handles nested invoice items with tax information, address details,
    and additional JSON fields for invoice-specific data.
    """

    account_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    contact_person_name = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    issue_date = serializers.DateField(required=False)
    billing_address = serializers.JSONField(required=False, write_only=True)
    shipping_address = serializers.JSONField(required=False, write_only=True)
    recipient_details = serializers.JSONField(required=False)
    pickup_details = serializers.JSONField(required=False)
    items = InvoiceItemCreateSerializer(many=True)
    customer_group_id = serializers.IntegerField(required=False, write_only=True)
    invoice_number = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    rounding_sign = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    rounded_delta = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    def _generate_invoice_number(self, invoice_config, validated_data, auth_tenant_id):
        """
        Generate an invoice number based on configuration settings, using a dedicated
        counter table for performance and concurrency safety.
        """
        config_values = invoice_config.get("config_values", [])

        # Extract configuration values into a dictionary for easy access
        config_dict = {
            config.get("setting_def_name"): config.get("configured_value")
            for config in config_values
        }

        # Get numbering type
        num_type = config_dict.get("NUM_TYPE", "MANUAL")
        print(f"Numbering Type: {num_type}")

        if num_type == "MANUAL":
            # Check if invoice_number already exists
            invoice_number = validated_data.get("invoice_number")
            if not invoice_number:
                raise serializers.ValidationError(
                    "Invoice number is required for manual numbering."
                )

            # Check for duplicate invoice number
            existing_invoice = Invoice.objects.filter(
                client_id=auth_tenant_id, invoice_number=invoice_number
            ).exists()

            if existing_invoice:
                raise serializers.ValidationError(
                    f"Invoice number '{invoice_number}' already exists. Please use a different number."
                )

            print(f"Manual Invoice Number Validated: {invoice_number}")
            return invoice_number

        elif num_type == "AUTOMATIC":
            # --- NEW: Get the sequence number from the counter table ---
            config_assignment_id = invoice_config.get("id")
            if not config_assignment_id:
                raise serializers.ValidationError(
                    "Invoice configuration response from API is missing the root 'id'."
                )

            renumber_freq = config_dict.get("NUM_RENUMBER_FREQUENCY", "NEVER_RESET")
            starting_value = int(config_dict.get("NUM_STARTING_VALUE", "1"))

            # Determine the key for the reset period (e.g., '2025' or 'all_time')
            if renumber_freq == "YEARLY":
                reset_key = str(datetime.now().year)
            else:  # NEVER_RESET
                reset_key = "all_time"

            next_sequence = 0
            try:
                with transaction.atomic():
                    # Lock the counter row to prevent race conditions.
                    # Get or create the counter for this specific config/client/period.
                    (
                        counter,
                        created,
                    ) = InvoiceCounter.objects.select_for_update().get_or_create(
                        config_assignment_id=config_assignment_id,
                        client_id=auth_tenant_id,
                        reset_period_key=reset_key,
                        # Set the initial value if the counter is new.
                        # We set it to `starting_value - 1` so the first increment brings it to `starting_value`.
                        defaults={"last_sequence": starting_value - 1},
                    )

                    # If the counter was just created, the first number is the starting_value.
                    if created:
                        next_sequence = starting_value
                        counter.last_sequence = starting_value
                        print(
                            f"New counter created for '{reset_key}'. Starting sequence: {next_sequence}"
                        )
                    else:
                        # If the counter already exists, increment its sequence.
                        # This also handles the case where an admin increases the starting_value
                        # after invoices have already been generated.
                        if counter.last_sequence < starting_value:
                            next_sequence = starting_value
                            counter.last_sequence = starting_value
                        else:
                            counter.last_sequence += 1
                            next_sequence = counter.last_sequence
                        print(
                            f"Existing counter found for '{reset_key}'. Next sequence: {next_sequence}"
                        )

                    counter.save()

            except Exception as e:
                logger.error(
                    f"FATAL: Could not generate sequence number from counter table: {e}"
                )
                raise serializers.ValidationError(
                    "Failed to generate a unique invoice number. Please try again."
                )

            # --- FORMATTING: This logic remains the same as your original code ---
            # It now uses the safe `next_sequence` variable instead of a calculated one.

            # Get configuration values for formatting
            embed_year_pos = config_dict.get("NUM_EMBED_YEAR_POSITION", "NOT_REQUIRED")
            separator = config_dict.get("NUM_SEPARATOR", "")
            year_format = config_dict.get("NUM_YEAR_EMBEDDING_FORMAT", "YYYY")
            prefix = config_dict.get("NUM_PREFIX", "")
            suffix = config_dict.get("NUM_SUFFIX_VALUE", "")
            min_seq_length = int(config_dict.get("NUM_MIN_SEQUENCE_LENGTH", "1"))

            # Format sequence number with minimum length (zero-padding)
            sequence_str = str(next_sequence).zfill(min_seq_length)
            print(f"Formatted sequence: {sequence_str}")

            # Build year component if required
            year_component = ""
            if embed_year_pos != "NOT_REQUIRED":
                current_year = datetime.now().year
                if year_format == "YY-YY":
                    year_component = f"{str(current_year)[2:]}-{str(current_year)[2:]}"
                elif year_format == "YYYY-YY":
                    year_component = f"{current_year}-{str(current_year)[2:]}"
                else:  # YYYY
                    year_component = str(current_year)
                print(f"Year component: {year_component}")

            # Build the complete invoice number by assembling the parts
            invoice_parts = []

            # 1. Add main prefix (e.g., "INV")
            if prefix:
                invoice_parts.append(prefix)

            # 2. Add year as a prefix if required
            if embed_year_pos == "AS_PREFIX" and year_component:
                invoice_parts.append(year_component)

            # 3. Add the sequence number
            invoice_parts.append(sequence_str)

            # 4. Add year as a suffix if required
            if embed_year_pos == "AS_SUFFIX" and year_component:
                invoice_parts.append(year_component)

            # 5. Add main suffix (e.g., "FIN")
            if suffix:
                invoice_parts.append(suffix)

            # Join the parts with the specified separator
            # Note: We filter out empty parts to avoid leading/trailing/double separators
            # if a prefix/suffix is not defined.
            final_invoice_number = separator.join(filter(None, invoice_parts))

            print(f"Final Generated Invoice Number: {final_invoice_number}")
            return final_invoice_number

        else:
            logger.warning(f"Unknown numbering type: {num_type}")
            # Depending on your business logic, you might want to raise an error here
            # or return None and handle it in the `create` method.
            raise serializers.ValidationError(
                f"Invalid numbering type '{num_type}' received from configuration."
            )

    class Meta:
        model = Invoice
        fields = [
            "account",
            "account_name",
            "contact",
            "contact_person_name",
            "invoice_number",
            "reference_number",
            "place_of_supply",
            "gst_treatment",
            "template_id",
            "issue_date",
            "payment_terms",
            "payment_terms_label",
            "due_date",
            "subtotal_amount",
            "discount_type",
            "discount_percentage",
            "discount_amount",
            "currency",
            "is_discount_before_tax",
            "is_inclusive_tax",
            "tax_amount",
            "total_amount",
            "allow_partial_payments",
            "notes",
            "terms",
            "invoice_status",
            "invoice_type",
            "payment_status",
            "invoice_url",
            "recipient_details",
            "billing_address",
            "same_as_shipping",
            "shipping_address",
            "amount_paid",
            "amount_due",
            "is_reverse_charge_applicable",
            "irn",
            "ack_no",
            "signed_qr_code",
            "storepickup",
            "pickup_details",
            "items",
            "selling_channel",
            "responsible_person",
            "fulfillment_type",
            "customer_group_id",
            "config_snapshot",
            "rounded_delta",
            "rounding_sign",
        ]

    @transaction.atomic
    def create(self, validated_data):
        """
        Create an invoice with nested items and handle all related data.
        Uses transactions to ensure data consistency.
        """
        # Extract nested data
        items_data = validated_data.pop("items", [])
        billing_address_data = validated_data.pop("billing_address", {})
        shipping_address_data = validated_data.pop("shipping_address", {})
        rounding_sign = validated_data.pop("rounding_sign", None)
        rounded_delta = validated_data.pop("rounded_delta", None)

        customer_group_id = validated_data.pop("customer_group_id", None)
        selling_channel_id = validated_data.get("selling_channel")

        # Get auth_tenant_id from the view context (set by tenant middleware)
        auth_tenant_id = self.context.get("auth_tenant_id")
        if not auth_tenant_id:
            raise serializers.ValidationError("Tenant information is required.")

        segment_id = None
        customer_group_selling_channel = None
        if customer_group_id and selling_channel_id:
            try:
                customer_group_selling_channel = (
                    CustomerGroupSellingChannel.objects.get(
                        customer_group_id=customer_group_id,
                        selling_channel_id=selling_channel_id,
                    )
                )
                segment_id = customer_group_selling_channel.id
            except CustomerGroupSellingChannel.DoesNotExist:
                logger.warning(
                    f"No CustomerGroupSellingChannel found for customer_group_id={customer_group_id}, "
                    f"selling_channel_id={selling_channel_id}"
                )

        if segment_id:
            # After the segment_id check
            tenant_slug = self.context.get("tenant_slug")
            if not tenant_slug:
                logger.warning(
                    "Missing tenant_slug in context, cannot fetch invoice config"
                )
            else:
                # Map invoice_type to API parameter 'type'
                invoice_type_mapping = {
                    "STANDARD": "Standard",
                    "PROFORMA": "Proforma",
                    "SALES_RECEIPT": "Sales Receipt",
                    "RECURRING": "Recurring",
                }

                # Get the invoice type from validated data
                invoice_type = validated_data.get("invoice_type", "STANDARD")
                name_param = invoice_type_mapping.get(invoice_type, "Standard")

                # Get JWT token from request
                request = self.context.get("request")
                auth_token = None
                if request and hasattr(request, "META"):
                    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
                    if auth_header.startswith("Bearer "):
                        auth_token = auth_header[7:]  # Remove "Bearer " prefix

                if not auth_token:
                    logger.warning(
                        "No authentication token found, cannot fetch invoice config"
                    )
                else:
                    try:
                        from erp_backend.settings import TENANT_URL
                        import requests

                        # Construct the URL
                        url = f"{TENANT_URL}/{tenant_slug}/invoice-config/"

                        # Set up headers
                        headers = {
                            "Authorization": f"Bearer {auth_token}",
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        }

                        # Set up parameters
                        params = {
                            "type": "Invoice",
                            "name": name_param,
                            "segment_id": segment_id,
                        }

                        # Make the API call
                        response = requests.get(url, headers=headers, params=params)
                        print(response.json())
                        if response.status_code == 200:
                            invoice_config = response.json()
                            validated_data["config_snapshot"] = invoice_config
                            print(invoice_config)
                            # Process invoice number generation based on config
                            try:
                                invoice_number = self._generate_invoice_number(
                                    invoice_config, validated_data, auth_tenant_id
                                )
                                if invoice_number:
                                    validated_data["invoice_number"] = invoice_number
                                    logger.info(
                                        f"Generated invoice number: {invoice_number}"
                                    )
                            except serializers.ValidationError:
                                raise  # Re-raise validation errors
                            except Exception as e:
                                logger.error(
                                    f"Error generating invoice number: {str(e)}"
                                )

                        else:
                            logger.warning(
                                f"Failed to fetch invoice config: {response.status_code}"
                            )

                    except Exception as e:
                        logger.error(f"Error fetching invoice config: {str(e)}")

        invoice = Invoice.objects.create(client_id=auth_tenant_id, **validated_data)

        # Create invoice payment method relationships based on customer group and selling channel
        if customer_group_selling_channel:
            try:
                payment_method_relationships = (
                    PaymentMethodCustomerGroupSellingChannel.objects.filter(
                        customer_group_selling_channel=customer_group_selling_channel,
                        is_active=True,
                    ).select_related("payment_method")
                )

                payment_methods = [
                    rel.payment_method for rel in payment_method_relationships
                ]

                payment_method_ids = [pm.id for pm in payment_methods]

                if payment_method_ids:
                    for payment_method_id in payment_method_ids:
                        try:
                            payment_method = PaymentMethod.objects.get(
                                id=payment_method_id
                            )
                            InvoicePaymentMethod.objects.create(
                                invoice=invoice,
                                payment_method=payment_method,
                                client_id=auth_tenant_id,
                            )
                        except PaymentMethod.DoesNotExist:
                            continue
            except CustomerGroupSellingChannel.DoesNotExist:
                pass  # No payment methods will be created if the relationship doesn't exist

        # Helper function to filter address data for InvoiceAddress model
        def filter_invoice_address_data(address_data, address_type):
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

        # Create billing address if provided
        if billing_address_data:
            billing_id = billing_address_data.pop("id", None)
            filtered_billing_data = filter_invoice_address_data(
                billing_address_data, "BILLING"
            )

            if billing_id:
                try:
                    billing_address_obj = OrderAddress.objects.get(
                        id=billing_id, client_id=auth_tenant_id
                    )
                    for field, value in filtered_billing_data.items():
                        setattr(billing_address_obj, field, value)
                    billing_address_obj.save()
                except OrderAddress.DoesNotExist:
                    billing_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        **filtered_billing_data,
                    )
            else:
                billing_address_obj = OrderAddress.objects.create(
                    client_id=auth_tenant_id,
                    **filtered_billing_data,
                )

            invoice.billing_address = billing_address_obj

        # Create shipping address if provided
        if shipping_address_data:
            shipping_id = shipping_address_data.pop("id", None)
            filtered_shipping_data = filter_invoice_address_data(
                shipping_address_data, "SHIPPING"
            )

            if shipping_id:
                try:
                    shipping_address_obj = OrderAddress.objects.get(
                        id=shipping_id, client_id=auth_tenant_id
                    )
                    for field, value in filtered_shipping_data.items():
                        setattr(shipping_address_obj, field, value)
                    shipping_address_obj.save()
                except OrderAddress.DoesNotExist:
                    shipping_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        **filtered_shipping_data,
                    )
            else:
                shipping_address_obj = OrderAddress.objects.create(
                    client_id=auth_tenant_id,
                    **filtered_shipping_data,
                )

            invoice.shipping_address = shipping_address_obj

        # # Create invoice items
        for item_data in items_data:
            item_data["invoice"] = invoice
            item_data["client_id"] = auth_tenant_id
            InvoiceItemCreateSerializer().create(item_data)

        # Calculate total_amount from items and set amount_due equal to total_amount
        invoice.refresh_from_db()
        if invoice.total_amount is not None:
            invoice.amount_due = invoice.total_amount

        # Save invoice with addresses and updated amount_due
        invoice.save()

        # Generate PDF from HTML template and upload to GCS if invoice_config is available
        if "config_snapshot" in validated_data and validated_data["config_snapshot"]:
            try:
                invoice_config = validated_data["config_snapshot"]
                template_code = invoice_config.get("template_code")

                if template_code:
                    # Generate PDF from HTML template and upload to GCS in background
                    if invoice_config:
                        from invoices.tasks import generate_and_upload_invoice_pdf

                        # Start background task for PDF generation
                        task = generate_and_upload_invoice_pdf.delay(
                            invoice_id=invoice.id,
                            auth_tenant_id=auth_tenant_id,
                            invoice_config=invoice_config,
                            rounding_sign=rounding_sign,
                            rounded_delta=rounded_delta,
                            contact_id=validated_data.get("contact_id"),
                        )

                        logger.info(
                            f"Started background PDF generation task {task.id} for invoice {invoice.invoice_number}"
                        )

            except Exception as e:
                logger.error(
                    f"Error starting PDF generation task for invoice {invoice.invoice_number}: {str(e)}"
                )

        return invoice


class AdminInvoiceItemSerializer(BaseTenantModelSerializer):
    """
    Serializer for InvoiceItem model in admin context.

    This serializer is specifically designed for admin views and includes
    enhanced product details while maintaining proper tenant isolation.
    It also includes tax information and discount details.
    """

    image_url = serializers.SerializerMethodField(read_only=True)
    taxes = InvoiceItemTaxSerializer(many=True, read_only=True)

    def get_tenant_slug(self):
        """
        Get tenant slug from serializer context, request context or URL kwargs.

        Returns:
            str: The tenant slug or None if not found
        """
        # Try to get from serializer context first
        if hasattr(self, "context") and "tenant_slug" in self.context:
            return self.context["tenant_slug"]

        # Try to get from request context
        request = getattr(self, "context", {}).get("request")
        if request and hasattr(request, "tenant_slug"):
            return request.tenant_slug

        # Try to get from request resolver match (URL kwargs)
        if request and hasattr(request, "resolver_match"):
            resolver_match = request.resolver_match
            if resolver_match and "tenant_slug" in resolver_match.kwargs:
                return resolver_match.kwargs["tenant_slug"]

        return None

    def get_image_url(self, obj):
        """
        Get product image URL from product details.

        Args:
            obj: The InvoiceItem instance

        Returns:
            str: Image URL or None if not found
        """
        if not obj.product:
            return None

        # For now, return None as product image integration would require
        # product service integration similar to order management
        return None

    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "product",
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


class InvoiceItemSerializer(BaseTenantModelSerializer):
    """
    Serializer for InvoiceItem model.
    """

    image_url = serializers.SerializerMethodField(read_only=True)
    taxes = InvoiceItemTaxSerializer(many=True, read_only=True)

    def get_image_url(self, obj):
        """
        Get product image URL from product service.

        Args:
            obj: The InvoiceItem instance

        Returns:
            The image URL string or None if not found
        """
        if not obj.product:
            return None

        # For now, return None as product image integration would require
        # product service integration similar to order management
        return None

    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "product",
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
        ]
        read_only_fields = fields


class InvoiceListSerializer(BaseTenantModelSerializer):
    """
    Serializer for Invoice list view in API responses.

    This serializer provides a simplified view of invoices for list endpoints,
    including the essential fields needed for invoice listings and
    a simplified view of invoice items.

    Features:
    - Includes core invoice identifiers and status information
    - Provides financial summary (total amount, currency)
    - Includes timestamps for tracking
    - Includes a simplified view of invoice items
    - All fields are read-only to prevent modification through this serializer

    For admin views, this includes additional fields like account_id and payment_status.

    """

    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "reference_number",
            "account",
            "account_name",
            "contact",
            "contact_person_name",
            "issue_date",
            "due_date",
            "subtotal_amount",
            "tax_amount",
            "total_amount",
            "currency",
            "invoice_status",
            "invoice_type",
            "payment_status",
            "amount_paid",
            "amount_due",
            "recipient_details",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminInvoiceDetailSerializer(BaseTenantModelSerializer):
    """
    Admin-specific serializer for Invoice detail view in API responses.

    Features:
    - Includes all standard invoice fields
    - Uses AdminInvoiceItemSerializer for rich product details
    - Includes admin-specific fields and metadata
    - Properly handles tenant isolation
    - Includes audit fields and timestamps
    - Includes discount level and type information
    - Supports item-level taxes and discounts
    - Properly handles OrderAddress foreign key relationships
    """

    items = AdminInvoiceItemSerializer(many=True, read_only=True)
    customer_details = serializers.SerializerMethodField(read_only=True)
    billing_address = InvoiceAddressSerializer(read_only=True)
    shipping_address = InvoiceAddressSerializer(read_only=True)
    payment_methods = serializers.SerializerMethodField(read_only=True)

    def get_customer_details(self, obj):
        """
        Get customer details including contact information.

        Args:
            obj: The Invoice instance or OrderedDict

        Returns:
            dict: Customer details or None if not available
        """
        if not obj.account:
            return None

        customer_data = {
            "account_id": obj.account.id,
            "account_name": obj.account.name,
            "account_number": getattr(obj.account, "account_number", None),
            "email": getattr(obj.account, "email", None),
            "phone": getattr(obj.account, "phone", None),
            "customer_group_id": getattr(obj.account, "customer_group_id", None),
        }

        # Add contact information if available
        if obj.contact:
            customer_data.update(
                {
                    "contact_id": obj.contact.id,
                    "contact_first_name": obj.contact.first_name,
                    "contact_last_name": obj.contact.last_name,
                    "contact_email": getattr(obj.contact, "email", None),
                    "contact_phone": getattr(obj.contact, "phone", None),
                }
            )

        return customer_data

    def get_payment_methods(self, obj):
        """
        Get list of payment method IDs associated with this invoice.

        Args:
            obj: The Invoice instance

        Returns:
            list: List of payment method IDs
        """
        from invoices.models import InvoicePaymentMethod

        payment_methods = InvoicePaymentMethod.objects.filter(invoice=obj).values_list(
            "payment_method_id", flat=True
        )

        return list(payment_methods)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [
            "id",
            "subtotal_amount",
            "tax_amount",
            "total_amount",
            "amount_due",
            "created_at",
            "updated_at",
        ]


class InvoiceItemTaxUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating InvoiceItemTax records within InvoiceItemUpdateSerializer.
    """

    id = serializers.IntegerField(required=False)
    tax_id = serializers.IntegerField(required=True)
    tax_code = serializers.CharField(required=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=True)
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )


class InvoiceItemUpdateSerializer(InvoiceItemCreateSerializer):
    """
    Serializer for updating InvoiceItems with support for both creating and updating
    related tax information.

    This serializer extends InvoiceItemCreateSerializer but adds ID field support
    for updating existing items and their taxes.
    """

    id = serializers.IntegerField(required=False)
    taxes = InvoiceItemTaxUpdateSerializer(many=True, required=False)

    class Meta(InvoiceItemCreateSerializer.Meta):
        fields = ["id"] + InvoiceItemCreateSerializer.Meta.fields

    def create(self, validated_data):
        """
        Create or update an InvoiceItem with the validated data,
        and handle tax information separately.
        """
        # Extract taxes data from validated_data if present
        taxes_data = validated_data.pop("taxes", [])

        # Create the invoice item
        invoice_item = InvoiceItem.objects.create(**validated_data)

        # Handle tax records
        for tax_data in taxes_data:
            tax_id = tax_data.get("tax_id")
            tax_code = tax_data.get("tax_code")
            tax_rate = tax_data.get("tax_rate")
            tax_amount = tax_data.get("tax_amount")
            item_tax_id = tax_data.get("id")

            try:
                tax_rate_obj = TaxRate.objects.get(id=tax_id)

                if item_tax_id:
                    # Update existing tax record
                    try:
                        tax_obj = InvoiceItemTax.objects.get(id=item_tax_id)
                        tax_obj.tax = tax_rate_obj
                        tax_obj.tax_code = tax_code
                        tax_obj.tax_rate = tax_rate
                        tax_obj.tax_amount = tax_amount
                        tax_obj.save()
                    except InvoiceItemTax.DoesNotExist:
                        # Create new tax record if not found
                        InvoiceItemTax.objects.create(
                            invoice_item=invoice_item,
                            tax=tax_rate_obj,
                            tax_code=tax_code,
                            tax_rate=tax_rate,
                            tax_amount=tax_amount,
                        )
                else:
                    # Create new tax record
                    InvoiceItemTax.objects.create(
                        invoice_item=invoice_item,
                        tax=tax_rate_obj,
                        tax_code=tax_code,
                        tax_rate=tax_rate,
                        tax_amount=tax_amount,
                    )
            except TaxRate.DoesNotExist:
                logger.error(
                    f"Tax rate with ID {tax_id} not found when creating/updating invoice item tax"
                )
                # Still create the tax record with the provided values
                InvoiceItemTax.objects.create(
                    invoice_item=invoice_item,
                    tax_id=tax_id,
                    tax_code=tax_code,
                    tax_rate=tax_rate,
                    tax_amount=tax_amount,
                )

        return invoice_item


class InvoiceUpdateSerializer(InvoiceCreateSerializer):
    """
    Serializer for updating invoices with all related data.

    This serializer extends InvoiceCreateSerializer but provides logic for updating
    existing invoice items, addresses, and tax information instead of always creating new ones.
    """

    id = serializers.IntegerField(required=False, read_only=True)
    items = InvoiceItemUpdateSerializer(many=True)

    class Meta(InvoiceCreateSerializer.Meta):
        fields = ["id"] + InvoiceCreateSerializer.Meta.fields

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update an invoice with nested items and handle all related data.
        If related objects have IDs, update them rather than create new ones.
        Uses transactions to ensure data consistency.
        """
        # Extract nested data
        items_data = validated_data.pop("items", [])
        billing_address_data = validated_data.pop("billing_address", {})
        shipping_address_data = validated_data.pop("shipping_address", {})

        # Get auth_tenant_id from the view context
        auth_tenant_id = self.context.get("auth_tenant_id")
        if not auth_tenant_id:
            raise serializers.ValidationError("Tenant information is required.")

        # Helper function to filter address data
        def filter_invoice_address_data(address_data, address_type):
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

        # Update billing address if provided
        if billing_address_data:
            billing_id = billing_address_data.pop("id", None)
            filtered_billing_data = filter_invoice_address_data(
                billing_address_data, "BILLING"
            )

            if billing_id:
                try:
                    billing_address_obj = OrderAddress.objects.get(
                        id=billing_id, client_id=auth_tenant_id
                    )
                    for field, value in filtered_billing_data.items():
                        setattr(billing_address_obj, field, value)
                    billing_address_obj.save()
                except OrderAddress.DoesNotExist:
                    billing_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        **filtered_billing_data,
                    )
            else:
                billing_address_obj = OrderAddress.objects.create(
                    client_id=auth_tenant_id,
                    **filtered_billing_data,
                )

            instance.billing_address = billing_address_obj

        # Update shipping address if provided
        if shipping_address_data:
            shipping_id = shipping_address_data.pop("id", None)
            filtered_shipping_data = filter_invoice_address_data(
                shipping_address_data, "SHIPPING"
            )

            if shipping_id:
                try:
                    shipping_address_obj = OrderAddress.objects.get(
                        id=shipping_id, client_id=auth_tenant_id
                    )
                    for field, value in filtered_shipping_data.items():
                        setattr(shipping_address_obj, field, value)
                    shipping_address_obj.save()
                except OrderAddress.DoesNotExist:
                    shipping_address_obj = OrderAddress.objects.create(
                        client_id=auth_tenant_id,
                        **filtered_shipping_data,
                    )
            else:
                shipping_address_obj = OrderAddress.objects.create(
                    client_id=auth_tenant_id,
                    **filtered_shipping_data,
                )

            instance.shipping_address = shipping_address_obj

        # Handle invoice items
        existing_item_ids = []
        for item_data in items_data:
            item_id = item_data.get("id")
            item_data["invoice"] = instance
            item_data["client_id"] = auth_tenant_id

            if item_id:
                # Update existing item
                try:
                    existing_item = InvoiceItem.objects.get(
                        id=item_id, invoice=instance, client_id=auth_tenant_id
                    )
                    existing_item_ids.append(item_id)

                    # Extract and handle taxes separately
                    taxes_data = item_data.pop("taxes", [])

                    # Update item fields
                    for field, value in item_data.items():
                        if field not in ["invoice", "client_id"]:
                            setattr(existing_item, field, value)
                    existing_item.save()

                    # Handle taxes for existing item
                    existing_tax_ids = []
                    for tax_data in taxes_data:
                        tax_item_id = tax_data.get("id")
                        tax_id = tax_data.get("tax_id")
                        tax_code = tax_data.get("tax_code")
                        tax_rate = tax_data.get("tax_rate")
                        tax_amount = tax_data.get("tax_amount")

                        if tax_item_id:
                            # Update existing tax
                            try:
                                existing_tax = InvoiceItemTax.objects.get(
                                    id=tax_item_id, invoice_item=existing_item
                                )
                                existing_tax_ids.append(tax_item_id)
                                existing_tax.tax_id = tax_id
                                existing_tax.tax_code = tax_code
                                existing_tax.tax_rate = tax_rate
                                existing_tax.tax_amount = tax_amount
                                existing_tax.save()
                            except InvoiceItemTax.DoesNotExist:
                                # Create new tax if not found
                                InvoiceItemTax.objects.create(
                                    invoice_item=existing_item,
                                    tax_id=tax_id,
                                    tax_code=tax_code,
                                    tax_rate=tax_rate,
                                    tax_amount=tax_amount,
                                )
                        else:
                            # Create new tax
                            InvoiceItemTax.objects.create(
                                invoice_item=existing_item,
                                tax_id=tax_id,
                                tax_code=tax_code,
                                tax_rate=tax_rate,
                                tax_amount=tax_amount,
                            )

                    # Delete taxes not in the update
                    InvoiceItemTax.objects.filter(invoice_item=existing_item).exclude(
                        id__in=existing_tax_ids
                    ).delete()

                except InvoiceItem.DoesNotExist:
                    item_data.pop("id", None)
                    new_item = InvoiceItemUpdateSerializer().create(item_data)
                    existing_item_ids.append(new_item.id)
            else:
                new_item = InvoiceItemUpdateSerializer().create(item_data)
                existing_item_ids.append(new_item.id)

        # Delete items not in the update
        InvoiceItem.objects.filter(invoice=instance, client_id=auth_tenant_id).exclude(
            id__in=existing_item_ids
        ).delete()

        # Update invoice fields
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class AdminInvoiceSerializer(serializers.ModelSerializer):
    """
    Extended invoice serializer for admin users with additional details.
    Includes more comprehensive account and contact information.
    Replaces the old AdminInvoiceSerializer for AdminInvoiceViewSet.
    """

    items = AdminInvoiceItemSerializer(many=True, read_only=True)
    tenant_slug = serializers.SerializerMethodField(read_only=True)
    account_detail = serializers.SerializerMethodField(read_only=True)
    contact_detail = serializers.SerializerMethodField(read_only=True)
    billing_address = InvoiceAddressSerializer(read_only=True)
    shipping_address = InvoiceAddressSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [
            "id",
            "subtotal_amount",
            "tax_amount",
            "total_amount",
            "amount_due",
            "created_at",
            "updated_at",
        ]

    def get_tenant_slug(self, obj) -> Optional[str]:
        """
        Get the tenant slug from the request context.

        Returns:
            str: The tenant slug or None if not available
        """
        request = self.context.get("request")
        if request:
            return getattr(request, "tenant_slug", None)
        return None

    def get_account_detail(self, obj) -> Optional[Dict[str, Any]]:
        """
        Get detailed account information including additional fields.

        Returns:
            dict: Comprehensive account details or None if not available
        """
        if not obj.account:
            return None

        return {
            "id": obj.account.id,
            "name": obj.account.name,
            "account_number": getattr(obj.account, "account_number", None),
            "email": getattr(obj.account, "email", None),
            "phone": getattr(obj.account, "phone", None),
            "account_type": getattr(obj.account, "account_type", None),
            "status": getattr(obj.account, "status", None),
        }

    def get_contact_detail(self, obj) -> Optional[Dict[str, Any]]:
        """
        Get detailed contact information including additional fields.

        Returns:
            dict: Comprehensive contact details or None if not available
        """
        if not obj.contact:
            return None

        return {
            "id": obj.contact.id,
            "first_name": obj.contact.first_name,
            "last_name": obj.contact.last_name,
            "email": getattr(obj.contact, "email", None),
            "phone": getattr(obj.contact, "phone", None),
            "title": getattr(obj.contact, "title", None),
            "department": getattr(obj.contact, "department", None),
        }
