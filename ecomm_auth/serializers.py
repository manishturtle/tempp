"""
Serializers for the ecomm_auth app.

This module defines serializers for e-commerce authentication operations
such as signup, login, and password reset.
"""

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _


class NewEcommSignupSerializer(serializers.Serializer):
    """
    Simplified serializer for new e-commerce signup process.
    Handles both individual and business account types with required fields.
    """

    ACCOUNT_TYPE_CHOICES = [("INDIVIDUAL", "Individual"), ("BUSINESS", "Business")]

    # Required fields for all account types
    account_type = serializers.ChoiceField(
        choices=ACCOUNT_TYPE_CHOICES, default="INDIVIDUAL"
    )
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    user_id = serializers.CharField(required=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_group_id = serializers.IntegerField(required=False, allow_null=True)

    # Business-specific fields
    business_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    legal_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    company_size = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tax_id = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs):
        """
        Validate that business accounts have required business fields.
        """
        account_type = attrs.get("account_type")

        if account_type == "BUSINESS":
            if not attrs.get("business_name"):
                raise serializers.ValidationError(
                    {
                        "business_name": _(
                            "Business name is required for business accounts."
                        )
                    }
                )

        return attrs
