"""
Signal handlers for the customers app.

This module contains signal handlers for Account and Contact models,
which trigger synchronization tasks when relevant fields are updated.
"""
import logging
from typing import Set, Optional, Any, Type

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Model
from django.conf import settings

from customers.models import Account, Contact
from customers.tasks import sync_individual_account_contact_data

logger = logging.getLogger(__name__)

# Fields that should trigger synchronization
SYNC_FIELDS = {'first_name', 'last_name', 'email', 'name'}


@receiver(post_save, sender=Account)
@receiver(post_save, sender=Contact)
def handle_account_contact_sync(
    sender: Type[Model],
    instance: Model,
    created: bool,
    update_fields: Optional[Set[str]] = None,
    **kwargs: Any
) -> None:
    """
    Handle synchronization between Accounts and Contacts.
    
    This signal handler is triggered when an Account or Contact is saved.
    It checks if relevant fields were updated and, if so, queues a task
    to handle the synchronization.
    
    Args:
        sender: The model class that sent the signal
        instance: The instance that was saved
        created: Whether this is a new instance
        update_fields: The fields that were updated
        **kwargs: Additional keyword arguments
    """
    # Only run on updates with specific fields saved (not on creation)
    if created or not update_fields:
        return
    
    # Convert update_fields to a set for easier checking
    update_fields_set = set(update_fields)
    
    # Check if any sync fields were updated
    if not SYNC_FIELDS.intersection(update_fields_set):
        return
    
    # Check if sync is needed based on model type and account type
    sync_needed = False
    
    if sender == Account:
        # For Accounts, only sync if it's an Individual account
        if hasattr(instance, 'effective_customer_group') and \
           instance.effective_customer_group and \
           instance.effective_customer_group.group_type == 'INDIVIDUAL':
            sync_needed = True
    
    elif sender == Contact:
        # For Contacts, only sync if linked to an Individual account
        if hasattr(instance, 'account') and instance.account and \
           hasattr(instance.account, 'effective_customer_group') and \
           instance.account.effective_customer_group and \
           instance.account.effective_customer_group.group_type == 'INDIVIDUAL':
            sync_needed = True
    
    if not sync_needed:
        logger.debug(
            "Skipping sync for %s %s: Not an Individual account or Contact linked to an Individual account.",
            sender.__name__, instance.id
        )
        return
    
    # Get tenant ID from the instance
    tenant_id = getattr(instance, 'client_id', None)
    if not tenant_id:
        logger.warning(
            "Cannot determine tenant ID for %s %s. Skipping sync.",
            sender.__name__, instance.id,
            extra={'record_id': str(instance.id), 'model': sender.__name__}
        )
        return
    
    # Get the user who updated the instance for audit trail
    updated_by_id = getattr(instance, 'updated_by_id', None)
    
    # Create context for logging
    log_context = {
        'tenant_id': tenant_id,
        'user_id': updated_by_id,
        'model': sender.__name__,
        'record_id': str(instance.id),
        'updated_fields': ', '.join(update_fields_set)
    }
    
    # Queue the synchronization task with comprehensive logging
    logger.info(
        "Queueing sync task for %s %s. Updated fields: %s",
        sender.__name__, instance.id, ', '.join(update_fields_set),
        extra=log_context
    )
    
    sync_individual_account_contact_data.delay(
        str(instance.id),
        sender.__name__,
        list(update_fields_set),
        tenant_id,
        updated_by_id
    )
