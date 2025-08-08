"""
Celery tasks for the customers app.

This module contains asynchronous tasks for handling customer-related operations,
including synchronization between Accounts, Contacts, and the E-commerce platform.
"""
import logging
import uuid
from typing import List, Optional, Dict, Any

from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.conf import settings

from core.clients import EcomApiClient
from core.utils.tenant import set_tenant_context
from customers.models import Account, Contact

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_individual_account_contact_data(
    self,
    record_id: str,
    model_name: str,
    updated_fields: List[str],
    tenant_id: int,
    initiating_user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Synchronize data between Individual Accounts and their primary Contacts.
    
    Args:
        self: Celery task instance
        record_id: UUID of the record (Account or Contact) that was updated
        model_name: Name of the model that was updated ('Account' or 'Contact')
        updated_fields: List of fields that were updated
        tenant_id: ID of the tenant in which the record exists
        initiating_user_id: ID of the user who initiated the update
    
    Returns:
        Dictionary with the results of the synchronization operations
    """
    # Comprehensive logging with context
    extra_context = {
        'tenant_id': tenant_id,
        'user_id': initiating_user_id,
        'model': model_name,
        'record_id': record_id
    }
    """
    Synchronize data between Individual Accounts and their primary Contacts,
    as well as between Contacts and the E-commerce platform.
    
    This task handles bi-directional synchronization:
    1. Account -> Contact: For Individual accounts, sync name and email changes to the primary Contact
    2. Contact -> Account: For Contacts linked to Individual accounts, sync name and email changes to the Account
    3. Contact -> E-commerce: For Contacts with an ecommerce_user_id, sync name and email changes to the E-commerce platform
    
    Args:
        record_id: UUID of the record (Account or Contact) that was updated
        model_name: Name of the model that was updated ('Account' or 'Contact')
        updated_fields: List of fields that were updated
        tenant_id: ID of the tenant in which the record exists
        initiating_user_id: ID of the user who initiated the update, for audit purposes
        
    Returns:
        Dictionary with the results of the synchronization operations
        
    Raises:
        Exception: If there is an error during synchronization, which may trigger a retry
    """
    # Define fields that should trigger synchronization
    sync_fields = ['first_name', 'last_name', 'email', 'name']
    
    # Check if any relevant fields were updated
    if not any(field in updated_fields for field in sync_fields):
        logger.debug(
            "No relevant fields updated for %s %s. Skipping sync.",
            model_name, record_id
        )
        return {
            "status": "skipped",
            "reason": "no_relevant_fields",
            "model": model_name,
            "record_id": record_id
        }
    
    # Set tenant context with comprehensive logging
    try:
        set_tenant_context(tenant_id)
        logger.info(
            f"Tenant context activated for {model_name} synchronization", 
            extra=extra_context
        )
    except Exception as e:
        logger.error(
            f"Failed to set tenant context: {str(e)}", 
            extra=extra_context,
            exc_info=True
        )
        raise
    
    # Convert record_id to UUID if it's a string
    if isinstance(record_id, str):
        record_id = uuid.UUID(record_id)
    
    result = {
        "status": "success",
        "model": model_name,
        "record_id": str(record_id),
        "operations": []
    }
    
    try:
        # Handle Account to Contact synchronization
        if model_name == 'Account':
            sync_result = _sync_account_to_contact(
                record_id, updated_fields, initiating_user_id
            )
            if sync_result:
                result["operations"].append(sync_result)
        
        # Handle Contact to Account and Contact to E-commerce synchronization
        elif model_name == 'Contact':
            # Sync to Account
            account_sync_result = _sync_contact_to_account(
                record_id, updated_fields, initiating_user_id
            )
            if account_sync_result:
                result["operations"].append(account_sync_result)
            
            # Sync to E-commerce
            ecom_sync_result = _sync_contact_to_ecommerce(
                record_id, updated_fields
            )
            if ecom_sync_result:
                result["operations"].append(ecom_sync_result)
        
        return result
    
    except Exception as exc:
        logger.exception(
            "Error synchronizing %s %s: %s",
            model_name, record_id, str(exc)
        )
        result["status"] = "error"
        result["error"] = str(exc)
        
        # Retry the task with exponential backoff
        raise self.retry(
            exc=exc,
            countdown=2 ** self.request.retries * 60,  # 1min, 2min, 4min
            max_retries=3
        )


def _sync_account_to_contact(
    record_id: uuid.UUID, 
    updated_fields: List[str], 
    initiating_user_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Synchronize Account data to Contact.
    
    Args:
        record_id: UUID of the Account
        updated_fields: Fields that were updated
        initiating_user_id: ID of the user who initiated the update
    
    Returns:
        Optional dictionary with synchronization details
    """
    extra_context = {
        'user_id': initiating_user_id,
        'record_id': str(record_id),
        'operation': 'account_to_contact_sync'
    }
    """
    Synchronize data from an Account to its primary Contact.
    
    For Individual accounts, this function updates the primary Contact's
    name and email based on changes to the Account.
    
    Args:
        record_id: UUID of the Account that was updated
        updated_fields: List of fields that were updated
        initiating_user_id: ID of the user who initiated the update, for audit purposes
        
    Returns:
        Dictionary with the results of the synchronization operation, or None if no sync was performed
    """
    try:
        # Fetch the Account
        account = Account.objects.filter(id=record_id).first()
        if not account:
            logger.warning("Account %s not found. Skipping sync.", record_id)
            return None
        
        # Check if this is an Individual account
        if not account.effective_customer_group or account.effective_customer_group.group_type != 'INDIVIDUAL':
            logger.debug(
                "Account %s is not an Individual account. Skipping sync.",
                record_id
            )
            return None
        
        # Find the primary Contact for this Account
        # Just get the first contact for now, or implement a more sophisticated
        # primary contact detection based on business rules
        contact = Contact.objects.filter(account=account).first()
        
        if not contact:
            logger.warning(
                "No primary Contact found for Individual Account %s. Skipping sync.",
                record_id
            )
            return None
        
        # Prepare data to update on the Contact
        contact_update_data = {}
        
        # Sync name if it was updated
        if 'name' in updated_fields:
            # Simple name parsing - split on the first space
            name_parts = account.name.split(' ', 1)
            contact_update_data['first_name'] = name_parts[0]
            if len(name_parts) > 1:
                contact_update_data['last_name'] = name_parts[1]
            else:
                contact_update_data['last_name'] = ''
        
        # Sync email if it was updated and exists on the Account
        if 'email' in updated_fields and hasattr(account, 'email') and account.email:
            contact_update_data['email'] = account.email
        
        # If there's nothing to update, return
        if not contact_update_data:
            return None
        
        # Update the Contact
        with transaction.atomic():
            for field, value in contact_update_data.items():
                setattr(contact, field, value)
            
            # Use update_fields to prevent recursion
            update_fields = list(contact_update_data.keys())
            
            # Add updated_by if provided
            if initiating_user_id:
                contact.updated_by_id = initiating_user_id
                update_fields.append('updated_by')
            
            contact.save(update_fields=update_fields)
            
            logger.info(
                "Successfully synchronized Account %s to Contact %s. Updated fields: %s",
                record_id, contact.id, ', '.join(contact_update_data.keys()),
                extra=extra_context
            )
            
            return {
                "operation": "account_to_contact",
                "account_id": str(record_id),
                "contact_id": str(contact.id),
                "updated_fields": list(contact_update_data.keys())
            }
    
    except Exception as e:
        logger.exception(
            "Error synchronizing Account %s to Contact: %s",
            record_id, str(e)
        )
        raise


def _sync_contact_to_account(
    record_id: uuid.UUID, 
    updated_fields: List[str], 
    initiating_user_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Synchronize Contact data to Account.
    
    Args:
        record_id: UUID of the Contact
        updated_fields: Fields that were updated
        initiating_user_id: ID of the user who initiated the update
    
    Returns:
        Optional dictionary with synchronization details
    """
    extra_context = {
        'user_id': initiating_user_id,
        'record_id': str(record_id),
        'operation': 'contact_to_account_sync'
    }
    """
    Synchronize data from a Contact to its linked Account.
    
    For Contacts linked to Individual accounts, this function updates the
    Account's name and email based on changes to the Contact.
    
    Args:
        contact_id: UUID of the Contact that was updated
        updated_fields: List of fields that were updated
        initiating_user_id: ID of the user who initiated the update, for audit purposes
        
    Returns:
        Dictionary with the results of the synchronization operation, or None if no sync was performed
    """
    try:
        # Fetch the Contact
        contact = Contact.objects.filter(id=contact_id).first()
        if not contact:
            logger.warning("Contact %s not found. Skipping sync.", contact_id)
            return None
        
        # Fetch the linked Account
        account = contact.account
        if not account:
            logger.warning(
                "Contact %s is not linked to an Account. Skipping sync.",
                contact_id
            )
            return None
        
        # Check if this is an Individual account
        if not account.effective_customer_group or account.effective_customer_group.group_type != 'INDIVIDUAL':
            logger.debug(
                "Account %s is not an Individual account. Skipping sync.",
                account.id
            )
            return None
        
        # Prepare data to update on the Account
        account_update_data = {}
        
        # Sync name if first_name or last_name was updated
        if 'first_name' in updated_fields or 'last_name' in updated_fields:
            account_update_data['name'] = contact.full_name
        
        # Sync email if it was updated and the Account has an email field
        if 'email' in updated_fields and hasattr(account, 'email'):
            account_update_data['email'] = contact.email
        
        # If there's nothing to update, return
        if not account_update_data:
            return None
        
        # Update the Account
        with transaction.atomic():
            for field, value in account_update_data.items():
                setattr(account, field, value)
            
            # Use update_fields to prevent recursion
            update_fields = list(account_update_data.keys())
            
            # Add updated_by if provided
            if initiating_user_id:
                account.updated_by_id = initiating_user_id
                update_fields.append('updated_by')
            
            account.save(update_fields=update_fields)
            
            logger.info(
                "Successfully synchronized Contact %s to Account %s. Updated fields: %s",
                contact_id, account.id, ', '.join(account_update_data.keys())
            )
            
            return {
                "operation": "contact_to_account",
                "contact_id": str(contact_id),
                "account_id": str(account.id),
                "updated_fields": list(account_update_data.keys())
            }
    
    except Exception as e:
        logger.exception(
            "Error synchronizing Contact %s to Account: %s",
            contact_id, str(e)
        )
        raise


def _sync_contact_to_ecommerce(
    contact_id: uuid.UUID,
    updated_fields: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Synchronize data from a Contact to the E-commerce platform.
    
    For Contacts with an ecommerce_user_id, this function updates the
    user's profile in the E-commerce platform based on changes to the Contact.
    
    Args:
        contact_id: UUID of the Contact that was updated
        updated_fields: List of fields that were updated
        
    Returns:
        Dictionary with the results of the synchronization operation, or None if no sync was performed
    """
    try:
        # Fetch the Contact
        contact = Contact.objects.filter(id=contact_id).first()
        if not contact:
            logger.warning("Contact %s not found. Skipping sync.", contact_id)
            return None
        
        # Check if this Contact has an ecommerce_user_id
        if not contact.ecommerce_user_id:
            logger.debug(
                "Contact %s has no ecommerce_user_id. Skipping sync.",
                contact_id
            )
            return None
        
        # Check if any relevant fields were updated
        relevant_fields = ['first_name', 'last_name', 'email']
        if not any(field in updated_fields for field in relevant_fields):
            logger.debug(
                "No relevant fields updated for Contact %s. Skipping sync.",
                contact_id
            )
            return None
        
        # Prepare data to update in the E-commerce platform
        ecom_profile_data = {}
        
        # Add name fields if they were updated
        if 'first_name' in updated_fields:
            ecom_profile_data['first_name'] = contact.first_name
        
        if 'last_name' in updated_fields:
            ecom_profile_data['last_name'] = contact.last_name
        
        # Add email if it was updated
        if 'email' in updated_fields and contact.email:
            ecom_profile_data['email'] = contact.email
        
        # If there's nothing to update, return
        if not ecom_profile_data:
            return None
        
        # Update the user's profile in the E-commerce platform
        ecom_api_client = EcomApiClient()
        success, response = ecom_api_client.update_user_profile(
            contact.ecommerce_user_id, ecom_profile_data
        )
        
        if success:
            logger.info(
                "Successfully synchronized Contact %s to E-commerce user %s. Updated fields: %s",
                contact_id, contact.ecommerce_user_id, ', '.join(ecom_profile_data.keys())
            )
            
            return {
                "operation": "contact_to_ecommerce",
                "contact_id": str(contact_id),
                "ecommerce_user_id": contact.ecommerce_user_id,
                "updated_fields": list(ecom_profile_data.keys()),
                "response": response
            }
        else:
            logger.error(
                "Failed to synchronize Contact %s to E-commerce user %s: %s",
                contact_id, contact.ecommerce_user_id, response.get('error', 'Unknown error')
            )
            raise Exception(f"E-commerce API error: {response.get('error', 'Unknown error')}")
    
    except Exception as e:
        logger.exception(
            "Error synchronizing Contact %s to E-commerce: %s",
            contact_id, str(e)
        )
        raise
