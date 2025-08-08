"""
Views for the ecomm_auth app.

This module defines ViewSets and APIViews for e-commerce user authentication and authorization.
These views interact with the external Auth microservice for core authentication operations.
"""

import logging
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from erp_backend.middleware import TenantSchemaMiddleware
from customers.models import Contact, Account, CustomerGroup
from ecomm_auth.serializers import (
    NewEcommSignupSerializer,
)
from erp_backend.utils import send_api_notification

User = get_user_model()
logger = logging.getLogger(__name__)


class EcommUserViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing e-commerce user authentication.

    This is a placeholder implementation that will be expanded with full
    authentication and user management functionality in the future.
    """

    # Will be implemented with full functionality later
    pass


class EcommNewSignupView(APIView):
    """
    API view for simplified e-commerce signup process.

    This view handles the creation of Account and Contact records based on the provided
    data, with different fields required for individual vs. business accounts.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = [TenantSchemaMiddleware]
    serializer_class = NewEcommSignupSerializer

    def get_serializer(self, *args, **kwargs):
        """
        Return the serializer instance that should be used for validating and
        deserializing input, and for serializing output.
        """
        serializer_class = self.serializer_class
        kwargs.setdefault("context", {"request": self.request})
        return serializer_class(*args, **kwargs)

    def post(self, request: Request, tenant_slug: str, *args, **kwargs):
        """
        Handle POST requests for new account and contact creation.

        Creates records in Account and Contact tables with transaction atomicity.

        Args:
            request: The HTTP request object containing signup data
            tenant_slug: The tenant schema identifier from the URL path

        Returns:
            Response with success message or error details
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract validated data
        account_type = serializer.validated_data.get("account_type")
        first_name = serializer.validated_data.get("first_name")
        last_name = serializer.validated_data.get("last_name", "")
        email = serializer.validated_data.get("email")
        phone = serializer.validated_data.get("phone")
        user_id = serializer.validated_data.get("user_id")
        country = serializer.validated_data.get("country", "")
        customer_group_id = serializer.validated_data.get("customer_group_id")

        # Business-specific fields
        business_name = serializer.validated_data.get("business_name", "")
        legal_name = serializer.validated_data.get("legal_name", "")
        website = serializer.validated_data.get("website", "")
        company_size = serializer.validated_data.get("company_size", "")
        industry = serializer.validated_data.get("industry", "")
        tax_id = serializer.validated_data.get("tax_id", "")

        # Get the authenticated user if available
        user = (
            request.user
            if hasattr(request, "user") and request.user.is_authenticated
            else None
        )

        try:
            with transaction.atomic():
                # Get customer group by ID from payload
                if customer_group_id:
                    try:
                        customer_group = CustomerGroup.objects.get(id=customer_group_id)
                    except CustomerGroup.DoesNotExist:
                        logger.error(f"Customer group with ID {customer_group_id} not found")
                        return Response(
                            {
                                "detail": f"Customer group with ID {customer_group_id} not found."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Create Account
                account_name = (
                    business_name
                    if account_type == "BUSINESS"
                    else f"{first_name} {last_name}".strip() or email
                )
                account_data = {
                    "name": account_name,
                    "customer_group": customer_group,
                    "client_id": 1,
                    "created_by": user,
                    "updated_by": user,
                    "country": country,
                }

                # Add business-specific fields if this is a business account
                if account_type == "BUSINESS":
                    business_fields = [
                        "legal_name",
                        "website",
                        "industry",
                        "tax_id",
                        "company_size",
                    ]
                    for field in business_fields:
                        if field in request.data and request.data[field]:
                            account_data[field] = request.data.get(field)

                account = Account.objects.create(**account_data)

                # Create Contact
                contact_kwargs = {
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "account": account,
                    "client_id": 1,
                    "created_by": user,
                    "updated_by": user,
                    "mobile_phone": phone,
                    "work_phone": phone,
                    "user_id": user_id,
                }

                contact = Contact.objects.create(**contact_kwargs)

                # Send welcome email notification
                greeting = business_name if account_type == "BUSINESS" else first_name
                account_type_text = (
                    "business" if account_type == "BUSINESS" else "personal"
                )

                notification_result = send_api_notification(
                    recipients=[email],
                    subject="Welcome to Our Platform!",
                    body_text=f"Hi {greeting or 'there'}, thank you for creating your {account_type_text} account. We are excited to have you join our platform.",
                )

                from erp_backend.settings import TENANT_URL
                import requests
                import json

                # Construct the URL for validation
                validation_url = f"{TENANT_URL}/{tenant_slug}/auth/signup/validate/"

                # Prepare validation payload
                validation_payload = {
                    "user_id": int(user_id) if user_id else None,
                    "success": True,  # Account and contact were created successfully
                }

                try:
                    # Make API call to inform about successful account creation
                    validation_response = requests.post(
                        validation_url,
                        json=validation_payload,
                        headers={"Content-Type": "application/json"},
                    )
                    logger.info(
                        f"Validation API call response: {validation_response.status_code}"
                    )
                except Exception as e:
                    # Log the error but continue with the response
                    logger.error(f"Failed to call validation API: {str(e)}")

                return Response(
                    {
                        "success": True,
                        "message": "Account created successfully",
                        "data": {
                            "account_id": account.id,
                            "contact_id": contact.id,
                            "customer_group_id": account.customer_group_id,
                            "notification_sent": bool(notification_result),
                            "account_type": account_type,
                        },
                    },
                    status=status.HTTP_201_CREATED,
                )

        except Exception as e:
            logger.exception(f"Error creating new account: {str(e)}")

            # Also inform the validation endpoint about the failure
            try:
                from erp_backend.settings import TENANT_URL
                import requests

                # Construct the URL for validation
                validation_url = f"{TENANT_URL}/{tenant_slug}/auth/signup/validate/"

                # Prepare validation payload indicating failure
                validation_payload = {
                    "user_id": int(user_id) if user_id else None,
                    "success": False,  # Account and contact creation failed
                }

                # Make API call to inform about failed account creation
                validation_response = requests.post(
                    validation_url,
                    json=validation_payload,
                    headers={"Content-Type": "application/json"},
                )
                logger.info(
                    f"Failure validation API call response: {validation_response.status_code}"
                )
            except Exception as validation_error:
                logger.error(
                    f"Failed to call validation API for error case: {str(validation_error)}"
                )

            return Response(
                {"detail": f"Failed to create account: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
