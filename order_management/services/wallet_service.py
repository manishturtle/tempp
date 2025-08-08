"""
Wallet service module for handling wallet-related operations.

This module provides functions for managing customer wallets,
including balance retrieval, transaction creation, and wallet management.
"""

import logging
from decimal import Decimal
from typing import Optional, Dict, Any

from django.db import transaction
from django.db.models import F

from order_management.models import (
    Wallet, 
    WalletTransaction, 
    WalletTransactionType,
    Order,
    RMA
)
from order_management.integrations import customer_service

logger = logging.getLogger(__name__)


class WalletError(Exception):
    """Custom exception for wallet-related errors."""
    pass


def get_account_id_or_raise(contact_id: int) -> int:
    """
    Get the account ID for a contact or raise an exception if not found.
    
    Args:
        contact_id: The contact identifier
        
    Returns:
        The account ID
        
    Raises:
        WalletError: If the account ID cannot be determined
    """
    account_id = customer_service.get_account_id_for_contact(contact_id=contact_id)
    
    if account_id is None:
        error_msg = f"Could not determine account_id for contact_id={contact_id}"
        logger.error(error_msg)
        raise WalletError(error_msg)
    
    return account_id


def get_or_create_wallet(account_id: int, created_by_contact_id: int) -> Wallet:
    """
    Get an existing wallet or create a new one if it doesn't exist.
    
    Args:
        account_id: The account identifier
        created_by_contact_id: The contact ID of the creator
        
    Returns:
        The wallet object
        
    Raises:
        Exception: If there's an error creating or retrieving the wallet
    """
    try:
        wallet, created = Wallet.objects.get_or_create(
            account_id=account_id,
            defaults={
                'created_by_id': created_by_contact_id,
                'updated_by_id': created_by_contact_id,
                'balance': Decimal('0.00')
            }
        )
        
        if created:
            logger.info(f"Created new wallet for account_id={account_id}")
        
        return wallet
    
    except Exception as e:
        error_msg = f"Error getting or creating wallet for account_id={account_id}: {str(e)}"
        logger.error(error_msg)
        raise WalletError(error_msg) from e


def get_contact_wallet_balance(contact_id: int) -> Decimal:
    """
    Get the wallet balance for a contact.
    
    Args:
        contact_id: The contact identifier
        
    Returns:
        The wallet balance
        
    Raises:
        WalletError: If there's an error retrieving the balance
    """
    try:
        # Get the account ID for the contact
        account_id = get_account_id_or_raise(contact_id)
        
        # Get or create the wallet
        wallet = get_or_create_wallet(account_id, contact_id)
        
        return wallet.balance
    
    except WalletError:
        # Re-raise WalletError exceptions
        raise
    
    except Exception as e:
        error_msg = f"Error retrieving wallet balance for contact_id={contact_id}: {str(e)}"
        logger.error(error_msg)
        raise WalletError(error_msg) from e


@transaction.atomic
def add_transaction(
    wallet: Wallet,
    transaction_type: str,
    amount: Decimal,
    created_by_contact_id: int,
    related_order: Optional[Order] = None,
    related_rma: Optional[RMA] = None,
    notes: Optional[str] = None
) -> WalletTransaction:
    """
    Add a transaction to a wallet and update the balance atomically.
    
    Args:
        wallet: The wallet object
        transaction_type: The type of transaction (from WalletTransactionType)
        amount: The transaction amount (positive for credit, negative for debit)
        created_by_contact_id: The contact ID of the creator
        related_order: Optional related order
        related_rma: Optional related RMA
        notes: Optional transaction notes
        
    Returns:
        The created transaction object
        
    Raises:
        WalletError: If there's an error creating the transaction
    """
    try:
        # Lock the wallet row for update
        wallet_locked = Wallet.objects.select_for_update().get(pk=wallet.pk)
        
        # Create the transaction
        transaction = WalletTransaction.objects.create(
            wallet=wallet_locked,
            transaction_type=transaction_type,
            amount=amount,
            related_order=related_order,
            related_rma=related_rma,
            notes=notes,
            created_by_id=created_by_contact_id,
            updated_by_id=created_by_contact_id
        )
        
        # Update the wallet balance using F() expression for atomic update
        wallet_locked.balance = F('balance') + amount
        wallet_locked.updated_by_id = created_by_contact_id
        wallet_locked.save(update_fields=['balance', 'updated_at', 'updated_by_id'])
        
        # Refresh the wallet to get the updated balance
        wallet_locked.refresh_from_db(fields=['balance'])
        
        logger.info(
            f"Added {transaction_type} transaction of {amount} to wallet {wallet.pk}, "
            f"new balance: {wallet_locked.balance}"
        )
        
        return transaction
    
    except Exception as e:
        error_msg = f"Error adding transaction to wallet {wallet.pk}: {str(e)}"
        logger.error(error_msg)
        raise WalletError(error_msg) from e
