"""
Models for the ecomm_auth app.

This module defines models for e-commerce user authentication and authorization.
It includes models for storing user credentials for the e-commerce storefront,
separate from the internal Django authentication system.

Ref: Functional Specification Section 2.4 (Phase 1 structure)
"""
from django.db import models
from django.conf import settings
from customers.models import Contact
from core.models.base import BaseTenantModel


class EcommUserCredential(BaseTenantModel):
    """
    Model for e-commerce user authentication credentials.
    
    This model stores authentication information for e-commerce storefront users,
    separate from the internal Django authentication system. Each credential
    is linked to exactly one Contact record.
    
    Ref: Functional Specification Section 2.4 (Phase 1 structure)
    """
    # IMPORTANT: Password Handling Security Note
    # --------------------------------------
    # Passwords must NEVER be stored or handled in plain text.
    # Always use Django's built-in secure hashing functions:
    # - from django.contrib.auth.hashers import make_password: When setting/creating passwords
    # - from django.contrib.auth.hashers import check_password: When verifying during login
    # 
    # This password hashing/checking logic should be implemented in the Authentication
    # Views/Serializers, not in the model itself.
    
    # id field is inherited from BaseTenantModel
    contact = models.OneToOneField(
        'customers.Contact',
        on_delete=models.CASCADE,
        related_name='ecomm_credential',
        help_text="Mandatory link to the CRM Contact record representing this user."
    )
    email = models.EmailField(
        max_length=254, 
        db_index=True,
        help_text="Login email, must be kept in sync with Contact email. Unique within tenant."
    )
    password = models.CharField(
        max_length=128,
        help_text="Stores the securely hashed password."
    )
    is_active = models.BooleanField(
        default=True, 
        db_index=True,
        help_text="Allows disabling login without deleting the record."
    )
    is_verified = models.BooleanField(
        default=False, 
        db_index=True,
        help_text="Indicates if email address has been verified."
    )
    last_login = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Timestamp of the last successful login."
    )
    # created_at, updated_at, created_by, updated_by fields are inherited from BaseTenantModel
    # Additional fields can be added based on detailed requirements
    
    def __str__(self):
        return self.email
    
    class Meta:
        verbose_name = "E-commerce User Credential"
        verbose_name_plural = "E-commerce User Credentials"
        ordering = ['email']
        unique_together = [('client_id', 'email')]


# Note: The EcommUserProfile model has been removed as per the new requirements.
# User profile data will be stored in the Contact model and related models.
