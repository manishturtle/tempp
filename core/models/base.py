"""
Abstract base models for the ERP backend.

This module defines abstract base models that can be inherited by other models
to provide common functionality and reduce code duplication.
"""
import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings


class TimestampedModel(models.Model):
    """
    An abstract base model that provides created_at and updated_at fields.
    
    This model should be inherited by any model that needs to track when
    records were created and last updated.
    """
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']


class AuditableModel(TimestampedModel):
    """
    An abstract base model that extends TimestampedModel with audit fields.
    
    This model adds fields to track who created and last modified a record,
    which is useful for auditing purposes.
    """
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='%(app_label)s_%(class)s_created',
        editable=False
    )
    updated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='%(app_label)s_%(class)s_updated'
    )
    
    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """
    An abstract base model that provides soft delete functionality.
    
    Instead of permanently deleting records from the database, this model
    marks them as deleted by setting the is_deleted flag and deleted_at timestamp.
    """
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        """
        Override the delete method to perform a soft delete.
        
        Instead of removing the record from the database, this method
        sets is_deleted to True and records the deletion timestamp.
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
    
    def hard_delete(self, using=None, keep_parents=False):
        """
        Permanently delete the record from the database.
        
        This method should be used when a record needs to be permanently
        removed, bypassing the soft delete mechanism.
        """
        return super().delete(using=using, keep_parents=keep_parents)


class BaseTenantModel(models.Model):
    """
    Abstract base model for all tenant-specific business data models.
    
    This model provides standard fields required for all tenant-specific models,
    including UUID primary key, client/company identifiers, and audit fields.
    
    Note: Future Implementation Requirements:
    1. Logic to automatically populate created_by and updated_by fields based on the current user
       will be implemented via middleware or model save overrides.
    2. Logic to dynamically set the correct client and company_id based on tenant context
       will be implemented in a later phase.
    3. These fields provide the foundation for detailed audit trails as specified in
       Functional Specification Section 8.2.3.
    """
    # Primary key field - using AutoField for new models
    id = models.AutoField(primary_key=True)
    # Placeholder field, tenant scoping via DB schema path. Defaulting to 1.
    client_id = models.BigIntegerField(default=1, editable=False, db_index=True)
    # Placeholder field, tenant scoping via DB schema path. Defaulting to 1.
    company_id = models.BigIntegerField(default=1, editable=False, db_index=True, help_text="Company Identifier (within tenant). Default=1 for Phase 1.")
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)
    created_by = models.BigIntegerField(null=True, blank=True, editable=False, db_index=True)
    updated_by = models.BigIntegerField(null=True, blank=True, editable=False)
    
    # Implementation Note for custom_fields:
    # This JSONField provides flexible storage for basic custom fields defined by Tenant Admins.
    # The *structure* within the JSON (e.g., {"internal_rating_c": "Hot", "legacy_system_id_c": 12345})
    # and the *validation* of custom field data types will be determined by consuming code
    # (serializers, forms, UI components) based on separate CustomFieldDefinition metadata
    # (to be implemented later). This field simply provides the storage container in Phase 1.
    custom_fields = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Stores basic custom field data as key-value pairs defined by admin settings."
    )
    
    class Meta:
        abstract = True
        ordering = ['-created_at']  # Default ordering by creation date
