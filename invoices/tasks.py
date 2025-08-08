"""
Celery tasks for invoice processing.
"""

import logging
import uuid
from datetime import datetime
from io import BytesIO

from celery import shared_task
from jinja2 import Template
from weasyprint import HTML

from invoices.models import Invoice
from customers.models import Contact
import os
from django.conf import settings
from google.cloud import storage
import base64

logger = logging.getLogger(__name__)


# --- Updated GCS Client Initialization ---
if hasattr(settings, "GS_CREDENTIALS_FILE") and os.path.exists(
    settings.GS_CREDENTIALS_FILE
):
    storage_client = storage.Client.from_service_account_json(
        settings.GS_CREDENTIALS_FILE
    )
    logger.info(
        f"GCS Client initialized using service account: {settings.GS_CREDENTIALS_FILE}"
    )
elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    # If GOOGLE_APPLICATION_CREDENTIALS env var is set, use that
    storage_client = storage.Client()
    logger.info(
        "GCS Client initialized using GOOGLE_APPLICATION_CREDENTIALS environment variable."
    )
else:
    # Fallback or raise an error if no credentials found
    logger.warning(
        "Warning: GS_CREDENTIALS_FILE not found or GOOGLE_APPLICATION_CREDENTIALS not set. Attempting default GCS client initialization."
    )
    storage_client = storage.Client()
    # Consider raising an ImproperlyConfigured error if credentials are strictly required and not found.
    # from django.core.exceptions import ImproperlyConfigured
    # raise ImproperlyConfigured("GCS credentials not found. Set GS_CREDENTIALS_FILE or GOOGLE_APPLICATION_CREDENTIALS.")

GCS_BUCKET_NAME = settings.GS_BUCKET_NAME


def upload_pdf_to_gcs(
    pdf_content_bytes, gcs_path, desired_filename="document.pdf"
):  # Added desired_filename
    """
    Uploads PDF content (bytes) to the specified GCS path.
    Sets Content-Disposition to suggest download with desired_filename.
    Returns the GCS object path.
    """
    if not GCS_BUCKET_NAME:
        raise ValueError("GCS_BUCKET_NAME setting is not configured.")

    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(gcs_path)  # gcs_path is the object name/path within bucket

    blob.upload_from_string(
        pdf_content_bytes,
        content_type="application/pdf",  # Important for the browser to know it's a PDF
    )

    # Set Content-Disposition metadata to trigger download
    # This tells the browser to download the file with the given filename
    # instead of trying to display it inline (for most cases).
    blob.content_disposition = f'attachment; filename="{desired_filename}"'
    blob.patch()  # Save the metadata changes to the GCS object

    logger.info(
        f"Successfully uploaded private PDF to gs://{GCS_BUCKET_NAME}/{gcs_path} with Content-Disposition for download as '{desired_filename}'."
    )
    return gcs_path


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_and_upload_invoice_pdf(
    self,
    invoice_id: int,
    auth_tenant_id: str,
    invoice_config: dict,
    rounding_sign: str,
    rounded_delta: float,
    contact_id: int,
):
    """
    Generate PDF from HTML template and upload to GCS.

    Args:
        invoice_id: The ID of the invoice to generate PDF for
        auth_tenant_id: The tenant ID for folder structure
        invoice_config: The invoice configuration dictionary
        rounding_sign: The rounding sign for the invoice
        rounded_delta: The rounded delta for the invoice
        contact_id: The ID of the contact associated with the invoice
    """
    try:
        print("DEBUG invoice_config:", invoice_config)
        print("DEBUG type:", type(invoice_config))
        # Get the invoice instance
        invoice = Invoice.objects.get(id=invoice_id)

        logger.info(f"Starting PDF generation for invoice {invoice.invoice_number}")

        # Extract template code (it's directly in invoice_config, not nested under "template")
        template_code = invoice_config["template_code"]

        # Extract configuration flags (they're called "config_values" with different key names)
        config_flags = {
            config_value["setting_def_name"]: config_value["configured_value"]
            for config_value in invoice_config.get("config_values", [])
        }

        def number_to_words(amount):
            """Simple utility to convert number to words - replace with num2words in production."""
            return f"{amount} rupees"  # Simplified implementation

        # Prepare context data for template
        context_data = {
            # Document label from config
            "document_label": config_flags.get("GEN_DOCUMENT_LABEL", "TAX INVOICE"),
            # Company info
            "company": {
                "name": invoice_config["company_info"]["company_name"],
                "address": ", ".join(
                    filter(
                        None,
                        [
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("address_line_1", "")
                            ),
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("address_line_2", "")
                            ),
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("city", "")
                            ),
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("state", "")
                            ),
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("country", "")
                            ),
                            str(
                                invoice_config["company_info"][
                                    "registered_address"
                                ].get("postal_code", "")
                            ),
                        ],
                    )
                ),
                "contact_details": ", ".join(
                    filter(
                        None,
                        [
                            str(
                                invoice_config["company_info"].get(
                                    "primary_contact_email", ""
                                )
                            ),
                            str(
                                invoice_config["company_info"].get(
                                    "primary_contact_phone", ""
                                )
                            ),
                        ],
                    )
                ),
                "state": invoice_config["company_info"]["registered_address"].get(
                    "state", ""
                ),
                "gstin": invoice_config["company_info"].get("tax_id", ""),
            },
            # Buyer info
            "buyer": {
                "name": invoice.account_name or "",
                "address": ", ".join(
                    filter(
                        None,
                        [
                            str(invoice.billing_address.street_1 or ""),
                            str(invoice.billing_address.street_2 or ""),
                            str(invoice.billing_address.street_3 or ""),
                            str(invoice.billing_address.city or ""),
                            str(invoice.billing_address.state_province or ""),
                            str(invoice.billing_address.country or ""),
                            str(invoice.billing_address.postal_code or ""),
                        ],
                    )
                ),
                "gstin": invoice.billing_address.gst_number or "",
            },
            # Invoice details (match template variable names)
            "invoice": {
                "number": invoice.invoice_number,  # Template expects 'number', not 'invoice_number'
                "date": invoice.issue_date.strftime(
                    "%d/%m/%Y"
                ),  # Template expects 'date', not 'invoice_date'
                "due_date": (
                    invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else ""
                ),
                "po_number": invoice.reference_number
                or "",  # Template expects 'po_number'
                "eway_bill": "",  # Template expects 'eway_bill', add this field to model if needed
            },
        }

        # Add shipping address if configured (template expects address_line1 and address_line2)
        if config_flags.get("PRINT_SHOW_SHIPPING_ADDRESS") and invoice.shipping_address:
            shipping_address_parts = [
                str(invoice.shipping_address.street_1 or ""),
                str(invoice.shipping_address.street_2 or ""),
                str(invoice.shipping_address.street_3 or ""),
                str(invoice.shipping_address.city or ""),
                str(invoice.shipping_address.state_province or ""),
                str(invoice.shipping_address.country or ""),
                str(invoice.shipping_address.postal_code or ""),
            ]
            # Filter out empty parts and join
            full_address = ", ".join(filter(None, shipping_address_parts))

            context_data["shipping"] = {
                "address_line1": full_address,  # Template expects address_line1
                "address_line2": "",  # Template might expect this too
            }

        # Add buyer state if configured
        if config_flags.get("PRINT_SHOW_POS_STATE"):
            context_data["buyer"]["state"] = (
                invoice.billing_address.state_province or ""
            )

        # Process invoice items with tax names
        invoice_items = []
        for item in invoice.items.all().prefetch_related("taxes__tax"):
            # Get tax names for this item
            tax_names = [tax.tax.rate_name for tax in item.taxes.all() if tax.tax]

            invoice_items.append(
                {
                    "name": item.product_name or "",
                    "description": item.description or "",
                    "hsn_sac": item.hsn_sac_code or "",
                    "quantity": item.quantity,
                    "uom": item.uom_symbol or "",
                    "list_price": item.unit_price,
                    "discount": item.discount_amount or 0,
                    "tax_names": ", ".join(tax_names),
                    "total_amount": item.total_price,
                }
            )

        context_data["invoice_items"] = invoice_items

        # Create totals object
        context_data["totals"] = {
            "subtotal": invoice.subtotal_amount,
            "discount_amount": invoice.discount_amount,
            "cgst_rate": 0,  # Calculate based on taxes if needed
            "cgst_amount": 0,
            "sgst_rate": 0,
            "sgst_amount": 0,
            "igst_rate": 0,
            "igst_amount": 0,
            "rounding_sign": rounding_sign,
            "rounded_delta": rounded_delta,
            "final_amount": invoice.total_amount,
        }

        # Get payment methods for the invoice (template expects list of method names)
        payment_methods = invoice.invoice_payment_methods.all().select_related(
            "payment_method"
        )
        context_data["payment_methods"] = [
            pm.payment_method.name
            for pm in payment_methods  # Template expects string list, not dict
        ]

        # Add all config flags to context
        context_data.update(config_flags)

        # Handle signature display
        signature_display_type = config_flags.get("SIGNATURE_DISPLAY_TYPE")
        if signature_display_type == "IMAGE_UPLOAD":
            context_data["SIG_IMAGE_DATA"] = config_flags.get("SIG_IMAGE_DATA", "")
        elif signature_display_type == "PRE_AUTHENTICATED_LABEL":
            context_data["SIG_PRE_AUTH_LABEL_TEXT"] = config_flags.get(
                "SIG_PRE_AUTH_LABEL_TEXT", ""
            )

        # Add thank you message
        context_data["GEN_THANK_YOU_MESSAGE"] = config_flags.get(
            "GEN_THANK_YOU_MESSAGE", ""
        )

        # Add terms and conditions
        context_data["GEN_TERMS_AND_CONDITIONS"] = config_flags.get(
            "GEN_TERMS_AND_CONDITIONS", ""
        )

        # Add amount in words
        context_data["amount_in_words"] = number_to_words(invoice.total_amount)

        # Render HTML template with context using Jinja2
        template = Template(template_code)
        rendered_html = template.render(**context_data)

        # Generate PDF using WeasyPrint
        pdf_buffer = BytesIO()
        HTML(string=rendered_html).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        # Generate a unique filename with timestamp and UUID
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8]  # Use first 8 characters of UUID
        safe_filename = f"invoice_{invoice.invoice_number.replace(' ', '_')}_{timestamp}_{unique_id}.pdf"

        # Define folder structure: invoices/{client_id}/
        destination_path = f"invoices/{auth_tenant_id}/{safe_filename}"

        # Get PDF content as bytes
        pdf_content_bytes = pdf_buffer.getvalue()

        # Upload to GCS using the robust upload function
        upload_pdf_to_gcs(
            pdf_content_bytes=pdf_content_bytes,
            gcs_path=destination_path,
            desired_filename=safe_filename,
        )

        # Store only the GCS path (not full URL) in invoice_url
        invoice.invoice_url = destination_path
        invoice.save(update_fields=["invoice_url"])

        logger.info(
            f"Generated and uploaded PDF for invoice {invoice.invoice_number} to {destination_path}"
        )

        # Send email notification with PDF attachment if contact_id is provided
        # if contact_id:
        #     try:
        #         # Get the contact details
        #         contact = Contact.objects.get(pk=contact_id)

        #         # Determine email to use (primary email, or fallback to secondary)
        #         recipient_email = contact.email or contact.secondary_email

        #         if recipient_email:
        #             # Get contact's full name
        #             full_name = (
        #                 f"{contact.first_name} {contact.last_name or ''}".strip()
        #             )

        #             # Convert PDF bytes to base64 for attachment
        #             pdf_base64 = base64.b64encode(pdf_content_bytes).decode("utf-8")

        #             # Prepare attachment
        #             attachments = [
        #                 {
        #                     "filename": safe_filename,
        #                     "content": pdf_base64,
        #                     "content_type": "application/pdf",
        #                 }
        #             ]

        #             # Import the email function
        #             from order_management.integrations.notification_service import (
        #                 send_transactional_email,
        #             )

        #             # Send email with PDF attachment
        #             email_context = {
        #                 "customer_name": full_name,
        #                 "invoice_number": invoice.invoice_number,
        #                 "invoice_date": (
        #                     invoice.issue_date.strftime("%d/%m/%Y")
        #                     if invoice.issue_date
        #                     else ""
        #                 ),
        #                 "invoice_amount": str(invoice.total_amount or 0),
        #                 "company_name": invoice_config.get("company_info", {}).get(
        #                     "company_name", ""
        #                 ),
        #             }

        #             # Send the email (using .delay for async or direct call)
        #             send_transactional_email(
        #                 tenant_identifier=auth_tenant_id,
        #                 recipient_email=recipient_email,
        #                 template_key="invoice_generated",  # You may need to configure this template
        #                 context=email_context,
        #                 attachments=attachments,
        #             )

        #             logger.info(
        #                 f"Sent invoice PDF email to {recipient_email} for invoice {invoice.invoice_number}"
        #             )
        #         else:
        #             logger.warning(
        #                 f"Contact {contact_id} has no email address - cannot send invoice PDF"
        #             )

        #     except Contact.DoesNotExist:
        #         logger.error(
        #             f"Contact {contact_id} not found - cannot send invoice PDF"
        #         )
        #     except Exception as email_error:
        #         logger.error(
        #             f"Error sending invoice PDF email for contact {contact_id}: {str(email_error)}"
        #         )

        return {
            "success": True,
            "invoice_id": invoice_id,
            "pdf_path": destination_path,
            "message": f"PDF generated successfully for invoice {invoice.invoice_number}",
        }

    except Exception as exc:
        logger.error(f"Error generating PDF for invoice ID {invoice_id}: {str(exc)}")

        # Retry the task if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)

        # If all retries failed, return error info
        return {
            "success": False,
            "invoice_id": invoice_id,
            "error": str(exc),
            "message": f"Failed to generate PDF after {self.max_retries} attempts",
        }
