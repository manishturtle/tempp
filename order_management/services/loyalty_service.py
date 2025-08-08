"""
Loyalty service module for handling loyalty point operations.

This module provides functions for managing customer loyalty points,
including balance calculation, transaction creation, and point expiration.
"""

import logging
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone

from order_management.models import (
    LoyaltyTransaction,
    LoyaltyTransactionType,
    Order
)
from order_management.integrations import tenant_service, customer_service
from order_management.utils.config_utils import get_tenant_config_value

logger = logging.getLogger(__name__)

# System user ID for automatic operations like point expiry
SYSTEM_USER_ID = 1


class LoyaltyError(Exception):
    """Custom exception for loyalty-related errors."""
    pass


def get_account_points_balance(account_id: int, client_id: int) -> int:
    """
    Get the current loyalty points balance for an account.
    
    This function calculates the sum of all non-expired loyalty point transactions
    for the specified account and client.
    
    Args:
        account_id: The account identifier
        client_id: The client identifier
        
    Returns:
        The current points balance (integer)
    """
    logger.debug(f"Calculating loyalty points balance for account_id={account_id}, client_id={client_id}")
    
    # Get loyalty configuration to check if expiry is enabled
    loyalty_rules = get_tenant_config_value(client_id=client_id, config_key='loyalty_config', default={})
    
    # Build the base query
    query = LoyaltyTransaction.objects.filter(
        account_id=account_id,
        client_id=client_id
    )
    
    # Apply expiry filter only if expiry is configured
    if loyalty_rules.get('expiry_days'):
        today = timezone.now().date()
        query = query.filter(
            # Include transactions with no expiry date or future expiry date
            Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
        )
    
    # Calculate the balance
    balance = query.aggregate(
        total_points=Sum('points_change')
    )['total_points']
    
    # Return 0 if no transactions found
    return balance or 0


def add_loyalty_transaction(
    contact_id: int,
    account_id: int,
    client_id: int,
    transaction_type: str,
    points_change: int,
    created_by_user_id: int,
    related_order: Optional[Order] = None,
    expiry_date: Optional[date] = None,
    notes: Optional[str] = None
) -> LoyaltyTransaction:
    """
    Add a loyalty transaction for an account.
    
    Args:
        contact_id: The contact identifier of the person responsible for the transaction
        account_id: The account identifier that owns the loyalty points
        client_id: The client identifier
        transaction_type: The type of transaction (from LoyaltyTransactionType)
        points_change: The points change (positive for earned, negative for redeemed)
        created_by_user_id: The user ID of the creator
        related_order: Optional related order
        expiry_date: Optional expiry date for earned points
        notes: Optional transaction notes
        
    Returns:
        The created transaction object
        
    Raises:
        LoyaltyError: If there's an error creating the transaction
    """
    try:
        # Create the transaction
        transaction = LoyaltyTransaction.objects.create(
            contact_id=contact_id,
            account_id=account_id,
            client_id=client_id,
            transaction_type=transaction_type,
            points_change=points_change,
            related_order=related_order,
            expiry_date=expiry_date,
            notes=notes,
            created_by_id=created_by_user_id,
            updated_by_id=created_by_user_id
        )
        
        logger.info(
            f"Added {transaction_type} transaction of {points_change} points "
            f"for account {account_id} (contact: {contact_id}, client: {client_id})"
        )
        
        return transaction
    
    except Exception as e:
        error_msg = f"Error adding loyalty transaction for account_id={account_id}, contact_id={contact_id}, client_id={client_id}: {str(e)}"
        logger.error(error_msg)
        raise LoyaltyError(error_msg) from e


def award_points_for_order(order: Order) -> Optional[LoyaltyTransaction]:
    """
    Award loyalty points for an order.
    
    This function calculates and awards points based on the order amount
    and the client's loyalty configuration.
    
    Args:
        order: The order object
        
    Returns:
        The created transaction object or None if no points were awarded
        
    Raises:
        LoyaltyError: If there's an error awarding points
    """
    try:
        # Get loyalty configuration for the client
        loyalty_rules = get_tenant_config_value(client_id=order.client_id, config_key='loyalty_config', default={})
        
        # Check if loyalty program is enabled
        if not loyalty_rules or not loyalty_rules.get('enabled', False):
            logger.info(f"Loyalty program not enabled for client {order.client_id}")
            return None
        
        # Get earn rate from config
        earn_rate_str = loyalty_rules.get('earn_rate')
        if not earn_rate_str:
            logger.info(f"No earn rate defined in loyalty config for client {order.client_id}")
            return None
        
        # Convert earn rate to Decimal for calculation
        earn_rate = Decimal(str(earn_rate_str))
        if earn_rate <= Decimal('0'):
            logger.info(f"Invalid earn rate ({earn_rate}) for client {order.client_id}")
            return None
        
        # Calculate points to award based on order subtotal
        # Convert to integer (floor) to avoid fractional points
        points_earned = int(Decimal(str(order.subtotal_amount)) * earn_rate)
        
        # Only award points if the amount is positive
        if points_earned <= 0:
            logger.info(f"No points earned for order {order.id} (amount too small)")
            return None
        
        # Calculate expiry date if applicable
        expiry_date = None
        if expiry_days := loyalty_rules.get('expiry_days'):
            expiry_date = timezone.now().date() + timedelta(days=int(expiry_days))
        
        # Get the contact ID from the credential ID (auth user ID)
        auth_credential_id = order.created_by_id
        contact_id = customer_service.get_contact_id_for_credential(credential_id=auth_credential_id)
        
        if not contact_id:
            logger.warning(f"Could not map credential ID {auth_credential_id} to contact ID for order {order.id}")
            return None
        
        # Get the account ID for the contact
        account_id = order.account_id
        if not account_id:
            logger.warning(f"Order {order.id} has no account_id")
            return None
            
        # Create the transaction
        transaction = add_loyalty_transaction(
            contact_id=contact_id,
            account_id=account_id,
            client_id=order.client_id,
            transaction_type=LoyaltyTransactionType.EARNED,
            points_change=points_earned,
            created_by_user_id=auth_credential_id,  # Use credential ID for audit field
            related_order=order,
            expiry_date=expiry_date,
            notes=f"Points earned for order {order.id}"
        )
        
        logger.info(
            f"Awarded {points_earned} loyalty points for order {order.id} "
            f"(contact: {contact_id}, account: {account_id}, client: {order.client_id})"
        )
        
        return transaction
    
    except Exception as e:
        error_msg = f"Error awarding loyalty points for order {order.id}: {str(e)}"
        logger.error(error_msg)
        raise LoyaltyError(error_msg) from e


@transaction.atomic
def redeem_points_for_checkout(
    redeeming_contact_id: int,
    redeeming_user_credential_id: int,
    client_id: int,
    points_to_redeem: int,
    order_being_placed: Order
) -> Optional[LoyaltyTransaction]:
    """
    Redeem loyalty points during checkout.
    
    This function should be called within an atomic transaction
    during order creation to ensure consistency.
    
    Args:
        redeeming_contact_id: The contact ID of the person redeeming points
        redeeming_user_credential_id: The credential ID of the user performing the redemption
        client_id: The client identifier
        points_to_redeem: The number of points to redeem
        order_being_placed: The order being created
        
    Returns:
        The created transaction object if points were successfully redeemed, None otherwise
        
    Raises:
        LoyaltyError: If there's an error redeeming points
    """
    try:
        # Get account ID for the contact
        account_id = customer_service.get_account_id_for_contact(contact_id=redeeming_contact_id)
        
        if not account_id:
            logger.warning(f"Could not get account ID for contact {redeeming_contact_id}")
            raise LoyaltyError(f"No account found for contact {redeeming_contact_id}")
        
        # Get loyalty configuration to check if redemption is enabled
        loyalty_rules = get_tenant_config_value(client_id=client_id, config_key='loyalty_config', default={})
        
        # Check if loyalty program redemption is enabled
        if not loyalty_rules or not loyalty_rules.get('enabled', False):
            logger.info(f"Loyalty program not enabled for client {client_id}")
            return None
        
        # Validate redeem rate if needed
        redeem_rate_str = loyalty_rules.get('redeem_rate')
        if not redeem_rate_str:
            logger.info(f"No redeem rate defined in loyalty config for client {client_id}")
            return None
        
        # Validate input
        if points_to_redeem <= 0:
            logger.warning(f"Invalid points_to_redeem value: {points_to_redeem}")
            return None
        
        # Get current balance at the account level
        current_balance = get_account_points_balance(account_id, client_id)
        
        # Check if account has enough points
        if points_to_redeem > current_balance:
            logger.warning(
                f"Insufficient points balance for account {account_id} (client: {client_id}). "
                f"Requested: {points_to_redeem}, Available: {current_balance}"
            )
            return None
        
        # Create redemption transaction (negative points_change for debit)
        transaction = add_loyalty_transaction(
            contact_id=redeeming_contact_id,
            account_id=account_id,
            client_id=client_id,
            transaction_type=LoyaltyTransactionType.REDEEMED,
            points_change=-points_to_redeem,  # Negative for redemption
            created_by_user_id=redeeming_user_credential_id,  # Use credential ID for audit field
            related_order=order_being_placed,
            notes=f"Points redeemed for order {order_being_placed.id}"
        )
        
        logger.info(
            f"Redeemed {points_to_redeem} loyalty points for order {order_being_placed.id} "
            f"(contact: {redeeming_contact_id}, account: {account_id}, client: {client_id})"
        )
        
        return transaction
    
    except Exception as e:
        error_msg = f"Error redeeming loyalty points for contact {redeeming_contact_id}: {str(e)}"
        logger.error(error_msg)
        raise LoyaltyError(error_msg) from e


def expire_points_for_account(account_id: int, client_id: int) -> Optional[LoyaltyTransaction]:
    """
    Expire loyalty points for an account.
    
    This function finds earned points that have expired and creates
    an expiration transaction to offset them.
    
    Args:
        account_id: The account identifier
        client_id: The client identifier
        
    Returns:
        The created transaction object or None if no points were expired
        
    Raises:
        LoyaltyError: If there's an error expiring points
    """
    try:
        # Get loyalty configuration to check if expiry is enabled
        loyalty_rules = get_tenant_config_value(client_id=client_id, config_key='loyalty_config', default={})
        
        # Check if expiry is configured
        expiry_days = loyalty_rules.get('expiry_days')
        if not expiry_days:
            logger.debug(f"Point expiry not configured for client {client_id}")
            return None
        
        today = timezone.now().date()
        
        # Calculate current valid balance (already considers expiry dates)
        valid_balance = get_account_points_balance(account_id, client_id)
        
        # Calculate total recorded balance
        recorded_balance = LoyaltyTransaction.objects.filter(
            account_id=account_id,
            client_id=client_id
        ).aggregate(
            total=Sum('points_change')
        )['total'] or 0
        
        # Calculate points expired but not recorded
        points_to_expire_now = recorded_balance - valid_balance
        
        # If there are points to expire, create an expiration transaction
        if points_to_expire_now > 0:
            logger.info(
                f"Expiring {points_to_expire_now} loyalty points for account {account_id} "
                f"(client: {client_id})"
            )
            
            # Create expiration transaction (negative points_change for debit)
            transaction = add_loyalty_transaction(
                contact_id=None,  # No specific contact for bulk expiry
                account_id=account_id,
                client_id=client_id,
                transaction_type=LoyaltyTransactionType.EXPIRED,
                points_change=-points_to_expire_now,  # Negative for expiration
                created_by_user_id=SYSTEM_USER_ID,
                notes=f"Points expired as of {today}"
            )
            
            return transaction
        
        logger.debug(f"No loyalty points to expire for account {account_id} (client: {client_id})")
        return None
    
    except Exception as e:
        error_msg = f"Error expiring loyalty points for account {account_id}: {str(e)}"
        logger.error(error_msg)
        raise LoyaltyError(error_msg) from e
